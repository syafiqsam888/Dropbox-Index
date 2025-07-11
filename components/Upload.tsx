import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { CloudUploadIcon, XIcon } from "@heroicons/react/solid";
import ky from "ky";

interface UploadProps {
  currentPath?: string;
  onUploadComplete?: () => void;
}

interface UploadResult {
  success: boolean;
  method: 'direct' | 'proxy';
  message: string;
  file_path?: string;
  error?: string;
}

export const Upload = ({ currentPath = "", onUploadComplete }: UploadProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const validateUrl = (url: string): boolean => {
    try {
      const parsedUrl = new URL(url);
      return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch {
      return false;
    }
  };

  const generateFileNameFromUrl = (url: string): string => {
    try {
      const parsedUrl = new URL(url);
      let name = parsedUrl.pathname.split('/').pop() || 'download';
      name = name.split('?')[0]; // Remove query parameters
      if (!name.includes('.')) {
        name += '.bin';
      }
      return name;
    } catch {
      return 'download.bin';
    }
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (value && !fileName) {
      setFileName(generateFileNameFromUrl(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    if (!validateUrl(url)) {
      toast.error("Please enter a valid HTTP or HTTPS URL");
      return;
    }

    if (!fileName.trim()) {
      toast.error("Please enter a file name");
      return;
    }

    setIsUploading(true);

    try {
      const result = await ky.post('/api/upload/by-link', {
        json: {
          url: url.trim(),
          fileName: fileName.trim(),
          folderPath: currentPath
        }
      }).json<UploadResult>();

      if (result.success) {
        toast.success(
          `${result.message} (Method: ${result.method})`,
          {
            duration: 5000,
            style: {
              backgroundColor: "#1e293b",
              borderWidth: 2,
              borderColor: "#10b981",
              color: "white",
            },
          }
        );
        
        // Reset form
        setUrl("");
        setFileName("");
        setIsOpen(false);
        
        // Notify parent component
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        toast.error(
          `Upload failed: ${result.error || result.message}`,
          {
            duration: 8000,
            style: {
              backgroundColor: "#1e293b",
              borderWidth: 2,
              borderColor: "#ef4444",
              color: "white",
            },
          }
        );
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(
        `Upload failed: ${error.message || 'Unknown error occurred'}`,
        {
          duration: 8000,
          style: {
            backgroundColor: "#1e293b",
            borderWidth: 2,
            borderColor: "#ef4444",
            color: "white",
          },
        }
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative">
      {/* Upload Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors duration-200"
        disabled={isUploading}
      >
        <CloudUploadIcon className="w-5 h-5 mr-2" />
        Upload by URL
      </button>

      {/* Upload Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full border border-slate-700">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Upload File by URL</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
                disabled={isUploading}
              >
                <XIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-slate-300 mb-2">
                  File URL *
                </label>
                <input
                  type="url"
                  id="url"
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://example.com/file.pdf"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  disabled={isUploading}
                  required
                />
                <p className="text-xs text-slate-400 mt-1">
                  Enter the direct URL to the file you want to upload
                </p>
              </div>

              <div>
                <label htmlFor="fileName" className="block text-sm font-medium text-slate-300 mb-2">
                  File Name *
                </label>
                <input
                  type="text"
                  id="fileName"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="document.pdf"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  disabled={isUploading}
                  required
                />
                <p className="text-xs text-slate-400 mt-1">
                  The name to save the file as in Dropbox
                </p>
              </div>

              {currentPath && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Destination Folder
                  </label>
                  <div className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-300">
                    /{currentPath}
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors duration-200"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>

            {/* Help Text */}
            <div className="px-6 pb-6">
              <div className="text-xs text-slate-400 bg-slate-900 rounded-lg p-3">
                <p className="font-medium mb-1">Upload Methods:</p>
                <p>• <strong>Direct:</strong> Uses Dropbox save_url API (faster)</p>
                <p>• <strong>Proxy:</strong> Downloads then uploads (works with complex URLs)</p>
                <p className="mt-2">Complex URLs with query parameters will automatically use the proxy method if direct upload fails.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};