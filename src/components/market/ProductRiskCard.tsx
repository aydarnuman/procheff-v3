'use client';

import React, { useState } from 'react';
import type { ProductRiskAnalysis } from '@/lib/market/schema';

interface ProductRiskCardProps {
  riskAnalysis: ProductRiskAnalysis;
  collapsed?: boolean;
}

/**
 * Product Risk Card (5-Category Risk Visualization)
 *
 * Comprehensive risk assessment display:
 * 1. Price Volatility (CV-based)
 * 2. Stock Availability (out-of-stock frequency)
 * 3. Supplier Concentration (HHI)
 * 4. Seasonality (monthly pattern)
 * 5. Data Quality (freshness + completeness)
 *
 * Fixes: "Sığ risk analizi (sadece volatilite)" problemi
 *
 * **Features:**
 * - 🎯 Overall risk score (0-100) with level
 * - 📊 Individual risk category breakdown
 * - ⚠️ Risk alerts with severity
 * - 💡 Mitigation strategies
 * - 🔽 Collapsible details
 */
export default function ProductRiskCard({
  riskAnalysis,
  collapsed: initialCollapsed = false
}: ProductRiskCardProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const { overallRiskScore, riskLevel, risks, alerts, mitigationStrategies } = riskAnalysis;

  // Risk level config
  const riskLevelConfig = {
    low: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', borderColor: 'border-emerald-500/30', icon: '✅', label: 'Düşük Risk' },
    medium: { color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', borderColor: 'border-yellow-500/30', icon: '⚠️', label: 'Orta Risk' },
    high: { color: 'text-orange-400', bgColor: 'bg-orange-500/20', borderColor: 'border-orange-500/30', icon: '🔶', label: 'Yüksek Risk' },
    critical: { color: 'text-red-400', bgColor: 'bg-red-500/20', borderColor: 'border-red-500/30', icon: '🚨', label: 'Kritik Risk' }
  };

  const config = riskLevelConfig[riskLevel];

  // Risk category info
  const riskCategories = [
    {
      key: 'priceVolatility',
      icon: '📈',
      label: 'Fiyat Volatilitesi',
      data: risks.priceVolatility
    },
    {
      key: 'stockAvailability',
      icon: '📦',
      label: 'Stok Durumu',
      data: risks.stockAvailability
    },
    {
      key: 'supplierConcentration',
      icon: '🏪',
      label: 'Tedarikçi Yoğunluğu',
      data: risks.supplierConcentration
    },
    {
      key: 'seasonality',
      icon: '📅',
      label: 'Mevsimsellik',
      data: risks.seasonality
    },
    {
      key: 'dataQuality',
      icon: '💎',
      label: 'Veri Kalitesi',
      data: risks.dataQuality
    }
  ];

  // Risk score color
  const getRiskScoreColor = (score: number) => {
    if (score >= 75) return 'text-red-400';
    if (score >= 50) return 'text-orange-400';
    if (score >= 25) return 'text-yellow-400';
    return 'text-emerald-400';
  };

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div
        className={`p-6 border-b border-slate-700 ${config.bgColor} cursor-pointer`}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{config.icon}</div>
            <div>
              <h3 className="h3 text-white flex items-center gap-2">
                <span>Risk Analizi</span>
                <span className={`text-sm font-normal ${config.color}`}>
                  ({config.label})
                </span>
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                5 kategori risk değerlendirmesi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Overall Risk Score */}
            <div className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${config.bgColor} ${config.borderColor}`}>
              <span className="text-slate-400 text-xs">Risk Skoru:</span>
              <span className={`font-bold text-2xl ${config.color}`}>
                {overallRiskScore}
              </span>
              <span className="text-slate-500 text-xs">/ 100</span>
            </div>

            {/* Collapse Toggle */}
            <button className="text-slate-400 hover:text-white transition-colors">
              {collapsed ? '▼' : '▲'}
            </button>
          </div>
        </div>
      </div>

      {/* Details (Collapsible) */}
      {!collapsed && (
        <div className="p-6 space-y-6">
          {/* Risk Categories */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wide">
              Risk Kategorileri
            </h4>
            {riskCategories.map(category => (
              <div
                key={category.key}
                className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{category.icon}</span>
                  <div>
                    <div className="font-semibold text-white">{category.label}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {category.data.recommendation}
                    </div>
                  </div>
                </div>
                <div className={`text-xl font-bold ${getRiskScoreColor(category.data.score)}`}>
                  {category.data.score}
                </div>
              </div>
            ))}
          </div>

          {/* Risk Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wide">
                ⚠️ Risk Uyarıları ({alerts.length})
              </h4>
              {alerts.map((alert, index) => {
                const alertConfig: Record<string, { icon: string; color: string; bgColor: string }> = {
                  info: { icon: 'ℹ️', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
                  warning: { icon: '⚠️', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
                  critical: { icon: '🚨', color: 'text-red-400', bgColor: 'bg-red-500/10' }
                };
                const config = alertConfig[alert.severity] || alertConfig.info;

                return (
                  <div
                    key={`alert-${index}`}
                    className={`flex items-start gap-3 p-4 rounded-lg ${config.bgColor} border border-slate-700`}
                  >
                    <div className="text-xl">{config.icon}</div>
                    <div>
                      <div className={`font-semibold ${config.color}`}>
                        {alert.category}
                      </div>
                      <div className="text-sm text-slate-300 mt-1">
                        {alert.message}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mitigation Strategies */}
          {mitigationStrategies.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wide">
                💡 Önleme Stratejileri
              </h4>
              <ul className="space-y-2">
                {mitigationStrategies.map((strategy, index) => (
                  <li
                    key={`strategy-${index}`}
                    className="flex items-start gap-3 text-sm text-slate-300"
                  >
                    <span className="text-emerald-400">✓</span>
                    <span>{strategy}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
