'use client';

import { useState } from 'react';
import { useVideoCompression } from '@/hooks/useVideoCompression';
import { VideoUploader } from '@/components/VideoUploader';
import { CompressionControls } from '@/components/CompressionControls';
import { ProgressBar } from '@/components/ProgressBar';
import { VideoPreview } from '@/components/VideoPreview';
import { DownloadButton } from '@/components/DownloadButton';
import { DEFAULT_MAX_SIZE } from '@/lib/constants';

export default function Home() {
  const { state, uploadFile, startCompression, cancelCompression, reset } = useVideoCompression();
  const [maxSizeMB, setMaxSizeMB] = useState(DEFAULT_MAX_SIZE);

  const handleFileSelect = async (file: File) => {
    await uploadFile(file);
  };

  const handleRemoveFile = () => {
    reset();
  };

  const handleCompress = () => {
    startCompression(maxSizeMB);
  };

  const handleCancel = () => {
    cancelCompression();
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container max-w-5xl mx-auto px-4 py-12 md:py-20">
        {/* Header */}
        <div className="text-center mb-12">
          {/* <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-4"> */}
            {/* <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" /> */}
            {/* <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Powered by MediaBunny</span> */}
          {/* </div> */}
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-3">
          CompressMyVideo
            </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Compress your videos with professional quality. Reduce file size while maintaining optimal video quality.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Upload & Controls */}
          <div className="space-y-6">
            <div className="glass-morphism p-6 rounded-2xl shadow-xl">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Upload Video
              </h2>
              <VideoUploader
                onFileSelect={handleFileSelect}
                onRemove={handleRemoveFile}
                file={state.originalFile}
                isProcessing={state.status === 'processing'}
                error={state.error}
              />
            </div>

            <div className="glass-morphism p-6 rounded-2xl shadow-xl">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Compression Settings
              </h2>
              <CompressionControls
                maxSizeMB={maxSizeMB}
                onMaxSizeChange={setMaxSizeMB}
                onCompress={handleCompress}
                onCancel={handleCancel}
                isProcessing={state.status === 'processing'}
                hasFile={!!state.originalFile}
                duration={state.metadata?.duration}
              />
            </div>

            <div className="glass-morphism p-6 rounded-2xl shadow-xl">
              <ProgressBar
                value={state.progress}
                status={state.status}
                error={state.error}
              />
            </div>
          </div>

          {/* Right Column - Preview & Download */}
          <div className="space-y-6">
            <div className="glass-morphism p-6 rounded-2xl shadow-xl">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Video Preview
              </h2>
              <VideoPreview
                file={state.originalFile}
                metadata={state.metadata}
              />
            </div>

            {state.status === 'completed' && state.compressedFile && (
              <div className="glass-morphism p-6 rounded-2xl shadow-xl">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Download
                </h2>
                <DownloadButton
                  file={state.compressedFile}
                  originalName={state.originalFile?.name}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800 pt-8">
          <p>All processing is done locally in your browser. Your videos never leave your device.</p>
          <p className="mt-1">Secure • Private • Fast</p>
        </div>
      </div>
    </main>
  );
}