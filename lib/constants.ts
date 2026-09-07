export const MAX_UPLOAD_SIZE = 1024 * 1024 * 1024; // 1GB
export const DEFAULT_MAX_SIZE = 50; // 50MB
export const MIN_MAX_SIZE = 1;
export const MAX_MAX_SIZE = 500;
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
export const COMPRESSION_QUALITY_PRESETS = [
  { label: 'Low (10MB)', value: 10 },
  { label: 'Medium (50MB)', value: 50 },
  { label: 'High (100MB)', value: 100 },
  { label: 'Very High (200MB)', value: 200 },
] as const;