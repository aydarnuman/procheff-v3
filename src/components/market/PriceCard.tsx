'use client';

import { MarketFusion } from '@/lib/market/schema';
import { TrendingUp, TrendingDown, Minus, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';

interface PriceCardProps {
  data: MarketFusion;
  productName: string;
}

export function PriceCard({ data, productName }: PriceCardProps) {
  // Güven skoru rengi
  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-green-400';
    if (conf >= 0.6) return 'text-yellow-400';
    return 'text-orange-400';
  };

  // Güven rozeti
  const getConfidenceBadge = (conf: number) => {
    if (conf >= 0.8) return 'bg-green-500/20 text-green-300 border-green-500/40';
    if (conf >= 0.6) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
    return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
  };

  // Kaynak ikonu
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'TUIK':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'DB':
        return <CheckCircle2 className="w-4 h-4 text-blue-400" />;
      case 'WEB':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card border border-indigo-500/30 hover:border-indigo-500/50 transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">{productName}</h3>
          <p className="text-sm text-slate-400">{data.unit} başına fiyat</p>
        </div>
        <span
          className={`px-3 py-1 rounded-lg border text-xs font-bold ${getConfidenceBadge(data.conf)}`}
        >
          Güven: {(data.conf * 100).toFixed(0)}%
        </span>
      </div>

      {/* Fiyat */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-white">{data.price.toFixed(2)}</span>
          <span className="text-xl text-slate-400">₺</span>
          <span className="text-sm text-slate-500">/ {data.unit}</span>
        </div>
      </div>

      {/* Kaynak Katkıları */}
      <div className="mb-6">
        <h4 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
          Kaynak Katkısı
        </h4>
        <div className="space-y-2">
          {data.sources.map((source, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 border border-slate-700/40"
            >
              <div className="flex items-center gap-2">
                {getSourceIcon(source.source)}
                <span className="text-sm text-slate-300">{source.source}</span>
              </div>
              <span className="text-sm font-medium text-white">
                {source.unit_price.toFixed(2)} ₺
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tahmin (varsa) */}
      {data.forecast && (
        <div className="pt-4 border-t border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">Gelecek Ay Tahmini</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-indigo-300">
                  {data.forecast.nextMonth.toFixed(2)} ₺
                </span>
                {data.forecast.nextMonth > data.price ? (
                  <TrendingUp className="w-4 h-4 text-red-400" />
                ) : data.forecast.nextMonth < data.price ? (
                  <TrendingDown className="w-4 h-4 text-green-400" />
                ) : (
                  <Minus className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Güven</p>
              <span className={`text-sm font-medium ${getConfidenceColor(data.forecast.conf)}`}>
                {(data.forecast.conf * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
