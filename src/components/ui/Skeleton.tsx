"use client";

import { motion } from "framer-motion";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "card";
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

export function Skeleton({
  className = "",
  variant = "rectangular",
  width,
  height,
  animate = true,
}: SkeletonProps) {
  const baseClasses = "bg-gradient-to-r from-slate-800/50 via-slate-700/50 to-slate-800/50 bg-[length:200%_100%]";
  
  const variantClasses = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg",
    card: "rounded-xl",
  };

  const styles: React.CSSProperties = {
    width: width || undefined,
    height: height || undefined,
  };

  const Component = animate ? motion.div : "div";

  return (
    <Component
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={styles}
      {...(animate
        ? {
            animate: {
              backgroundPosition: ["0% 0%", "100% 0%"],
            },
            transition: {
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
            },
          }
        : {})}
    />
  );
}

// Pre-built skeleton components
export function SkeletonCard() {
  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-3/4" />
          <Skeleton variant="text" className="w-1/2" />
        </div>
      </div>
      <Skeleton variant="rectangular" height={100} />
      <div className="flex gap-2">
        <Skeleton variant="rectangular" className="flex-1" height={40} />
        <Skeleton variant="rectangular" className="flex-1" height={40} />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex gap-4">
        <Skeleton variant="text" className="flex-1" height={20} />
        <Skeleton variant="text" className="flex-1" height={20} />
        <Skeleton variant="text" className="flex-1" height={20} />
        <Skeleton variant="text" className="w-24" height={20} />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 border-b border-gray-800 flex gap-4">
          <Skeleton variant="text" className="flex-1" />
          <Skeleton variant="text" className="flex-1" />
          <Skeleton variant="text" className="flex-1" />
          <Skeleton variant="rectangular" className="w-24" height={32} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="glass-card p-4 flex items-center gap-4">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="w-2/3" />
            <Skeleton variant="text" className="w-1/3" />
          </div>
          <Skeleton variant="rectangular" width={80} height={32} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-6 space-y-3">
            <Skeleton variant="text" className="w-1/2" />
            <Skeleton variant="text" height={40} className="w-3/4" />
            <Skeleton variant="text" className="w-1/3" />
          </div>
        ))}
      </div>
      {/* Chart */}
      <div className="glass-card p-6 space-y-4">
        <Skeleton variant="text" className="w-1/4" height={24} />
        <Skeleton variant="rectangular" height={300} />
      </div>
      {/* Table */}
      <SkeletonTable rows={3} />
    </div>
  );
}
