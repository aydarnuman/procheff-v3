"use client";

import { Bell, ChevronLeft, Mail, MessageSquare, Save, Smartphone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type NotificationChannel = "email" | "push" | "sms";
type NotificationEvent = {
  id: string;
  name: string;
  description: string;
  channels: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
};

export default function NotificationsSettingsPage() {
  const [events, setEvents] = useState<NotificationEvent[]>([
    {
      id: "pipeline_complete",
      name: "Pipeline Tamamlandı",
      description: "Auto-pipeline başarıyla tamamlandığında",
      channels: { email: true, push: true, sms: false },
    },
    {
      id: "pipeline_failed",
      name: "Pipeline Başarısız",
      description: "Pipeline hata ile sonlandığında",
      channels: { email: true, push: true, sms: true },
    },
    {
      id: "ihale_deadline",
      name: "İhale Tarihi Yaklaşıyor",
      description: "İhale bitiş tarihine 24 saat kaldığında",
      channels: { email: true, push: false, sms: false },
    },
    {
      id: "cost_threshold",
      name: "Maliyet Limiti Aşıldı",
      description: "Tahmin edilen maliyet belirlenen limiti aştığında",
      channels: { email: false, push: true, sms: false },
    },
    {
      id: "report_ready",
      name: "Rapor Hazır",
      description: "PDF/Excel raporu oluşturulduğunda",
      channels: { email: true, push: false, sms: false },
    },
    {
      id: "system_error",
      name: "Sistem Hatası",
      description: "Kritik sistem hatası oluştuğunda",
      channels: { email: true, push: true, sms: true },
    },
  ]);

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);

  const [emailAddress, setEmailAddress] = useState("user@procheff.com");
  const [phoneNumber, setPhoneNumber] = useState("+90 555 123 4567");

  const toggleChannel = (eventId: string, channel: NotificationChannel) => {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? {
              ...event,
              channels: {
                ...event.channels,
                [channel]: !event.channels[channel],
              },
            }
          : event
      )
    );
  };

  const handleSave = () => {
    const settings = {
      channels: {
        email: { enabled: emailEnabled, address: emailAddress },
        push: { enabled: pushEnabled },
        sms: { enabled: smsEnabled, phone: phoneNumber },
      },
      events,
    };

    localStorage.setItem("notification_settings", JSON.stringify(settings));
    alert("Bildirim ayarları kaydedildi!");
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

      {/* Channel Settings */}
      <div className="glass-card mb-6">
        <h2 className="h2 mb-4">Bildirim Kanalları</h2>

        <div className="space-y-4">
          {/* Email */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Mail className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-200">Email Bildirimleri</p>
                    <p className="text-sm text-gray-500">Önemli olaylar için email gönder</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailEnabled}
                      onChange={(e) => setEmailEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                {emailEnabled && (
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="email@example.com"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Push */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-indigo-500/20">
                <Smartphone className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-200">Push Bildirimleri</p>
                    <p className="text-sm text-gray-500">Tarayıcı bildirimleri</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pushEnabled}
                      onChange={(e) => setPushEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* SMS */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-200">SMS Bildirimleri</p>
                    <p className="text-sm text-gray-500">Kritik olaylar için SMS</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smsEnabled}
                      onChange={(e) => setSmsEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                {smsEnabled && (
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="+90 555 123 4567"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Preferences */}
      <div className="glass-card mb-6">
        <h2 className="h2 mb-4">Bildirim Tercihleri</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                  Etkinlik
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">
                  Email
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">
                  Push
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">
                  SMS
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-3 px-4">
                    <p className="text-sm font-medium text-gray-200">{event.name}</p>
                    <p className="text-xs text-gray-500">{event.description}</p>
                  </td>
                  <td className="text-center py-3 px-4">
                    <input
                      type="checkbox"
                      checked={event.channels.email}
                      onChange={() => toggleChannel(event.id, "email")}
                      disabled={!emailEnabled}
                      className="w-4 h-4 text-indigo-500 bg-white/5 border-white/10 rounded focus:ring-indigo-500 disabled:opacity-30"
                    />
                  </td>
                  <td className="text-center py-3 px-4">
                    <input
                      type="checkbox"
                      checked={event.channels.push}
                      onChange={() => toggleChannel(event.id, "push")}
                      disabled={!pushEnabled}
                      className="w-4 h-4 text-indigo-500 bg-white/5 border-white/10 rounded focus:ring-indigo-500 disabled:opacity-30"
                    />
                  </td>
                  <td className="text-center py-3 px-4">
                    <input
                      type="checkbox"
                      checked={event.channels.sms}
                      onChange={() => toggleChannel(event.id, "sms")}
                      disabled={!smsEnabled}
                      className="w-4 h-4 text-indigo-500 bg-white/5 border-white/10 rounded focus:ring-indigo-500 disabled:opacity-30"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
      >
        <Save className="w-5 h-5" />
        Ayarları Kaydet
      </button>
    </div>
  );
}
