"use client";

import { useState } from "react";
import { Webhook } from "@/lib/integrations/webhook-service";
import { Globe, MoreVertical, Play, Trash2, Edit2, Copy, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface WebhookCardProps {
  webhook: Webhook;
  onTest: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  testing?: boolean;
}

export function WebhookCard({
  webhook,
  onTest,
  onEdit,
  onDelete,
  onToggle,
  testing = false,
}: WebhookCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const copyUrl = () => {
    navigator.clipboard.writeText(webhook.url);
    toast.success("URL kopyalandı!");
    setShowMenu(false);
  };

  const getStatusColor = () => {
    if (!webhook.active) return "bg-gray-500";
    if (webhook.last_status && webhook.last_status >= 200 && webhook.last_status < 300) {
      return "bg-green-500";
    }
    if (webhook.failure_count && webhook.failure_count > 0) {
      return "bg-red-500";
    }
    return "bg-yellow-500";
  };

  return (
    <div className="glass-card hover:border-indigo-500/30 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${getStatusColor()}/20`}>
            <Globe className={`w-5 h-5 text-${getStatusColor().replace("bg-", "")}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-gray-200">{webhook.name}</h3>
              {webhook.active ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-500" />
              )}
            </div>
            <p className="text-sm text-gray-400 font-mono break-all">{webhook.url}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>Events: {webhook.events.length}</span>
              {webhook.last_triggered && (
                <span>
                  Last: {new Date(webhook.last_triggered).toLocaleString("tr-TR")}
                </span>
              )}
              {webhook.failure_count !== undefined && webhook.failure_count > 0 && (
                <span className="text-red-400">Failures: {webhook.failure_count}</span>
              )}
            </div>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-10 w-48 glass rounded-lg shadow-xl z-20 py-1">
                <button
                  onClick={() => {
                    onTest();
                    setShowMenu(false);
                  }}
                  disabled={testing}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-2 disabled:opacity-50"
                >
                  {testing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Test Webhook
                </button>
                <button
                  onClick={() => {
                    onEdit();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Düzenle
                </button>
                <button
                  onClick={copyUrl}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  URL Kopyala
                </button>
                <button
                  onClick={() => {
                    onToggle();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {webhook.active ? "Devre Dışı Bırak" : "Etkinleştir"}
                </button>
                <hr className="my-1 border-white/10" />
                <button
                  onClick={() => {
                    if (confirm("Bu webhook'u silmek istediğinizden emin misiniz?")) {
                      onDelete();
                      setShowMenu(false);
                    }
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-500/20 text-red-400 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Sil
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Event badges */}
      <div className="flex flex-wrap gap-2 mt-3">
        {webhook.events.slice(0, 3).map((event) => (
          <span
            key={event}
            className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded-full"
          >
            {event}
          </span>
        ))}
        {webhook.events.length > 3 && (
          <span className="px-2 py-1 bg-white/10 text-gray-400 text-xs rounded-full">
            +{webhook.events.length - 3} more
          </span>
        )}
      </div>
    </div>
  );
}