'use client';

import { useState } from 'react';
import { MarketFusion } from '@/lib/market/schema';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PriceCardV31Props {
  data: MarketFusion;
  productName: string;
}

export function PriceCardV31({ data, productName }: PriceCardV31Props) {
  const [showDetails, setShowDetails] = useState(false);

  // Güven rozeti rengi
  const getConfidenceBadge = (conf: number) => {
    if (conf >= 0.8) return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' };
    if (conf >= 0.6) return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' };
    return { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' };
  };

  const badge = getConfidenceBadge(data.conf);

  // Kaynak emoji
  const getSourceEmoji = (source: string) => {
    switch (source) {
      case 'AI': return '🤖';
      case 'DB': return '📦';
      case 'TUIK': return '🛒';
      case 'WEB': return '🌐';
      default: return '📊';
    }
  };

  // Fiyat aralığı
  const prices = data.sources.map(s => s.unit_price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="
        relative
        bg-[#0D0F16]/60
        backdrop-blur-xl
        rounded-2xl
        border border-white/10
        shadow-[0_0_50px_-15px_rgba(0,0,0,0.4)]
        hover:border-white/20
        hover:shadow-[0_0_60px_-10px_rgba(99,102,241,0.3)]
        transition-all duration-500
        overflow-hidden
      "
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 pointer-events-none" />
      
      <div className="relative p-6 md:p-8">
        {/* Header: Ürün Adı + Güven (tek satır) */}
        <div className="flex items-start justify-between mb-6 pb-4 border-b border-white/10">
          <div className="flex-1 min-w-0">
            <h3 className="text-3xl font-bold text-white mb-2 truncate">
              {productName}
            </h3>
            <p className="text-sm text-slate-400">Birim: {data.unit}</p>
          </div>
          
          {/* Güven rozeti - sağda */}
          <div className={`ml-4 px-4 py-2 rounded-xl border ${badge.border} ${badge.bg} backdrop-blur-sm flex-shrink-0`}>
            <div className="text-xs font-medium text-slate-400 mb-0.5">Güven</div>
            <div className={`text-2xl font-bold ${badge.text}`}>
              %{(data.conf * 100).toFixed(0)}
            </div>
          </div>
        </div>

        {/* Ana Fiyat - Premium Format */}
        <div className="mb-8">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-sm font-medium text-slate-400">Ortalama Fiyat</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-6xl font-bold text-white tracking-tight">
              {data.price.toFixed(2)}
            </span>
            <div className="flex flex-col">
              <span className="text-xl text-slate-400 font-medium">TL</span>
              <span className="text-sm text-slate-500">/ {data.unit}</span>
            </div>
          </div>
        </div>

        {/* Fiyat Aralığı - Compact */}
        <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Fiyat Aralığı:</span>
            <span className="text-white font-semibold">
              {minPrice.toFixed(2)} - {maxPrice.toFixed(2)} TL
            </span>
          </div>
        </div>

        {/* Kaynaklar - Tek Satır Format */}
        <div className="mb-6 space-y-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Kaynaklar ({data.sources.length})
          </h4>
          {data.sources.map((source, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{getSourceEmoji(source.source)}</span>
                <span className="text-sm text-slate-300">{source.source}</span>
                {source.sourceTrust && (
                  <span className="text-xs text-slate-500">
                    (%{(source.sourceTrust * 100).toFixed(0)} güven)
                  </span>
                )}
              </div>
              <span className="text-base font-semibold text-white">
                {source.unit_price.toFixed(2)} TL
              </span>
            </div>
          ))}
        </div>

        {/* Volatility varsa göster */}
        {data.volatility && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Volatilite</span>
              <span className="text-lg font-bold text-amber-400">
                {data.volatility.level.toUpperCase()}
              </span>
            </div>
          </div>
        )}

        {/* Detaylı Analiz - Collapsible */}
        <div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="
              w-full flex items-center justify-between 
              py-3 px-4 rounded-xl 
              bg-white/5 hover:bg-white/10 
              transition-all duration-200
              text-slate-300 hover:text-white
              border border-white/10 hover:border-white/20
            "
          >
            <span className="text-sm font-semibold">Detaylı Analiz</span>
            {showDetails ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>

          <AnimatePresence>
            {showDetails && data.confidenceBreakdown && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-4 p-6 rounded-xl bg-white/5 border border-white/10 space-y-4">
                  <h5 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                    Güven Skoru Detayı
                  </h5>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs text-slate-400 mb-1">Kategori</p>
                      <p className="text-xl font-bold text-white">
                        %{(data.confidenceBreakdown.category * 100).toFixed(0)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs text-slate-400 mb-1">Varyant</p>
                      <p className="text-xl font-bold text-white">
                        %{(data.confidenceBreakdown.variant * 100).toFixed(0)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs text-slate-400 mb-1">Fiyat</p>
                      <p className="text-xl font-bold text-white">
                        %{(data.confidenceBreakdown.marketPrice * 100).toFixed(0)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-indigo-500/20 border border-indigo-500/30">
                      <p className="text-xs text-slate-400 mb-1">Toplam</p>
                      <p className="text-xl font-bold text-indigo-400">
                        %{(data.confidenceBreakdown.weighted * 100).toFixed(0)}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {data.confidenceBreakdown.explanation}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
