'use client';

import React from 'react';
import type { MarketFusionV2 } from '@/lib/market/schema';
import { upgradeToMarketQuoteV2 } from '@/lib/market/schema';
import SourceContributionChart from './SourceContributionChart';
import ScanSummaryBadge from './ScanSummaryBadge';
import MarketComparisonTableV2 from './MarketComparisonTableV2';
import ProductRiskCard from './ProductRiskCard';

interface PriceRobotResultV6Props {
  fusion: MarketFusionV2;
  productName?: string;
}

/**
 * Price Robot Result V6 (Enterprise Edition)
 *
 * Main UI component integrating all V2 features:
 * - ✅ 3-layer product detection
 * - ✅ Multi-dimensional market scoring
 * - ✅ Price intelligence with source breakdown
 * - ✅ 5-category risk analysis
 * - ✅ Scan summary with failure tracking
 *
 * Fixes all 5 critical problems identified in VALIDATION.md
 */
export default function PriceRobotResultV6({
  fusion,
  productName
}: PriceRobotResultV6Props) {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            {productName && (
              <h2 className="text-xl font-bold text-white mb-2">
                {productName}
              </h2>
            )}
            <div className="flex items-center gap-4">
              <div>
                <span className="text-slate-400 text-sm">Final Fiyat:</span>
                <span className="text-3xl font-bold text-emerald-400 ml-2">
                  ₺{fusion.price?.toFixed(2)}
                </span>
                <span className="text-slate-500 text-sm ml-1">/ {fusion.unit}</span>
              </div>
              {fusion.conf !== undefined && (
                <div className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                  <span className="text-slate-400 text-xs">Güven:</span>
                  <span className="text-blue-400 font-semibold text-sm ml-1">
                    {(fusion.conf * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Scan Summary */}
          {fusion.scanSummary && (
            <div>
              <ScanSummaryBadge scanSummary={fusion.scanSummary} />
            </div>
          )}
        </div>

        {/* Price Intelligence (Optional) */}
        {fusion.priceIntelligence && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="font-semibold text-white">Fiyat Güveni:</span>
              <span>{(fusion.priceIntelligence.confidence * 100).toFixed(0)}%</span>
              <span className="text-slate-600">•</span>
              <span>
                {fusion.priceIntelligence.sourceContribution.realMarketData.percentage.toFixed(0)}% Market,{' '}
                {fusion.priceIntelligence.sourceContribution.aiEstimation.percentage.toFixed(0)}% AI,{' '}
                {fusion.priceIntelligence.sourceContribution.historicalTrend.percentage.toFixed(0)}% Geçmiş
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Source Contribution & Risk Analysis Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Contribution Chart */}
        {fusion.priceIntelligence?.sourceContribution && (
          <SourceContributionChart
            sourceContribution={fusion.priceIntelligence.sourceContribution}
            size="md"
          />
        )}

        {/* Risk Analysis Card */}
        {fusion.riskAnalysis && (
          <ProductRiskCard
            riskAnalysis={fusion.riskAnalysis}
            collapsed={false}
          />
        )}
      </div>

      {/* Market Comparison Table V2 */}
      {fusion.sources && fusion.sources.length > 0 && (
        <MarketComparisonTableV2 
          quotes={fusion.sources.map(q => upgradeToMarketQuoteV2(q))} 
        />
      )}

      {/* Price Intelligence Details */}
      {fusion.priceIntelligence && (
        <div className="glass-card p-6">
          <h3 className="h3 text-white flex items-center gap-2 mb-4">
            <span>📊</span>
            <span>Fiyat İstihbaratı</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Data Freshness */}
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <div className="text-xs text-slate-400 mb-2">🕒 Veri Güncelliği</div>
              <div className="text-sm text-white">
                Ortalama: <span className="font-semibold text-blue-400">{fusion.priceIntelligence.dataFreshness.averageAge.toFixed(1)} saat</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                En yeni: {fusion.priceIntelligence.dataFreshness.newestSource}
              </div>
            </div>

            {/* Price Consistency */}
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <div className="text-xs text-slate-400 mb-2">📈 Fiyat Tutarlılığı</div>
              <div className="text-sm text-white">
                Skor: <span className="font-semibold text-emerald-400">{(fusion.priceIntelligence.priceConsistency.score * 100).toFixed(0)}/100</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {fusion.priceIntelligence.priceConsistency.explanation}
              </div>
            </div>

            {/* Price Range */}
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <div className="text-xs text-slate-400 mb-2">💰 Fiyat Aralığı</div>
              <div className="text-sm text-white">
                <span className="text-green-400">₺{fusion.priceIntelligence.priceRange.min.toFixed(2)}</span>
                {' - '}
                <span className="text-red-400">₺{fusion.priceIntelligence.priceRange.max.toFixed(2)}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Ort: ₺{fusion.priceIntelligence.priceRange.avg.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Brand Options V2 */}
      {fusion.priceByBrandV2 && fusion.priceByBrandV2.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="h3 text-white flex items-center gap-2 mb-4">
            <span>🏷️</span>
            <span>Marka Seçenekleri</span>
            <span className="text-sm text-slate-400 font-normal">(Skorlara göre sıralı)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fusion.priceByBrandV2.map((brand, index) => (
              <div
                key={`brand-${index}`}
                className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-emerald-500/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-white">{brand.brand}</div>
                  <div className="px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded text-emerald-400 text-xs font-semibold">
                    {brand.marketScore}/100
                  </div>
                </div>
                <div className="text-2xl font-bold text-emerald-400">
                  ₺{brand.avgPrice.toFixed(2)}
                </div>
                <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
                  <span>{brand.source}</span>
                  <span className={`px-2 py-0.5 rounded ${
                    brand.availability === 'in_stock'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {brand.availability === 'in_stock' ? '✓ Stokta' : '✗ Yok'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
