'use client';

import { motion } from 'framer-motion';

interface SkeletonLoaderProps {
  variant?: 'text' | 'rect' | 'circle' | 'card';
  width?: string | number;
  height?: string | number;
  className?: string;
  count?: number;
}

/**
 * Skeleton Loader Component
 * Provides loading placeholders with shimmer animation
 *
 * @example
 * <SkeletonLoader variant="card" count={3} />
 * <SkeletonLoader variant="text" width="80%" height="20px" />
 */
export function SkeletonLoader({
  variant = 'text',
  width = '100%',
  height,
  className = '',
  count = 1
}: SkeletonLoaderProps) {
  const getDefaultHeight = () => {
    switch (variant) {
      case 'text':
        return '1rem';
      case 'rect':
        return '4rem';
      case 'circle':
        return '3rem';
      case 'card':
        return '12rem';
      default:
        return '1rem';
    }
  };

  const getShape = () => {
    switch (variant) {
      case 'circle':
        return 'rounded-full';
      case 'card':
        return 'rounded-xl';
      default:
        return 'rounded-lg';
    }
  };

  const skeletonHeight = height || getDefaultHeight();
  const shape = getShape();

  const skeletons = Array.from({ length: count }, (_, i) => (
    <motion.div
      key={i}
      className={`
        relative overflow-hidden bg-slate-800/50
        ${shape}
        ${className}
      `}
      style={{
        width: variant === 'circle' ? skeletonHeight : width,
        height: skeletonHeight
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: i * 0.05 }}
    >
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-700/30 to-transparent"
        animate={{
          x: ['-100%', '100%']
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear'
        }}
      />
    </motion.div>
  ));

  return count > 1 ? (
    <div className="space-y-3">{skeletons}</div>
  ) : (
    skeletons[0]
  );
}

/**
 * Card Skeleton - Pre-configured skeleton for cards
 */
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`glass-card p-6 ${className}`}>
      <div className="flex items-start gap-4 mb-4">
        <SkeletonLoader variant="circle" width="3rem" height="3rem" />
        <div className="flex-1">
          <SkeletonLoader width="60%" height="1.5rem" className="mb-2" />
          <SkeletonLoader width="40%" height="1rem" />
        </div>
      </div>
      <SkeletonLoader variant="rect" height="8rem" className="mb-3" />
      <SkeletonLoader width="80%" height="1rem" className="mb-2" />
      <SkeletonLoader width="60%" height="1rem" />
    </div>
  );
}

/**
 * Table Skeleton - Pre-configured skeleton for tables
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="glass-card p-4">
      {/* Header */}
      <div className="flex gap-4 mb-4 pb-3 border-b border-slate-700">
        <SkeletonLoader width="25%" height="1rem" />
        <SkeletonLoader width="20%" height="1rem" />
        <SkeletonLoader width="30%" height="1rem" />
        <SkeletonLoader width="15%" height="1rem" />
      </div>
      {/* Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <SkeletonLoader width="25%" height="2.5rem" />
            <SkeletonLoader width="20%" height="2.5rem" />
            <SkeletonLoader width="30%" height="2.5rem" />
            <SkeletonLoader width="15%" height="2.5rem" />
          </div>
        ))}
      </div>
    </div>
  );
}
