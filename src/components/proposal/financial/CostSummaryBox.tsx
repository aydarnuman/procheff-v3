'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedCounter } from '@/components/shared/animations/AnimatedCounter';
import { SparkLine } from '@/components/shared/charts/MiniChart';
import { useInlineNumberEdit } from '@/lib/hooks/useInlineEdit';
import { Edit3, Check, X } from 'lucide-react';

interface CostSummaryBoxProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  trend?: number[];
  editable?: boolean;
  onChange?: (newValue: number) => void;
  breakdown?: Array<{ label: string; value: number }>;
}

export function CostSummaryBox({
  label,
  value,
  icon,
  color,
  trend,
  editable = false,
  onChange,
  breakdown
}: CostSummaryBoxProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const {
    isEditing,
    displayValue,
    inputRef,
    startEditing,
    handleChange,
    handleKeyDown,
    handleBlur
  } = useInlineNumberEdit({
    initialValue: value,
    onSave: (newValue) => {
      onChange?.(newValue);
    },
    decimals: 2
  });

  return (
    <motion.div
      className="glass-card p-5 relative overflow-hidden cursor-pointer"
      onMouseEnter={() => setShowBreakdown(true)}
      onMouseLeave={() => setShowBreakdown(false)}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.2 }}
    >
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-5`} />

      {/* Content */}
      <div className="relative z-10">
        {/* Icon & Label */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-slate-400 text-sm font-medium">{label}</span>
          </div>

          {editable && !isEditing && (
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                startEditing();
              }}
              className="p-1 rounded hover:bg-slate-700/50 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            </motion.button>
          )}
        </div>

        {/* Value */}
        <div className="flex items-baseline gap-1 mb-2">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                ref={inputRef}
                type="number"
                value={displayValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                className="w-full px-2 py-1 bg-slate-800 text-white text-2xl font-bold rounded border border-indigo-500 focus:outline-none"
                step="0.01"
              />
              <button
                onClick={handleBlur}
                className="p-1 text-green-400 hover:bg-green-500/20 rounded"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <span className="text-3xl font-bold text-white">
                <AnimatedCounter value={value} decimals={2} duration={1} />
              </span>
              <span className="text-slate-400 text-sm">TL</span>
            </>
          )}
        </div>

        {/* Sparkline */}
        {trend && trend.length > 0 && (
          <div className="mt-3">
            <SparkLine data={trend} color="#6366f1" />
          </div>
        )}

        {/* Breakdown Hover Tooltip */}
        <AnimatePresence>
          {showBreakdown && breakdown && breakdown.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute left-0 right-0 bottom-full mb-2 glass-card p-3 z-50"
            >
              <p className="text-xs text-slate-400 mb-2 font-semibold">Detay:</p>
              <div className="space-y-1">
                {breakdown.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-slate-300">{item.label}</span>
                    <span className="text-white font-medium">
                      {item.value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
