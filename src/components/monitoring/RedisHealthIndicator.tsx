"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, Server, XCircle } from "lucide-react";

interface RedisHealth {
  connected: boolean;
  configured: boolean;
  latency: number | null;
}

interface RedisHealthIndicatorProps {
  health: RedisHealth | null;
  loading?: boolean;
}

export function RedisHealthIndicator({ health, loading }: RedisHealthIndicatorProps) {
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

  if (!health) {
    return (
      <Card variant="elevated" className="border-gray-500/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-gray-400" />
            <CardTitle>Redis Status</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">No data available</p>
        </CardContent>
      </Card>
    );
  }

  const isHealthy = health.connected && health.configured;
  const statusColor = isHealthy ? "text-green-400" : "text-red-400";
  const statusBg = isHealthy ? "bg-green-500/20" : "bg-red-500/20";
  const StatusIcon = isHealthy ? CheckCircle : XCircle;

  return (
    <Card variant="elevated" className={isHealthy ? "border-green-500/30" : "border-red-500/30"}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className={`w-5 h-5 ${statusColor}`} />
            <CardTitle>Redis Status</CardTitle>
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded ${statusBg}`}>
            <StatusIcon className={`w-4 h-4 ${statusColor}`} />
            <span className={`text-xs font-semibold ${statusColor}`}>
              {isHealthy ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Configuration Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Configuration</span>
          <span className={`text-sm font-semibold ${
            health.configured ? "text-green-400" : "text-yellow-400"
          }`}>
            {health.configured ? "Configured" : "Not Configured"}
          </span>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Connection</span>
          <span className={`text-sm font-semibold ${statusColor}`}>
            {health.connected ? "Active" : "Inactive"}
          </span>
        </div>

        {/* Latency */}
        {health.latency !== null && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Latency
            </span>
            <span className={`text-sm font-semibold ${
              health.latency < 50 ? "text-green-400" :
              health.latency < 100 ? "text-yellow-400" :
              "text-red-400"
            }`}>
              {health.latency}ms
            </span>
          </div>
        )}

        {!health.configured && (
          <div className="pt-2 border-t border-slate-700">
            <p className="text-xs text-yellow-400">
              Configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in environment variables
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

