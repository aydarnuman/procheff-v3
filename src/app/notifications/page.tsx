"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  XCircle,
  Check,
  CheckCheck,
  RefreshCw
} from "lucide-react";

type Notification = {
  id: number;
  level: "info" | "warn" | "error";
  message: string;
  is_read: number;
  created_at: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const url =
        filter === "unread"
          ? "/api/notifications?unread=true"
          : "/api/notifications";

      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: number) {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  }

  async function markAllAsRead() {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Bell className="w-8 h-8 text-indigo-400" />
          Bildirimler
          {unreadCount > 0 && (
            <span className="text-sm px-3 py-1 bg-red-500 text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </h1>
        <p className="text-gray-400 mt-2">
          Sistem uyarıları ve bildirimleriniz
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === "all"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800/50 text-gray-300 hover:bg-slate-800"
            }`}
          >
            Tümü
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === "unread"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800/50 text-gray-300 hover:bg-slate-800"
            }`}
          >
            Okunmamış ({unreadCount})
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchNotifications}
            className="px-4 py-2 rounded-lg bg-slate-800/50 text-gray-300 hover:bg-slate-800 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Yenile
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <CheckCheck className="w-4 h-4" />
              Tümünü Okundu İşaretle
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="glass-card text-center py-12">
          <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-400 mb-2">
            Bildirim Yok
          </h2>
          <p className="text-gray-500">
            {filter === "unread"
              ? "Tüm bildirimleriniz okundu"
              : "Henüz bildirim bulunmuyor"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {notifications.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.2 }}
              >
                <NotificationCard
                  notification={notif}
                  onMarkRead={markAsRead}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function NotificationCard({
  notification,
  onMarkRead
}: {
  notification: Notification;
  onMarkRead: (id: number) => void;
}) {
  const icons = {
    info: <Info className="w-5 h-5 text-blue-400" />,
    warn: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    error: <XCircle className="w-5 h-5 text-red-400" />
  };

  const bgColors = {
    info: "bg-blue-900/20 border-blue-700/50",
    warn: "bg-amber-900/20 border-amber-700/50",
    error: "bg-red-900/20 border-red-700/50"
  };

  return (
    <div
      className={`glass-card ${bgColors[notification.level]} ${
        notification.is_read ? "opacity-60" : ""
      } hover:scale-[1.01] transition-all`}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">{icons[notification.level]}</div>

        <div className="flex-1 min-w-0">
          <p className="text-gray-100 leading-relaxed">
            {notification.message}
          </p>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-xs text-gray-500">
              {formatDate(notification.created_at)}
            </p>
            {!notification.is_read && (
              <span className="text-xs px-2 py-0.5 bg-indigo-600 text-white rounded-full">
                Yeni
              </span>
            )}
          </div>
        </div>

        {!notification.is_read && (
          <button
            onClick={() => onMarkRead(notification.id)}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-slate-700/50 text-indigo-400 hover:text-indigo-300 transition-colors"
            title="Okundu işaretle"
          >
            <Check className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Az önce";
  if (minutes < 60) return `${minutes} dakika önce`;
  if (hours < 24) return `${hours} saat önce`;
  if (days < 7) return `${days} gün önce`;

  return date.toLocaleString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
