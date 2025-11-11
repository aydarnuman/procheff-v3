/**
 * ContextWidgets - Real-time system info widgets for chat sidebar
 */

import { useEffect, useState } from 'react';
import { Activity, TrendingUp, Bell, Loader2, RefreshCw } from 'lucide-react';

interface MetricsData {
  total_logs: number;
  errors: number;
  success_rate: string;
  last_24h: number;
  avg_duration_ms: number;
  avg_tokens: number;
}

interface AlertStats {
  total: number;
  unread: number;
  critical: number;
}

export function MetricsWidget() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/metrics');
      const data = await response.json();
      if (data.success) {
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Metrics fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="glass-card p-4 rounded-xl">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="glass-card p-4 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-400" />
          <h4 className="text-sm font-semibold text-white">Sistem Metrikleri</h4>
        </div>
        <button
          onClick={fetchMetrics}
          className="p-1 hover:bg-slate-700/50 rounded transition-colors"
          title="Yenile"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Başarı Oranı</span>
          <span className="text-green-400 font-medium">{metrics.success_rate}%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Son 24 saat</span>
          <span className="text-white font-medium">{metrics.last_24h}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Ort. Süre</span>
          <span className="text-white font-medium">{metrics.avg_duration_ms}ms</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Ort. Token</span>
          <span className="text-white font-medium">{metrics.avg_tokens}</span>
        </div>
        {metrics.errors > 0 && (
          <div className="flex justify-between text-xs pt-2 border-t border-slate-700/50">
            <span className="text-slate-400">Hatalar</span>
            <span className="text-red-400 font-medium">{metrics.errors}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function PriceWidget() {
  const [recentPrice, setRecentPrice] = useState<{product: string; price: string} | null>(null);

  return (
    <div className="glass-card p-4 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-green-400" />
        <h4 className="text-sm font-semibold text-white">Piyasa Robotu</h4>
      </div>

      <div className="text-xs text-slate-400 space-y-2">
        <p>Hızlı fiyat sorgulamak için:</p>
        <div className="bg-slate-800/50 rounded px-2 py-1.5 font-mono text-indigo-400">
          /fiyat domates
        </div>

        {recentPrice && (
          <div className="pt-2 border-t border-slate-700/50">
            <p className="text-slate-500 mb-1">Son sorgulanan:</p>
            <p className="text-white font-medium">{recentPrice.product}</p>
            <p className="text-green-400">{recentPrice.price}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function AlertsWidget() {
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts');
      const data = await response.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Alerts fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  if (loading) {
    return (
      <div className="glass-card p-4 rounded-xl">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-yellow-400" />
          <h4 className="text-sm font-semibold text-white">Alert Sistemi</h4>
        </div>
        {stats && stats.unread > 0 && (
          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
            {stats.unread}
          </span>
        )}
      </div>

      <div className="text-xs text-slate-400 space-y-2">
        {stats ? (
          <>
            <div className="flex justify-between">
              <span>Toplam Alert</span>
              <span className="text-white font-medium">{stats.total}</span>
            </div>
            {stats.critical > 0 && (
              <div className="flex justify-between">
                <span>Kritik</span>
                <span className="text-red-400 font-medium">{stats.critical}</span>
              </div>
            )}
            <button
              onClick={() => window.location.href = '/notifications'}
              className="w-full mt-2 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20
                text-yellow-400 rounded-lg transition-colors text-xs"
            >
              Tümünü Görüntüle
            </button>
          </>
        ) : (
          <p>Alert kontrolü için <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-indigo-400">/alert</kbd> yazın</p>
        )}
      </div>
    </div>
  );
}
