'use client';

import { motion } from 'framer-motion';

interface MiniChartProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  showDots?: boolean;
  className?: string;
}

export function MiniChart({
  data,
  color = '#6366f1',
  height = 40,
  width = 100,
  showDots = false,
  className = ''
}: MiniChartProps) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return { x, y };
  });

  const pathD = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    return `${path} L ${point.x} ${point.y}`;
  }, '');

  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* Gradient */}
      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Area under line */}
      <motion.path
        d={`${pathD} L ${width} ${height} L 0 ${height} Z`}
        fill="url(#chartGradient)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      />

      {/* Line */}
      <motion.path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />

      {/* Dots */}
      {showDots && points.map((point, index) => (
        <motion.circle
          key={index}
          cx={point.x}
          cy={point.y}
          r="3"
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.05, duration: 0.2 }}
        />
      ))}
    </svg>
  );
}

export function SparkLine({ data, color = '#10b981', className = '' }: {
  data: number[];
  color?: string;
  className?: string;
}) {
  return <MiniChart data={data} color={color} height={30} width={80} className={className} />;
}
