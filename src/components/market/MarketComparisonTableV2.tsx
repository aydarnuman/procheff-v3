'use client';

import React, { useState } from 'react';
import type { MarketQuoteV2 } from '@/lib/market/schema';
import { getScoreTierColor } from '@/lib/market/scoring';

interface MarketComparisonTableV2Props {
  quotes: Array<MarketQuoteV2 & { marketScore?: any }>;
}

type SortField = 'overall' | 'price' | 'reliability' | 'completeness' | 'stock' | 'recency' | 'unit_price';
type SortDirection = 'asc' | 'desc';

/**
 * Market Comparison Table V2 (Multi-Dimensional Scoring)
 *
 * Shows all markets with 5-factor scoring breakdown:
 * - Price Score (35%)
 * - Reliability Score (25%)
 * - Completeness Score (15%)
 * - Stock Score (15%)
 * - Recency Score (10%)
 *
 * Fixes: "Tek boyutlu market sıralaması (sadece fiyat)" problemi
 *
 * **Features:**
 * - 🎯 Overall score (0-100) with color coding
 * - 📊 Individual score breakdown
 * - ↕️ Sortable columns
 * - 🏆 Best score highlighting
 * - 📝 Human-readable breakdown
 */
export default function MarketComparisonTableV2({
  quotes
}: MarketComparisonTableV2Props) {
  const [sortField, setSortField] = useState<SortField>('overall');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sort quotes
  const sortedQuotes = [...quotes].sort((a, b) => {
    let aValue: number;
    let bValue: number;

    if (sortField === 'unit_price') {
      aValue = a.unit_price;
      bValue = b.unit_price;
    } else if (sortField === 'overall') {
      aValue = a.marketScore?.overall || 0;
      bValue = b.marketScore?.overall || 0;
    } else {
      const scoreKey = `${sortField}Score` as keyof typeof a.marketScore;
      aValue = a.marketScore?.[scoreKey] || 0;
      bValue = b.marketScore?.[scoreKey] || 0;
    }

    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
  });

  // Find best score
  const bestOverallScore = Math.max(...quotes.map(q => q.marketScore?.overall || 0));

  // Column header component
  const ColumnHeader = ({ field, label, width }: { field: SortField; label: string; width?: string }) => (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-700/30 transition-colors ${width || ''}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {sortField === field && (
          <span className="text-emerald-400">
            {sortDirection === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  );

  // Score badge component
  const ScoreBadge = ({ score, label }: { score: number; label?: string }) => {
    const tier = getScoreTierColor(score);
    const bgColor = {
      green: 'bg-emerald-500/20 border-emerald-500/30',
      blue: 'bg-blue-500/20 border-blue-500/30',
      yellow: 'bg-yellow-500/20 border-yellow-500/30',
      orange: 'bg-orange-500/20 border-orange-500/30',
      red: 'bg-red-500/20 border-red-500/30'
    }[tier.color];

    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded border ${bgColor}`}>
        <span>{tier.emoji}</span>
        <span className="text-white font-semibold text-sm">{score}</span>
        {label && <span className="text-slate-400 text-xs">/ 100</span>}
      </div>
    );
  };

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <h3 className="h3 text-white flex items-center gap-2">
          <span>🏪</span>
          <span>Market Karşılaştırması (V2)</span>
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          5 boyutlu skorlama sistemi - Tıklayarak sırala
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-800/50">
            <tr>
              <ColumnHeader field="overall" label="Genel Skor" width="w-32" />
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Market
              </th>
              <ColumnHeader field="unit_price" label="Fiyat" width="w-24" />
              <ColumnHeader field="price" label="Fiyat S." width="w-20" />
              <ColumnHeader field="reliability" label="Güvenilirlik S." width="w-28" />
              <ColumnHeader field="completeness" label="Tamlık S." width="w-24" />
              <ColumnHeader field="stock" label="Stok S." width="w-20" />
              <ColumnHeader field="recency" label="Güncellik S." width="w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {sortedQuotes.map((quote, index) => {
              const isBest = quote.marketScore?.overall === bestOverallScore;

              return (
                <tr
                  key={`quote-${index}`}
                  className={`hover:bg-slate-700/30 transition-colors ${isBest ? 'bg-emerald-500/5' : ''}`}
                >
                  {/* Overall Score */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ScoreBadge score={quote.marketScore?.overall || 0} label="overall" />
                      {isBest && <span className="text-emerald-400 text-sm">🏆</span>}
                    </div>
                  </td>

                  {/* Market Name */}
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-semibold text-white">{quote.source}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {quote.marketScore?.breakdown}
                      </div>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="px-4 py-3">
                    <span className="text-emerald-400 font-semibold">
                      ₺{quote.unit_price.toFixed(2)}
                    </span>
                  </td>

                  {/* Price Score */}
                  <td className="px-4 py-3">
                    <ScoreBadge score={quote.marketScore?.priceScore || 0} />
                  </td>

                  {/* Reliability Score */}
                  <td className="px-4 py-3">
                    <ScoreBadge score={quote.marketScore?.reliabilityScore || 0} />
                  </td>

                  {/* Completeness Score */}
                  <td className="px-4 py-3">
                    <ScoreBadge score={quote.marketScore?.completenessScore || 0} />
                  </td>

                  {/* Stock Score */}
                  <td className="px-4 py-3">
                    <ScoreBadge score={quote.marketScore?.stockScore || 0} />
                  </td>

                  {/* Recency Score */}
                  <td className="px-4 py-3">
                    <ScoreBadge score={quote.marketScore?.recencyScore || 0} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="p-4 bg-slate-800/30 border-t border-slate-700">
        <div className="flex flex-wrap gap-4 text-xs text-slate-400">
          <div>
            <span className="font-semibold text-white">Fiyat S.</span> (35%): En düşük fiyat = 100
          </div>
          <div>
            <span className="font-semibold text-white">Güvenilirlik S.</span> (25%): Kaynak + scraper health
          </div>
          <div>
            <span className="font-semibold text-white">Tamlık S.</span> (15%): Veri eksiksizliği
          </div>
          <div>
            <span className="font-semibold text-white">Stok S.</span> (15%): Stok durumu
          </div>
          <div>
            <span className="font-semibold text-white">Güncellik S.</span> (10%): Veri yaşı
          </div>
        </div>
      </div>
    </div>
  );
}
