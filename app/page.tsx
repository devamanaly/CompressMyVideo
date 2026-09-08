/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useRef } from "react";
import { useVideoCompression } from "@/hooks/useVideoCompression";
import { VideoUploader } from "@/components/VideoUploader";
import { CompressionControls } from "@/components/CompressionControls";
import { ProgressBar } from "@/components/ProgressBar";
import { VideoPreview } from "@/components/VideoPreview";
import { DownloadButton } from "@/components/DownloadButton";
import { DEFAULT_MAX_SIZE, getMaxFileSize } from "@/lib/constants";
import { Sparkles } from "lucide-react";

export default function Home() {
  const { state, uploadFile, startCompression, cancelCompression, reset } =
    useVideoCompression();
  const [maxSizeMB, setMaxSizeMB] = useState(DEFAULT_MAX_SIZE);
  const [maxPossibleSize, setMaxPossibleSize] = useState(500);
  const [trimStart, setTrimStart] = useState<number | undefined>(undefined);
  const [trimEnd, setTrimEnd] = useState<number | undefined>(undefined);

  const trimValuesRef = useRef<{ start: number; end: number } | null>(null);

  useEffect(() => {
    if (state.metadata) {
      const fileSizeMB = state.metadata.size / (1024 * 1024);
      const maxSize = Math.round(getMaxFileSize(fileSizeMB)); // rounded, no more ugly decimals
      setMaxPossibleSize(maxSize);

      const defaultTarget = Math.min(Math.round(fileSizeMB * 0.3), 50);
      setMaxSizeMB(Math.max(1, Math.min(defaultTarget, maxSize)));
    }
  }, [state.metadata]);

  const handleFileSelect = async (file: File) => {
    await uploadFile(file);
  };

  const handleRemoveFile = () => {
    reset();
  };

  const handleCompress = () => {
    const trimStartVal = trimValuesRef.current?.start;
    const trimEndVal = trimValuesRef.current?.end;

    const start =
      trimStartVal !== undefined && trimStartVal > 0 ? trimStartVal : undefined;
    const end =
      trimEndVal !== undefined && trimEndVal < (state.metadata?.duration || 0)
        ? trimEndVal
        : undefined;

    startCompression(maxSizeMB, start, end);
  };

  const handleCancel = () => {
    cancelCompression();
  };

  const handleTrimChange = (start: number, end: number) => {
    trimValuesRef.current = { start, end };
    setTrimStart(start);
    setTrimEnd(end);
  };

  const hasFile = !!state.originalFile;
  const showDownload = state.status === "completed" && !!state.compressedFile;

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Header — always first, on every breakpoint */}
        <div className="text-center mb-8 md:mb-12">
          {/* Mobile: Show app name */}
            {/* <span className="text-lg font-bold gradient-text">
              CompressMyVideo
            </span> */}
          {/* </div> */}
          <div className=" flex items-center justify-center flex-wrap gap-2 mb-4">

          <Sparkles className="md:w-9 md:h-9 w-7 h-7 text-purple-500" />

          <h1 className="text-3xl md:text-5xl font-bold gradient-text mb-2 md:mb-3">
            Compress My Video
          </h1>
</div>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-4">
            Compress your videos with professional quality. Reduce file size
            while maintaining optimal video quality.
          </p>
        </div>

        {/*
          Single grid handles both layouts:
          - Mobile: 1 column, items stack top-to-bottom by `order-*`
              1) Uploader (no file yet) OR Preview (file present)
              2) Settings (+ progress bar inside it)
              3) Download
          - Desktop (lg+): 2 columns, explicit col-start/row-start placement
              Row 1: Settings/Uploader (col 1) | Preview (col 2) — stretched to equal height
              Row 2: Download — spans both columns, full container width
        */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:items-stretch">
          {/* Upload card — shown only before a file is selected */}
          {!hasFile && (
            <div className="order-1 lg:order-none lg:col-start-1 lg:row-start-1 glass-morphism p-4 md:p-6 rounded-2xl shadow-xl">
              <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 md:mb-4">
                Upload Video
              </h2>
              <VideoUploader
                onFileSelect={handleFileSelect}
                onRemove={handleRemoveFile}
                file={state.originalFile}
                metadata={state.metadata}
                isProcessing={state.status === "processing"}
                error={state.error}
              />
            </div>
          )}

          {/* Settings card — shown once a file is selected. Same desktop slot as Upload. */}
          {hasFile && (
            <div className="order-2 lg:order-none lg:col-start-1 lg:row-start-1 h-full glass-morphism p-4 md:p-6 rounded-2xl shadow-xl">
              <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 md:mb-4">
                Compression Settings
              </h2>
              <CompressionControls
                maxSizeMB={maxSizeMB}
                maxPossibleSize={maxPossibleSize}
                onMaxSizeChange={setMaxSizeMB}
                onCompress={handleCompress}
                onCancel={handleCancel}
                isProcessing={state.status === "processing"}
                hasFile={hasFile}
                duration={state.metadata?.duration}
                fileSizeMB={
                  state.metadata ? state.metadata.size / (1024 * 1024) : 0
                }
                onTrimChange={handleTrimChange}
              />

              {/* Progress lives inside the same card so it doesn't float separately */}
              {(state.status === "processing" ||
                state.status === "completed" ||
                state.status === "error") && (
                <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-800">
                  <ProgressBar
                    value={state.progress}
                    status={state.status}
                    error={state.error}
                  />
                </div>
              )}
            </div>
          )}

          {/* Preview card — on mobile, only shows once a file exists (swaps in place of Uploader).
              On desktop, always visible in the right column. */}
          <div
            className={`order-1 lg:order-none lg:col-start-2 lg:row-start-1 h-full glass-morphism p-4 md:p-6 rounded-2xl shadow-xl ${
              hasFile ? "block" : "hidden lg:block"
            }`}
          >
            <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 md:mb-4">
              Video Preview
            </h2>
            <VideoPreview
              file={state.originalFile}
              metadata={state.metadata}
              onRemove={handleRemoveFile}
              isProcessing={state.status === "processing"}
            />
          </div>

          {/* Download card — full width row below Settings/Preview on desktop */}
          {showDownload && (
            <div className="order-3 lg:order-none lg:col-start-1 lg:col-span-2 lg:row-start-2 glass-morphism p-4 md:p-6 rounded-2xl shadow-xl">
              <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 md:mb-4">
                Download
              </h2>
              <DownloadButton
                file={state.compressedFile}
                originalName={state.originalFile?.name}
                originalSize={state.originalFile?.size}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 md:mt-12 text-center text-xs md:text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800 pt-6 md:pt-8">
  <p>
    All processing is done locally in your browser. Your videos never
    leave your device.
  </p>

  <p className="mt-1">Secure • Private • Fast</p>

  <p className="mt-2 text-gray-400 dark:text-gray-500">
    Performance note: Compression may take longer on mobile devices with
    slower processors. Please keep this page open while your video is
    being processed.
  </p>
</div>
      </div>
    </main>
  );
}
