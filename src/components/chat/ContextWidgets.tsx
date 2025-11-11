/**
 * ContextWidgets - Real-time system info widgets for chat sidebar
 */

import { motion } from 'framer-motion';
import { Activity, AlertTriangle, Bell, Loader2, RefreshCw, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

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
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
      className="group relative glass-card p-5 rounded-2xl border border-slate-700/50 
        hover:border-indigo-500/30 transition-all duration-300
        shadow-lg hover:shadow-xl hover:shadow-indigo-500/10
        before:absolute before:inset-0 before:rounded-2xl before:bg-linear-to-br
        before:from-indigo-500/5 before:via-purple-500/5 before:to-pink-500/5 before:opacity-0
        before:group-hover:opacity-100 before:transition-opacity before:duration-300"
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              transition={{ duration: 0.2 }}
              className="p-1.5 rounded-lg bg-indigo-500/20"
            >
              <Activity className="w-4 h-4 text-indigo-400" />
            </motion.div>
            <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">Sistem Metrikleri</h4>
          </div>
          <motion.button
            whileHover={{ rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            onClick={fetchMetrics}
            className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-colors"
            title="Yenile"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400 hover:text-white transition-colors" />
          </motion.button>
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
    </motion.div>
  );
}

export function PriceWidget() {
  // const [recentPrice, setRecentPrice] = useState<{product: string; price: string} | null>(null);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="group relative glass-card p-5 rounded-2xl border border-slate-700/50 
        hover:border-green-500/30 transition-all duration-300
        shadow-lg hover:shadow-xl hover:shadow-green-500/10
        before:absolute before:inset-0 before:rounded-2xl before:bg-linear-to-br
        before:from-green-500/5 before:via-emerald-500/5 before:to-teal-500/5 before:opacity-0
        before:group-hover:opacity-100 before:transition-opacity before:duration-300"
    >
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ duration: 0.2 }}
            className="p-1.5 rounded-lg bg-green-500/20"
          >
            <TrendingUp className="w-4 h-4 text-green-400" />
          </motion.div>
          <h4 className="text-sm font-bold text-white group-hover:text-green-300 transition-colors">Piyasa Robotu</h4>
        </div>

        <div className="text-xs text-slate-400 space-y-2 group-hover:text-slate-300 transition-colors">
          <p>Hızlı fiyat sorgulamak için:</p>
          <div className="bg-slate-800/50 rounded px-2 py-1.5 font-mono text-indigo-400">
            /fiyat domates
          </div>

          <div className="pt-2 border-t border-slate-700/50">
            <p className="text-slate-500 mb-1">Yakında aktif olacak...</p>
            <p className="text-green-400 text-xs">Piyasa verileri entegrasyonu</p>
          </div>
        </div>
      </div>
    </motion.div>
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

export function TenderAlert() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="group"
    >
      <div className="glass-card border border-amber-500/30 hover:border-amber-400/50 transition-all duration-300">
        <div className="flex items-start gap-3">
          <motion.div
            whileHover={{ rotate: 15 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <AlertTriangle className="w-5 h-5 text-amber-400 mt-1 shrink-0" />
          </motion.div>

          <div className="flex-1">
            <h3 className="text-amber-400 font-semibold mb-1 group-hover:text-amber-300 transition-colors">
              Yeni İhale Takibi
            </h3>
            <p className="text-sm text-slate-300 mb-3">
              Kriterlere uygun ihaleler için otomatik bildirim
            </p>
            
            <div className="text-xs text-slate-400 space-y-2 group-hover:text-slate-300 transition-colors">
              <p>Mevcut takipler:</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between bg-slate-800/50 rounded px-2 py-1">
                  <span className="text-blue-400">Gıda İhaleleri</span>
                  <span className="text-green-400 text-xs">3 aktif</span>
                </div>
                <div className="flex items-center justify-between bg-slate-800/50 rounded px-2 py-1">
                  <span className="text-purple-400">Temizlik Hizmetleri</span>
                  <span className="text-green-400 text-xs">1 aktif</span>
                </div>
              </div>
              
              <div className="pt-2 border-t border-slate-700/50">
                <p className="text-slate-500 mb-1">Son 24 saat:</p>
                <p className="text-white font-medium">4 yeni ihale</p>
                <p className="text-green-400 text-xs">2 tavsiye edildi</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
