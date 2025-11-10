'use client';

import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendChartProps {
  data: Array<{ date: string; price: number }>;
  productName: string;
  stats?: {
    min: number;
    max: number;
    avg: number;
    latest: number;
    trend: 'rising' | 'falling' | 'stable' | null;
  };
}

export function TrendChart({ data, productName, stats }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="glass-card flex items-center justify-center h-64">
        <p className="text-slate-400 text-sm">Geçmiş veri bulunamadı</p>
      </div>
    );
  }

  // Trend ikonu
  const getTrendIcon = () => {
    if (!stats?.trend) return <Minus className="w-5 h-5 text-slate-400" />;

    switch (stats.trend) {
      case 'rising':
        return <TrendingUp className="w-5 h-5 text-red-400" />;
      case 'falling':
        return <TrendingDown className="w-5 h-5 text-green-400" />;
      default:
        return <Minus className="w-5 h-5 text-slate-400" />;
    }
  };

  // Trend rengi
  const getTrendColor = () => {
    if (!stats?.trend) return 'text-slate-400';

    switch (stats.trend) {
      case 'rising':
        return 'text-red-400';
      case 'falling':
        return 'text-green-400';
      default:
        return 'text-slate-400';
    }
  };

  // Trend metni
  const getTrendText = () => {
    if (!stats?.trend) return 'Belirsiz';

    switch (stats.trend) {
      case 'rising':
        return 'Yükseliş Trendi';
      case 'falling':
        return 'Düşüş Trendi';
      default:
        return 'Sabit';
    }
  };

  return (
    <div className="glass-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">{productName}</h3>
          <p className="text-sm text-slate-400">Son {data.length} günlük fiyat trendi</p>
        </div>
        {stats?.trend && (
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <span className={`text-sm font-medium ${getTrendColor()}`}>
              {getTrendText()}
            </span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
            <XAxis
              dataKey="date"
              stroke="rgba(148, 163, 184, 0.5)"
              fontSize={12}
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getDate()}/${date.getMonth() + 1}`;
              }}
            />
            <YAxis
              stroke="rgba(148, 163, 184, 0.5)"
              fontSize={12}
              tickFormatter={(value) => `${value}₺`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: 'rgba(148, 163, 184, 1)' }}
              itemStyle={{ color: 'rgba(255, 255, 255, 1)' }}
              formatter={(value: number) => [`${value.toFixed(2)} ₺`, 'Fiyat']}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="rgba(99, 102, 241, 1)"
              strokeWidth={2}
              dot={{ fill: 'rgba(99, 102, 241, 1)', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/40">
            <p className="text-xs text-slate-400 mb-1">En Düşük</p>
            <p className="text-lg font-bold text-white">{stats.min.toFixed(2)} ₺</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/40">
            <p className="text-xs text-slate-400 mb-1">En Yüksek</p>
            <p className="text-lg font-bold text-white">{stats.max.toFixed(2)} ₺</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/40">
            <p className="text-xs text-slate-400 mb-1">Ortalama</p>
            <p className="text-lg font-bold text-white">{stats.avg.toFixed(2)} ₺</p>
          </div>
          <div className="p-3 rounded-lg bg-indigo-500/20 border border-indigo-500/40">
            <p className="text-xs text-indigo-300 mb-1">Son Fiyat</p>
            <p className="text-lg font-bold text-white">{stats.latest.toFixed(2)} ₺</p>
          </div>
        </div>
      )}
    </div>
  );
}
