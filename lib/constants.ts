// lib/constants.ts

export const MAX_UPLOAD_SIZE = 1024 * 1024 * 1024; // 1GB
export const DEFAULT_MAX_SIZE = 50; // 50MB
export const MIN_MAX_SIZE = 1;
export const MAX_MAX_SIZE = 500;
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

export const getMaxFileSize = (fileSizeMB: number): number => {
  return Math.min(fileSizeMB, 500);
};