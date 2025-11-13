'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import type { PriceVolatility } from '@/lib/market';

interface VolatilityIndicatorProps {
  volatility: PriceVolatility;
  compact?: boolean;
}

export function VolatilityIndicator({ 
  volatility, 
  compact = false 
}: VolatilityIndicatorProps) {
  const { score, trend, avgDailyChange, maxSpike, recommendation } = volatility;

  // Volatility badge
  const getVolatilityBadge = (s: number) => {
    if (s < 0.3) return { color: 'green', emoji: '🟢', label: 'Stabil', icon: CheckCircle };
    if (s < 0.5) return { color: 'blue', emoji: '🔵', label: 'Normal', icon: Minus };
    if (s < 0.7) return { color: 'yellow', emoji: '🟡', label: 'Değişken', icon: Clock };
    return { color: 'red', emoji: '🔴', label: 'Çok Değişken', icon: AlertTriangle };
  };

  const badge = getVolatilityBadge(score);
  const BadgeIcon = badge.icon;

  // Trend icon
  const TrendIcon = trend === 'rising' ? TrendingUp : 
                    trend === 'falling' ? TrendingDown : 
                    Minus;

  const trendColor = trend === 'rising' ? 'text-red-400' : 
                     trend === 'falling' ? 'text-green-400' : 
                     'text-slate-400';

  const trendLabel = trend === 'rising' ? '↑ Yükseliş' : 
                     trend === 'falling' ? '↓ Düşüş' : 
                     '→ Sabit';

  // Compact mode
  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50">
        <span className="text-lg">{badge.emoji}</span>
        <span className="text-sm font-medium text-white">{badge.label}</span>
        <div className="h-4 w-px bg-slate-600" />
        <TrendIcon className={`w-4 h-4 ${trendColor}`} />
        <span className="text-xs text-slate-400">{trendLabel}</span>
      </div>
    );
  }

  // Full mode
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BadgeIcon className={`w-5 h-5 text-${badge.color}-400`} />
          <h3 className="font-semibold text-white">Fiyat Değişkenliği</h3>
        </div>
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full bg-${badge.color}-500/20`}>
          <span>{badge.emoji}</span>
          <span className={`text-sm font-medium text-${badge.color}-300`}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Volatility Score Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Volatilite Skoru</span>
          <span className="text-white font-medium">{(score * 100).toFixed(0)}%</span>
        </div>
        
        <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              score < 0.3 ? 'bg-green-500' :
              score < 0.5 ? 'bg-blue-500' :
              score < 0.7 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Trend */}
        <div className="text-center p-2 rounded bg-slate-700/30 border border-slate-600/30">
          <TrendIcon className={`w-5 h-5 mx-auto mb-1 ${trendColor}`} />
          <div className="text-xs text-slate-400 mb-0.5">Trend</div>
          <div className={`text-sm font-medium ${trendColor}`}>
            {trendLabel}
          </div>
        </div>

        {/* Daily Change */}
        <div className="text-center p-2 rounded bg-slate-700/30 border border-slate-600/30">
          <div className="text-lg mb-1">📊</div>
          <div className="text-xs text-slate-400 mb-0.5">Günlük Ort.</div>
          <div className="text-sm font-medium text-white">
            {avgDailyChange.toFixed(1)}%
          </div>
        </div>

        {/* Max Spike */}
        <div className="text-center p-2 rounded bg-slate-700/30 border border-slate-600/30">
          <div className="text-lg mb-1">⚡</div>
          <div className="text-xs text-slate-400 mb-0.5">Maks. Sıçrama</div>
          <div className="text-sm font-medium text-orange-300">
            {maxSpike.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className={`p-3 rounded-lg ${
        recommendation.includes('✅') ? 'bg-green-500/10 border border-green-500/30' :
        recommendation.includes('🔼') ? 'bg-orange-500/10 border border-orange-500/30' :
        recommendation.includes('⏳') ? 'bg-blue-500/10 border border-blue-500/30' :
        'bg-yellow-500/10 border border-yellow-500/30'
      }`}>
        <div className="flex items-start gap-2">
          <div className="text-lg flex-shrink-0 mt-0.5">💡</div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-slate-300 mb-1">
              Öneri
            </div>
            <div className="text-sm text-white">
              {recommendation}
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="text-xs text-slate-500 text-center">
        Son 90 günlük fiyat verisi analizi
      </div>
    </motion.div>
  );
}

// Simplified version for small spaces
export function VolatilityBadge({ volatility }: { volatility: PriceVolatility }) {
  const { score, trend } = volatility;
  
  const badge = score < 0.3 ? { emoji: '🟢', label: 'Stabil' } :
                score < 0.5 ? { emoji: '🔵', label: 'Normal' } :
                score < 0.7 ? { emoji: '🟡', label: 'Değişken' } :
                { emoji: '🔴', label: 'Çok Değişken' };

  const trendIcon = trend === 'rising' ? '↑' : 
                    trend === 'falling' ? '↓' : '→';

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-700/50 text-xs">
      <span>{badge.emoji}</span>
      <span className="text-slate-300">{badge.label}</span>
      <span className="text-slate-500">|</span>
      <span className="text-slate-400">{trendIcon}</span>
    </div>
  );
}

