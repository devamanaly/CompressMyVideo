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

  if (currentPixels > MAX_PIXELS) {
    const scaleFactor = Math.sqrt(MAX_PIXELS / currentPixels);
    targetWidth = Math.round(targetWidth * scaleFactor);
    targetHeight = Math.round(targetHeight * scaleFactor);
  }

  if (targetWidth % 2 !== 0) targetWidth--;
  if (targetHeight % 2 !== 0) targetHeight--;

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
 * Generate compressed file name for a given container extension
 */
function getCompressedFileName(originalName: string, ext: string): string {
  const lastDot = originalName.lastIndexOf('.');

  if (lastDot === -1) {
    return originalName + '_compressed' + ext;
  }

  return originalName.substring(0, lastDot) + '_compressed' + ext;
}

/**
 * Does this conversion's discardedTracks list include the video track?
 * NOTE: We check this independently of `conversion.isValid`, because
 * MediaBunny only requires ONE track (e.g. audio) to be encodable for
 * `isValid` to be true. A video track can be silently discarded
 * (reason: "no_encodable_target_codec") while isValid stays true,
 * producing an audio-only file that looks like a successful conversion.
 */
function isVideoTrackDiscarded(conversion: any): boolean {
  return (
    Array.isArray(conversion.discardedTracks) &&
    conversion.discardedTracks.some(
      (discarded: any) => discarded.track && discarded.track.type === 'video'
    )
  );
}

// Candidate output containers, in preference order.
// MP4/AVC is the most broadly compatible target; WebM/VP9-VP8 is the
// fallback because libvpx's software encoder ships inside Chromium itself
// (unlike H.264, which often relies on the optional OpenH264 plugin that
// many budget-device WebViews/OEM browsers do not bundle).
function getContainerCandidates(MediaBunnyModule: any) {
  const { Mp4OutputFormat, WebMOutputFormat } = MediaBunnyModule;

  const candidates: Array<{
    OutputFormatCtor: any;
    codecs: string[];
    ext: string;
    mime: string;
  }> = [
    {
      OutputFormatCtor: Mp4OutputFormat,
      codecs: ['avc', 'hevc'],
      ext: '.mp4',
      mime: 'video/mp4',
    },
  ];

  // WebMOutputFormat may not exist in older MediaBunny versions — guard it.
  if (WebMOutputFormat) {
    candidates.push({
      OutputFormatCtor: WebMOutputFormat,
      codecs: ['vp9', 'vp8'],
      ext: '.webm',
      mime: 'video/webm',
    });
  }

  return candidates;
}

/**
 * Probe the device/browser to find a container + codec combo that can
 * actually be encoded, instead of assuming AVC works everywhere.
 */
async function pickEncodableTarget(
  MediaBunnyModule: any,
  width: number,
  height: number,
  bitrate: number
): Promise<{
  OutputFormatCtor: any;
  codec: string;
  ext: string;
  mime: string;
} | null> {
  const { getFirstEncodableVideoCodec } = MediaBunnyModule;

  if (!getFirstEncodableVideoCodec) {
    // Older MediaBunny without capability-detection helpers: fall back to
    // assuming avc/mp4, matching previous behavior.
    return {
      OutputFormatCtor: MediaBunnyModule.Mp4OutputFormat,
      codec: 'avc',
      ext: '.mp4',
      mime: 'video/mp4',
    };
  }

  for (const candidate of getContainerCandidates(MediaBunnyModule)) {
    const codec = await getFirstEncodableVideoCodec(candidate.codecs, {
      width,
      height,
      bitrate,
    });

    if (codec) {
      console.log('[MediaBunny] Encodable target found:', {
        container: candidate.mime,
        codec,
        width,
        height,
      });

      return {
        OutputFormatCtor: candidate.OutputFormatCtor,
        codec,
        ext: candidate.ext,
        mime: candidate.mime,
      };
    }
  }

  return null;
}

/**
 * Main video compression function
 */
export const compressVideo = async (
  file: File,
  options: CompressionOptions
): Promise<File> => {
  if (!file) {
    throw new VideoCompressionErrors('No video file was provided.');
  }

  if (!(file instanceof File)) {
    throw new VideoCompressionErrors('The provided input is not a valid File.');
  }

  if (!options || typeof options.maxSizeMB !== 'number') {
    throw new VideoCompressionErrors('Invalid compression options.');
  }

  if (options.maxSizeMB <= 0) {
    throw new VideoCompressionErrors('maxSizeMB must be greater than zero.');
  }

  throwIfCancelled(options.signal);

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
  } = MediaBunny as any;

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

    input = new Input({
      formats: ALL_FORMATS,
      source: new BlobSource(file),
    });

    console.log('[MediaBunny] Input created:', {
      name: file.name,
      type: file.type,
      sizeMB: (file.size / 1024 / 1024).toFixed(2),
    });

    const canRead = await input.canRead();
    console.log('[MediaBunny] Input canRead:', canRead);

    throwIfCancelled(options.signal);

    if (!canRead) {
      throw new VideoCompressionErrors(
        'Could not read the input video. The format may be unsupported or the file may be corrupt.'
      );
    }

    const duration = await input.computeDuration();
    const videoTrack = await input.getPrimaryVideoTrack();

    if (!videoTrack) {
      throw new VideoCompressionErrors('No video track was found.');
    }

    const originalWidth = await videoTrack.getDisplayWidth();
    const originalHeight = await videoTrack.getDisplayHeight();

    console.log('[MediaBunny] Input video metadata:', {
      name: file.name,
      type: file.type,
      sizeMB: (file.size / 1024 / 1024).toFixed(2),
      duration,
      originalWidth,
      originalHeight,
      codec: videoTrack.codec,
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

    const trimStart = Math.max(0, Math.min(requestedTrimStart, duration));
    const trimEnd = Math.max(trimStart + 0.1, Math.min(requestedTrimEnd, duration));
    const trimmedDuration = trimEnd - trimStart;
    const needsTrim = trimStart > 0 || trimEnd < duration;

    console.log('[MediaBunny] Trim configuration:', {
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
    const usableSizeBytes = targetSizeBytes * 0.94;
    const targetBitrate = Math.floor((usableSizeBytes * 8) / trimmedDuration);

    const MIN_AUDIO_BITRATE = 64000;
    const MAX_AUDIO_BITRATE = 128000;

    let audioBitrate = Math.floor(targetBitrate * 0.1);
    audioBitrate = Math.max(MIN_AUDIO_BITRATE, Math.min(MAX_AUDIO_BITRATE, audioBitrate));

    const MIN_VIDEO_BITRATE = 150000;
    let videoBitrate = targetBitrate - audioBitrate;
    videoBitrate = Math.max(MIN_VIDEO_BITRATE, videoBitrate);

    const { targetWidth, targetHeight } = computeTargetDimensions(originalWidth, originalHeight);

    console.log('[MediaBunny] Compression configuration:', {
      original: { width: originalWidth, height: originalHeight },
      target: { width: targetWidth, height: targetHeight },
      duration,
      trimmedDuration,
      targetSizeMB: options.maxSizeMB,
      targetBitrate,
      audioBitrate,
      videoBitrate,
    });

    // --- Probe the device for a container/codec it can actually encode ---
    // This replaces the previous hardcoded `codec: 'avc'`. On devices that
    // can't encode AVC in hardware OR software (e.g. WebViews shipped
    // without OpenH264), this transparently falls back to VP9/VP8 in WebM,
    // whose software encoder is built into Chromium itself.
    let encodableTarget = await pickEncodableTarget(
      MediaBunny,
      targetWidth,
      targetHeight,
      videoBitrate
    );

    let workingWidth = targetWidth;
    let workingHeight = targetHeight;

    if (!encodableTarget) {
      // Try smaller fallback dimensions before giving up entirely — some
      // devices can't encode at large resolutions but can at smaller ones.
      const fallback = computeFallbackDimensions(targetWidth, targetHeight);
      console.warn('[MediaBunny] No encodable codec at target size, retrying smaller:', fallback);

      encodableTarget = await pickEncodableTarget(
        MediaBunny,
        fallback.width,
        fallback.height,
        Math.max(MIN_VIDEO_BITRATE, videoBitrate)
      );

      workingWidth = fallback.width;
      workingHeight = fallback.height;
    }

    if (!encodableTarget) {
      throw new VideoCompressionErrors(
        'This device/browser cannot encode video (no working video encoder was found for ' +
          'MP4/AVC, MP4/HEVC, WebM/VP9, or WebM/VP8). Try a different browser (e.g. Chrome) ' +
          'or a different device.'
      );
    }

    const { OutputFormatCtor, codec, ext, mime } = encodableTarget;

    // Helper to create conversion for a given codec/container/size
    const createConversion = async (width: number, height: number) => {
      throwIfCancelled(options.signal);

      console.log('[MediaBunny] Creating conversion:', {
        width,
        height,
        codec,
        container: mime,
        videoBitrate,
        audioBitrate,
        trim: needsTrim ? { start: trimStart, end: trimEnd } : null,
      });

      const output = new Output({
        format: new OutputFormatCtor(),
        target: new BufferTarget(),
      });

      const conversionOptions: any = {
        input,
        output,
        video: {
          width,
          height,
          fit: 'contain',
          codec,
          // Let the browser pick hardware vs software itself now that
          // we've already confirmed this codec is encodable at all —
          // forcing a preference here was masking the real problem.
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
        conversionOptions.trim = { start: trimStart, end: trimEnd };
      }

      const conversion = await Conversion.init(conversionOptions);

      console.log('[MediaBunny] Conversion initialized:', {
        isValid: conversion.isValid,
        discardedTracks: conversion.discardedTracks?.map((item: any) => ({
          type: item.track?.type,
          codec: item.track?.codec,
          reason: item.reason,
        })),
      });

      return { conversion, output };
    };

    console.log('[MediaBunny] Starting primary conversion:', { width: workingWidth, height: workingHeight, codec });

    let { conversion, output } = await createConversion(workingWidth, workingHeight);

    throwIfCancelled(options.signal);

    // Fixed check: verify the VIDEO track specifically wasn't discarded,
    // regardless of `isValid` (isValid can be true even with video
    // discarded, as long as audio alone is encodable).
    if (isVideoTrackDiscarded(conversion)) {
      const fallback = computeFallbackDimensions(workingWidth, workingHeight);

      console.warn('[MediaBunny] Video track was discarded even though codec probe passed. Retrying at fallback size:', fallback);

      ({ conversion, output } = await createConversion(fallback.width, fallback.height));
      workingWidth = fallback.width;
      workingHeight = fallback.height;
    }

    if (isVideoTrackDiscarded(conversion) || !conversion.isValid) {
      const discarded = Array.isArray(conversion.discardedTracks)
        ? conversion.discardedTracks.map((item: any) => ({
            type: item.track?.type,
            codec: item.track?.codec,
            reason: item.reason,
          }))
        : [];

      console.error('[MediaBunny] FINAL CONVERSION FAILURE:', {
        isValid: conversion.isValid,
        discardedTracks: discarded,
        requestedOutput: { codec, container: mime, width: workingWidth, height: workingHeight },
      });

      throw new VideoCompressionErrors(
        'Could not find a supported video/audio encoder configuration. ' + JSON.stringify(discarded)
      );
    }

    console.log('[MediaBunny] Conversion is valid (video track confirmed present). Starting execution...');

    conversion.onProgress = (progress: number) => {
      options.onProgress(Math.max(0, Math.min(0.99, progress)));
    };

    let abortHandler: (() => void) | null = null;

    if (options.signal) {
      abortHandler = () => {
        try {
          const result = conversion.cancel();
          if (result && typeof result.catch === 'function') {
            result.catch(() => {});
          }
        } catch {
          // Ignore cancellation errors
        }
      };

      options.signal.addEventListener('abort', abortHandler);
    }

    try {
      throwIfCancelled(options.signal);
      await conversion.execute();
    } catch (error: any) {
      if (error instanceof ConversionCanceledError) {
        throw new VideoCompressionCancelled();
      }
      if (options.signal?.aborted) {
        throw new VideoCompressionCancelled();
      }
      throw new VideoCompressionErrors('Conversion failed: ' + (error?.message || 'Unknown error'));
    } finally {
      if (abortHandler && options.signal) {
        options.signal.removeEventListener('abort', abortHandler);
      }
    }

    const buffer = output.target.buffer;

    if (!buffer) {
      throw new VideoCompressionErrors('MediaBunny produced no output buffer.');
    }

    console.log('[MediaBunny] Output buffer created:', {
      sizeMB: (buffer.byteLength / 1024 / 1024).toFixed(2),
    });

    const compressedBlob = new Blob([buffer], { type: mime });
    const compressedFile = new File([compressedBlob], getCompressedFileName(file.name, ext), {
      type: mime,
      lastModified: Date.now(),
    });

    console.log('[MediaBunny] Compression COMPLETE:', {
      input: { name: file.name, sizeMB: (file.size / 1024 / 1024).toFixed(2) },
      output: {
        name: compressedFile.name,
        sizeMB: (compressedFile.size / 1024 / 1024).toFixed(2),
        codec,
        container: mime,
      },
      compressionRatio: (compressedFile.size / file.size).toFixed(3),
    });

    options.onProgress(1);

    return compressedFile;
  } finally {
    if (input) {
      try {
        input.dispose();
      } catch (error) {
        console.warn('[MediaBunny] Error disposing input:', error);
      }
    }
  }
};

export default {
  compressVideo,
  VideoCompressionErrors,
  VideoCompressionCancelled,
  throwIfCancelled,
};