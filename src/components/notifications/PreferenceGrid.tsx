"use client";

import { Mail, Smartphone, Bell, Monitor } from "lucide-react";
import { NotificationChannel } from "@/lib/notifications/service";

interface PreferenceGridProps {
  preferences: Record<string, string[]>;
  channels: NotificationChannel[];
  onChange: (event: string, channel: string, enabled: boolean) => void;
  onSave: () => void;
  saving?: boolean;
}

const eventDetails = {
  pipeline_complete: {
    name: "Pipeline Tamamlandı",
    description: "Auto-pipeline başarıyla tamamlandığında",
  },
  pipeline_failed: {
    name: "Pipeline Başarısız",
    description: "Pipeline hata ile sonlandığında",
  },
  report_ready: {
    name: "Rapor Hazır",
    description: "PDF/Excel raporu oluşturulduğunda",
  },
  analysis_complete: {
    name: "Analiz Tamamlandı",
    description: "İhale analizi tamamlandığında",
  },
  cost_threshold: {
    name: "Maliyet Limiti Aşıldı",
    description: "Tahmin edilen maliyet belirlenen limiti aştığında",
  },
  security_alert: {
    name: "Güvenlik Uyarısı",
    description: "Güvenlik ile ilgili önemli olaylar",
  },
};

const channelTypes = {
  email: { icon: Mail, label: "Email" },
  sms: { icon: Smartphone, label: "SMS" },
  push: { icon: Bell, label: "Push" },
  in_app: { icon: Monitor, label: "Uygulama İçi" },
};

export function PreferenceGrid({
  preferences,
  channels,
  onChange,
  onSave,
  saving = false,
}: PreferenceGridProps) {
  // Get available channel types from user's verified channels
  const availableChannelTypes = Array.from(
    new Set(channels.filter(ch => ch.verified).map(ch => ch.type))
  );

  const isChannelEnabled = (event: string, channelType: string): boolean => {
    return preferences[event]?.includes(channelType) || false;
  };

  const handleToggle = (event: string, channelType: string) => {
    const isEnabled = isChannelEnabled(event, channelType);
    onChange(event, channelType, !isEnabled);
  };

  const hasVerifiedChannel = (type: string): boolean => {
    return channels.some(ch => ch.type === type && ch.verified);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Bildirim Tercihleri</h3>
        <button
          onClick={onSave}
          disabled={saving}
          className="btn-gradient px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {saving ? "Kaydediliyor..." : "Tercihleri Kaydet"}
        </button>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left p-3">Olay</th>
              {Object.entries(channelTypes).map(([type, config]) => {
                const Icon = config.icon;
                const isAvailable = hasVerifiedChannel(type);
                return (
                  <th
                    key={type}
                    className={`text-center p-3 ${!isAvailable ? "opacity-50" : ""}`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Icon className="w-4 h-4" />
                      <span className="text-xs">{config.label}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Object.entries(eventDetails).map(([eventKey, event]) => (
              <tr
                key={eventKey}
                className="border-b border-slate-700/50 hover:bg-slate-800/50"
              >
                <td className="p-3">
                  <div>
                    <p className="font-medium text-sm">{event.name}</p>
                    <p className="text-xs text-gray-500">{event.description}</p>
                  </div>
                </td>
                {Object.keys(channelTypes).map((channelType) => {
                  const isAvailable = hasVerifiedChannel(channelType);
                  const isEnabled = isChannelEnabled(eventKey, channelType);

                  return (
                    <td key={channelType} className="text-center p-3">
                      <label className="inline-flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => handleToggle(eventKey, channelType)}
                          disabled={!isAvailable}
                          className="w-4 h-4 rounded text-indigo-500 bg-slate-700 border-slate-600
                                   focus:ring-indigo-500 focus:ring-2 disabled:opacity-50
                                   disabled:cursor-not-allowed"
                        />
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info */}
      {availableChannelTypes.length === 0 && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
          <p className="text-sm text-yellow-400">
            Bildirim tercihlerini ayarlayabilmek için önce en az bir kanal ekleyip
            doğrulamalısınız.
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <input type="checkbox" checked disabled className="w-3 h-3" />
          <span>Aktif</span>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" disabled className="w-3 h-3" />
          <span>Pasif</span>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" disabled className="w-3 h-3 opacity-50" />
          <span>Kullanılamaz (Kanal eklenmemiş)</span>
        </div>
      </div>
    </div>
  );
}