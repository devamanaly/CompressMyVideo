/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useRef, useCallback } from 'react';
// FIX: Changed from 'vedio-compressor' to 'video-compressor'
import { compressVideo, VideoCompressionCancelled } from '@/lib/vedio-compressor';
import { CompressionOptions } from '@/lib/vedio-compressor';

export interface VideoMetadata {
  name: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  type: string;
}

export interface CompressionState {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  originalFile: File | null;
  compressedFile: File | null;
  metadata: VideoMetadata | null;
  error: string | null;
  startTime?: number;
}

export function useVideoCompression() {
  const [state, setState] = useState<CompressionState>({
    status: 'idle',
    progress: 0,
    originalFile: null,
    compressedFile: null,
    metadata: null,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const extractVideoMetadata = async (file: File): Promise<VideoMetadata> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        resolve({
          name: file.name,
          size: file.size,
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          type: file.type,
        });
        URL.revokeObjectURL(video.src);
      };
      
      video.onerror = () => {
        reject(new Error('Failed to load video metadata'));
        URL.revokeObjectURL(video.src);
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  const verifyCompressedVideo = useCallback(async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      
      video.onloadedmetadata = () => {
        // Check if video has valid dimensions
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          URL.revokeObjectURL(url);
          resolve(false);
          return;
        }
        
        // Check if video can play
        const canPlay = video.canPlayType('video/mp4');
        if (canPlay === '') {
          URL.revokeObjectURL(url);
          resolve(false);
          return;
        }
        
        URL.revokeObjectURL(url);
        resolve(true);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(false);
      };
      
      video.src = url;
      video.load();
      
      // Timeout after 5 seconds
      setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve(false);
      }, 5000);
    });
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    try {
      setState({
        status: 'uploading',
        progress: 0,
        originalFile: file,
        compressedFile: null,
        metadata: null,
        error: null,
      });

      const metadata = await extractVideoMetadata(file);
      setState((prev) => ({
        ...prev,
        status: 'idle',
        metadata,
      }));

      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to process video',
      }));
      return false;
    }
  }, []);

  const startCompression = useCallback(async (maxSizeMB: number, trimStart?: number, trimEnd?: number) => {
    if (!state.originalFile) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: 'No file selected',
      }));
      return false;
    }

    try {
      // Cancel any existing compression
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setState((prev) => ({
        ...prev,
        status: 'processing',
        progress: 0,
        error: null,
        startTime: Date.now(),
      }));

      const options: CompressionOptions = {
        maxSizeMB,
        onProgress: (progress: number) => {
          setState((prev) => ({
            ...prev,
            progress: Math.round(progress * 100),
          }));
        },
        signal: controller.signal,
        trimStart,
        trimEnd,
      };

      const compressedFile = await compressVideo(state.originalFile, options);

      // Verify the compressed video works
      const isValid = await verifyCompressedVideo(compressedFile);
      
      if (!isValid) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: 'Compressed video may not be compatible with this device. Try using a smaller target size or "Fast" compression mode.',
          progress: 0,
        }));
        return false;
      }

      setState((prev) => ({
        ...prev,
        status: 'completed',
        compressedFile,
        progress: 100,
      }));

      return true;
    } catch (error: any) {
      if (error instanceof VideoCompressionCancelled || error.name === 'VideoCompressionCancelled') {
        setState((prev) => ({
          ...prev,
          status: 'idle',
          progress: 0,
          error: null,
        }));
        return false;
      }

      setState((prev) => ({
        ...prev,
        status: 'error',
        error: error.message || 'Compression failed',
        progress: 0,
      }));
      return false;
    }
  }, [state.originalFile, verifyCompressedVideo]);

  const cancelCompression = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      status: 'idle',
      progress: 0,
      error: null,
    }));
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState({
      status: 'idle',
      progress: 0,
      originalFile: null,
      compressedFile: null,
      metadata: null,
      error: null,
    });
  }, []);

  return {
    state,
    uploadFile,
    startCompression,
    cancelCompression,
    reset,
  };
}