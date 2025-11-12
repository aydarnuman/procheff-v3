'use client';

import { fadeInUp, staggerContainer } from '@/lib/animations';
import { motion } from 'framer-motion';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  LayoutDashboard,
  TrendingUp,
  Zap,
  Sparkles,
  Package,
  MessageSquare
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/ui/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardStats {
  totalTenders: number;
  activePipelines: number;
  completedAnalyses: number;
  totalRevenue: number;
  totalUsers: number;
  aiTokens: number;
  uptime: string;
  avgResponse: string;
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTenders: 0,
    activePipelines: 0,
    completedAnalyses: 0,
    totalRevenue: 0,
    totalUsers: 0,
    aiTokens: 0,
    uptime: '0%',
    avgResponse: '0s'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch real stats from APIs
    const fetchStats = async () => {
      try {
        // Fetch tender stats
        const tendersRes = await fetch('/api/ihale/list');
        const tendersData = await tendersRes.json();
        const totalTenders = tendersData.items?.length || 0;

        // Fetch active pipelines
        const activeRes = await fetch('/api/orchestrate/active-count');
        const activeData = await activeRes.json();
        const activePipelines = activeData.count || 0;

        // Fetch metrics
        const metricsRes = await fetch('/api/metrics');
        const metricsData = await metricsRes.json();
        const completedAnalyses = metricsData.success_rate || 0;

        setStats({
          totalTenders,
          activePipelines,
          completedAnalyses: Math.round(completedAnalyses),
          totalRevenue: 2450000, // TODO: Calculate from actual data
          totalUsers: 24, // TODO: Get from auth system
          aiTokens: 2400000, // TODO: Get from metrics
          uptime: '99.9%',
          avgResponse: '1.2s'
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        // Use mock data on error
        setStats({
          totalTenders: 127,
          activePipelines: 3,
          completedAnalyses: 89,
          totalRevenue: 2450000,
          totalUsers: 24,
          aiTokens: 2400000,
          uptime: '99.9%',
          avgResponse: '1.2s'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const quickActions = [
    { label: 'Yeni Analiz Başlat', href: '/analysis', icon: Sparkles, color: 'indigo' },
    { label: 'İhale Listesi', href: '/ihale', icon: FileText, color: 'blue' },
    { label: 'Raporlar', href: '/reports', icon: BarChart3, color: 'green' },
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

  return (
    <motion.div
      className="space-y-6"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      {/* Header */}
      <motion.div variants={fadeInUp}>
        <div className="flex items-center gap-3 mb-2">
          <LayoutDashboard className="w-8 h-8 text-indigo-400" />
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        </div>
        <p className="text-slate-400 text-sm">Sistem durumu ve istatistikler</p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Toplam İhale"
          value={stats.totalTenders}
          icon={FileText}
          iconColor="text-indigo-400"
          iconBg="bg-indigo-500/20"
          gradientFrom="from-indigo-500/10"
          gradientTo="to-blue-500/10"
          loading={loading}
        />
        <MetricCard
          title="Aktif Pipeline"
          value={stats.activePipelines}
          icon={Zap}
          iconColor="text-yellow-400"
          iconBg="bg-yellow-500/20"
          gradientFrom="from-yellow-500/10"
          gradientTo="to-orange-500/10"
          loading={loading}
        />
        <MetricCard
          title="Tamamlanan Analiz"
          value={stats.completedAnalyses}
          icon={CheckCircle2}
          iconColor="text-green-400"
          iconBg="bg-green-500/20"
          gradientFrom="from-green-500/10"
          gradientTo="to-emerald-500/10"
          loading={loading}
        />
        <MetricCard
          title="Toplam Değer"
          value={`${(stats.totalRevenue / 1000000).toFixed(1)}M₺`}
          icon={TrendingUp}
          iconColor="text-purple-400"
          iconBg="bg-purple-500/20"
          gradientFrom="from-purple-500/10"
          gradientTo="to-pink-500/10"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <motion.div variants={fadeInUp}>
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="relative z-10 border-b border-slate-700/50">
              <CardTitle className="flex items-center gap-2 text-white">
                <div className="p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30">
                  <LayoutDashboard className="w-5 h-5 text-indigo-400" />
                </div>
                Hızlı Erişim
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 pt-6">
              <div className="space-y-2">
                {quickActions.map((action, idx) => {
                  const Icon = action.icon;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <Link
                        href={action.href}
                        className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/40 hover:bg-slate-700/60 border border-slate-700/50 hover:border-indigo-500/40 transition-all duration-300 group/item backdrop-blur-sm"
                      >
                        <motion.div
                          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                            action.color === 'indigo' ? 'from-indigo-500/20 to-blue-500/20' :
                            action.color === 'blue' ? 'from-blue-500/20 to-cyan-500/20' :
                            action.color === 'purple' ? 'from-purple-500/20 to-pink-500/20' :
                            'from-green-500/20 to-emerald-500/20'
                          } flex items-center justify-center border border-white/10 group-hover/item:border-white/20 transition-all duration-300`}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                        >
                          <Icon className={`w-6 h-6 ${
                            action.color === 'indigo' ? 'text-indigo-400' :
                            action.color === 'blue' ? 'text-blue-400' :
                            action.color === 'purple' ? 'text-purple-400' :
                            'text-green-400'
                          }`} />
                        </motion.div>
                        <span className="text-sm font-semibold text-slate-300 group-hover/item:text-white transition-colors">
                          {action.label}
                        </span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </div>
        </motion.div>

        {/* Recent Activities */}
        <motion.div variants={fadeInUp}>
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="relative z-10 border-b border-slate-700/50">
              <CardTitle className="flex items-center gap-2 text-white">
                <div className="p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30">
                  <Clock className="w-5 h-5 text-indigo-400" />
                </div>
                Son Aktiviteler
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 pt-6">
              <div className="space-y-3">
                {recentActivities.map((activity, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/30 hover:bg-slate-700/40 border border-slate-700/40 hover:border-slate-600/60 transition-all duration-300 backdrop-blur-sm group/item"
                  >
                    <div className="relative mt-1">
                      <div className={`w-3 h-3 rounded-full ${
                        activity.status === 'success' ? 'bg-green-400' : 'bg-yellow-400'
                      } ${activity.status === 'processing' ? 'animate-pulse' : ''}`} />
                      {activity.status === 'success' && (
                        <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-400/50 animate-ping" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-300 group-hover/item:text-white truncate transition-colors">
                        {activity.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </div>
        </motion.div>

        {/* System Health */}
        <motion.div variants={fadeInUp}>
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="relative z-10 border-b border-slate-700/50">
              <CardTitle className="flex items-center gap-2 text-white">
                <div className="p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30">
                  <Activity className="w-5 h-5 text-indigo-400" />
                </div>
                Sistem Durumu
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 pt-6">
              <div className="space-y-3">
                {systemHealth.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 hover:bg-slate-700/40 border border-slate-700/40 hover:border-slate-600/60 transition-all duration-300 backdrop-blur-sm group/item"
                  >
                    <div className="flex items-center gap-3">
                      <motion.div
                        whileHover={{ scale: 1.2, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {item.status === 'healthy' ? (
                          <div className="relative">
                            <CheckCircle2 className="w-6 h-6 text-green-400" />
                            <div className="absolute inset-0 w-6 h-6 rounded-full bg-green-400/20 animate-ping" />
                          </div>
                        ) : (
                          <Activity className="w-6 h-6 text-yellow-400 animate-pulse" />
                        )}
                      </motion.div>
                      <div>
                        <p className="text-sm font-semibold text-slate-300 group-hover/item:text-white transition-colors">
                          {item.label}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.value}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </div>
        </motion.div>
      </div>

      {/* Bottom Stats */}
      <motion.div variants={fadeInUp}>
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="relative z-10 border-b border-slate-700/50">
            <CardTitle className="flex items-center gap-2 text-white">
              <div className="p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30">
                <Database className="w-5 h-5 text-indigo-400" />
              </div>
              Sistem Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Toplam Kullanıcı', value: stats.totalUsers, gradient: 'from-blue-500/10 to-cyan-500/10' },
                { label: 'AI Token Kullanımı', value: `${(stats.aiTokens / 1000000).toFixed(1)}M`, gradient: 'from-purple-500/10 to-pink-500/10' },
                { label: 'Uptime', value: stats.uptime, gradient: 'from-green-500/10 to-emerald-500/10' },
                { label: 'Ortalama Yanıt', value: stats.avgResponse, gradient: 'from-yellow-500/10 to-orange-500/10' },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className={`p-5 rounded-xl bg-gradient-to-br ${stat.gradient} border border-slate-700/40 hover:border-slate-600/60 backdrop-blur-sm transition-all duration-300 group/item`}
                >
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-white group-hover/item:text-indigo-300 transition-colors">
                    {stat.value}
                  </p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </div>
      </motion.div>
    </motion.div>
  );
}
