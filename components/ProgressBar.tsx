'use client';

import * as Progress from '@radix-ui/react-progress';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ProgressBarProps {
  value: number;
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string | null;
}

export function ProgressBar({ value, status, error }: ProgressBarProps) {
  if (status === 'idle' || (status === 'uploading' && value === 0)) {
    return null;
  }

  const getStatusColor = () => {
    if (status === 'completed') return 'bg-green-500';
    if (status === 'error') return 'bg-red-500';
    return 'bg-gradient-to-r from-purple-500 to-blue-500';
  };

  const getStatusText = () => {
    if (status === 'uploading') return 'Uploading...';
    if (status === 'processing') return `Compressing... ${value}%`;
    if (status === 'completed') return 'Compression complete!';
    if (status === 'error') return 'Compression failed';
    return '';
  };

  const getStatusIcon = () => {
    if (status === 'completed') return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (status === 'error') return <AlertCircle className="w-5 h-5 text-red-500" />;
    return null;
  };

  return (
    <div className="w-full space-y-3">
      <Progress.Root
        className="relative overflow-hidden h-3 rounded-full bg-gray-200 dark:bg-gray-700"
        value={value}
      >
        <Progress.Indicator
          className={`h-full rounded-full transition-all duration-500 ease-out ${getStatusColor()}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </Progress.Root>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {getStatusText()}
          </span>
        </div>
        {status === 'processing' && (
          <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
            {Math.min(value, 100)}%
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}