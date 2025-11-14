'use client';

import { motion } from 'framer-motion';
import { NormalizedProduct } from '@/lib/market';

interface VariantChipsProps {
  normalized: NormalizedProduct;
  onSelectVariant?: (variant: string) => void;
  onSelectAlternative?: (alt: string) => void;
}

export function VariantChips({
  normalized,
  onSelectVariant,
  onSelectAlternative
}: VariantChipsProps) {
  const allItems = [
    ...(normalized.variant ? [normalized.variant] : []),
    ...(normalized.alternatives || [])
  ];

  if (allItems.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="flex flex-wrap gap-2"
    >
      {/* Kategori chip - her zaman göster */}
      {normalized.category && (
        <div className="
          px-3 py-1.5 
          rounded-lg 
          bg-indigo-500/20 
          border border-indigo-500/30
          text-xs font-medium text-indigo-300
        ">
          {normalized.category}
        </div>
      )}

      {/* Varyant - tıklanabilir */}
      {normalized.variant && [normalized.variant].map((variant, idx) => (
        <button
          key={`variant-${idx}`}
          onClick={() => onSelectVariant?.(variant)}
          className="
            px-3 py-1.5 
            rounded-lg 
            bg-white/5
            hover:bg-white/10
            border border-white/10
            hover:border-white/20
            text-xs font-medium text-slate-300
            hover:text-white
            transition-all duration-200
            hover:scale-105
          "
        >
          {variant}
        </button>
      ))}

      {/* Alternatifler - tıklanabilir */}
      {normalized.alternatives?.map((alt, idx) => (
        <button
          key={`alt-${idx}`}
          onClick={() => onSelectAlternative?.(alt)}
          className="
            px-3 py-1.5 
            rounded-lg 
            bg-purple-500/10
            hover:bg-purple-500/20
            border border-purple-500/20
            hover:border-purple-500/30
            text-xs font-medium text-purple-300
            hover:text-purple-200
            transition-all duration-200
            hover:scale-105
          "
        >
          {alt}
        </button>
      ))}
    </motion.div>
  );
}
