'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { SourceContribution } from '@/lib/market/schema';

interface SourceContributionChartProps {
  sourceContribution: SourceContribution;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Source Contribution Pie Chart
 *
 * Visualizes where the final price comes from:
 * - Real Market Data (migros, a101, bim, etc.)
 * - AI Estimation (claude-sonnet-4)
 * - Historical Trend (DB)
 * - TÜİK Official Data (optional)
 *
 * Fixes: "Fiyat güvenilirlik kaynağı belirsiz" problemi
 */
interface ContributionPayload {
  name: string;
  value: number;
  fill: string;
  icon: string;
  details: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: ContributionPayload }>;
}

interface ChartLegendPayload {
  color?: string;
  value?: string | number;
  payload?: ContributionPayload;
}

function SourceTooltip({ active, payload }: ChartTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div className="glass-card p-3 border border-white/20">
        <p className="font-semibold text-white flex items-center gap-2">
          <span>{data.icon}</span>
          <span>{data.name}</span>
        </p>
        <p className="text-emerald-400 text-lg font-bold">
          {data.value.toFixed(1)}%
        </p>
        <p className="text-slate-300 text-sm mt-1">
          {data.details}
        </p>
      </div>
    );
  }
  return null;
}

function SourceLegend({ payload }: { payload?: ChartLegendPayload[] }) {
  if (!payload) return null;

  return (
    <div className="flex flex-col gap-2 mt-4">
      {payload.map((entry, index) => {
        const legendPayload = entry?.payload;
        if (!legendPayload) return null;

        return (
          <div
            key={`legend-${index}`}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-300">
                {legendPayload.icon} {entry.value}
              </span>
            </div>
            <span className="font-semibold text-white">
              {legendPayload.value.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function SourceContributionChart({
  sourceContribution,
  size = 'md'
}: SourceContributionChartProps) {
  // Chart dimensions
  const dimensions = {
    sm: { width: 200, height: 200, radius: [50, 70] },
    md: { width: 300, height: 300, radius: [70, 100] },
    lg: { width: 400, height: 400, radius: [100, 140] }
  };

  const { width, height, radius } = dimensions[size];

  // Prepare chart data
  const chartData = [
    {
      name: 'Market Verisi',
      value: sourceContribution.realMarketData.percentage,
      fill: '#10b981', // Green
      icon: '🛒',
      details: `${sourceContribution.realMarketData.sourceCount} kaynak, Ort: ₺${sourceContribution.realMarketData.avgPrice}`
    },
    {
      name: 'AI Tahmini',
      value: sourceContribution.aiEstimation.percentage,
      fill: '#8b5cf6', // Purple
      icon: '🤖',
      details: `${sourceContribution.aiEstimation.model}, ${(sourceContribution.aiEstimation.confidence * 100).toFixed(0)}% güven`
    },
    {
      name: 'Geçmiş Trend',
      value: sourceContribution.historicalTrend.percentage,
      fill: '#3b82f6', // Blue
      icon: '📊',
      details: `${sourceContribution.historicalTrend.dataPoints} veri noktası, ${sourceContribution.historicalTrend.trendDirection}`
    }
  ];

  // Add TÜİK if available
  if (sourceContribution.tuikData) {
    chartData.push({
      name: 'TÜİK Resmi',
      value: sourceContribution.tuikData.percentage,
      fill: '#f59e0b', // Amber
      icon: '🏛️',
      details: `₺${sourceContribution.tuikData.officialPrice}, ${sourceContribution.tuikData.lastUpdate}`
    });
  }

  // Filter out 0% entries
  const filteredData = chartData.filter(d => d.value > 0);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="h3 text-white flex items-center gap-2">
          <span>🔍</span>
          <span>Kaynak Katkısı</span>
        </h3>
        <div className="text-xs text-slate-400">
          Fusion ağırlıkları
        </div>
      </div>

      <ResponsiveContainer width={width} height={height}>
        <PieChart>
          <Pie
            data={filteredData}
            cx="50%"
            cy="50%"
            innerRadius={radius[0]}
            outerRadius={radius[1]}
            paddingAngle={2}
            dataKey="value"
            label={(entry) => `${entry.value.toFixed(0)}%`}
            labelLine={false}
          >
            {filteredData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<SourceTooltip />} />
          <Legend content={<SourceLegend />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
        <p className="text-xs text-slate-400 mb-2">💡 Açıklama</p>
        <p className="text-sm text-slate-300">
          Final fiyat, tüm kaynakların <span className="text-emerald-400 font-semibold">ağırlıklı ortalaması</span>dır.
          Güvenilir kaynaklar (market verisi) daha yüksek ağırlığa sahiptir.
        </p>
      </div>
    </div>
  );
}
