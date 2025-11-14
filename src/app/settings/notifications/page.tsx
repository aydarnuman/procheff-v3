"use client";

import { useState, useEffect } from "react";
import { Bell, ChevronLeft, Mail, Plus, RefreshCw, Settings, Smartphone, MessageSquare, X } from "lucide-react";
import Link from "next/link";
import { ChannelCard } from "@/components/notifications/ChannelCard";
import { VerificationModal } from "@/components/notifications/VerificationModal";
import { PreferenceGrid } from "@/components/notifications/PreferenceGrid";
import { NotificationChannel } from "@/lib/notifications/service";
import { toast } from "sonner";

export default function NotificationsSettingsPage() {
  const [activeTab, setActiveTab] = useState<"channels" | "preferences">("channels");
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [preferences, setPreferences] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState<number | null>(null);
  const [savingPreferences, setSavingPreferences] = useState(false);

  // New channel form state
  const [newChannelType, setNewChannelType] = useState<"email" | "sms">("email");
  const [newChannelDestination, setNewChannelDestination] = useState("");
  const [addingChannel, setAddingChannel] = useState(false);

  useEffect(() => {
    loadChannels();
    loadPreferences();
  }, []);

  const loadChannels = async () => {
    try {
      const res = await fetch("/api/settings/notifications/channels");
      const data = await res.json();

      if (data.success) {
        setChannels(data.channels);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Failed to load channels:", error);
      toast.error("Kanallar yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const res = await fetch("/api/settings/notifications/preferences");
      const data = await res.json();

      if (data.success) {
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error("Failed to load preferences:", error);
    }
  };

  const handleAddChannel = async () => {
    if (!newChannelDestination.trim()) {
      toast.error("Lütfen geçerli bir adres girin");
      return;
    }

    setAddingChannel(true);
    try {
      const res = await fetch("/api/settings/notifications/channels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: newChannelType,
          destination: newChannelDestination,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        setShowAddChannel(false);
        setNewChannelDestination("");
        loadChannels();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Kanal eklenemedi"
      );
    } finally {
      setAddingChannel(false);
    }
  };

  const handleVerifyChannel = (channelId: number) => {
    setShowVerifyModal(channelId);
  };

  const handleVerifyCode = async (channelId: number, code: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/settings/notifications/verify", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channelId,
          code,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Kanal başarıyla doğrulandı!");
        loadChannels();
        return true;
      } else {
        toast.error(data.error || "Doğrulama başarısız");
        return false;
      }
    } catch (error) {
      toast.error("Doğrulama başarısız");
      return false;
    }
  };

  const handleResendVerification = async (channelId: number) => {
    try {
      const res = await fetch("/api/settings/notifications/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ channelId }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Doğrulama kodu tekrar gönderildi");
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error("Kod gönderilemedi");
    }
  };

  const handleTestChannel = async (channelId: number) => {
    try {
      const res = await fetch("/api/settings/notifications/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ channelId }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Test bildirimi gönderildi!");
        if (data.previewUrl) {
          window.open(data.previewUrl, "_blank");
        }
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Test gönderilemedi"
      );
    }
  };

  const handleDeleteChannel = async (channelId: number) => {
    try {
      const res = await fetch(
        `/api/settings/notifications/channels?channelId=${channelId}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (data.success) {
        toast.success("Kanal silindi");
        loadChannels();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error("Kanal silinemedi");
    }
  };

  const handlePreferenceChange = (event: string, channel: string, enabled: boolean) => {
    setPreferences((prev) => {
      const updated = { ...prev };
      if (!updated[event]) {
        updated[event] = [];
      }

      if (enabled) {
        if (!updated[event].includes(channel)) {
          updated[event].push(channel);
        }
      } else {
        updated[event] = updated[event].filter(ch => ch !== channel);
      }

      return updated;
    });
  };

  const handleSavePreferences = async () => {
    setSavingPreferences(true);
    try {
      const res = await fetch("/api/settings/notifications/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferences),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Tercihler kaydedildi");
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error("Tercihler kaydedilemedi");
    } finally {
      setSavingPreferences(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
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
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center shadow-lg shadow-indigo-500/30">
            <Bell className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-100">Bildirimler</h1>
            <p className="text-gray-400">Bildirim kanalları ve etkinlikler</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("channels")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "channels"
              ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
              : "glass hover:bg-white/10 text-gray-400"
          }`}
        >
          Kanallar
        </button>
        <button
          onClick={() => setActiveTab("preferences")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "preferences"
              ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
              : "glass hover:bg-white/10 text-gray-400"
          }`}
        >
          Tercihler
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "channels" ? (
        <div className="space-y-6">
          {/* Add Channel Button */}
          <button
            onClick={() => setShowAddChannel(true)}
            className="w-full glass-card hover:bg-white/10 transition-colors flex items-center justify-center gap-2 py-4"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Yeni Kanal Ekle</span>
          </button>

          {/* Channels List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : channels.length === 0 ? (
            <div className="glass-card text-center py-12">
              <Bell className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Kanal Bulunamadı</h3>
              <p className="text-gray-400 mb-4">
                Bildirim almak için bir kanal ekleyin
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {channels.map((channel) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  onVerify={() => handleVerifyChannel(channel.id!)}
                  onTest={() => handleTestChannel(channel.id!)}
                  onDelete={() => handleDeleteChannel(channel.id!)}
                  onResendVerification={() => handleResendVerification(channel.id!)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card">
          <PreferenceGrid
            preferences={preferences}
            channels={channels}
            onChange={handlePreferenceChange}
            onSave={handleSavePreferences}
            saving={savingPreferences}
          />
        </div>
      )}

      {/* Add Channel Modal */}
      {showAddChannel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Yeni Kanal Ekle</h3>
              <button
                onClick={() => {
                  setShowAddChannel(false);
                  setNewChannelDestination("");
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Channel Type */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Kanal Tipi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewChannelType("email")}
                    className={`p-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                      newChannelType === "email"
                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                        : "glass hover:bg-white/10"
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewChannelType("sms")}
                    className={`p-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                      newChannelType === "sms"
                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                        : "glass hover:bg-white/10"
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>SMS</span>
                  </button>
                </div>
              </div>

              {/* Destination */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {newChannelType === "email" ? "Email Adresi" : "Telefon Numarası"}
                </label>
                <input
                  type={newChannelType === "email" ? "email" : "tel"}
                  value={newChannelDestination}
                  onChange={(e) => setNewChannelDestination(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder={
                    newChannelType === "email"
                      ? "email@example.com"
                      : "+90 555 123 4567"
                  }
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddChannel(false);
                    setNewChannelDestination("");
                  }}
                  className="flex-1 glass py-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleAddChannel}
                  disabled={addingChannel || !newChannelDestination.trim()}
                  className="flex-1 btn-gradient py-2 rounded-lg disabled:opacity-50"
                >
                  {addingChannel ? (
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    "Ekle"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {showVerifyModal && (() => {
        const channel = channels.find(c => c.id === showVerifyModal);
        if (!channel) return null;
        return (
          <VerificationModal
            channelId={showVerifyModal}
            channelType={channel.type}
            destination={channel.destination}
            onVerify={handleVerifyCode}
            onResend={handleResendVerification}
            onClose={() => setShowVerifyModal(null)}
          />
        );
      })()}
    </div>
  );
}
