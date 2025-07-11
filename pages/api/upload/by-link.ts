import type { NextApiRequest, NextApiResponse } from "next";
import { uploadByLink, generateFileName, UploadResult } from "../../../lib/upload";

interface UploadRequest {
  url: string;
  fileName?: string;
  folderPath?: string;
}

interface UploadResponse extends UploadResult {}

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<UploadResponse>
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      method: 'direct',
      message: 'Method not allowed',
      error: 'Only POST requests are accepted'
    });
  }

  try {
    const { url, fileName, folderPath }: UploadRequest = req.body;

    // Validate request body
    if (!url) {
      return res.status(400).json({
        success: false,
        method: 'direct',
        message: 'Missing required parameter',
        error: 'URL is required'
      });
    }

    // Generate destination path
    let destinationFileName = fileName || generateFileName(url);
    
    // Ensure filename doesn't start with special characters
    destinationFileName = destinationFileName.replace(/^[\.\_]/, '');
    
    const destinationPath = folderPath 
      ? `/${folderPath.replace(/^\/+|\/+$/g, '')}/${destinationFileName}`
      : `/${destinationFileName}`;

    // Perform the upload
    const result = await uploadByLink(url, destinationPath);
    
    // Return appropriate status code
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Upload API error:', error);
    res.status(500).json({
      success: false,
      method: 'direct',
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
};

export default handler;