'use client';

/**
 * PriceRobotResultV5 - Kurumsal Profesyonel Piyasa Robotu UI
 *
 * 3 Katmanlı Mimari:
 * 1. Ürün Algılama - Ultra kompakt, collapse default kapalı
 * 2. Fiyat & Trend - Ana odak, inline chart, volatility, market comparison
 * 3. AI Intelligence - Detaylı confidence breakdown, kurumsal açıklamalar
 * 4. Varyant Seçici - Kategori-filtreli chip selector
 *
 * @version 5.0.0 - Kurumsal Mature Product Design
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Info,
  Sparkles,
  Package,
  Tag,
  Store,
  LineChart
} from 'lucide-react';
import type { MarketFusion} from '@/lib/market/schema';
import type { NormalizedProduct } from '@/lib/market';

interface PriceRobotResultV5Props {
  data: MarketFusion;
  productName: string;
  normalized?: NormalizedProduct;
  onSelectVariant?: (variant: string) => void;
  onSelectAlternative?: (alternative: string) => void;
  priceHistory?: { series: any[]; stats: any }; // Trend chart data
}

export function PriceRobotResultV5({
  data,
  productName,
  normalized,
  onSelectVariant,
  onSelectAlternative,
  priceHistory
}: PriceRobotResultV5Props) {
  const [showDetection, setShowDetection] = useState(false);
  const [showIntelligence, setShowIntelligence] = useState(false);

  // Güven rozeti helper
  const getConfidenceBadge = (score: number) => {
    if (score >= 0.85) return { color: 'green', emoji: '🟢', label: 'Çok Yüksek', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' };
    if (score >= 0.70) return { color: 'blue', emoji: '🔵', label: 'Yüksek', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' };
    if (score >= 0.50) return { color: 'yellow', emoji: '🟡', label: 'Orta', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' };
    if (score >= 0.30) return { color: 'orange', emoji: '🟠', label: 'Düşük', bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' };
    return { color: 'red', emoji: '🔴', label: 'Çok Düşük', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };
  };

  const badge = normalized ? getConfidenceBadge(normalized.confidence) : null;
  const breakdown = data.confidenceBreakdown;

  // Yazım hatası tespit
  const hasTypoCorrection = normalized?.canonical.toLowerCase() !== productName.toLowerCase();

  // Fiyat aralığı
  const prices = data.sources.map(s => s.unit_price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

  return (
    <div className="space-y-4">
      {/* ========================================
          KATMAN 1: ÜRÜN ALGILAMA (ULTRA KOMPAKT)
      ======================================== */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden border border-slate-700/50"
      >
        <button
          onClick={() => setShowDetection(!showDetection)}
          className="w-full p-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Package className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">
                  {normalized?.canonical || productName}
                </h3>
                {badge && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${badge.bg} ${badge.text} ${badge.border} border flex items-center gap-1`}>
                    <span>{badge.emoji}</span>
                    <span>%{(normalized!.confidence * 100).toFixed(0)}</span>
                  </span>
                )}
              </div>
              {normalized?.category && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {normalized.category}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasTypoCorrection && (
              <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/30">
                ⚠️ Düzeltildi
              </span>
            )}
            {showDetection ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </button>

        <AnimatePresence>
          {showDetection && normalized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-slate-700/50"
            >
              <div className="p-4 space-y-3">
                {/* Yazım hatası düzeltme feedback */}
                {hasTypoCorrection && (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-yellow-300 mb-1">
                          Yazım Hatası Düzeltildi
                        </p>
                        <p className="text-xs text-slate-300">
                          <span className="line-through text-slate-500">{productName}</span>
                          {' → '}
                          <span className="text-green-400 font-medium">{normalized.canonical}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tespit detayları */}
                <div className="flex flex-wrap gap-2 text-xs">
                  {normalized.category && (
                    <div className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 flex items-center gap-1.5 border border-purple-500/30">
                      <Package className="w-3 h-3" />
                      {normalized.category}
                    </div>
                  )}
                  {normalized.variant && (
                    <div className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 flex items-center gap-1.5 border border-blue-500/30">
                      <Tag className="w-3 h-3" />
                      {normalized.variant}
                    </div>
                  )}
                  <div className="px-3 py-1.5 rounded-lg bg-slate-500/20 text-slate-300 border border-slate-500/30">
                    {normalized.method === 'exact' ? '✓ Tam Eşleşme' :
                     normalized.method === 'fuzzy' ? '≈ Benzer Eşleşme' :
                     normalized.method === 'ai' ? '🤖 AI Tahmin' : '? Varsayılan'}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ========================================
          KATMAN 2: FİYAT & TREND (ANA ODAK)
      ======================================== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6 md:p-8 border border-slate-700/50"
      >
        {/* Ana Fiyat Display */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-6xl md:text-7xl font-bold text-white tracking-tight">
                  {data.price.toFixed(2)}
                </span>
                <div className="flex flex-col">
                  <span className="text-2xl text-slate-400 font-medium">TL</span>
                  <span className="text-sm text-slate-500">/ {data.unit}</span>
                </div>
              </div>
              <p className="text-sm text-slate-400">
                {data.sources.length} kaynaktan hesaplandı
              </p>
            </div>

            {/* Trend badge */}
            {data.volatility && (
              <div className="flex items-center gap-2">
                {data.volatility.trend === 'rising' && (
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30">
                    <TrendingUp className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-medium text-red-300">Yükseliyor</span>
                  </div>
                )}
                {data.volatility.trend === 'falling' && (
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30">
                    <TrendingDown className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-medium text-green-300">Düşüyor</span>
                  </div>
                )}
                {data.volatility.trend === 'stable' && (
                  <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <Minus className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-medium text-blue-300">Sabit</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fiyat Aralığı Özet */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-xs text-slate-400 mb-1">En Düşük</p>
              <p className="text-lg font-bold text-green-400">{minPrice.toFixed(2)} TL</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <p className="text-xs text-slate-400 mb-1">Ortalama</p>
              <p className="text-lg font-bold text-blue-400">{avgPrice.toFixed(2)} TL</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-xs text-slate-400 mb-1">En Yüksek</p>
              <p className="text-lg font-bold text-red-400">{maxPrice.toFixed(2)} TL</p>
            </div>
          </div>
        </div>

        {/* Volatility Bar */}
        {data.volatility && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Fiyat Volatilitesi
              </h4>
              <span className="text-sm font-bold text-amber-400">
                {data.volatility.score > 0.7 ? 'YÜKSEK' : data.volatility.score > 0.4 ? 'ORTA' : 'DÜŞÜK'}
              </span>
            </div>
            <div className="relative w-full h-3 bg-slate-800/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${data.volatility.score * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full ${
                  data.volatility.score > 0.7 ? 'bg-red-500' :
                  data.volatility.score > 0.4 ? 'bg-amber-500' :
                  'bg-green-500'
                }`}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Ortalama günlük değişim: {data.volatility.avgDailyChange?.toFixed(2) || '0'}%
            </p>
          </div>
        )}

        {/* Market Comparison */}
        {data.priceByBrand && data.priceByBrand.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Store className="w-4 h-4" />
                Market Karşılaştırması
              </h4>
            </div>
            <div className="space-y-2">
              {data.priceByBrand.slice(0, 5).map((brand, idx) => {
                const isLowest = brand.price === minPrice;
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                      isLowest
                        ? 'bg-green-500/20 border-2 border-green-500/50'
                        : 'bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base font-medium text-white">{brand.brand}</span>
                      {isLowest && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/30 text-green-300 border border-green-500/50">
                          ✓ En Ucuz
                        </span>
                      )}
                    </div>
                    <span className={`text-lg font-bold ${isLowest ? 'text-green-400' : 'text-white'}`}>
                      {brand.price.toFixed(2)} TL
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Inline Trend Chart */}
        {priceHistory && priceHistory.series && priceHistory.series.length > 0 && (
          <div className="mt-6 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-3">
              <LineChart className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                30 Günlük Trend
              </h4>
            </div>
            {/* TrendChart component - zaten mevcut */}
            <div className="h-[200px]">
              <p className="text-xs text-slate-500 text-center py-8">
                Trend chart burada render edilecek (mevcut TrendChart komponenti)
              </p>
            </div>
          </div>
        )}

        {/* Forecast (opsiyonel) */}
        {data.forecast && (
          <div className="mt-4 p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Gelecek Ay Tahmini</p>
                <p className="text-2xl font-bold text-indigo-300">
                  {data.forecast.nextMonth.toFixed(2)} TL
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Güven</p>
                <p className="text-lg font-semibold text-indigo-400">
                  %{(data.forecast.conf * 100).toFixed(0)}
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* ========================================
          KATMAN 3: AI INTELLIGENCE (DETAYLI)
      ======================================== */}
      {breakdown && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card overflow-hidden border border-purple-500/30"
        >
          <button
            onClick={() => setShowIntelligence(!showIntelligence)}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <div className="text-left">
                <h3 className="text-base font-semibold text-white">AI Güven Analizi</h3>
                <p className="text-xs text-slate-400">
                  Toplam Güven: %{(breakdown.weighted * 100).toFixed(0)}
                </p>
              </div>
            </div>
            {showIntelligence ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          <AnimatePresence>
            {showIntelligence && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-purple-700/50"
              >
                <div className="p-6 space-y-6">
                  {/* Confidence Breakdown Progress Bars */}
                  <div>
                    <h5 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-4">
                      Güven Skoru Detayları
                    </h5>

                    {/* Kategori */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-300">📦 Kategori Tespiti</span>
                        <span className="text-sm font-bold text-purple-400">
                          %{(breakdown.category * 100).toFixed(0)}
                        </span>
                      </div>
                      <div className="relative w-full h-2 bg-slate-800/50 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${breakdown.category * 100}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-purple-500 to-purple-400"
                        />
                      </div>
                    </div>

                    {/* Varyant */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-300">🔁 Varyant Eşleşmesi</span>
                        <span className="text-sm font-bold text-blue-400">
                          %{(breakdown.variant * 100).toFixed(0)}
                        </span>
                      </div>
                      <div className="relative w-full h-2 bg-slate-800/50 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${breakdown.variant * 100}%` }}
                          transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
                        />
                      </div>
                    </div>

                    {/* Fiyat */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-300">💰 Piyasa Fiyatı</span>
                        <span className="text-sm font-bold text-green-400">
                          %{(breakdown.marketPrice * 100).toFixed(0)}
                        </span>
                      </div>
                      <div className="relative w-full h-2 bg-slate-800/50 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${breakdown.marketPrice * 100}%` }}
                          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-green-500 to-green-400"
                        />
                      </div>
                    </div>

                    {/* Toplam */}
                    <div className="pt-4 border-t border-slate-700/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-base font-semibold text-white">🎯 Toplam Güven Skoru</span>
                        <span className="text-xl font-bold text-indigo-400">
                          %{(breakdown.weighted * 100).toFixed(0)}
                        </span>
                      </div>
                      <div className="relative w-full h-3 bg-slate-800/50 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${breakdown.weighted * 100}%` }}
                          transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Kurumsal Açıklama */}
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <div className="flex items-start gap-3">
                      {breakdown.weighted >= 0.7 ? (
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <h6 className="text-sm font-semibold text-white mb-2">
                          {breakdown.weighted >= 0.85 ? 'Yüksek Güvenilirlik' :
                           breakdown.weighted >= 0.70 ? 'Orta-Yüksek Güvenilirlik' :
                           breakdown.weighted >= 0.50 ? 'Orta Güvenilirlik' :
                           'Düşük Güvenilirlik'}
                        </h6>
                        <p className="text-sm text-slate-300 leading-relaxed">
                          {breakdown.explanation || 'Güven skoru detayları hesaplanıyor...'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Düşük güven uyarısı + Öneriler */}
                  {breakdown.weighted < 0.7 && (
                    <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h6 className="text-sm font-semibold text-orange-300 mb-2">
                            İyileştirme Önerileri
                          </h6>
                          <ul className="text-sm text-slate-300 space-y-1">
                            {breakdown.variant < 0.5 && (
                              <li>• Daha spesifik ürün adı kullanın (örn: &quot;tavuk&quot; yerine &quot;tavuk göğsü&quot;)</li>
                            )}
                            {breakdown.category < 0.5 && (
                              <li>• Ürün kategorisini netleştirin (örn: &quot;et&quot; yerine &quot;kırmızı et&quot;)</li>
                            )}
                            {breakdown.marketPrice < 0.5 && (
                              <li>• Piyasa verisi sınırlı, alternatif varyantları deneyin</li>
                            )}
                            {hasTypoCorrection && (
                              <li>• Yazım hatası düzeltildi, sonuçlar kontrol edilmelidir</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Kategori Filtresi Açıklaması */}
                  {normalized?.category && (
                    <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h6 className="text-sm font-semibold text-indigo-300 mb-2">
                            Kategori Filtresi Aktif
                          </h6>
                          <p className="text-sm text-slate-300">
                            Alternatif ürünler <strong>&quot;{normalized.category}&quot;</strong> kategorisi içinde filtrelendi.
                            Bu, daha alakalı önerilerin sunulmasını sağlar ve hatalı eşleşmeleri önler.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ========================================
          KATMAN 4: VARYANT SEÇİCİ (CHIP SELECTOR)
      ======================================== */}
      {normalized && ((normalized.suggestions && normalized.suggestions.length > 0) || (normalized.alternatives && normalized.alternatives.length > 0)) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Varyantlar & Alternatifler
          </h4>

          <div className="flex flex-wrap gap-2">
            {/* Kategori Chip (Pasif) */}
            {normalized.category && (
              <div className="px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-sm font-medium text-indigo-300 flex items-center gap-2">
                <Package className="w-4 h-4" />
                {normalized.category}
              </div>
            )}

            {/* Varyant Chips (Tıklanabilir, Blue) */}
            {normalized.suggestions?.map((variant: string, idx: number) => (
              <button
                key={`variant-${idx}`}
                onClick={() => onSelectVariant?.(variant)}
                className="
                  px-4 py-2 rounded-lg
                  bg-blue-500/10 hover:bg-blue-500/20
                  border border-blue-500/30 hover:border-blue-500/50
                  text-sm font-medium text-blue-300 hover:text-blue-200
                  transition-all duration-200
                  hover:scale-105 active:scale-95
                  flex items-center gap-2
                "
              >
                <Tag className="w-3 h-3" />
                {variant}
              </button>
            ))}

            {/* Alternatif Chips (Tıklanabilir, Purple) */}
            {normalized.alternatives?.map((alt: string, idx: number) => (
              <button
                key={`alt-${idx}`}
                onClick={() => onSelectAlternative?.(alt)}
                className="
                  px-4 py-2 rounded-lg
                  bg-purple-500/10 hover:bg-purple-500/20
                  border border-purple-500/30 hover:border-purple-500/50
                  text-sm font-medium text-purple-300 hover:text-purple-200
                  transition-all duration-200
                  hover:scale-105 active:scale-95
                  flex items-center gap-2
                "
              >
                <Sparkles className="w-3 h-3" />
                {alt}
              </button>
            ))}
          </div>

          {/* Kategori Filtresi Bilgilendirme */}
          {normalized.category && normalized.alternatives && normalized.alternatives.length > 0 && (
            <p className="text-xs text-slate-500">
              ℹ️ Alternatifler <strong>{normalized.category}</strong> kategorisi içinde filtrelenmiştir.
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
