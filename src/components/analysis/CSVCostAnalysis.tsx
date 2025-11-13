'use client';

import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle, X } from 'lucide-react';
import type { MarketAnalysis } from '@/lib/tender-analysis/types';

interface CSVCostAnalysisProps {
  analysis: MarketAnalysis;
  fileName: string;
  onRemove?: () => void;
}

export function CSVCostAnalysis({ analysis, fileName, onRemove }: CSVCostAnalysisProps) {
  const totalCost = analysis.total_cost || 0;
  const costItems = analysis.cost_items || [];
  const comparison = analysis.comparison;
  const warnings = analysis.warnings || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 rounded-xl p-6 border border-emerald-500/30 shadow-lg"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <DollarSign className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{fileName}</h3>
            <p className="text-sm text-slate-400">CSV Maliyet Analizi</p>
          </div>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
            title="Kaldır"
          >
            <X className="w-5 h-5 text-red-400" />
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-emerald-500/20">
          <div className="text-xs text-slate-400 mb-1">Toplam Maliyet</div>
          <div className="text-2xl font-bold text-emerald-400">
            {totalCost.toLocaleString('tr-TR', { 
              style: 'currency', 
              currency: 'TRY',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            })}
          </div>
        </div>

        {comparison && (
          <>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-blue-500/20">
              <div className="text-xs text-slate-400 mb-1">Risk Seviyesi</div>
              <div className={`text-xl font-bold ${
                comparison.risk_level === 'safe' ? 'text-green-400' :
                comparison.risk_level === 'tight' ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {comparison.risk_level === 'safe' ? 'Düşük' :
                 comparison.risk_level === 'tight' ? 'Orta' :
                 'Yüksek'}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 border border-purple-500/20">
              <div className="text-xs text-slate-400 mb-1">Sapma</div>
              <div className={`text-xl font-bold ${
                comparison.budget_vs_calculated > 0 ? 'text-red-400' : 'text-green-400'
              }`}>
                {comparison.budget_vs_calculated > 0 ? '+' : ''}
                {comparison.budget_vs_calculated.toFixed(1)}%
              </div>
            </div>
          </>
        )}
      </div>

      {/* Cost Items */}
      {costItems.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Maliyet Kalemleri ({costItems.length})
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {costItems.slice(0, 10).map((item, index) => (
              <div
                key={index}
                className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50 flex justify-between items-center"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{item.name_original}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {item.quantity} {item.unit} × {item.unit_price.toLocaleString('tr-TR')} ₺
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-sm font-bold text-emerald-400">
                    {item.total_price.toLocaleString('tr-TR', {
                      style: 'currency',
                      currency: 'TRY',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })}
                  </div>
                  <div className="text-xs text-slate-500">
                    {Math.round(item.confidence * 100)}% güven
                  </div>
                </div>
              </div>
            ))}
            {costItems.length > 10 && (
              <div className="text-center text-xs text-slate-500 py-2">
                +{costItems.length - 10} kalem daha...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h4 className="text-sm font-semibold text-yellow-400">Uyarılar</h4>
          </div>
          <ul className="space-y-1">
            {warnings.map((warning, index) => (
              <li key={index} className="text-sm text-yellow-300">
                • {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Forecast */}
      {analysis.forecast && (
        <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <h4 className="text-sm font-semibold text-blue-400">Tahmin</h4>
          </div>
          <div className="text-sm text-white">
            <div className="flex justify-between mb-1">
              <span>Gelecek Ay Toplam:</span>
              <span className="font-bold">
                {analysis.forecast.next_month.toLocaleString('tr-TR', {
                  style: 'currency',
                  currency: 'TRY',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Trend:</span>
              <span className={`font-bold ${
                analysis.forecast.trend === 'up' ? 'text-red-400' :
                analysis.forecast.trend === 'down' ? 'text-green-400' :
                'text-yellow-400'
              }`}>
                {analysis.forecast.trend === 'up' ? '↑ Artış' :
                 analysis.forecast.trend === 'down' ? '↓ Azalış' :
                 '→ Stabil'}
              </span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

