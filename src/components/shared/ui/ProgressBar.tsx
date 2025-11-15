'use client';

import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number;
  showLabel?: boolean;
  showPercentage?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

/**
 * Progress Bar Component
 * Animated progress indicator with variants and labels
 *
 * @example
 * <ProgressBar progress={75} showPercentage variant="success" />
 */
export function ProgressBar({
  progress,
  showLabel = false,
  showPercentage = true,
  variant = 'default',
  size = 'md',
  animated = true,
  className = ''
}: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  const getVariantColor = () => {
    switch (variant) {
      case 'success':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-indigo-500';
    }
  };

  const getSize = () => {
    switch (size) {
      case 'sm':
        return 'h-1.5';
      case 'lg':
        return 'h-4';
      default:
        return 'h-2.5';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-400">İlerleme</span>
          {showPercentage && (
            <span className="text-sm font-medium text-white">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}

      <div className={`
        w-full bg-slate-800 rounded-full overflow-hidden
        ${getSize()}
      `}>
        <motion.div
          className={`
            h-full rounded-full
            ${getVariantColor()}
            ${animated ? 'relative overflow-hidden' : ''}
          `}
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{
            duration: 0.8,
            ease: 'easeOut'
          }}
        >
          {animated && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{
                x: ['-100%', '200%']
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear'
              }}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Circular Progress Component
 */
export function CircularProgress({
  progress,
  size = 80,
  strokeWidth = 8,
  showPercentage = true,
  variant = 'default',
  className = ''
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedProgress / 100) * circumference;

  const getStrokeColor = () => {
    switch (variant) {
      case 'success':
        return '#10b981'; // green-500
      case 'warning':
        return '#f59e0b'; // yellow-500
      case 'error':
        return '#ef4444'; // red-500
      default:
        return '#6366f1'; // indigo-500
    }
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getStrokeColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        />
      </svg>
      {showPercentage && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          {/* Dynamic font size based on circular progress size */}
          <span className="text-white font-bold" style={{ fontSize: size * 0.2 }}>
            {Math.round(clampedProgress)}%
          </span>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Stepped Progress Component - Shows discrete steps
 */
export function SteppedProgress({
  currentStep,
  totalSteps,
  labels,
  className = ''
}: {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
  className?: string;
}) {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
  // const isFuture = stepNumber > currentStep;  // Unused variable

          return (
            <div key={index} className="flex-1 flex items-center">
              {/* Step circle */}
              <motion.div
                className={`
                  relative flex items-center justify-center
                  w-10 h-10 rounded-full font-medium text-sm
                  ${isCompleted ? 'bg-green-500 text-white' :
                    isCurrent ? 'bg-indigo-500 text-white' :
                    'bg-slate-700 text-slate-400'}
                `}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                {isCompleted ? '✓' : stepNumber}
                {isCurrent && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-indigo-400"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0, 0.5]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity
                    }}
                  />
                )}
              </motion.div>

              {/* Connector line */}
              {index < totalSteps - 1 && (
                <div className="flex-1 h-1 mx-2">
                  <motion.div
                    className={`h-full rounded ${isCompleted ? 'bg-green-500' : 'bg-slate-700'}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: isCompleted ? 1 : 0 }}
                    transition={{ delay: index * 0.1 + 0.2, duration: 0.3 }}
                    style={{ transformOrigin: 'left' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Labels */}
      {labels && labels.length === totalSteps && (
        <div className="flex justify-between mt-3">
          {labels.map((label, index) => (
            <div
              key={index}
              className={`
                text-xs text-center flex-1
                ${index + 1 === currentStep ? 'text-white font-medium' : 'text-slate-500'}
              `}
              // Dynamic label width based on total steps
              style={{ maxWidth: `${100 / totalSteps}%` }}
            >
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
