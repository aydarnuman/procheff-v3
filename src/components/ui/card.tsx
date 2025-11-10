import React, { HTMLAttributes } from "react";

export type CardVariant = 'default' | 'elevated' | 'bordered' | 'subtle';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: CardVariant;
  hoverable?: boolean;
  tilt?: boolean;
}

export function Card({
  children,
  className = "",
  variant = 'default',
  hoverable = false,
  tilt = false,
  ...props
}: CardProps) {
  const variantClasses = {
    default: 'glass-card',
    elevated: 'glass-elevated',
    bordered: 'glass-card glow-border-blue',
    subtle: 'glass-subtle'
  };

  return (
    <div
      className={`
        ${variantClasses[variant]}
        ${hoverable ? 'card-hover cursor-pointer' : ''}
        ${tilt ? 'card-tilt' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardSectionProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = "" }: CardSectionProps) {
  return (
    <div className={`px-6 py-4 border-b border-white/5 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }: CardSectionProps) {
  return (
    <h3 className={`h3 mb-0 text-[var(--color-text-primary)] ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = "" }: CardSectionProps) {
  return (
    <p className={`body-sm text-[var(--color-text-secondary)] mt-1 ${className}`}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = "" }: CardSectionProps) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = "" }: CardSectionProps) {
  return (
    <div className={`px-6 py-4 border-t border-white/5 ${className}`}>
      {children}
    </div>
  );
}
