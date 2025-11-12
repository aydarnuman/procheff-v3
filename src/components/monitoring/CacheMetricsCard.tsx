"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, Database, TrendingUp } from "lucide-react";

interface CacheStats {
  enabled: boolean;
  hitRate?: number;
  totalHits?: number;
  totalMisses?: number;
  cacheSize?: number;
  topKeys?: Array<{ key: string; hits: number }>;
  error?: string;
  message?: string;
}

interface CacheMetricsCardProps {
  stats: CacheStats | null;
  loading?: boolean;
}

export function CacheMetricsCard({ stats, loading }: CacheMetricsCardProps) {
  if (loading) {
    return (
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            <div className="h-8 bg-slate-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || !stats.enabled) {
    return (
      <Card variant="elevated" className="border-yellow-500/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-yellow-400" />
            <CardTitle>Cache Metrics</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-yellow-400">
            <AlertTriangle className="w-4 h-4" />
            <p className="text-sm">Caching is disabled</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stats.error) {
    return (
      <Card variant="elevated" className="border-red-500/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-red-400" />
            <CardTitle>Cache Metrics</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-400">{stats.error}</p>
        </CardContent>
      </Card>
    );
  }

  const hitRate = stats.hitRate || 0;
  const totalRequests = (stats.totalHits || 0) + (stats.totalMisses || 0);

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-green-400" />
            <CardTitle>Cache Metrics</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs">Active</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hit Rate Gauge */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Hit Rate</span>
            <span className={`text-lg font-bold ${
              hitRate >= 80 ? "text-green-400" :
              hitRate >= 50 ? "text-yellow-400" :
              "text-red-400"
            }`}>
              {hitRate.toFixed(1)}%
            </span>
          </div>
          <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${
                hitRate >= 80 ? "bg-green-500" :
                hitRate >= 50 ? "bg-yellow-500" :
                "bg-red-500"
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${hitRate}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-400">Total Hits</p>
            <p className="text-lg font-semibold text-green-400">
              {stats.totalHits?.toLocaleString() || 0}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-400">Total Misses</p>
            <p className="text-lg font-semibold text-red-400">
              {stats.totalMisses?.toLocaleString() || 0}
            </p>
          </div>
        </div>

        {/* Cache Size */}
        {stats.cacheSize !== undefined && (
          <div className="pt-2 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Cache Size</span>
              <span className="text-sm font-semibold text-indigo-400">
                {(stats.cacheSize / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          </div>
        )}

        {/* Top Keys */}
        {stats.topKeys && stats.topKeys.length > 0 && (
          <div className="pt-2 border-t border-slate-700">
            <h4 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Top Cached Keys
            </h4>
            <div className="space-y-1">
              {stats.topKeys.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-gray-300 truncate max-w-[150px]">
                    {item.key}
                  </span>
                  <span className="text-green-400 font-semibold">
                    {item.hits} hits
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

