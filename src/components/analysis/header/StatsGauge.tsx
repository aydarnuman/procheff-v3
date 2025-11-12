'use client';

import { CircularProgress } from '@/components/shared/ui/ProgressBar';

interface StatsGaugeProps {
  value: number;
  label?: string;
  size?: number;
}

export function StatsGauge({ value, label = 'Score', size = 80 }: StatsGaugeProps) {
  const variant = value >= 80 ? 'success' : value >= 60 ? 'warning' : 'error';

  return (
    <div className="flex flex-col items-center gap-2">
      <CircularProgress
        progress={value}
        size={size}
        strokeWidth={8}
        variant={variant}
      />
      {label && (
        <span className="text-xs text-slate-400 font-medium">{label}</span>
      )}
    </div>
  );
}
