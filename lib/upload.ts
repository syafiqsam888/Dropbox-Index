import { dropbox } from "./dropbox";
import { files } from "dropbox";

export interface UploadResult {
  success: boolean;
  method: 'direct' | 'proxy';
  message: string;
  file_path?: string;
  error?: string;
}

export interface URLValidationResult {
  isValid: boolean;
  error?: string;
  contentType?: string;
  contentLength?: number;
}

/**
 * Validates a URL before attempting upload
 */
export async function validateURL(url: string): Promise<URLValidationResult> {
  try {
    // Basic URL format validation
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      return {
        isValid: false,
        error: "Invalid URL format"
      };
    }

    // Check if it's HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        isValid: false,
        error: "URL must use HTTP or HTTPS protocol"
      };
    }

    // Make a HEAD request to check if the URL is accessible
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Dropbox-Index/1.0'
      }
    });

    if (!response.ok) {
      return {
        isValid: false,
        error: `URL returned status ${response.status}: ${response.statusText}`
      };
    }

    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');

    return {
      isValid: true,
      contentType: contentType || undefined,
      contentLength: contentLength ? parseInt(contentLength) : undefined
    };

  } catch (error) {
    return {
      isValid: false,
      error: `Failed to validate URL: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Attempts direct upload to Dropbox using save_url API
 */
export async function uploadDirect(url: string, path: string): Promise<UploadResult> {
  try {
    const response = await dropbox.filesSaveUrl({
      url: url,
      path: path
    });

    return {
      success: true,
      method: 'direct',
      message: 'File uploaded successfully using direct method',
      file_path: path
    };

  } catch (error: any) {
    return {
      success: false,
      method: 'direct',
      message: 'Direct upload failed',
      error: error.message || 'Unknown error occurred'
    };
  }
}

/**
 * Proxy upload method - downloads file then uploads to Dropbox
 */
export async function uploadProxy(url: string, path: string): Promise<UploadResult> {
  try {
    // Download the file
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Dropbox-Index/1.0'
      }
    });

    if (!response.ok) {
      return {
        success: false,
        method: 'proxy',
        message: 'Failed to download file from URL',
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const fileBuffer = await response.arrayBuffer();
    const contentLength = fileBuffer.byteLength;

    // For large files (> 150MB), use upload session
    if (contentLength > 150 * 1024 * 1024) {
      return await uploadLargeFile(fileBuffer, path);
    }

    // For smaller files, use regular upload
    const uploadResponse = await dropbox.filesUpload({
      path: path,
      contents: fileBuffer,
      mode: { '.tag': 'add' },
      autorename: true
    });

    return {
      success: true,
      method: 'proxy',
      message: 'File uploaded successfully using proxy method',
      file_path: uploadResponse.result.path_display || path
    };

  } catch (error: any) {
    return {
      success: false,
      method: 'proxy',
      message: 'Proxy upload failed',
      error: error.message || 'Unknown error occurred'
    };
  }
}

/**
 * Upload large files using upload session
 */
async function uploadLargeFile(fileBuffer: ArrayBuffer, path: string): Promise<UploadResult> {
  try {
    const chunkSize = 8 * 1024 * 1024; // 8MB chunks
    const fileSize = fileBuffer.byteLength;
    
    // Start upload session
    const sessionStart = await dropbox.filesUploadSessionStart({
      contents: fileBuffer.slice(0, chunkSize),
      close: false
    });

    let offset = chunkSize;
    
    // Upload remaining chunks
    while (offset < fileSize) {
      const chunk = fileBuffer.slice(offset, Math.min(offset + chunkSize, fileSize));
      const isLastChunk = offset + chunk.byteLength >= fileSize;
      
      if (isLastChunk) {
        // Finish the session
        await dropbox.filesUploadSessionFinish({
          contents: chunk,
          cursor: {
            session_id: sessionStart.result.session_id,
            offset: offset
          },
          commit: {
            path: path,
            mode: { '.tag': 'add' },
            autorename: true
          }
        });
      } else {
        // Append chunk
        await dropbox.filesUploadSessionAppendV2({
          contents: chunk,
          cursor: {
            session_id: sessionStart.result.session_id,
            offset: offset
          },
          close: false
        });
      }
      
      offset += chunk.byteLength;
    }

    return {
      success: true,
      method: 'proxy',
      message: 'Large file uploaded successfully using proxy method with upload session',
      file_path: path
    };

  } catch (error: any) {
    return {
      success: false,
      method: 'proxy',
      message: 'Large file upload failed',
      error: error.message || 'Unknown error occurred'
    };
  }
}

/**
 * Main upload function that tries direct first, then falls back to proxy
 */
export async function uploadByLink(url: string, destinationPath: string): Promise<UploadResult> {
  // First, validate the URL
  const validation = await validateURL(url);
  if (!validation.isValid) {
    return {
      success: false,
      method: 'direct',
      message: 'URL validation failed',
      error: validation.error
    };
  }

  // Try direct upload first
  const directResult = await uploadDirect(url, destinationPath);
  if (directResult.success) {
    return directResult;
  }

  // If direct upload fails, try proxy upload
  const proxyResult = await uploadProxy(url, destinationPath);
  
  // Add context about the fallback
  if (proxyResult.success) {
    proxyResult.message = `Direct upload failed, successfully uploaded using proxy method. Original error: ${directResult.error}`;
  }
  
  return proxyResult;
}

/**
 * Generate a file name from URL
 */
export function generateFileName(url: string): string {
  try {
    const parsedUrl = new URL(url);
    let fileName = parsedUrl.pathname.split('/').pop() || 'download';
    
    // Remove query parameters from filename
    fileName = fileName.split('?')[0];
    
    // If no extension, add .bin
    if (!fileName.includes('.')) {
      fileName += '.bin';
    }
    
    return fileName;
  } catch (e) {
    return 'download.bin';
  }
}