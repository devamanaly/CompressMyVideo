'use client';

import { Upload, X, FileVideo } from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { ALLOWED_VIDEO_TYPES } from '@/lib/constants';
import { VideoMetadata } from '@/hooks/useVideoCompression';

interface VideoUploaderProps {
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  file?: File | null;
  metadata?: VideoMetadata | null;
  isProcessing?: boolean;
  error?: string | null;
}

export function VideoUploader({ 
  onFileSelect, 
  onRemove, 
  file, 
  metadata, 
  isProcessing, 
  error 
}: VideoUploaderProps) {
  const { isDragging, handleDragEnter, handleDragLeave, handleDragOver, handleDrop, handleFileSelect } = useFileUpload();

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const result = handleDrop(e);
    if (result.file) {
      onFileSelect(result.file);
    }
  };

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const result = handleFileSelect(e);
    if (result.file) {
      onFileSelect(result.file);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show uploaded file preview
  if (file && metadata) {
    return (
      <div className="relative p-4 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl border-2 border-purple-200 dark:border-purple-800">
        <button
          onClick={onRemove}
          disabled={isProcessing}
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
        >
          <X className="w-5 h-5 text-red-500" />
        </button>
        
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex-shrink-0">
            <FileVideo className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm md:text-base">
              {file.name}
            </p>
            <div className="flex flex-wrap gap-2 md:gap-3 mt-1 text-xs md:text-sm text-gray-500 dark:text-gray-400">
              <span>{formatFileSize(file.size)}</span>
              <span>•</span>
              <span>{metadata.width}×{metadata.height}</span>
              <span>•</span>
              <span>{formatDuration(metadata.duration)}</span>
            </div>
          </div>
          
          {isProcessing && (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show upload zone when no file is uploaded
  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={onDrop}
      className={`upload-zone p-8 md:p-12 text-center cursor-pointer transition-all duration-300 ${
        isDragging ? 'drag-active' : ''
      } ${error ? 'border-red-500 bg-red-50/50 dark:bg-red-900/10' : ''}`}
    >
      <input
        type="file"
        accept={ALLOWED_VIDEO_TYPES.join(',')}
        onChange={onSelect}
        className="hidden"
        id="video-upload"
        disabled={isProcessing}
      />
      <label htmlFor="video-upload" className="cursor-pointer block">
        <div className="flex flex-col items-center gap-3 md:gap-4">
          <div className="p-3 md:p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full">
            <Upload className="w-8 h-8 md:w-10 md:h-10 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-base md:text-lg font-medium text-gray-700 dark:text-gray-300">
              {isDragging ? 'Drop your video here' : 'Upload your video'}
            </p>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Drag & drop or click to browse
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-2 text-xs text-gray-400 dark:text-gray-500">
              <span>MP4</span>
              <span>•</span>
              <span>MOV</span>
              <span>•</span>
              <span>AVI</span>
              <span>•</span>
              <span>WEBM</span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Max file size: 1GB
            </p>
          </div>
        </div>
      </label>
      {error && (
        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}