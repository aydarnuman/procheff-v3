"use client";

import { Mail, Smartphone, Bell, CheckCircle, XCircle, Trash2, Send, RefreshCw } from "lucide-react";
import { NotificationChannel } from "@/lib/notifications/service";
import { useState } from "react";

interface ChannelCardProps {
  channel: NotificationChannel;
  onVerify: (channelId: number) => void;
  onTest: (channelId: number) => void;
  onDelete: (channelId: number) => void;
  onResendVerification: (channelId: number) => void;
}

export function ChannelCard({
  channel,
  onVerify,
  onTest,
  onDelete,
  onResendVerification,
}: ChannelCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const getIcon = () => {
    switch (channel.type) {
      case "email":
        return <Mail className="w-5 h-5" />;
      case "sms":
        return <Smartphone className="w-5 h-5" />;
      case "push":
      case "in_app":
        return <Bell className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getTypeLabel = () => {
    switch (channel.type) {
      case "email":
        return "Email";
      case "sms":
        return "SMS";
      case "push":
        return "Push Bildirimi";
      case "in_app":
        return "Uygulama İçi";
      default:
        return channel.type;
    }
  };

  const handleDelete = async () => {
    if (confirm(`${channel.destination} kanalını silmek istediğinizden emin misiniz?`)) {
      setIsDeleting(true);
      await onDelete(channel.id!);
      setIsDeleting(false);
    }
  };

  return (
    <div className="glass-card hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 glass rounded-lg">{getIcon()}</div>
          <div>
            <h3 className="font-medium text-white">{getTypeLabel()}</h3>
            <p className="text-sm text-gray-400">{channel.destination}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {channel.verified ? (
            <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
              <CheckCircle className="w-3 h-3" />
              Doğrulandı
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
              <XCircle className="w-3 h-3" />
              Doğrulanmadı
            </span>
          )}
        </div>
      </div>

      {/* Settings */}
      {channel.settings && Object.keys(channel.settings).length > 0 && (
        <div className="mb-4 p-3 bg-slate-800/50 rounded-lg">
          <p className="text-xs text-gray-500 mb-2">Ayarlar:</p>
          {Object.entries(channel.settings).map(([key, value]) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-gray-400">{key}:</span>
              <span>{String(value)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-slate-700">
        {!channel.verified ? (
          <>
            <button
              onClick={() => onVerify(channel.id!)}
              className="flex-1 glass py-2 rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <CheckCircle className="w-4 h-4" />
              Doğrula
            </button>
            <button
              onClick={() => onResendVerification(channel.id!)}
              className="p-2 glass rounded-lg hover:bg-slate-700 transition-colors"
              title="Kodu Tekrar Gönder"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            onClick={() => onTest(channel.id!)}
            className="flex-1 glass py-2 rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Send className="w-4 h-4" />
            Test Gönder
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-2 glass rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>

      {/* Created Date */}
      {channel.created_at && (
        <p className="text-xs text-gray-500 mt-3 text-center">
          Eklenme: {new Date(channel.created_at).toLocaleDateString("tr-TR")}
        </p>
      )}
    </div>
  );
}