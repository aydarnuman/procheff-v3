'use client';

import { motion } from 'framer-motion';
import {
  Search,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  Tag,
  Info,
  ChevronDown,
  ChevronUp,
  Store
} from 'lucide-react';
import type { MarketFusion, ConfidenceBreakdown } from '@/lib/market/schema';
import type { NormalizedProduct } from '@/lib/market';
import { TrendChart } from './TrendChart';
import { VolatilityIndicator } from './VolatilityIndicator';
import { BrandComparisonList } from './BrandComparisonList';
import { MarketComparisonModal } from './MarketComparisonModal';
import { useState } from 'react';

interface PriceRobotResultV4Props {
  data: MarketFusion;
  productName: string;
  normalized?: NormalizedProduct;
  onSelectVariant?: (variant: string) => void;
  onSelectAlternative?: (alternative: string) => void;
  priceHistory?: any; // Trend chart verisi
}

export function PriceRobotResultV4({
  data,
  productName,
  normalized,
  onSelectVariant,
  onSelectAlternative,
  priceHistory
}: PriceRobotResultV4Props) {
  const [expandedSection, setExpandedSection] = useState<'detection' | 'price' | 'intelligence'>('price');
  const [showMarketModal, setShowMarketModal] = useState(false);

  const toggleSection = (section: 'detection' | 'price' | 'intelligence') => {
    setExpandedSection(expandedSection === section ? 'price' : section);
  };

  // Confidence badge helper
  const getConfidenceBadge = (score: number) => {
    if (score >= 0.85) return { color: 'green', emoji: '🟢', label: 'Yüksek Güven' };
    if (score >= 0.70) return { color: 'blue', emoji: '🔵', label: 'İyi Güven' };
    if (score >= 0.50) return { color: 'yellow', emoji: '🟡', label: 'Orta Güven' };
    if (score >= 0.30) return { color: 'orange', emoji: '🟠', label: 'Düşük Güven' };
    return { color: 'red', emoji: '🔴', label: 'Çok Düşük' };
  };

  const badge = normalized ? getConfidenceBadge(normalized.confidence) : null;
  const breakdown = data.confidenceBreakdown;

  return (
    <div className="space-y-3">
      {/* ========== LAYER 1: ÜRÜN ALGILAMA (KOMPAKT) ========== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden"
      >
        <button
          onClick={() => toggleSection('detection')}
          className="w-full flex items-center justify-between p-3 hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">
              {normalized?.canonical || productName}
            </h3>
            {badge && (
              <span className={`text-xs px-2 py-0.5 rounded-full bg-${badge.color}-500/20 text-${badge.color}-300`}>
                {badge.emoji} {normalized ? (normalized.confidence * 100).toFixed(0) : 0}%
              </span>
            )}
          </div>
          {expandedSection === 'detection' ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {expandedSection === 'detection' && normalized && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 pb-3 space-y-3 border-t border-slate-700/50"
          >
            {/* Detay bilgiler */}
            <div className="flex flex-wrap gap-2 text-xs mt-3">
              {normalized.category && (
                <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-300 flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  {normalized.category}
                </span>
              )}
              {normalized.variant && (
                <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-300 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {normalized.variant}
                </span>
              )}
              <span className="px-2 py-1 rounded bg-slate-500/20 text-slate-400">
                {normalized.method === 'exact' ? '✓ Tam Eşleşme' :
                 normalized.method === 'fuzzy' ? '≈ Benzer' :
                 normalized.method === 'ai' ? '🤖 AI' : '? Varsayılan'}
              </span>
            </div>

            {/* Varyant chip selector */}
            {normalized.suggestions && normalized.suggestions.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-2">Varyantlar:</p>
                <div className="flex flex-wrap gap-2">
                  {normalized.suggestions.slice(0, 4).map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSelectVariant?.(suggestion)}
                      className="text-xs px-3 py-1.5 rounded-full bg-slate-700/50 hover:bg-indigo-600/30
                               text-slate-300 hover:text-white transition-colors
                               border border-slate-600/30 hover:border-indigo-500/50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Alternatifler (kategori filtreli) */}
            {normalized.alternatives && normalized.alternatives.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-2">Benzer Ürünler (aynı kategori):</p>
                <div className="flex flex-wrap gap-2">
                  {normalized.alternatives.slice(0, 3).map((alt, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSelectAlternative?.(alt)}
                      className="text-xs px-3 py-1.5 rounded-full bg-slate-700/30 hover:bg-yellow-600/20
                               text-slate-400 hover:text-white transition-colors
                               border border-slate-600/20 hover:border-yellow-500/30"
                    >
                      {alt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* ========== LAYER 2: FİYAT & TREND (GENIŞLETILMIŞ) ========== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card overflow-hidden"
      >
        <button
          onClick={() => toggleSection('price')}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            {data.volatility?.trend === 'rising' && <TrendingUp className="w-5 h-5 text-red-400" />}
            {data.volatility?.trend === 'falling' && <TrendingDown className="w-5 h-5 text-green-400" />}
            {data.volatility?.trend === 'stable' && <Minus className="w-5 h-5 text-blue-400" />}
            <div>
              <h3 className="text-2xl font-bold text-white">
                {data.price.toFixed(2)} TL
              </h3>
              <p className="text-xs text-slate-400">
                {data.unit} başına • {data.sources.length} kaynak
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMarketModal(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 
                         text-indigo-300 hover:text-indigo-200 transition-all text-sm
                         flex items-center gap-1.5"
            >
              <Store className="w-4 h-4" />
              Market Karşılaştır
            </button>
            {expandedSection === 'price' ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </button>

        {expandedSection === 'price' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-4 space-y-4 border-t border-slate-700/50"
          >
            {/* 30 günlük trend chart */}
            {priceHistory && priceHistory.series && priceHistory.series.length > 0 && (
              <div className="mt-4">
                <TrendChart
                  data={priceHistory.series}
                  productName={productName}
                  stats={priceHistory.stats}
                />
              </div>
            )}

            {/* Volatility indicator */}
            {data.volatility && (
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Fiyat Volatilitesi
                </h4>
                <VolatilityIndicator volatility={data.volatility} />
              </div>
            )}

            {/* Brand comparison */}
            {data.priceByBrand && data.priceByBrand.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Marka Karşılaştırması
                </h4>
                <BrandComparisonList brands={data.priceByBrand} />
              </div>
            )}

            {/* Forecast (opsiyonel) */}
            {data.forecast && (
              <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-semibold text-indigo-300">
                    Gelecek Ay Tahmini
                  </h4>
                </div>
                <p className="text-lg font-bold text-white">
                  {data.forecast.nextMonth.toFixed(2)} TL
                </p>
                <p className="text-xs text-slate-400">
                  %{(data.forecast.conf * 100).toFixed(0)} güven • {data.forecast.method}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* ========== LAYER 3: AI INTELLIGENCE (CONFIDENCE BREAKDOWN) ========== */}
      {breakdown && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card overflow-hidden border border-purple-500/30"
        >
          <button
            onClick={() => toggleSection('intelligence')}
            className="w-full flex items-center justify-between p-3 hover:bg-slate-800/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">AI Intelligence</h3>
              <span className="text-xs text-slate-400">
                %{(breakdown.weighted * 100).toFixed(0)} toplam güven
              </span>
            </div>
            {expandedSection === 'intelligence' ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {expandedSection === 'intelligence' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 pb-3 space-y-3 border-t border-purple-700/50"
            >
              {/* Confidence breakdown grid */}
              <div className="grid grid-cols-3 gap-3 mt-3">
                {/* Kategori */}
                <div className="text-center p-2 rounded bg-purple-500/10 border border-purple-500/30">
                  <p className="text-xs text-slate-400 mb-1">Kategori</p>
                  <p className="text-lg font-bold text-white">
                    {(breakdown.category * 100).toFixed(0)}%
                  </p>
                  <div className="w-full bg-slate-700/50 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-purple-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${breakdown.category * 100}%` }}
                    />
                  </div>
                </div>

                {/* Varyant */}
                <div className="text-center p-2 rounded bg-blue-500/10 border border-blue-500/30">
                  <p className="text-xs text-slate-400 mb-1">Varyant</p>
                  <p className="text-lg font-bold text-white">
                    {(breakdown.variant * 100).toFixed(0)}%
                  </p>
                  <div className="w-full bg-slate-700/50 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${breakdown.variant * 100}%` }}
                    />
                  </div>
                </div>

                {/* Fiyat */}
                <div className="text-center p-2 rounded bg-green-500/10 border border-green-500/30">
                  <p className="text-xs text-slate-400 mb-1">Fiyat</p>
                  <p className="text-lg font-bold text-white">
                    {(breakdown.marketPrice * 100).toFixed(0)}%
                  </p>
                  <div className="w-full bg-slate-700/50 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-green-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${breakdown.marketPrice * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Açıklama */}
              {breakdown.explanation && (
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-start gap-2">
                    {breakdown.weighted >= 0.7 ? (
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm text-slate-300">
                      {breakdown.explanation}
                    </p>
                  </div>
                </div>
              )}

              {/* Düşük güven uyarısı */}
              {breakdown.weighted < 0.5 && (
                <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-orange-300 mb-1">
                        Düşük Güven Skoru Tespit Edildi
                      </p>
                      <p className="text-xs text-slate-400">
                        Bu sonuçları dikkatle değerlendirin. Daha spesifik bir arama yapabilir
                        veya yukarıdaki varyantlardan birini seçebilirsiniz.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Market Karşılaştırma Modalı */}
      <MarketComparisonModal
        isOpen={showMarketModal}
        onClose={() => setShowMarketModal(false)}
        productName={normalized?.canonical || productName}
        productKey={data.product_key}
        aiPrice={data.price}
        aiConfidence={data.conf}
      />
    </div>
  );
}
