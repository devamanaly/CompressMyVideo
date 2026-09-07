/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/video-compressor.ts

// Import MediaBunny directly from node_modules
import * as MediaBunny from 'mediabunny';

// Custom Error Classes
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

// Compression Options Interface
export interface CompressionOptions {
  maxSizeMB: number;
  onProgress: (ratio: number) => void;
  signal?: AbortSignal;
  trimStart?: number;
  trimEnd?: number;
}

/**
 * Calculate target dimensions for video compression
 */
function computeTargetDimensions(originalWidth: number, originalHeight: number) {
  const MAX_PIXELS = 2097152; // 2K resolution limit

  let targetWidth = originalWidth;
  let targetHeight = originalHeight;

  const currentPixels = targetWidth * targetHeight;

  // Scale down if too many pixels
  if (currentPixels > MAX_PIXELS) {
    const scaleFactor = Math.sqrt(MAX_PIXELS / currentPixels);
    targetWidth = Math.round(targetWidth * scaleFactor);
    targetHeight = Math.round(targetHeight * scaleFactor);
  }

  // Ensure even numbers (required for video encoding)
  if (targetWidth % 2 !== 0) targetWidth--;
  if (targetHeight % 2 !== 0) targetHeight--;

  // Cap at 1920x1080
  if (targetWidth > 1920) {
    const scaleFactor = 1920 / targetWidth;
    targetWidth = 1920;
    targetHeight = Math.round(targetHeight * scaleFactor);
    if (targetHeight % 2 !== 0) targetHeight--;
  }

  if (targetHeight > 1080) {
    const scaleFactor = 1080 / targetHeight;
    targetHeight = 1080;
    targetWidth = Math.round(targetWidth * scaleFactor);
    if (targetWidth % 2 !== 0) targetWidth--;
  }

  // Ensure minimum dimensions
  targetWidth = Math.max(32, targetWidth);
  targetHeight = Math.max(32, targetHeight);

  return { targetWidth, targetHeight };
}

/**
 * Make a number even
 */
function makeEven(value: number): number {
  const rounded = Math.max(2, Math.round(value));
  return rounded % 2 === 0 ? rounded : rounded - 1;
}

/**
 * Compute fallback dimensions if primary encoding fails
 */
function computeFallbackDimensions(width: number, height: number) {
  const MAX_WIDTH = 854;
  const MAX_HEIGHT = 480;
  const scale = Math.min(1, MAX_WIDTH / width, MAX_HEIGHT / height);

  return {
    width: makeEven(width * scale),
    height: makeEven(height * scale),
  };
}

/**
 * Check if compression was cancelled
 */
export function throwIfCancelled(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new VideoCompressionCancelled();
  }
}

/**
 * Generate compressed file name
 */
function getCompressedFileName(originalName: string): string {
  const lastDot = originalName.lastIndexOf('.');

  if (lastDot === -1) {
    return originalName + '_compressed.mp4';
  }

  return originalName.substring(0, lastDot) + '_compressed.mp4';
}

/**
 * Main video compression function
 */
export const compressVideo = async (
  file: File,
  options: CompressionOptions
): Promise<File> => {
  // Input validation
  if (!file) {
    throw new VideoCompressionErrors('No video file was provided.');
  }

  if (!(file instanceof File)) {
    throw new VideoCompressionErrors(
      'The provided input is not a valid File.'
    );
  }

  if (!options || typeof options.maxSizeMB !== 'number') {
    throw new VideoCompressionErrors('Invalid compression options.');
  }

  if (options.maxSizeMB <= 0) {
    throw new VideoCompressionErrors('maxSizeMB must be greater than zero.');
  }

  throwIfCancelled(options.signal);

  // Validate MediaBunny exports
  const {
    Input,
    Output,
    Conversion,
    ConversionCanceledError,
    ALL_FORMATS,
    BlobSource,
    BufferTarget,
    Mp4OutputFormat,
    Quality,
  } = MediaBunny;

  if (
    !Input ||
    !Output ||
    !Conversion ||
    !ConversionCanceledError ||
    !ALL_FORMATS ||
    !BlobSource ||
    !BufferTarget ||
    !Mp4OutputFormat ||
    !Quality
  ) {
    throw new VideoCompressionErrors(
      'Invalid MediaBunny module. Required APIs are missing. ' +
        'Please ensure MediaBunny is properly installed.'
    );
  }

  let input: any = null;

  try {
    throwIfCancelled(options.signal);

    // Create input from file
    input = new Input({
      formats: ALL_FORMATS,
      source: new BlobSource(file),
    });

    console.log('[MediaBunny] Input created:', {
      name: file.name,
      type: file.type,
      sizeMB: (file.size / 1024 / 1024).toFixed(2),
    });

    // Check if file can be read
    const canRead = await input.canRead();

    console.log('[MediaBunny] Input canRead:', canRead);

    throwIfCancelled(options.signal);

    if (!canRead) {
      throw new VideoCompressionErrors(
        'Could not read the input video. The format may be unsupported or the file may be corrupt.'
      );
    }

    // Get video metadata
    const duration = await input.computeDuration();
    const videoTrack = await input.getPrimaryVideoTrack();

    if (!videoTrack) {
      throw new VideoCompressionErrors('No video track was found.');
    }

    const originalWidth = await videoTrack.getDisplayWidth();
    const originalHeight = await videoTrack.getDisplayHeight();

    // DEBUG: Input video information
    console.log('[MediaBunny] Input video metadata:', {
      name: file.name,
      type: file.type,
      sizeMB: (file.size / 1024 / 1024).toFixed(2),
      duration,
      originalWidth,
      originalHeight,
      codec: videoTrack.codec,
      trackType: videoTrack.type,
      id: videoTrack.id,
      codedWidth: videoTrack.codedWidth,
      codedHeight: videoTrack.codedHeight,
      displayWidth: videoTrack.displayWidth,
      displayHeight: videoTrack.displayHeight,
      rotation: videoTrack.rotation,
    });

    if (!duration || !Number.isFinite(duration) || duration <= 0) {
      throw new VideoCompressionErrors('Invalid video duration.');
    }

    if (!originalWidth || !originalHeight) {
      throw new VideoCompressionErrors('Invalid video dimensions.');
    }

    // Handle trimming
    const requestedTrimStart = options.trimStart ?? 0;
    const requestedTrimEnd = options.trimEnd ?? duration;

    const trimStart = Math.max(
      0,
      Math.min(requestedTrimStart, duration)
    );

    const trimEnd = Math.max(
      trimStart + 0.1,
      Math.min(requestedTrimEnd, duration)
    );

    const trimmedDuration = trimEnd - trimStart;
    const needsTrim = trimStart > 0 || trimEnd < duration;

    console.log('[MediaBunny] Trim configuration:', {
      requestedTrimStart,
      requestedTrimEnd,
      trimStart,
      trimEnd,
      trimmedDuration,
      needsTrim,
    });

    if (trimmedDuration <= 0) {
      throw new VideoCompressionErrors('Invalid trim duration.');
    }

    // Calculate bitrate based on target size
    const targetSizeBytes = options.maxSizeMB * 1024 * 1024;
    const usableSizeBytes = targetSizeBytes * 0.94; // 6% overhead for container
    const targetBitrate = Math.floor(
      (usableSizeBytes * 8) / trimmedDuration
    );

    // Audio bitrate (10% of total, capped)
    const MIN_AUDIO_BITRATE = 64000;
    const MAX_AUDIO_BITRATE = 128000;

    let audioBitrate = Math.floor(targetBitrate * 0.10);

    audioBitrate = Math.max(
      MIN_AUDIO_BITRATE,
      Math.min(MAX_AUDIO_BITRATE, audioBitrate)
    );

    // Video bitrate (remaining)
    const MIN_VIDEO_BITRATE = 150000;

    let videoBitrate = targetBitrate - audioBitrate;

    videoBitrate = Math.max(
      MIN_VIDEO_BITRATE,
      videoBitrate
    );

    // Compute target dimensions
    const { targetWidth, targetHeight } =
      computeTargetDimensions(
        originalWidth,
        originalHeight
      );

    // DEBUG: Compression configuration
    console.log('[MediaBunny] Compression configuration:', {
      original: {
        width: originalWidth,
        height: originalHeight,
      },

      target: {
        width: targetWidth,
        height: targetHeight,
      },

      duration,
      trimmedDuration,

      targetSizeMB: options.maxSizeMB,

      targetBitrate,
      audioBitrate,
      videoBitrate,

      videoCodec: 'avc',
      hardwareAcceleration: 'prefer-software',
    });

    // Helper to create conversion
    const createConversion = async (
      width: number,
      height: number
    ) => {
      throwIfCancelled(options.signal);

      console.log('[MediaBunny] Creating conversion:', {
        width,
        height,

        video: {
          codec: 'avc',
          hardwareAcceleration: 'prefer-software',
          bitrate: videoBitrate,
          bitrateMode: 'constant',
          fit: 'contain',
        },

        audio: {
          bitrate: audioBitrate,
        },

        trim: needsTrim
          ? {
              start: trimStart,
              end: trimEnd,
            }
          : null,
      });

      const output = new Output({
        format: new Mp4OutputFormat(),
        target: new BufferTarget(),
      });

      const conversionOptions: any = {
        input,
        output,

        video: {
          width,
          height,
          fit: 'contain',
          // codec: 'avc',

          // DEBUG TARGET
          hardwareAcceleration: 'no-preference',

          quality: new Quality({
            bitrate: videoBitrate,
            bitrateMode: 'constant',
          }),
        },

        audio: {
          quality: new Quality({
            bitrate: audioBitrate,
          }),
        },
      };

      if (needsTrim) {
        conversionOptions.trim = {
          start: trimStart,
          end: trimEnd,
        };
      }

      // DEBUG: Exact options being sent to MediaBunny
      console.log(
        '[MediaBunny] Conversion options:',
        conversionOptions
      );

      const conversion = await Conversion.init(
        conversionOptions
      );

      // DEBUG: Result of conversion initialization
      console.log(
        '[MediaBunny] Conversion initialized:',
        {
          isValid: conversion.isValid,

          discardedTracks:
            conversion.discardedTracks?.map(
              (item: any) => ({
                type: item.track?.type,
                codec: item.track?.codec,
                reason: item.reason,
              })
            ),
        }
      );

      return { conversion, output };
    };

    // Create conversion with target dimensions
    console.log(
      '[MediaBunny] Starting primary conversion:',
      {
        width: targetWidth,
        height: targetHeight,
      }
    );

    let { conversion, output } =
      await createConversion(
        targetWidth,
        targetHeight
      );

    throwIfCancelled(options.signal);

    // If video track was discarded, try fallback dimensions
    if (!conversion.isValid) {
      const videoDiscarded =
        Array.isArray(conversion.discardedTracks) &&
        conversion.discardedTracks.some(
          (discarded: any) =>
            discarded.track &&
            discarded.track.type === 'video'
        );

      console.warn(
        '[MediaBunny] Primary conversion is invalid:',
        {
          isValid: conversion.isValid,

          videoDiscarded,

          discardedTracks:
            conversion.discardedTracks?.map(
              (item: any) => ({
                type: item.track?.type,
                codec: item.track?.codec,
                reason: item.reason,
              })
            ),
        }
      );

      if (videoDiscarded) {
        const fallback =
          computeFallbackDimensions(
            targetWidth,
            targetHeight
          );

        console.warn(
          '[MediaBunny] Video track was discarded. Trying fallback dimensions:',
          {
            originalTarget: {
              width: targetWidth,
              height: targetHeight,
            },

            fallback,
          }
        );

        ({
          conversion,
          output,
        } = await createConversion(
          fallback.width,
          fallback.height
        ));

        console.log(
          '[MediaBunny] Fallback conversion result:',
          {
            isValid: conversion.isValid,

            discardedTracks:
              conversion.discardedTracks?.map(
                (item: any) => ({
                  type: item.track?.type,
                  codec: item.track?.codec,
                  reason: item.reason,
                })
              ),
          }
        );
      }
    }

    // If still invalid, throw error
    if (!conversion.isValid) {
      const discarded =
        Array.isArray(
          conversion.discardedTracks
        )
          ? conversion.discardedTracks.map(
              (item: any) => ({
                type: item.track?.type,
                codec: item.track?.codec,
                reason: item.reason,
              })
            )
          : [];

      console.error(
        '[MediaBunny] FINAL CONVERSION FAILURE:',
        {
          isValid: conversion.isValid,
          discardedTracks: discarded,

          inputVideo: {
            codec: videoTrack.codec,
            width: originalWidth,
            height: originalHeight,
          },

          requestedOutput: {
            codec: 'avc',
            hardwareAcceleration: 'prefer-software',
            width: targetWidth,
            height: targetHeight,
            videoBitrate,
            audioBitrate,
          },
        }
      );

      throw new VideoCompressionErrors(
        'Could not find a supported video/audio encoder configuration. ' +
          JSON.stringify(discarded)
      );
    }

    console.log(
      '[MediaBunny] Conversion is valid. Starting execution...'
    );

    // Set up progress tracking
    conversion.onProgress = (
      progress: number
    ) => {
      const safeProgress = Math.max(
        0,
        Math.min(0.99, progress)
      );

      options.onProgress(safeProgress);
    };

    // Set up cancellation
    let abortHandler:
      (() => void) | null = null;

    if (options.signal) {
      abortHandler = () => {
        try {
          console.warn(
            '[MediaBunny] Compression cancellation requested.'
          );

          const result = conversion.cancel();

          if (
            result &&
            typeof result.catch === 'function'
          ) {
            result.catch(() => {});
          }
        } catch {
          // Ignore cancellation errors
        }
      };

      options.signal.addEventListener(
        'abort',
        abortHandler
      );
    }

    // Execute conversion
    try {
      throwIfCancelled(options.signal);

      console.log(
        '[MediaBunny] conversion.execute() START'
      );

      await conversion.execute();

      console.log(
        '[MediaBunny] conversion.execute() COMPLETE'
      );
    } catch (error: any) {
      console.error(
        '[MediaBunny] conversion.execute() ERROR:',
        error
      );

      if (
        error instanceof ConversionCanceledError
      ) {
        throw new VideoCompressionCancelled();
      }

      if (options.signal?.aborted) {
        throw new VideoCompressionCancelled();
      }

      throw new VideoCompressionErrors(
        'Conversion failed: ' +
          (error?.message || 'Unknown error')
      );
    } finally {
      if (
        abortHandler &&
        options.signal
      ) {
        options.signal.removeEventListener(
          'abort',
          abortHandler
        );
      }
    }

    // Get compressed data
    console.log(
      '[MediaBunny] Getting compressed output...'
    );

    const buffer = output.target.buffer;

    if (!buffer) {
      console.error(
        '[MediaBunny] No output buffer produced.'
      );

      throw new VideoCompressionErrors(
        'MediaBunny produced no output buffer.'
      );
    }

    console.log(
      '[MediaBunny] Output buffer created:',
      {
        sizeMB: (
          buffer.byteLength /
          1024 /
          1024
        ).toFixed(2),
        bytes: buffer.byteLength,
      }
    );

    // Create compressed file
    const compressedBlob = new Blob(
      [buffer],
      {
        type: 'video/mp4',
      }
    );

    const compressedFile = new File(
      [compressedBlob],
      getCompressedFileName(
        file.name
      ),
      {
        type: 'video/mp4',
        lastModified: Date.now(),
      }
    );

    console.log(
      '[MediaBunny] Compression COMPLETE:',
      {
        input: {
          name: file.name,
          sizeMB: (
            file.size /
            1024 /
            1024
          ).toFixed(2),
        },

        output: {
          name: compressedFile.name,
          sizeMB: (
            compressedFile.size /
            1024 /
            1024
          ).toFixed(2),
        },

        compressionRatio:
          (
            compressedFile.size /
            file.size
          ).toFixed(3),
      }
    );

    options.onProgress(1);

    return compressedFile;

  } finally {
    // Clean up
    if (input) {
      try {
        console.log(
          '[MediaBunny] Disposing input...'
        );

        input.dispose();

        console.log(
          '[MediaBunny] Input disposed.'
        );
      } catch (error) {
        console.warn(
          '[MediaBunny] Error disposing input:',
          error
        );

        // Ignore disposal errors
      }
    }
  }
};

// Default export for convenience
export default {
  compressVideo,
  VideoCompressionErrors,
  VideoCompressionCancelled,
  throwIfCancelled,
};