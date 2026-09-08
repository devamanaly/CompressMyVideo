/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Maximize2, Minimize2, X } from 'lucide-react';

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
  onRemove?: () => void;
  isProcessing?: boolean;
}

export function VideoPreview({ file, metadata, onRemove, isProcessing }: VideoPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Create object URL when file changes
  useEffect(() => {
    if (file) {
      // Revoke old URL if it exists
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setIsVideoLoaded(false);
      setHasError(false);
      
      // Load the video
      if (videoRef.current) {
        videoRef.current.load();
      }
    } else {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
        setVideoUrl(null);
      }
    }

    // Cleanup on unmount
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [file]);

  // Reset video state when file changes
  useEffect(() => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  }, [file]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => setIsPlaying(true))
              .catch((error) => {
                console.error('Play error:', error);
                setHasError(true);
              });
          }
        } catch (error) {
          console.error('Play error:', error);
          setHasError(true);
        }
      }
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

  const handleVideoLoad = () => {
    console.log('Video loaded successfully');
    setIsVideoLoaded(true);
    setHasError(false);
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error('Video error:', e);
    setHasError(true);
    setIsVideoLoaded(false);
  };

  const handleCanPlay = () => {
    console.log('Video can play');
    setIsVideoLoaded(true);
    setHasError(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!file) {
    return (
      <div className="flex items-center justify-center h-48 md:h-64 bg-gray-100 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
        <div className="text-center text-gray-400 dark:text-gray-500">
          <Play className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm md:text-base">Video preview will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
        {/* Remove button */}
        {onRemove && !isProcessing && (
          <button
            onClick={onRemove}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-black/50 hover:bg-red-500/80 transition-colors backdrop-blur-sm"
          >
            <X className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </button>
        )}

        {/* Error message if video fails to load */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 p-4">
            <div className="text-center text-white">
              <p className="text-sm font-medium mb-2">⚠️ Video preview unavailable</p>
              <p className="text-xs text-gray-400">
                This device may not support this video format.<br />
                The compression result should still work fine.
              </p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {!isVideoLoaded && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-white/60">Loading video...</p>
            </div>
          </div>
        )}

        {/* Video element with mobile-friendly attributes */}
        <video
          ref={videoRef}
          src={videoUrl || undefined}
          className="w-full h-full object-contain"
          onClick={togglePlay}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onLoadedData={handleVideoLoad}
          onCanPlay={handleCanPlay}
          onError={handleVideoError}
          playsInline
          muted={false}
          preload="auto"
          controlsList="nodownload"
          style={{ backgroundColor: 'black' }}
        />
        
        {/* Video Controls Overlay */}
        {isVideoLoaded && !hasError && (
          <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={togglePlay}
                className="p-1.5 md:p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 md:w-5 md:h-5 text-white" />
                ) : (
                  <Play className="w-4 h-4 md:w-5 md:h-5 text-white" />
                )}
              </button>
              
              <span className="text-xs md:text-sm text-white/80 font-medium">
                {metadata?.duration ? formatDuration(metadata.duration) : '0:00'}
              </span>
              
              <div className="flex-1" />
              
              <button
                onClick={toggleFullscreen}
                className="p-1.5 md:p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-3 h-3 md:w-4 md:h-4 text-white" />
                ) : (
                  <Maximize2 className="w-3 h-3 md:w-4 md:h-4 text-white" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metadata - Mobile friendly */}
      {metadata && (
        <div className="grid grid-cols-2 gap-2 p-3 md:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-xs md:text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Name</p>
            <p className="font-medium text-gray-700 dark:text-gray-300 truncate">{metadata.name}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Size</p>
            <p className="font-medium text-gray-700 dark:text-gray-300">{formatFileSize(metadata.size)}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Resolution</p>
            <p className="font-medium text-gray-700 dark:text-gray-300">{metadata.width}×{metadata.height}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Duration</p>
            <p className="font-medium text-gray-700 dark:text-gray-300">{formatDuration(metadata.duration)}</p>
          </div>
        </div>
      )}
    </div>
  );
}