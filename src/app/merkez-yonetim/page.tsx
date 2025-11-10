'use client';

import { motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  Database,
  DollarSign,
  FileText,
  LayoutDashboard,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface DashboardStats {
  totalTenders: number;
  activePipelines: number;
  completedAnalyses: number;
  totalRevenue: number;
}

export default function MerkezYonetimPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTenders: 0,
    activePipelines: 0,
    completedAnalyses: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - gerçek API'den gelecek
    setTimeout(() => {
      setStats({
        totalTenders: 127,
        activePipelines: 3,
        completedAnalyses: 89,
        totalRevenue: 2450000
      });
      setLoading(false);
    }, 500);
  }, []);

  const quickActions = [
    { label: 'Yeni İhale Analizi', href: '/ihale', icon: FileText, color: 'indigo' },
    { label: 'Oto-Analiz', href: '/auto', icon: Zap, color: 'yellow' },
    { label: 'Raporlar', href: '/reports', icon: BarChart3, color: 'green' },
    { label: 'Monitoring', href: '/monitor', icon: Activity, color: 'purple' },
  ];

  const recentActivities = [
    { title: 'İhale #2834 analizi tamamlandı', time: '5 dakika önce', status: 'success' },
    { title: 'Maliyet hesaplama başlatıldı', time: '12 dakika önce', status: 'processing' },
    { title: 'Rapor oluşturma tamamlandı', time: '1 saat önce', status: 'success' },
    { title: 'Yeni menü parse edildi', time: '2 saat önce', status: 'success' },
  ];

  const systemHealth = [
    { label: 'API Durumu', status: 'healthy', value: '99.9%' },
    { label: 'Database', status: 'healthy', value: 'Aktif' },
    { label: 'İhale Worker', status: 'healthy', value: 'Çalışıyor' },
    { label: 'Claude AI', status: 'healthy', value: 'Hazır' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Merkez Yönetim</h1>
        <p className="text-slate-400 text-sm">Sistem durumu ve istatistikler</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card border border-indigo-500/30 hover:border-indigo-500/50 transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-indigo-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-slate-400 text-xs mb-1">Toplam İhale</p>
          <p className="text-3xl font-bold text-white">{stats.totalTenders}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card border border-yellow-500/30 hover:border-yellow-500/50 transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-yellow-400" />
            </div>
            <Activity className="w-5 h-5 text-yellow-400 animate-pulse" />
          </div>
          <p className="text-slate-400 text-xs mb-1">Aktif Pipeline</p>
          <p className="text-3xl font-bold text-white">{stats.activePipelines}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card border border-green-500/30 hover:border-green-500/50 transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            </div>
            <BarChart3 className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-slate-400 text-xs mb-1">Tamamlanan Analiz</p>
          <p className="text-3xl font-bold text-white">{stats.completedAnalyses}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card border border-purple-500/30 hover:border-purple-500/50 transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-slate-400 text-xs mb-1">Toplam Değer</p>
          <p className="text-3xl font-bold text-white">{(stats.totalRevenue / 1000000).toFixed(1)}M₺</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card border border-slate-700/50"
        >
          <div className="flex items-center gap-2 mb-4">
            <LayoutDashboard className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Hızlı Erişim</h2>
          </div>
          <div className="space-y-2">
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <Link
                  key={idx}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/40 hover:bg-slate-700/60 border border-slate-700/50 hover:border-indigo-500/40 transition-all duration-200 group"
                >
                  <div className={`w-10 h-10 rounded-lg bg-${action.color}-500/20 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-5 h-5 text-${action.color}-400`} />
                  </div>
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                    {action.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </motion.div>

        {/* Recent Activities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card border border-slate-700/50"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Son Aktiviteler</h2>
          </div>
          <div className="space-y-3">
            {recentActivities.map((activity, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/40">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${
                  activity.status === 'success' ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 truncate">{activity.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* System Health */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card border border-slate-700/50"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Sistem Durumu</h2>
          </div>
          <div className="space-y-3">
            {systemHealth.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/40">
                <div className="flex items-center gap-3">
                  {item.status === 'healthy' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-300">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="glass-card border border-slate-700/50"
      >
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Sistem Bilgileri</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/40">
            <p className="text-xs text-slate-500 mb-1">Toplam Kullanıcı</p>
            <p className="text-2xl font-bold text-white">24</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/40">
            <p className="text-xs text-slate-500 mb-1">AI Token Kullanımı</p>
            <p className="text-2xl font-bold text-white">2.4M</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/40">
            <p className="text-xs text-slate-500 mb-1">Uptime</p>
            <p className="text-2xl font-bold text-white">99.9%</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/40">
            <p className="text-xs text-slate-500 mb-1">Ortalama Yanıt</p>
            <p className="text-2xl font-bold text-white">1.2s</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
