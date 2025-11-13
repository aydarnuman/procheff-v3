import { motion } from 'framer-motion';
import React, { ButtonHTMLAttributes, forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  ripple?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      ripple = true,
      disabled,
      className = '',
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const [ripples, setRipples] = React.useState<Array<{ x: number; y: number; id: number }>>([]);

    // Variant styles
    const variantStyles = {
      primary: `
        bg-gradient-to-r from-[var(--color-accent-blue)] to-[var(--color-accent-purple)]
        hover:from-[var(--color-accent-purple)] hover:to-[var(--color-accent-blue)]
        text-white font-semibold
        shadow-lg hover:shadow-glow-blue
        border border-transparent
      `,
      secondary: `
        glass
        text-[var(--color-text-primary)] font-semibold
        border border-white/10
        hover:border-[var(--color-accent-blue)] hover:shadow-glow-blue
      `,
      ghost: `
        bg-transparent
        text-[var(--color-text-primary)] font-medium
        border border-transparent
        hover:bg-white/5 hover:text-[var(--color-accent-blue)]
      `,
      outline: `
        bg-transparent
        text-[var(--color-text-primary)] font-semibold
        border border-[var(--color-border-bright)]
        hover:border-[var(--color-accent-blue)] hover:shadow-glow-blue hover:text-[var(--color-accent-blue)]
      `,
      danger: `
        bg-gradient-to-r from-[var(--color-accent-red)] to-red-600
        hover:from-red-600 hover:to-[var(--color-accent-red)]
        text-white font-semibold
        shadow-lg hover:shadow-glow-red
        border border-transparent
      `,
    };

    // Size styles
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm rounded-lg',
      md: 'px-4 py-2 text-base rounded-lg',
      lg: 'px-6 py-3 text-lg rounded-xl',
    };

    // Handle ripple effect
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (ripple && !disabled && !loading) {
        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = Date.now();

        setRipples((prev) => [...prev, { x, y, id }]);

        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== id));
        }, 600);
      }

      if (onClick && !disabled && !loading) {
        onClick(e);
      }
    };

    const baseStyles = `
      relative overflow-hidden
      inline-flex items-center justify-center gap-2
      transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)
      focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-base)]
      disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none
      active:scale-95
      ${fullWidth ? 'w-full' : ''}
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${className}
    `;

    return (
      <button
        ref={ref}
        className={baseStyles}
        disabled={disabled || loading}
        onClick={handleClick}
        {...props}
      >
        {/* Ripple Effect */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute rounded-full bg-white/30 animate-ripple pointer-events-none ripple"
            // CSS variables for ripple animation position - requires inline styles for dynamic positioning
            style={{
              '--ripple-x': `${ripple.x}px`,
              '--ripple-y': `${ripple.y}px`,
            } as React.CSSProperties}
          />
        ))}

        {/* Loading Spinner */}
        {loading && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-inherit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </motion.div>
        )}

        {/* Content */}
        <span className={`flex items-center gap-2 ${loading ? 'invisible' : ''}`}>
          {icon && iconPosition === 'left' && <span className="inline-flex">{icon}</span>}
          {children}
          {icon && iconPosition === 'right' && <span className="inline-flex">{icon}</span>}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
