/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useRef, useCallback } from 'react';
import { CompressionState, VideoMetadata, CompressionOptions } from '@/lib/types';
import { compressVideo } from '@/lib/vedio-compressor';
import { DEFAULT_MAX_SIZE } from '@/lib/constants';

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

  const startCompression = useCallback(async (maxSizeMB: number = DEFAULT_MAX_SIZE, trimStart?: number, trimEnd?: number) => {
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

      setState((prev) => ({
        ...prev,
        status: 'completed',
        compressedFile,
        progress: 100,
      }));

      return true;
    } catch (error: any) {
      if (error.name === 'VideoCompressionCancelled' || error.message?.includes('cancelled')) {
        setState((prev) => ({
          ...prev,
          status: 'idle',
          progress: 0,
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
  }, [state.originalFile]);

  const cancelCompression = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
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