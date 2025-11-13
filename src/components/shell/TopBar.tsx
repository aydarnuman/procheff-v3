"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
    Activity,
    AlertCircle,
    BarChart3,
    Bell,
    Brain,
    CheckCircle2,
    Database,
    Loader2,
    LogOut,
    Palette,
    Search,
    Settings,
    Shield,
    User,
    XCircle,
    Zap
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Notification = {
  id: number;
  level: "info" | "warn" | "error";
  message: string;
  is_read: number;
  created_at: string;
};

type SystemStatus = {
  api: "healthy" | "degraded" | "down";
  ai: "healthy" | "degraded" | "down";
  database: "healthy" | "degraded" | "down";
};

// Settings categories for dropdown
const SETTINGS_CATEGORIES = [
  {
    id: "profile",
    name: "Profil & Hesap",
    icon: User,
    href: "/settings/profile",
    description: "Kullanıcı bilgileri, şifre değiştirme"
  },
  {
    id: "ai",
    name: "AI Model Ayarları",
    icon: Brain,
    href: "/settings/ai",
    description: "Claude ve Gemini model seçimi"
  },
  {
    id: "pipeline",
    name: "Pipeline Ayarları",
    icon: Zap,
    href: "/settings/pipeline",
    description: "Auto-Pipeline konfigürasyonu"
  },
  {
    id: "monitoring",
    name: "Monitoring",
    icon: Activity,
    href: "/monitor",
    description: "Sistem izleme ve performans"
  },
  {
    id: "reports",
    name: "Raporlar",
    icon: BarChart3,
    href: "/reports",
    description: "Analiz raporları ve dışa aktarım"
  },
  {
    id: "database",
    name: "Veritabanı",
    icon: Database,
    href: "/settings/database",
    description: "SQLite ayarları, backup"
  },
  {
    id: "security",
    name: "Güvenlik",
    icon: Shield,
    href: "/settings/security",
    description: "API key yönetimi, erişim"
  },
  {
    id: "appearance",
    name: "Görünüm",
    icon: Palette,
    href: "/settings/appearance",
    description: "Tema, renk şeması"
  },
];

export function TopBar() {
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    api: "healthy",
    ai: "healthy",
    database: "healthy"
  });
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setLoadingNotifications(true);
    try {
      const res = await fetch("/api/notifications?limit=10");
      const data = await res.json();
      
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  // Fetch system status
  const fetchSystemStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      
      if (data.checks) {
        setSystemStatus({
          api: data.status === "healthy" ? "healthy" : "down",
          ai: data.checks.ai ? "healthy" : "down",
          database: data.checks.database ? "healthy" : "down"
        });
      }
    } catch (error) {
      setSystemStatus({
        api: "down",
        ai: "down",
        database: "down"
      });
    }
  }, []);

  // Initial fetch and intervals
  useEffect(() => {
    fetchNotifications();
    fetchSystemStatus();
    
    const notificationInterval = setInterval(fetchNotifications, 30000);
    const statusInterval = setInterval(fetchSystemStatus, 60000);
    
    return () => {
      clearInterval(notificationInterval);
      clearInterval(statusInterval);
    };
  }, [fetchNotifications, fetchSystemStatus]);

  // Open search (Command Palette) - handled by CommandPalette component

  // Mark notification as read
  const markAsRead = async (id: number) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: 1 } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };


  // Format notification time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Az önce";
    if (minutes < 60) return `${minutes} dk önce`;
    if (hours < 24) return `${hours} saat önce`;
    return `${days} gün önce`;
  };

  // Get status icon
  const getStatusIcon = (status: "healthy" | "degraded" | "down") => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
      case "degraded":
        return <AlertCircle className="w-3 h-3 text-amber-400" />;
      case "down":
        return <XCircle className="w-3 h-3 text-red-400" />;
    }
  };

  const user = session?.user;
  const userName = user?.name || user?.email || "Kullanıcı";

  return (
    <>
      <div 
        className="
          fixed top-0 z-60 h-16 
          bg-transparent
          transition-all duration-300 ease-out
          flex items-center justify-between pl-0 pr-4 md:pr-6
          right-0
          [left:var(--sidebar-width,0px)]
        "
      >
        {/* Logo & Page Title */}
        <div className="flex items-center gap-4 min-w-0 pl-4">
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 md:gap-3 ml-auto">
          {/* System Status Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10">
            {getStatusIcon(systemStatus.api)}
            <span className="text-xs text-gray-400 hidden lg:inline">Sistem</span>
          </div>

          {/* Search Button */}
          <button
            onClick={() => {
              // Trigger Command Palette via keyboard event
              const event = new KeyboardEvent("keydown", {
                key: "k",
                metaKey: true,
                bubbles: true,
                cancelable: true
              });
              window.dispatchEvent(event);
            }}
            className="hidden md:flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 hover:scale-105 transition-all duration-200"
            title="Ara (⌘K)"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Settings */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 hover:scale-105 transition-all duration-200"
              title="Ayarlar"
            >
              <Settings className="h-4 w-4" />
            </button>

            {/* Settings Dropdown */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-80 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl shadow-black/20 z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <Settings className="h-4 w-4 text-purple-400" />
                      Ayarlar & Yönetim
                    </h3>
                    
                    <div className="space-y-1">
                      {SETTINGS_CATEGORIES.map((category) => {
                        const Icon = category.icon;
                        return (
                          <Link
                            key={category.id}
                            href={category.href}
                            onClick={() => setShowSettings(false)}
                            className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/40 hover:bg-slate-700/60 border border-slate-700/30 hover:border-slate-600/50 transition-all duration-200 group"
                          >
                            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg flex items-center justify-center border border-purple-500/30 group-hover:border-purple-400/50 transition-colors">
                              <Icon className="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-white group-hover:text-purple-200 transition-colors">
                                {category.name}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                                {category.description}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                    
                    <div className="border-t border-slate-700/30 mt-3 pt-3">
                      <Link
                        href="/settings"
                        onClick={() => setShowSettings(false)}
                        className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/40 hover:bg-slate-700/60 border border-slate-700/30 hover:border-purple-500/40 transition-all duration-200 text-sm text-slate-300 hover:text-white"
                      >
                        <Settings className="w-4 h-4" />
                        Tüm Ayarlar
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) fetchNotifications();
              }}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 hover:scale-105 transition-all duration-200"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-linear-to-r from-red-500 to-pink-500 text-[9px] font-bold text-white shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                >
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </motion.span>
                </motion.span>
              )}
            </button>

            {/* Notification Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-59"
                    onClick={() => setShowNotifications(false)}
                  />

                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    className="absolute right-0 top-12 z-70 w-80 md:w-96 rounded-xl border border-white/10 bg-[#0a0a0a] backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
                  >
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                      <h3 className="text-sm font-semibold text-white">
                        Bildirimler
                      </h3>
                      {unreadCount > 0 && (
                        <span className="text-xs text-gray-400">
                          {unreadCount} okunmamış
                        </span>
                      )}
                    </div>

                    <div className="max-h-96 overflow-y-auto p-2">
                      {loadingNotifications ? (
                        <div className="py-8 text-center">
                          <Loader2 className="w-5 h-5 text-gray-400 animate-spin mx-auto mb-2" />
                          <p className="text-sm text-gray-400">Yükleniyor...</p>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="py-8 text-center text-sm text-gray-400">
                          Yeni bildirim yok
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {notifications.map((notification) => (
                            <div
                              key={notification.id}
                              onClick={() => !notification.is_read && markAsRead(notification.id)}
                              className={`rounded-lg p-3 hover:bg-white/10 transition-colors duration-300 cursor-pointer ${
                                notification.is_read ? "bg-white/5" : "bg-white/8 border-l-2 border-indigo-500"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <div className={`mt-0.5 ${
                                  notification.level === "error" ? "text-red-400" :
                                  notification.level === "warn" ? "text-amber-400" :
                                  "text-blue-400"
                                }`}>
                                  {notification.level === "error" ? <XCircle className="w-4 h-4" /> :
                                   notification.level === "warn" ? <AlertCircle className="w-4 h-4" /> :
                                   <CheckCircle2 className="w-4 h-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-white line-clamp-2">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {formatTime(notification.created_at)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-white/10 p-2">
                      <Link
                        href="/notifications"
                        onClick={() => setShowNotifications(false)}
                        className="flex w-full items-center justify-center rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20 transition-all duration-300 no-underline"
                      >
                        Tümünü Görüntüle
                      </Link>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 hover:scale-105 transition-all duration-200"
              title="Kullanıcı Menüsü"
            >
              <User className="h-4 w-4" />
            </button>

            {/* User Dropdown */}
            <AnimatePresence>
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-59"
                    onClick={() => setShowUserMenu(false)}
                  />

                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    className="absolute right-0 top-12 z-70 w-56 rounded-xl border border-white/10 bg-[#0a0a0a] backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
                  >
                    <div className="p-3 border-b border-white/10">
                      <p className="text-sm font-semibold text-white truncate">
                        {userName}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {user?.email}
                      </p>
                    </div>

                    <div className="p-1">
                      <Link
                        href="/settings/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors no-underline"
                      >
                        <User className="w-4 h-4" />
                        <span>Profil</span>
                      </Link>

                      <Link
                        href="/settings"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors no-underline"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Ayarlar</span>
                      </Link>

                      <div className="border-t border-white/10 my-1" />

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          signOut({ callbackUrl: "/signin" });
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Çıkış Yap</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
