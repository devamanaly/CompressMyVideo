'use client';

import { Download, FileVideo } from 'lucide-react';

interface DownloadButtonProps {
  file: File | null;
  originalName?: string;
}

export function DownloadButton({ file, originalName }: DownloadButtonProps) {
  if (!file) return null;

  const handleDownload = () => {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  return (
    <div className="p-6 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border-2 border-green-200 dark:border-green-800">
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
            <FileVideo className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{file.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Size: {formatFileSize(file.size)} • Ready to download
            </p>
          </div>
        </div>
        
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg shadow-green-500/20 whitespace-nowrap"
        >
          <Download className="w-5 h-5" />
          Download Video
        </button>
      </div>
    </div>
  );
}