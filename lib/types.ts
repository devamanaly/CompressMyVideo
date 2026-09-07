export interface CompressionOptions {
    maxSizeMB: number;
    onProgress: (ratio: number) => void;
    signal?: AbortSignal;
    trimStart?: number;
    trimEnd?: number;
  }
  
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
  }
  
  export class VideoCompressionErrors extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'VideoCompressionErrors';
    }
  }
  
  export class VideoCompressionCancelled extends Error {
    constructor(message: string = 'Video compression was cancelled') {
      super(message);
      this.name = 'VideoCompressionCancelled';
    }
  }