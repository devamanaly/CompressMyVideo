'use client';

import { useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { Settings, Scissors } from 'lucide-react';
import { DEFAULT_MAX_SIZE, MIN_MAX_SIZE, MAX_MAX_SIZE, COMPRESSION_QUALITY_PRESETS } from '@/lib/constants';

interface CompressionControlsProps {
  maxSizeMB: number;
  onMaxSizeChange: (value: number) => void;
  onCompress: () => void;
  onCancel: () => void;
  isProcessing: boolean;
  hasFile: boolean;
  duration?: number;
}

export function CompressionControls({
  maxSizeMB,
  onMaxSizeChange,
  onCompress,
  onCancel,
  isProcessing,
  hasFile,
  duration,
}: CompressionControlsProps) {
  const [showTrim, setShowTrim] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(duration || 0);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePresetClick = (value: number) => {
    onMaxSizeChange(value);
  };

  const handleTrimToggle = () => {
    if (!showTrim && duration) {
      setTrimEnd(duration);
    }
    setShowTrim(!showTrim);
  };

  return (
    <div className="space-y-6">
      {/* Target Size Control */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Target File Size
            </label>
          </div>
          <span className="text-lg font-semibold text-purple-600 dark:text-purple-400">
            {maxSizeMB} MB
          </span>
        </div>

        <Slider.Root
          className="relative flex items-center select-none touch-none w-full h-5"
          value={[maxSizeMB]}
          onValueChange={([value]) => onMaxSizeChange(value)}
          min={MIN_MAX_SIZE}
          max={MAX_MAX_SIZE}
          step={1}
          disabled={isProcessing || !hasFile}
        >
          <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-2">
            <Slider.Range className="absolute bg-gradient-to-r from-purple-500 to-blue-500 rounded-full h-full" />
          </Slider.Track>
          <Slider.Thumb
            className="block w-5 h-5 bg-white dark:bg-gray-900 shadow-lg rounded-full border-2 border-purple-500 hover:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Target size"
          />
        </Slider.Root>

        {/* Preset Buttons */}
        <div className="flex flex-wrap gap-2">
          {COMPRESSION_QUALITY_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handlePresetClick(preset.value)}
              disabled={isProcessing || !hasFile}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                maxSizeMB === preset.value
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trim Controls */}
      {duration && (
        <div className="space-y-3">
          <button
            onClick={handleTrimToggle}
            disabled={isProcessing || !hasFile}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Scissors className="w-4 h-4" />
            <span>{showTrim ? 'Hide trim controls' : 'Trim video'}</span>
            <span className="text-xs text-gray-400">({formatTime(trimStart)} - {formatTime(trimEnd)})</span>
          </button>

          {showTrim && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Start: {formatTime(trimStart)}</span>
                  <span className="text-gray-600 dark:text-gray-400">End: {formatTime(trimEnd)}</span>
                </div>
                <Slider.Root
                  className="relative flex items-center select-none touch-none w-full h-5"
                  value={[trimStart, trimEnd]}
                  onValueChange={([start, end]) => {
                    setTrimStart(start);
                    setTrimEnd(end);
                  }}
                  min={0}
                  max={duration}
                  step={0.5}
                  disabled={isProcessing || !hasFile}
                >
                  <Slider.Track className="bg-gray-200 dark:bg-gray-700 relative grow rounded-full h-2">
                    <Slider.Range className="absolute bg-gradient-to-r from-purple-500 to-blue-500 rounded-full h-full" />
                  </Slider.Track>
                  <Slider.Thumb
                    className="block w-4 h-4 bg-white dark:bg-gray-900 shadow-lg rounded-full border-2 border-purple-500 hover:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                    aria-label="Trim start"
                  />
                  <Slider.Thumb
                    className="block w-4 h-4 bg-white dark:bg-gray-900 shadow-lg rounded-full border-2 border-purple-500 hover:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                    aria-label="Trim end"
                  />
                </Slider.Root>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onCompress}
          disabled={isProcessing || !hasFile}
          className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Compressing...
            </span>
          ) : (
            'Compress Video'
          )}
        </button>

        {isProcessing && (
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium rounded-xl hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors duration-200"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}