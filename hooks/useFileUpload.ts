'use client';

import { useState, useCallback, DragEvent } from 'react';
import { ALLOWED_VIDEO_TYPES, MAX_UPLOAD_SIZE } from '@/lib/constants';

export function useFileUpload() {
  const [isDragging, setIsDragging] = useState(false);

  const validateFile = useCallback((file: File): string | null => {
    if (!file) return 'No file selected';
    
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload a video file (MP4, MOV, AVI, WEBM).';
    }
    
    if (file.size > MAX_UPLOAD_SIZE) {
      return `File too large. Maximum size is ${MAX_UPLOAD_SIZE / (1024 * 1024 * 1024)}GB.`;
    }
    
    return null;
  }, []);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const error = validateFile(file);
      if (error) {
        return { file: null, error };
      }
      return { file, error: null };
    }
    return { file: null, error: 'No files dropped' };
  }, [validateFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const error = validateFile(file);
      if (error) {
        return { file: null, error };
      }
      return { file, error: null };
    }
    return { file: null, error: 'No file selected' };
  }, [validateFile]);

  return {
    isDragging,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileSelect,
    validateFile,
  };
}