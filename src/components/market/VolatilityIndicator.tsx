'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, AlertTriangle, Info } from 'lucide-react';
import { VolatilityScore } from '@/lib/market/analytics/volatility-calculator';

interface VolatilityIndicatorProps {
  score: VolatilityScore;
  showDetails?: boolean;
  compact?: boolean;
}

export function VolatilityIndicator({
  score,
  showDetails = true,
  compact = false
}: VolatilityIndicatorProps) {
  // Get volatility level and styling
  const getVolatilityConfig = () => {
    if (score.volatility < 0.1) {
      return {
        level: 'Çok Düşük',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: Activity,
        description: 'Fiyat çok stabil'
      };
    } else if (score.volatility < 0.3) {
      return {
        level: 'Düşük',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: Activity,
        description: 'Normal oynaklık'
      };
    } else if (score.volatility < 0.5) {
      return {
        level: 'Orta',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        icon: Activity,
        description: 'Dikkatli olunmalı'
      };
    } else if (score.volatility < 0.7) {
      return {
        level: 'Yüksek',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        icon: AlertTriangle,
        description: 'Riskli dönem'
      };
    } else {
      return {
        level: 'Çok Yüksek',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: AlertTriangle,
        description: 'Aşırı oynaklık'
      };
    }
  };

  const getTrendIcon = () => {
    switch (score.trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      case 'fluctuating':
        return <Activity className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRecommendationColor = () => {
    switch (score.recommendation.buySignal) {
      case 'strong_buy':
        return 'text-green-700 bg-green-100 border-green-300';
      case 'buy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'hold':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'wait':
        return 'text-orange-600 bg-orange-50 border-orange-200';
    }
  };

  const config = getVolatilityConfig();
  const Icon = config.icon;

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg border
          ${config.bgColor} ${config.borderColor}
        `}
      >
        <Icon className={`h-4 w-4 ${config.color}`} />
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${config.color}`}>
            %{Math.round(score.volatility * 100)}
          </span>
          {getTrendIcon()}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Volatility Header */}
      <div className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${config.bgColor}`}>
              <Icon className={`h-6 w-6 ${config.color}`} />
            </div>
            <div>
              <h3 className={`font-semibold ${config.color}`}>
                Oynaklık: {config.level}
              </h3>
              <p className="text-sm text-gray-600">{config.description}</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${config.color}`}>
              %{Math.round(score.volatility * 100)}
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <span>Trend:</span>
              {getTrendIcon()}
            </div>
          </div>
        </div>

        {/* Price Range Bar */}
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score.volatility * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`absolute left-0 top-0 h-full ${
              score.volatility < 0.3 ? 'bg-green-500' :
              score.volatility < 0.5 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
          />
        </div>
      </div>

      {/* Recommendation */}
      <div className={`p-4 rounded-lg border-2 ${getRecommendationColor()}`}>
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold mb-1">
              {score.recommendation.buySignal === 'strong_buy' ? '🟢 Güçlü Alım Sinyali' :
               score.recommendation.buySignal === 'buy' ? '🟢 Alım Sinyali' :
               score.recommendation.buySignal === 'hold' ? '🔵 Bekle ve Gör' :
               '🟠 Beklemeye Devam'}
            </h4>
            <p className="text-sm">{score.recommendation.reason}</p>
            <p className="text-xs mt-1 opacity-75">
              Güven: %{Math.round(score.recommendation.confidence * 100)}
            </p>
          </div>
        </div>
      </div>

      {/* Price Statistics */}
      {showDetails && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Fiyat Aralığı</p>
            <p className="font-semibold">
              ₺{score.priceRange.min.toFixed(2)} - ₺{score.priceRange.max.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">
              Ortalama: ₺{score.priceRange.average.toFixed(2)}
            </p>
          </div>
          
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Standart Sapma</p>
            <p className="font-semibold">
              ₺{score.statistics.standardDeviation.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">
              CV: %{(score.statistics.coefficientOfVariation * 100).toFixed(1)}
            </p>
          </div>
        </div>
      )}

      {/* Data Info */}
      {showDetails && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Info className="h-3 w-3" />
          <span>
            Son {score.period.days} günde {score.period.dataPoints} fiyat verisi analiz edildi
          </span>
        </div>
      )}
    </motion.div>
  );
}

// Mini volatility badge for inline use
export function VolatilityBadge({ volatility }: { volatility: number }) {
  const getColor = () => {
    if (volatility < 0.1) return 'text-green-700 bg-green-100';
    if (volatility < 0.3) return 'text-blue-700 bg-blue-100';
    if (volatility < 0.5) return 'text-yellow-700 bg-yellow-100';
    if (volatility < 0.7) return 'text-orange-700 bg-orange-100';
    return 'text-red-700 bg-red-100';
  };

  return (
    <span className={`
      inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
      ${getColor()}
    `}>
      <Activity className="h-3 w-3" />
      {Math.round(volatility * 100)}%
    </span>
  );
}