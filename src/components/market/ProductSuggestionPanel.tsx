'use client';

import { motion } from 'framer-motion';
import { Search, CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';
import type { NormalizedProduct } from '@/lib/market';

interface ProductSuggestionPanelProps {
  normalized: NormalizedProduct;
  onSelectVariant?: (variant: string) => void;
  onSelectAlternative?: (alternative: string) => void;
}

export function ProductSuggestionPanel({
  normalized,
  onSelectVariant,
  onSelectAlternative
}: ProductSuggestionPanelProps) {
  const { 
    canonical, 
    confidence, 
    method, 
    category, 
    variant,
    alternatives = [],
    suggestions = []
  } = normalized;

  // Confidence badge
  const getConfidenceBadge = (conf: number) => {
    if (conf >= 0.85) return { color: 'green', emoji: '🟢', label: 'Çok Yüksek' };
    if (conf >= 0.70) return { color: 'blue', emoji: '🔵', label: 'Yüksek' };
    if (conf >= 0.50) return { color: 'yellow', emoji: '🟡', label: 'Orta' };
    return { color: 'red', emoji: '🔴', label: 'Düşük' };
  };

  const badge = getConfidenceBadge(confidence);

  return (
    <div className="space-y-4">
      {/* Ana Ürün Tespiti */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-white">📦 Tespit Edilen Ürün</h3>
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-${badge.color}-500/20 text-${badge.color}-300`}>
            <span>{badge.emoji}</span>
            <span>{badge.label}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-white">{canonical}</span>
            <span className="text-sm text-slate-400">
              {(confidence * 100).toFixed(0)}% güven
            </span>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            {category && (
              <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-300">
                {category}
              </span>
            )}
            {variant && (
              <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-300">
                {variant}
              </span>
            )}
            <span className="px-2 py-1 rounded bg-slate-500/20 text-slate-400">
              {method === 'exact' ? '✓ Tam Eşleşme' : 
               method === 'fuzzy' ? '≈ Benzer Eşleşme' : 
               method === 'ai' ? '🤖 AI Tahmini' : '? Varsayılan'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Varyant Önerileri */}
      {suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h3 className="font-semibold text-white">🔁 Varyant Önerileri</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suggestions.slice(0, 6).map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => onSelectVariant?.(suggestion)}
                className="text-left px-3 py-2 rounded bg-slate-700/50 hover:bg-slate-700 
                         text-slate-300 hover:text-white transition-colors text-sm
                         border border-slate-600/30 hover:border-blue-500/50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Alternatif Ürünler */}
      {alternatives.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
            <h3 className="font-semibold text-white">🍋 Benzer Ürünler</h3>
          </div>

          <div className="space-y-2">
            {alternatives.slice(0, 5).map((alternative, idx) => (
              <button
                key={idx}
                onClick={() => onSelectAlternative?.(alternative)}
                className="w-full text-left px-3 py-2 rounded bg-slate-700/30 hover:bg-slate-700/50
                         text-slate-400 hover:text-white transition-colors text-sm
                         border border-slate-600/20 hover:border-yellow-500/30
                         flex items-center justify-between group"
              >
                <span>{alternative}</span>
                <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  Bunu seç →
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Düşük Güven Uyarısı */}
      {confidence < 0.5 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-4 border border-orange-500/30"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-orange-300 mb-1">
                Düşük Güven Skoru
              </h4>
              <p className="text-sm text-slate-400">
                Ürün tam olarak eşleştirilemedi. Yukarıdaki önerilerden birini seçebilir 
                veya daha spesifik bir arama yapabilirsiniz.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

