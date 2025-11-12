"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, Shield } from "lucide-react";

interface RateLimitStats {
  enabled: boolean;
  totalRequests?: number;
  endpointStats?: Record<string, { requests: number; limit: number }>;
  globalLimit?: number;
  error?: string;
  message?: string;
}

interface RateLimitCardProps {
  stats: RateLimitStats | null;
  loading?: boolean;
}

export function RateLimitCard({ stats, loading }: RateLimitCardProps) {
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
            <Shield className="w-5 h-5 text-yellow-400" />
            <CardTitle>Rate Limiting</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-yellow-400">
            <AlertTriangle className="w-4 h-4" />
            <p className="text-sm">Rate limiting is disabled</p>
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
            <Shield className="w-5 h-5 text-red-400" />
            <CardTitle>Rate Limiting</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-400">{stats.error}</p>
        </CardContent>
      </Card>
    );
  }

  const topEndpoints = stats.endpointStats
    ? Object.entries(stats.endpointStats)
        .sort((a, b) => b[1].requests - a[1].requests)
        .slice(0, 5)
    : [];

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            <CardTitle>Rate Limiting</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs">Active</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Global Stats */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Global Limit</span>
            <span className="text-sm font-semibold text-indigo-400">
              {stats.globalLimit || 100} req/min
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-linear-to-r from-indigo-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((stats.totalRequests || 0) / (stats.globalLimit || 100) * 100, 100)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Top Endpoints */}
        {topEndpoints.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-400 mb-2">Top Endpoints</h4>
            <div className="space-y-2">
              {topEndpoints.map(([endpoint, data]) => {
                const usagePercent = (data.requests / data.limit) * 100;
                return (
                  <div key={endpoint} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-300 truncate max-w-[200px]">
                        {endpoint.replace("/api/", "")}
                      </span>
                      <span className={`font-semibold ${
                        usagePercent > 80 ? "text-red-400" :
                        usagePercent > 50 ? "text-yellow-400" :
                        "text-green-400"
                      }`}>
                        {data.requests}/{data.limit}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full ${
                          usagePercent > 80 ? "bg-red-500" :
                          usagePercent > 50 ? "bg-yellow-500" :
                          "bg-green-500"
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(usagePercent, 100)}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

