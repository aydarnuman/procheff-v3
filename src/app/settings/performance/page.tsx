"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Database, Save, Server, Shield, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface PerformanceConfig {
  rateLimiting: {
    enabled: boolean;
    globalLimit: number;
    endpoints: Record<string, { requests: number; window: string }>;
  };
  caching: {
    enabled: boolean;
    defaultTTL: number;
  };
  redis: {
    url: string;
    token: string;
    connected: boolean;
  };
}

export default function PerformanceSettingsPage() {
  const [config, setConfig] = useState<PerformanceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      // Fetch from our new performance save endpoint
      const res = await fetch("/api/settings/performance/save");
      const data = await res.json();
      if (data.success && data.settings) {
        // Transform database settings to config format
        setConfig({
          rateLimiting: {
            enabled: data.settings.enable_caching || false,
            globalLimit: data.settings.api_rate_limit || 100,
            endpoints: {},
          },
          caching: {
            enabled: data.settings.enable_caching || false,
            defaultTTL: data.settings.cache_ttl || 3600,
          },
          redis: {
            url: process.env.NEXT_PUBLIC_REDIS_URL || "",
            token: "",
            connected: false,
          },
        });
      }
    } catch (error) {
      console.error("Failed to fetch config:", error);
      toast.error("Ayarlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    try {
      // Save to our new performance database endpoint
      const res = await fetch("/api/settings/performance/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cache_ttl: config.caching.defaultTTL,
          api_rate_limit: config.rateLimiting.globalLimit,
          enable_caching: config.caching.enabled,
          enable_compression: true, // Default value
          // Add more fields as needed
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.requiresRestart && data.requiresRestart.length > 0) {
          toast.warning(
            "Ayarlar kaydedildi, ancak bazı değişiklikler sunucu yeniden başlatması gerektirir",
            {
              description: `Yeniden başlatma gerektiren ayarlar: ${data.requiresRestart.join(", ")}`,
              duration: 5000,
            }
          );
        } else {
          toast.success("Ayarlar başarıyla database'e kaydedildi!");
        }
        // Refresh config after save
        await fetchConfig();
      } else {
        throw new Error(data.error || "Kayıt başarısız");
      }
    } catch (error) {
      console.error("Failed to save config:", error);
      toast.error(
        error instanceof Error ? error.message : "Ayarlar kaydedilemedi"
      );
    } finally {
      setSaving(false);
    }
  };

  const testRedisConnection = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/performance/stats");
      const data = await res.json();
      if (data.success && data.data.redis?.connected) {
        toast.success("Redis bağlantısı başarılı!");
      } else {
        toast.error("Redis bağlantısı başarısız");
      }
    } catch (error) {
      toast.error("Redis bağlantısı test edilemedi");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-700 rounded w-1/3"></div>
          <div className="h-64 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="h1 mb-8">Performans Ayarları</h1>

      <div className="space-y-6">
        {/* Rate Limiting */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              <CardTitle>Rate Limiting</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Rate Limiting Aktif</p>
                <p className="text-sm text-gray-400">
                  API isteklerini sınırlandırır ve abuse'i önler
                </p>
              </div>
              <label htmlFor="rate-limiting-enabled" className="relative inline-flex items-center cursor-pointer">
                <input
                  id="rate-limiting-enabled"
                  type="checkbox"
                  checked={config?.rateLimiting.enabled || false}
                  onChange={(e) => setConfig({
                    ...config!,
                    rateLimiting: { ...config!.rateLimiting, enabled: e.target.checked }
                  })}
                  className="sr-only peer"
                  aria-label="Rate limiting aktif"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {config?.rateLimiting.enabled && (
              <div className="pt-4 border-t border-slate-700 space-y-4">
                <div>
                  <label htmlFor="global-limit" className="block text-sm font-medium mb-2">
                    Global Limit (istek/dakika)
                  </label>
                  <input
                    id="global-limit"
                    type="number"
                    value={config.rateLimiting.globalLimit}
                    onChange={(e) => setConfig({
                      ...config,
                      rateLimiting: {
                        ...config.rateLimiting,
                        globalLimit: parseInt(e.target.value) || 100
                      }
                    })}
                    className="glass p-3 rounded-lg w-full bg-transparent text-white border border-slate-700"
                    min="1"
                    max="1000"
                    placeholder="100"
                    title="Dakikada izin verilen maksimum istek sayısı"
                    aria-label="Global rate limit - istek sayısı per dakika"
                  />
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Endpoint Limitleri</p>
                  <div className="space-y-2 text-sm text-gray-400">
                    <p>Endpoint bazlı limitler backend'de tanımlıdır.</p>
                    <p className="text-xs">
                      Değiştirmek için: <code className="bg-slate-800 px-2 py-1 rounded">src/features/config.ts</code>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Caching */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-green-400" />
              <CardTitle>Response Caching</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Caching Aktif</p>
                <p className="text-sm text-gray-400">
                  AI analiz sonuçlarını cache'ler, performansı artırır
                </p>
              </div>
              <label htmlFor="caching-enabled" className="relative inline-flex items-center cursor-pointer">
                <input
                  id="caching-enabled"
                  type="checkbox"
                  checked={config?.caching.enabled || false}
                  onChange={(e) => setConfig({
                    ...config!,
                    caching: { ...config!.caching, enabled: e.target.checked }
                  })}
                  className="sr-only peer"
                  aria-label="Caching aktif"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            {config?.caching.enabled && (
              <div className="pt-4 border-t border-slate-700">
                <label htmlFor="default-ttl" className="block text-sm font-medium mb-2">
                  Default TTL (saniye)
                </label>
                <input
                  id="default-ttl"
                  type="number"
                  value={config.caching.defaultTTL}
                  onChange={(e) => setConfig({
                    ...config,
                    caching: {
                      ...config.caching,
                      defaultTTL: parseInt(e.target.value) || 3600
                    }
                  })}
                  className="glass p-3 rounded-lg w-full bg-transparent text-white border border-slate-700"
                  min="60"
                  max="86400"
                  placeholder="3600"
                  title="Cache'in geçerlilik süresi (saniye)"
                  aria-label="Default cache TTL - saniye cinsinden"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Cache'lenmiş verilerin ne kadar süre geçerli kalacağı
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Redis Configuration */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-purple-400" />
              <CardTitle>Redis Configuration</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold">Redis Durumu</p>
                <p className="text-sm text-gray-400">
                  Rate limiting ve caching için gerekli
                </p>
              </div>
              <div className="flex items-center gap-2">
                {config?.redis.connected ? (
                  <div className="flex items-center gap-1 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs">Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-400">
                    <XCircle className="w-4 h-4" />
                    <span className="text-xs">Disconnected</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="redis-url" className="block text-sm font-medium mb-2">
                  Redis URL
                </label>
                <input
                  id="redis-url"
                  type="text"
                  value={config?.redis.url || ""}
                  onChange={(e) => setConfig({
                    ...config!,
                    redis: { ...config!.redis, url: e.target.value }
                  })}
                  placeholder="https://your-redis.upstash.io"
                  className="glass p-3 rounded-lg w-full bg-transparent text-white border border-slate-700"
                  disabled
                  title="Redis bağlantı URL'i"
                  aria-label="Redis bağlantı URL'i"
                />
                <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Environment variable'dan yönetilir: UPSTASH_REDIS_REST_URL
                </p>
              </div>

              <div>
                <label htmlFor="redis-token" className="block text-sm font-medium mb-2">
                  Redis Token
                </label>
                <input
                  id="redis-token"
                  type="password"
                  value={config?.redis.token || ""}
                  onChange={(e) => setConfig({
                    ...config!,
                    redis: { ...config!.redis, token: e.target.value }
                  })}
                  placeholder="••••••••"
                  className="glass p-3 rounded-lg w-full bg-transparent text-white border border-slate-700"
                  disabled
                  title="Redis authentication token"
                  aria-label="Redis authentication token"
                />
                <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Environment variable'dan yönetilir: UPSTASH_REDIS_REST_TOKEN
                </p>
              </div>
            </div>

            <button
              onClick={testRedisConnection}
              disabled={testing}
              className="btn-gradient w-full py-3 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {testing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Test Ediliyor...
                </>
              ) : (
                <>
                  <Server className="w-4 h-4" />
                  Bağlantıyı Test Et
                </>
              )}
            </button>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-gradient flex-1 py-3 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Ayarları Kaydet
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

