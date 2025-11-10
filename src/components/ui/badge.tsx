import React, { HTMLAttributes } from 'react';
import { X } from 'lucide-react';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';
export type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  pulse?: boolean;
  dot?: boolean;
  closable?: boolean;
  onClose?: () => void;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  pulse = false,
  dot = false,
  closable = false,
  onClose,
  className = '',
  ...props
}) => {
  // Variant styles (use CSS classes from globals.css)
  const variantClasses: Record<BadgeVariant, string> = {
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
    info: 'badge-info',
    neutral: 'badge-neutral',
  };

  // Size adjustments
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  // Dot color
  const dotColors: Record<BadgeVariant, string> = {
    success: 'bg-[var(--color-accent-mint)]',
    warning: 'bg-[var(--color-accent-gold)]',
    error: 'bg-[var(--color-accent-red)]',
    info: 'bg-[var(--color-accent-blue)]',
    neutral: 'bg-[var(--color-text-tertiary)]',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${pulse ? 'animate-pulse-glow' : ''}
        ${className}
      `}
      {...props}
    >
      {/* Dot indicator */}
      {dot && (
        <span
          className={`
            w-1.5 h-1.5 rounded-full
            ${dotColors[variant]}
            ${pulse ? 'animate-pulse' : ''}
          `}
        />
      )}

      {/* Content */}
      <span>{children}</span>

      {/* Close button */}
      {closable && onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="ml-1 hover:opacity-70 transition-opacity"
          aria-label="Remove badge"
        >
          <X size={size === 'sm' ? 12 : size === 'lg' ? 18 : 14} />
        </button>
      )}
    </span>
  );
};
