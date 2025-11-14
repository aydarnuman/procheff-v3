"use client";

import { ApiEndpointList } from "@/components/integrations/ApiEndpointList";
import { IntegrationToggle } from "@/components/integrations/IntegrationToggle";
import { WebhookCard } from "@/components/integrations/WebhookCard";
import { ApiEndpoint, ApiStats } from "@/lib/integrations/api-stats-service";
import { IntegrationConfig } from "@/lib/integrations/integration-service";
import { Webhook } from "@/lib/integrations/webhook-service";
import { ChevronLeft, Code, Globe, Plus, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { toast } from "sonner";

type TabType = "endpoints" | "webhooks" | "integrations" | "stats";

export default function ApiIntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("endpoints");

  // Endpoints data
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);

  // Webhooks data
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [testingWebhook, setTestingWebhook] = useState<number | null>(null);

  // Integrations data
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [configuringIntegration, setConfiguringIntegration] = useState<IntegrationConfig | null>(null);

  // Stats data
  const [apiStats, setApiStats] = useState<ApiStats[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [statsTimeRange, setStatsTimeRange] = useState<"hour" | "day" | "week" | "month">("day");

  // Webhook form
  const [webhookForm, setWebhookForm] = useState({
    name: "",
    url: "",
    events: [] as string[],
    secret: "",
    headers: {} as Record<string, string>,
    active: true,
    retry_count: 3,
    timeout_ms: 5000,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === "stats") {
      loadStats();
    }
  }, [activeTab, statsTimeRange]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load API stats to get endpoints
      const statsRes = await fetch("/api/settings/integrations/api-stats");
      const statsData = await statsRes.json();
      if (statsData.success) {
        setEndpoints(statsData.endpoints || []);
      }

      // Load webhooks
      const webhooksRes = await fetch("/api/settings/integrations/webhooks");
      const webhooksData = await webhooksRes.json();
      if (webhooksData.success) {
        setWebhooks(webhooksData.webhooks || []);
      }

      // Load integrations
      const integrationsRes = await fetch("/api/settings/integrations");
      const integrationsData = await integrationsRes.json();
      if (integrationsData.success) {
        setIntegrations(integrationsData.integrations || []);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Veri yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`/api/settings/integrations/api-stats?timeRange=${statsTimeRange}`);
      const data = await res.json();

      if (data.success) {
        setApiStats(data.stats || []);
        setTimeline(data.timeline || []);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const handleTestWebhook = async (webhookId: number) => {
    setTestingWebhook(webhookId);
    try {
      const res = await fetch("/api/settings/integrations/test-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ webhookId }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message || "Test failed");
      }
    } catch (error) {
      toast.error("Webhook test failed");
    } finally {
      setTestingWebhook(null);
    }
  };

  const handleSaveWebhook = async () => {
    try {
      const method = editingWebhook ? "PUT" : "POST";
      const body = editingWebhook
        ? { id: editingWebhook.id, ...webhookForm }
        : webhookForm;

      const res = await fetch("/api/settings/integrations/webhooks", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setShowWebhookModal(false);
        setEditingWebhook(null);
        setWebhookForm({
          name: "",
          url: "",
          events: [],
          secret: "",
          headers: {},
          active: true,
          retry_count: 3,
          timeout_ms: 5000,
        });
        loadData();
      } else {
        toast.error(data.error || "Failed to save webhook");
      }
    } catch (error) {
      toast.error("Failed to save webhook");
    }
  };

  const handleDeleteWebhook = async (id: number) => {
    try {
      const res = await fetch(`/api/settings/integrations/webhooks?id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Webhook deleted");
        loadData();
      } else {
        toast.error(data.error || "Failed to delete webhook");
      }
    } catch (error) {
      toast.error("Failed to delete webhook");
    }
  };

  const handleToggleWebhook = async (webhook: Webhook) => {
    try {
      const res = await fetch("/api/settings/integrations/webhooks", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: webhook.id,
          active: !webhook.active,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Webhook ${!webhook.active ? "enabled" : "disabled"}`);
        loadData();
      }
    } catch (error) {
      toast.error("Failed to toggle webhook");
    }
  };

  const handleToggleIntegration = async (service: string, enabled: boolean) => {
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "toggle",
          service,
          enabled,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        loadData();
      } else {
        toast.error(data.message || "Failed to toggle integration");
      }
    } catch (error) {
      toast.error("Failed to toggle integration");
    }
  };

  const handleTestIntegration = async (service: string) => {
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "test",
          service,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message || "Test failed");
      }
    } catch (error) {
      toast.error("Integration test failed");
    }
  };

  const availableEvents = [
    "tender_created",
    "tender_analyzed",
    "decision_made",
    "report_generated",
    "user_login",
    "user_signup",
    "error_occurred",
    "test_event",
  ];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-indigo-300 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Ayarlara Dön
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 grid place-items-center shadow-lg shadow-purple-500/30">
            <Code className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-100">API & Entegrasyonlar</h1>
            <p className="text-gray-400">API endpoints, webhooks ve üçüncü parti entegrasyonlar</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-white/10">
        <button
          onClick={() => setActiveTab("endpoints")}
          className={`px-4 py-2 font-medium transition-all relative ${
            activeTab === "endpoints"
              ? "text-indigo-400"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          API Endpoints
          {activeTab === "endpoints" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("webhooks")}
          className={`px-4 py-2 font-medium transition-all relative ${
            activeTab === "webhooks"
              ? "text-indigo-400"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Webhooks
          {activeTab === "webhooks" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("integrations")}
          className={`px-4 py-2 font-medium transition-all relative ${
            activeTab === "integrations"
              ? "text-indigo-400"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Entegrasyonlar
          {activeTab === "integrations" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={`px-4 py-2 font-medium transition-all relative ${
            activeTab === "stats"
              ? "text-indigo-400"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          İstatistikler
          {activeTab === "stats" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-600" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "endpoints" && (
        <div className="space-y-6">
          <div className="glass-card">
            <h2 className="text-lg font-semibold mb-4">Mevcut API Endpoints</h2>
            <ApiEndpointList endpoints={endpoints} />
          </div>
        </div>
      )}

      {activeTab === "webhooks" && (
        <div className="space-y-6">
          <button
            onClick={() => {
              setEditingWebhook(null);
              setWebhookForm({
                name: "",
                url: "",
                events: [],
                secret: "",
                headers: {},
                active: true,
                retry_count: 3,
                timeout_ms: 5000,
              });
              setShowWebhookModal(true);
            }}
            className="w-full glass-card hover:bg-white/10 transition-colors flex items-center justify-center gap-2 py-4"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Yeni Webhook Ekle</span>
          </button>

          {webhooks.length === 0 ? (
            <div className="glass-card text-center py-12">
              <Globe className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Webhook Bulunamadı</h3>
              <p className="text-gray-400">
                Olay bildirimleri almak için webhook ekleyin
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {webhooks.map((webhook) => (
                <WebhookCard
                  key={webhook.id}
                  webhook={webhook}
                  onTest={() => handleTestWebhook(webhook.id!)}
                  onEdit={() => {
                    setEditingWebhook(webhook);
                    setWebhookForm({
                      name: webhook.name,
                      url: webhook.url,
                      events: webhook.events,
                      secret: webhook.secret || "",
                      headers: webhook.headers || {},
                      active: webhook.active,
                      retry_count: webhook.retry_count,
                      timeout_ms: webhook.timeout_ms,
                    });
                    setShowWebhookModal(true);
                  }}
                  onDelete={() => handleDeleteWebhook(webhook.id!)}
                  onToggle={() => handleToggleWebhook(webhook)}
                  testing={testingWebhook === webhook.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "integrations" && (
        <div className="space-y-4">
          {integrations.map((integration) => (
            <IntegrationToggle
              key={integration.service}
              integration={integration}
              onToggle={(enabled) => handleToggleIntegration(integration.service, enabled)}
              onTest={() => handleTestIntegration(integration.service)}
              onConfigure={() => setConfiguringIntegration(integration)}
            />
          ))}
        </div>
      )}

      {activeTab === "stats" && (
        <div className="space-y-6">
          {/* Time range selector */}
          <div className="flex gap-2">
            {(["hour", "day", "week", "month"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setStatsTimeRange(range)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  statsTimeRange === range
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                    : "glass hover:bg-white/10 text-gray-400"
                }`}
              >
                {range === "hour" ? "Son Saat" : range === "day" ? "Son 24 Saat" : range === "week" ? "Son 7 Gün" : "Son 30 Gün"}
              </button>
            ))}
          </div>

          {/* Usage Timeline */}
          <div className="glass-card">
            <h3 className="text-lg font-semibold mb-4">API Kullanım Grafiği</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "1px solid #374151" }} />
                <Legend />
                <Line type="monotone" dataKey="requests" stroke="#6366F1" name="İstekler" />
                <Line type="monotone" dataKey="errors" stroke="#EF4444" name="Hatalar" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top Endpoints */}
          <div className="glass-card">
            <h3 className="text-lg font-semibold mb-4">En Çok Kullanılan Endpoint'ler</h3>
            <div className="space-y-2">
              {apiStats.slice(0, 10).map((stat) => (
                <div key={`${stat.endpoint}-${stat.method}`} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-gray-300">
                        {stat.method} {stat.endpoint}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span>Toplam: {stat.totalRequests}</span>
                      <span>Başarı: {stat.successRate.toFixed(1)}%</span>
                      <span>Avg: {stat.avgResponseTime}ms</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-indigo-400">{stat.last24Hours}</div>
                    <div className="text-xs text-gray-500">Son 24 saat</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Webhook Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                {editingWebhook ? "Webhook Düzenle" : "Yeni Webhook"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowWebhookModal(false);
                  setEditingWebhook(null);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close modal"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">İsim</label>
                <input
                  type="text"
                  value={webhookForm.name}
                  onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="Production Webhook"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">URL</label>
                <input
                  type="url"
                  value={webhookForm.url}
                  onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="https://example.com/webhook"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Events</label>
                <div className="grid grid-cols-2 gap-2">
                  {availableEvents.map((event) => (
                    <label key={event} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10">
                      <input
                        type="checkbox"
                        checked={webhookForm.events.includes(event)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setWebhookForm({
                              ...webhookForm,
                              events: [...webhookForm.events, event],
                            });
                          } else {
                            setWebhookForm({
                              ...webhookForm,
                              events: webhookForm.events.filter((e) => e !== event),
                            });
                          }
                        }}
                        className="text-indigo-500"
                      />
                      <span className="text-sm">{event}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Secret (Optional)</label>
                <input
                  type="text"
                  value={webhookForm.secret}
                  onChange={(e) => setWebhookForm({ ...webhookForm, secret: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="HMAC signature secret"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowWebhookModal(false);
                    setEditingWebhook(null);
                  }}
                  className="flex-1 glass py-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleSaveWebhook}
                  className="flex-1 btn-gradient py-2 rounded-lg"
                >
                  {editingWebhook ? "Güncelle" : "Oluştur"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}