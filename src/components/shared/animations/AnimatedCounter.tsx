'use client';

import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  onComplete?: () => void;
}

/**
 * Animated Counter Component
 * Smoothly animates number changes with customizable formatting
 *
 * @example
 * <AnimatedCounter value={1250.50} decimals={2} prefix="₺" duration={1.5} />
 */
export function AnimatedCounter({
  value,
  duration = 1,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  onComplete
}: AnimatedCounterProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => {
    return latest.toFixed(decimals);
  });

  const nodeRef = useRef<HTMLSpanElement>(null);
  const prevValueRef = useRef(0);

  useEffect(() => {
    const animation = animate(count, value, {
      duration,
      ease: 'easeOut',
      onComplete: () => {
        onComplete?.();
      }
    });

    prevValueRef.current = value;

    return animation.stop;
  }, [value, duration, count, onComplete]);

  return (
    <motion.span
      ref={nodeRef}
      className={className}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </motion.span>
  );
}

/**
 * Formatted Currency Counter
 * Specialized counter for currency with locale formatting
 */
export function CurrencyCounter({
  value,
  locale = 'tr-TR',
  currency = 'TRY',
  className = '',
  duration = 1
}: {
  value: number;
  locale?: string;
  currency?: string;
  className?: string;
  duration?: number;
}) {
  const count = useMotionValue(0);
  const [displayValue, setDisplayValue] = React.useState('');

  React.useEffect(() => {
    const animation = animate(count, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (latest) => {
        setDisplayValue(
          new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(latest)
        );
      }
    });

    return animation.stop;
  }, [value, duration, locale, currency, count]);

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {displayValue}
    </motion.span>
  );
}

// Missing React import
import React from 'react';
