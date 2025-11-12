/**
 * Analytics Widget for Chat
 * Displays real-time chat usage metrics
 */

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Activity, TrendingUp, Clock, Hash, MessageSquare,
  Command, Users, Zap
} from 'lucide-react';

interface ChatMetrics {
  totalMessages: number;
  totalConversations: number;
  avgResponseTime: number;
  avgTokensPerMessage: number;
  commandUsage: Record<string, number>;
  topKeywords: Array<{ keyword: string; count: number }>;
  hourlyDistribution: Record<number, number>;
  successRate: number;
  errorRate: number;
  userSatisfaction: number;
}

export function AnalyticsWidget() {
  const [metrics, setMetrics] = useState<ChatMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchMetrics = async () => {
    try {
      // Calculate time range
      const now = new Date();
      const start = new Date();

      switch (timeRange) {
        case 'today':
          start.setHours(0, 0, 0, 0);
          break;
        case 'week':
          start.setDate(now.getDate() - 7);
          break;
        case 'month':
          start.setDate(now.getDate() - 30);
          break;
      }

      const response = await fetch('/api/chat/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeRange: {
            start: start.toISOString(),
            end: now.toISOString()
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!metrics) {
    return null;
  }

  // Prepare chart data
  const hourlyData = Object.entries(metrics.hourlyDistribution).map(([hour, count]) => ({
    hour: `${hour}:00`,
    messages: count
  }));

  const commandData = Object.entries(metrics.commandUsage)
    .map(([command, count]) => ({ command, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const pieData = [
    { name: 'Başarılı', value: metrics.successRate, color: '#10b981' },
    { name: 'Hatalı', value: metrics.errorRate, color: '#ef4444' }
  ];

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Chat Metrikleri</h3>
        <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
          {(['today', 'week', 'month'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                timeRange === range
                  ? 'bg-indigo-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {range === 'today' ? 'Bugün' :
               range === 'week' ? '7 Gün' : '30 Gün'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={MessageSquare}
          label="Toplam Mesaj"
          value={metrics.totalMessages}
          trend={+12}
          color="indigo"
        />
        <MetricCard
          icon={Users}
          label="Konuşma"
          value={metrics.totalConversations}
          trend={+8}
          color="purple"
        />
        <MetricCard
          icon={Clock}
          label="Ort. Yanıt"
          value={`${Math.round(metrics.avgResponseTime / 1000)}s`}
          trend={-5}
          color="green"
        />
        <MetricCard
          icon={Hash}
          label="Token/Mesaj"
          value={Math.round(metrics.avgTokensPerMessage)}
          color="orange"
        />
      </div>

      {/* Hourly Distribution Chart */}
      <div className="glass-card p-4 rounded-xl">
        <h4 className="text-sm font-semibold text-white mb-3">Saatlik Dağılım</h4>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="hour"
              stroke="#64748b"
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px'
              }}
            />
            <Line
              type="monotone"
              dataKey="messages"
              stroke="#818cf8"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Command Usage */}
      {commandData.length > 0 && (
        <div className="glass-card p-4 rounded-xl">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Command className="w-4 h-4" />
            Popüler Komutlar
          </h4>
          <div className="space-y-2">
            {commandData.map((item, idx) => (
              <div key={item.command} className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{item.command}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.count / commandData[0].count) * 100}%` }}
                      transition={{ delay: idx * 0.1 }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                    />
                  </div>
                  <span className="text-xs text-white w-8 text-right">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Rate */}
      <div className="glass-card p-4 rounded-xl">
        <h4 className="text-sm font-semibold text-white mb-3">Başarı Oranı</h4>
        <ResponsiveContainer width="100%" height={120}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={45}
              paddingAngle={5}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-4 mt-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-slate-400">%{metrics.successRate}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-slate-400">%{metrics.errorRate}</span>
          </div>
        </div>
      </div>

      {/* Top Keywords */}
      {metrics.topKeywords.length > 0 && (
        <div className="glass-card p-4 rounded-xl">
          <h4 className="text-sm font-semibold text-white mb-3">En Sık Konular</h4>
          <div className="flex flex-wrap gap-2">
            {metrics.topKeywords.slice(0, 8).map((kw, idx) => (
              <motion.span
                key={kw.keyword}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="px-2 py-1 bg-indigo-500/20 border border-indigo-500/30
                  rounded-full text-xs text-indigo-300"
              >
                {kw.keyword}
                <span className="ml-1 text-indigo-400">({kw.count})</span>
              </motion.span>
            ))}
          </div>
        </div>
      )}

      {/* User Satisfaction */}
      <div className="glass-card p-4 rounded-xl">
        <h4 className="text-sm font-semibold text-white mb-2">Kullanıcı Memnuniyeti</h4>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${metrics.userSatisfaction}%` }}
                transition={{ duration: 1 }}
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
              />
            </div>
          </div>
          <span className="ml-3 text-lg font-bold text-white">
            {metrics.userSatisfaction}%
          </span>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: any;
  label: string;
  value: string | number;
  trend?: number;
  color: 'indigo' | 'purple' | 'green' | 'orange';
}

function MetricCard({ icon: Icon, label, value, trend, color }: MetricCardProps) {
  const colors = {
    indigo: 'from-indigo-500 to-blue-500',
    purple: 'from-purple-500 to-pink-500',
    green: 'from-green-500 to-emerald-500',
    orange: 'from-orange-500 to-yellow-500'
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className="glass-card p-3 rounded-xl"
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${colors[color]} bg-opacity-20`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        {trend && (
          <span className={`text-xs flex items-center gap-0.5 ${
            trend > 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            <TrendingUp className="w-3 h-3" />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-slate-700 rounded" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-700 rounded-xl" />
        ))}
      </div>
      <div className="h-40 bg-slate-700 rounded-xl" />
    </div>
  );
}