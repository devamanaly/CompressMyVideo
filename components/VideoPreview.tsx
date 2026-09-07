'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Maximize2, Minimize2 } from 'lucide-react';

interface VideoPreviewProps {
  file: File | null;
  metadata?: {
    name: string;
    size: number;
    duration: number;
    width: number;
    height: number;
    type: string;
  } | null;
}

export function VideoPreview({ file, metadata }: VideoPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [file]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (!document.fullscreenElement) {
        videoRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
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

  if (!file) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
        <div className="text-center text-gray-400 dark:text-gray-500">
          <Play className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Video preview will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
        <video
          ref={videoRef}
          src={file ? URL.createObjectURL(file) : undefined}
          className="w-full h-full"
          onClick={togglePlay}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        
        {/* Video Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white" />
              )}
            </button>
            
            <span className="text-sm text-white/80 font-medium">
              {metadata?.duration ? formatDuration(metadata.duration) : '0:00'}
            </span>
            
            <div className="flex-1" />
            
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-white" />
              ) : (
                <Maximize2 className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Metadata */}
      {metadata && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{metadata.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Size</p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatFileSize(metadata.size)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Resolution</p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{metadata.width}×{metadata.height}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatDuration(metadata.duration)}</p>
          </div>
        </div>
      )}
    </div>
  );
}