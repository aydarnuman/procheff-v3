"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, TrendingUp, AlertTriangle, Clock, Zap, BarChart3, Info, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fadeInUp, staggerContainer, scaleIn } from "@/lib/animations";

interface Metrics {
  total_logs: number;
  errors: number;
  success_rate: string;
  last_24h: number;
  avg_duration_ms: number;
  avg_tokens: number;
  level_distribution: Array<{ level: string; count: number }>;
  recent_logs: Array<{
    id: number;
    level: string;
    message: string;
    created_at: string;
  }>;
}

interface MetricsResponse {
  success: boolean;
  metrics: Metrics;
  status: string;
  timestamp: string;
}

interface HistoryPoint extends Metrics {
  time: string;
}

const COLORS = {
  info: "#4A9EFF",      // var(--color-accent-blue)
  success: "#00D9A3",   // var(--color-accent-mint)
  warn: "#FFB020",      // var(--color-accent-gold)
  error: "#FF4757",     // var(--color-accent-red)
};

export default function MonitorPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const fetchMetrics = async () => {
    try {
      setLoading(false);
      const res = await fetch("/api/metrics");
      const data: MetricsResponse = await res.json();

      if (data.success && data.metrics) {
        setMetrics(data.metrics);
        setError(null);
        setLastUpdate(new Date().toLocaleTimeString("tr-TR"));

        setHistory((prev) => [
          ...prev.slice(-20),
          {
            ...data.metrics,
            time: new Date().toLocaleTimeString("tr-TR"),
          },
        ]);
      } else {
        setError("Metrikler alınamadı");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000); // Her 10 saniyede bir güncelle
    return () => clearInterval(interval);
  }, []);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "info": return Info;
      case "success": return CheckCircle;
      case "warn": return AlertTriangle;
      case "error": return XCircle;
      default: return Activity;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "info": return "text-[var(--color-accent-blue)]";
      case "success": return "text-[var(--color-accent-mint)]";
      case "warn": return "text-[var(--color-accent-gold)]";
      case "error": return "text-[var(--color-accent-red)]";
      default: return "text-[var(--color-text-secondary)]";
    }
  };

  const getLevelBgColor = (level: string) => {
    switch (level) {
      case "info": return "bg-[var(--color-accent-blue)]/10";
      case "success": return "bg-[var(--color-accent-mint)]/10";
      case "warn": return "bg-[var(--color-accent-gold)]/10";
      case "error": return "bg-[var(--color-accent-red)]/10";
      default: return "bg-[var(--color-surface)]";
    }
  };

  if (loading && !metrics) {
    return (
      <div className="min-h-screen p-6 md:p-8 flex items-center justify-center">
        <Card variant="elevated">
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Activity className="w-16 h-16 text-[var(--color-accent-blue)]" />
              </motion.div>
              <p className="h4 text-[var(--color-text-primary)]">Dashboard Yükleniyor</p>
              <p className="body-sm text-[var(--color-text-tertiary)]">Metrikler alınıyor...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 md:p-8 flex items-center justify-center">
        <Card variant="elevated" className="max-w-md border border-[var(--color-accent-red)]/30">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-[var(--color-accent-red)]/20">
                <XCircle className="w-8 h-8 text-[var(--color-accent-red)]" />
              </div>
              <div>
                <h3 className="h3 text-[var(--color-accent-red)] mb-2">Hata Oluştu</h3>
                <p className="body text-[var(--color-text-secondary)]">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <motion.div
      className="min-h-screen p-6 md:p-8"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div variants={fadeInUp}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <motion.div
                className="p-4 rounded-2xl bg-gradient-to-br from-[var(--color-accent-blue)] to-[var(--color-accent-purple)] shadow-glow-blue"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Activity className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <h1 className="h1">Procheff AI Monitoring</h1>
                <p className="body text-[var(--color-text-secondary)]">
                  Gerçek zamanlı sistem performans izleme
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <p className="body-sm text-[var(--color-text-tertiary)] mb-1">Son Güncelleme</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[var(--color-accent-blue)]" />
                  <p className="body font-mono text-[var(--color-accent-blue)]">{lastUpdate}</p>
                </div>
              </div>
              <Badge variant="success" pulse>LIVE</Badge>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={staggerContainer}
        >
          <motion.div variants={scaleIn}>
            <Card hoverable variant="elevated" className="h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-[var(--color-accent-blue)]/20">
                    <BarChart3 className="w-6 h-6 text-[var(--color-accent-blue)]" />
                  </div>
                  <span className="body-sm text-[var(--color-text-tertiary)]">
                    Toplam Log
                  </span>
                </div>
                <div className="h2 text-[var(--color-accent-blue)]">
                  {metrics.total_logs}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={scaleIn}>
            <Card hoverable variant="elevated" className="h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-[var(--color-accent-mint)]/20">
                    <TrendingUp className="w-6 h-6 text-[var(--color-accent-mint)]" />
                  </div>
                  <span className="body-sm text-[var(--color-text-tertiary)]">
                    Başarı Oranı
                  </span>
                </div>
                <div className="h2 text-[var(--color-accent-mint)]">
                  {metrics.success_rate}%
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={scaleIn}>
            <Card hoverable variant="elevated" className="h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-[var(--color-accent-red)]/20">
                    <XCircle className="w-6 h-6 text-[var(--color-accent-red)]" />
                  </div>
                  <span className="body-sm text-[var(--color-text-tertiary)]">
                    Hata Sayısı
                  </span>
                </div>
                <div className="h2 text-[var(--color-accent-red)]">
                  {metrics.errors}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={scaleIn}>
            <Card hoverable variant="elevated" className="h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-[var(--color-accent-purple)]/20">
                    <Zap className="w-6 h-6 text-[var(--color-accent-purple)]" />
                  </div>
                  <span className="body-sm text-[var(--color-text-tertiary)]">
                    Son 24 Saat
                  </span>
                </div>
                <div className="h2 text-[var(--color-accent-purple)]">
                  {metrics.last_24h}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Performance Metrics */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          variants={staggerContainer}
        >
          <motion.div variants={scaleIn}>
            <Card variant="elevated">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[var(--color-accent-blue)]" />
                    <span className="body-sm text-[var(--color-text-tertiary)]">Ortalama Süre</span>
                  </div>
                  <div className="h3 text-[var(--color-accent-blue)]">
                    {metrics.avg_duration_ms} ms
                  </div>
                </div>
                <div className="relative h-3 bg-[var(--color-surface)] rounded-full overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--color-accent-blue)] to-[var(--color-accent-purple)] rounded-full shadow-glow-blue"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((metrics.avg_duration_ms / 30000) * 100, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={scaleIn}>
            <Card variant="elevated">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[var(--color-accent-mint)]" />
                    <span className="body-sm text-[var(--color-text-tertiary)]">Ortalama Token</span>
                  </div>
                  <div className="h3 text-[var(--color-accent-mint)]">
                    {metrics.avg_tokens}
                  </div>
                </div>
                <div className="relative h-3 bg-[var(--color-surface)] rounded-full overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--color-accent-mint)] to-[var(--color-accent-blue)] rounded-full shadow-glow-mint"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((metrics.avg_tokens / 2000) * 100, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Charts */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          variants={staggerContainer}
        >
          {/* Time Series Chart */}
          <motion.div variants={scaleIn}>
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[var(--color-accent-mint)]" />
                  <CardTitle>Performans Trendi</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
                      <XAxis
                        dataKey="time"
                        stroke="var(--color-text-tertiary)"
                        fontSize={12}
                        tick={{ fill: "var(--color-text-tertiary)" }}
                      />
                      <YAxis
                        stroke="var(--color-text-tertiary)"
                        fontSize={12}
                        tick={{ fill: "var(--color-text-tertiary)" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "12px",
                          color: "var(--color-text-primary)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="avg_duration_ms"
                        stroke={COLORS.success}
                        name="Süre (ms)"
                        strokeWidth={3}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="avg_tokens"
                        stroke={COLORS.info}
                        name="Token"
                        strokeWidth={3}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Level Distribution */}
          <motion.div variants={scaleIn}>
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[var(--color-accent-purple)]" />
                  <CardTitle>Log Seviye Dağılımı</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.level_distribution}>
                      <XAxis
                        dataKey="level"
                        stroke="var(--color-text-tertiary)"
                        fontSize={12}
                        tick={{ fill: "var(--color-text-tertiary)" }}
                      />
                      <YAxis
                        stroke="var(--color-text-tertiary)"
                        fontSize={12}
                        tick={{ fill: "var(--color-text-tertiary)" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "12px",
                          color: "var(--color-text-primary)",
                        }}
                      />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                        {metrics.level_distribution.map((entry) => (
                          <Cell key={entry.level} fill={COLORS[entry.level as keyof typeof COLORS] || "var(--color-text-tertiary)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Recent Logs */}
        <motion.div variants={fadeInUp}>
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[var(--color-accent-blue)]" />
                <CardTitle>Son Aktiviteler</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.recent_logs.map((log, idx) => {
                  const Icon = getLevelIcon(log.level);
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02] cursor-pointer ${getLevelBgColor(log.level)} border-transparent hover:border-[var(--color-border-bright)]`}
                    >
                      <div className={`p-2 rounded-lg ${getLevelBgColor(log.level)}`}>
                        <Icon className={`w-5 h-5 ${getLevelColor(log.level)}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={
                              log.level === "error" ? "error" :
                              log.level === "warn" ? "warning" :
                              log.level === "success" ? "success" :
                              "info"
                            }
                            size="sm"
                          >
                            {log.level.toUpperCase()}
                          </Badge>
                          <span className="body-sm text-[var(--color-text-tertiary)] font-mono">
                            {new Date(log.created_at).toLocaleString("tr-TR")}
                          </span>
                        </div>
                        <p className="body-sm text-[var(--color-text-primary)] truncate">{log.message}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
