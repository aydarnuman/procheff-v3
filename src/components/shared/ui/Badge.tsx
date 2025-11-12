'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' | 'orange';
export type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: LucideIcon;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * Badge Component
 * Versatile badge with variants, sizes, icons, and animations
 *
 * @example
 * <Badge variant="success" icon={Check} pulse>Tamamlandı</Badge>
 * <Badge variant="error" dot>3</Badge>
 */
export function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon: Icon,
  dot = false,
  pulse = false,
  className = '',
  onClick
}: BadgeProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'error':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'info':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'purple':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'orange':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600/50';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-0.5 gap-1';
      case 'lg':
        return 'text-base px-4 py-2 gap-2';
      default:
        return 'text-sm px-3 py-1 gap-1.5';
    }
  };

  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;

  return (
    <motion.span
      className={`
        inline-flex items-center rounded-full border font-medium
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
        ${className}
      `}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.05 } : undefined}
      whileTap={onClick ? { scale: 0.95 } : undefined}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {dot && (
        <motion.span
          className={`
            w-2 h-2 rounded-full
            ${variant === 'success' ? 'bg-green-400' :
              variant === 'warning' ? 'bg-yellow-400' :
              variant === 'error' ? 'bg-red-400' :
              variant === 'info' ? 'bg-blue-400' :
              variant === 'purple' ? 'bg-purple-400' :
              variant === 'orange' ? 'bg-orange-400' :
              'bg-slate-400'}
          `}
          animate={pulse ? {
            scale: [1, 1.2, 1],
            opacity: [1, 0.7, 1]
          } : undefined}
          transition={pulse ? {
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          } : undefined}
        />
      )}
      {Icon && <Icon size={iconSize} />}
      {children}
    </motion.span>
  );
}

/**
 * Notification Badge - Specialized badge for counts
 */
export function NotificationBadge({
  count,
  max = 99,
  variant = 'error',
  className = ''
}: {
  count: number;
  max?: number;
  variant?: BadgeVariant;
  className?: string;
}) {
  if (count === 0) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <Badge
      variant={variant}
      size="sm"
      pulse={count > 0}
      className={`absolute -top-1 -right-1 min-w-[1.25rem] h-5 justify-center ${className}`}
    >
      {displayCount}
    </Badge>
  );
}

/**
 * Progress Badge - Shows completion percentage
 */
export function ProgressBadge({
  progress,
  showPercentage = true,
  variant,
  className = ''
}: {
  progress: number;
  showPercentage?: boolean;
  variant?: BadgeVariant;
  className?: string;
}) {
  const autoVariant: BadgeVariant =
    progress >= 100 ? 'success' :
    progress >= 75 ? 'info' :
    progress >= 50 ? 'warning' :
    'error';

  return (
    <Badge variant={variant || autoVariant} size="sm" className={className}>
      {showPercentage ? `${Math.round(progress)}%` : `${progress}/100`}
    </Badge>
  );
}
