'use client';

import { Download, FileVideo, TrendingDown } from 'lucide-react';

interface DownloadButtonProps {
  file: File | null;
  originalName?: string;
  originalSize?: number;
}

export function DownloadButton({ file, originalName, originalSize }: DownloadButtonProps) {
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

  const calculateSavings = () => {
    if (!originalSize) return null;
    const reduction = ((originalSize - file.size) / originalSize) * 100;
    return Math.round(reduction);
  };

  const savings = calculateSavings();

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border-2 border-green-200 dark:border-green-800">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0 w-full">
          <div className="p-2 md:p-3 bg-green-100 dark:bg-green-900/30 rounded-xl flex-shrink-0">
            <FileVideo className="w-5 h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm md:text-base">{file.name}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-gray-500 dark:text-gray-400">
              <span>{formatFileSize(file.size)}</span>
              {savings !== null && savings > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <TrendingDown className="w-3 h-3" />
                    Saved {savings}%
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 px-4 py-2.5 md:px-6 md:py-3 w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg shadow-green-500/20 text-sm md:text-base"
        >
          <Download className="w-4 h-4 md:w-5 md:h-5" />
          Download Video
        </button>
      </div>
    </div>
  );
}