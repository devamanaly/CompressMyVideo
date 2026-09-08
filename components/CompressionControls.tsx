/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useState, useEffect } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { Settings, Scissors } from 'lucide-react';
import { MIN_MAX_SIZE } from '@/lib/constants';

interface CompressionControlsProps {
  maxSizeMB: number;
  maxPossibleSize: number;
  onMaxSizeChange: (value: number) => void;
  onCompress: () => void;
  onCancel: () => void;
  isProcessing: boolean;
  hasFile: boolean;
  duration?: number;
  fileSizeMB: number;
  onTrimChange?: (start: number, end: number) => void;
}

export function CompressionControls({
  maxSizeMB,
  maxPossibleSize,
  onMaxSizeChange,
  onCompress,
  onCancel,
  isProcessing,
  hasFile,
  duration,
  fileSizeMB,
  onTrimChange,
}: CompressionControlsProps) {
  const [showTrim, setShowTrim] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(duration || 0);

  // Update trim end when duration changes
  useEffect(() => {
    if (duration) {
      setTrimEnd(duration);
      setTrimStart(0);
    }
  }, [duration]);

  const formatTime = (seconds: number): string => {
    if (!seconds || seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTrimToggle = () => {
    if (!showTrim && duration) {
      setTrimEnd(duration);
      setTrimStart(0);
      if (onTrimChange) {
        onTrimChange(0, duration);
      }
    }
    setShowTrim(!showTrim);
  };

  const handleTrimStartChange = (value: number) => {
    setTrimStart(value);
    if (onTrimChange) {
      onTrimChange(value, trimEnd);
    }
  };

  const handleTrimEndChange = (value: number) => {
    setTrimEnd(value);
    if (onTrimChange) {
      onTrimChange(trimStart, value);
    }
  };

  // Calculate presets based on file size
  const getPresets = () => {
    const presets = [];
    const percentages = [0.1, 0.3, 0.5, 0.8];
    const labels = ['Small (10%)', 'Medium (30%)', 'Large (50%)', 'Original (80%)'];
    
    for (let i = 0; i < percentages.length; i++) {
      const value = Math.round(fileSizeMB * percentages[i]);
      if (value >= MIN_MAX_SIZE && value <= maxPossibleSize) {
        presets.push({
          label: labels[i],
          value: Math.max(MIN_MAX_SIZE, Math.min(value, maxPossibleSize))
        });
      }
    }
    return presets;
  };

  const presets = getPresets();

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
          max={maxPossibleSize}
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

        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
          <span>{MIN_MAX_SIZE} MB</span>
          <span>Max: {maxPossibleSize} MB</span>
        </div>

        {/* Dynamic Preset Buttons */}
        {presets.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {presets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => onMaxSizeChange(preset.value)}
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
        )}
      </div>

      {/* Trim Controls */}
      {duration && duration > 0 && (
        <div className="space-y-3">
          <button
            onClick={handleTrimToggle}
            disabled={isProcessing || !hasFile}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Scissors className="w-4 h-4" />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300"> Trim Video
              {/* <span className="text-xs text-gray-400">
                ({formatTime(trimStart)} - {formatTime(trimEnd)})
              </span> */}
              </label>
          </button>

          {/* {showTrim && ( */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Start: {formatTime(trimStart)}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    End: {formatTime(trimEnd)}
                  </span>
                </div>
                <Slider.Root
                  className="relative flex items-center select-none touch-none w-full h-5"
                  value={[trimStart, trimEnd]}
                  onValueChange={([start, end]) => {
                    handleTrimStartChange(start);
                    handleTrimEndChange(end);
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
          {/* )} */}
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