'use client';

import { motion } from 'framer-motion';
import type { NormalizedProduct } from '@/lib/market';

interface ProductDetectionBadgeProps {
  normalized: NormalizedProduct;
}

export function ProductDetectionBadge({ normalized }: ProductDetectionBadgeProps) {
  const { canonical, confidence, category, variant } = normalized;

  // Güven badge
  const getConfidenceBadge = (conf: number) => {
    if (conf >= 0.85) return { emoji: '🟢', label: 'Çok Yüksek', color: 'text-green-400' };
    if (conf >= 0.70) return { emoji: '🔵', label: 'Yüksek', color: 'text-blue-400' };
    if (conf >= 0.50) return { emoji: '🟡', label: 'Orta', color: 'text-yellow-400' };
    return { emoji: '🔴', label: 'Düşük', color: 'text-red-400' };
  };

  const badge = getConfidenceBadge(confidence);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass-card border border-slate-700/50 p-4"
    >
      <div className="flex items-center justify-between">
        {/* Sol: Ürün Bilgisi */}
        <div className="flex items-center gap-3">
          <span className="text-3xl">📦</span>
          <div>
            <h3 className="text-lg font-bold text-white">{canonical}</h3>
            <div className="flex items-center gap-2 mt-1">
              {category && (
                <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                  {category}
                </span>
              )}
              {variant && (
                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                  {variant}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sağ: Güven Badge */}
        <div className="text-right">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{badge.emoji}</span>
            <span className={`text-sm font-semibold ${badge.color}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Güven: {(confidence * 100).toFixed(0)}%
          </p>
        </div>
      </div>
    </motion.div>
  );
}
