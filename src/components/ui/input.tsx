import React, { InputHTMLAttributes, forwardRef, useState } from 'react';

export type InputVariant = 'default' | 'filled' | 'outlined';
export type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  success?: boolean;
  variant?: InputVariant;
  size?: InputSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      success,
      variant = 'default',
      size = 'md',
      icon,
      iconPosition = 'left',
      fullWidth = false,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue);

    const handleFocus = () => setIsFocused(true);
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setHasValue(!!e.target.value);
    };

    // Variant styles
    const variantStyles = {
      default: `
        glass
        border border-white/10
        focus:border-[var(--color-accent-blue)]
        focus:shadow-glow-blue
      `,
      filled: `
        bg-[var(--color-card)]
        border border-transparent
        focus:border-[var(--color-accent-blue)]
        focus:shadow-glow-blue
      `,
      outlined: `
        bg-transparent
        border border-[var(--color-border-bright)]
        focus:border-[var(--color-accent-blue)]
        focus:shadow-glow-blue
      `,
    };

    // Size styles
    const sizeStyles = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2.5 text-base',
      lg: 'px-5 py-3 text-lg',
    };

    // Error/Success border
    let stateBorder = '';
    if (error) {
      stateBorder = 'border-[var(--color-accent-red)] focus:border-[var(--color-accent-red)] focus:shadow-glow-red';
    } else if (success) {
      stateBorder = 'border-[var(--color-accent-mint)] focus:border-[var(--color-accent-mint)] focus:shadow-glow-mint';
    }

    const inputClasses = `
      w-full
      rounded-lg
      text-[var(--color-text-primary)]
      placeholder:text-[var(--color-text-tertiary)]
      transition-all duration-300 ease-in-out
      focus:outline-none
      disabled:opacity-40 disabled:cursor-not-allowed
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${stateBorder}
      ${icon && iconPosition === 'left' ? 'pl-10' : ''}
      ${icon && iconPosition === 'right' ? 'pr-10' : ''}
      ${className}
    `;

    const labelClasses = `
      absolute left-4 transition-all duration-200 ease-in-out pointer-events-none
      ${
        isFocused || hasValue
          ? '-top-2.5 text-xs bg-[var(--color-base)] px-1'
          : size === 'sm'
          ? 'top-2 text-sm'
          : size === 'lg'
          ? 'top-3.5 text-lg'
          : 'top-3 text-base'
      }
      ${error ? 'text-[var(--color-accent-red)]' : success ? 'text-[var(--color-accent-mint)]' : isFocused ? 'text-[var(--color-accent-blue)]' : 'text-[var(--color-text-tertiary)]'}
    `;

    const iconClasses = `
      absolute ${iconPosition === 'left' ? 'left-3' : 'right-3'}
      top-1/2 -translate-y-1/2
      text-[var(--color-text-tertiary)]
      ${isFocused && !error && !success ? 'text-[var(--color-accent-blue)]' : ''}
      ${error ? 'text-[var(--color-accent-red)]' : ''}
      ${success ? 'text-[var(--color-accent-mint)]' : ''}
      transition-colors duration-200
    `;

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        <div className="relative">
          {/* Floating Label */}
          {label && <label className={labelClasses}>{label}</label>}

          {/* Icon */}
          {icon && <span className={iconClasses}>{icon}</span>}

          {/* Input */}
          <input
            ref={ref}
            className={inputClasses}
            disabled={disabled}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
        </div>

        {/* Helper Text / Error Message */}
        {(helperText || error) && (
          <p
            className={`mt-1.5 text-sm ${
              error
                ? 'text-[var(--color-accent-red)]'
                : success
                ? 'text-[var(--color-accent-mint)]'
                : 'text-[var(--color-text-tertiary)]'
            }`}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
