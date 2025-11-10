"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, Settings, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function TopBar() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch unread notification count
  useEffect(() => {
    async function fetchUnreadCount() {
      try {
        const res = await fetch("/api/notifications?unread=true");
        const data = await res.json();
        if (data.success) {
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error("Failed to fetch unread count:", error);
      }
    }

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get page title from pathname
  const getPageTitle = () => {
    const routes: Record<string, string> = {
      "/": "Dashboard",
      "/auto": "Oto-Analiz Pipeline",
      "/ihale/workspace": "İhale Workspace",
      "/menu-parser": "Menü Parser",
      "/cost-analysis": "Maliyet Analizi",
      "/decision": "Karar Motoru",
      "/reports": "Raporlar",
      "/monitor": "Monitoring",
      "/logs": "Log Viewer",
      "/notifications": "Bildirimler",
      "/auto/history": "Pipeline History",
      "/settings": "Ayarlar",
      "/settings/pipeline": "Pipeline Ayarları",
    };

    return routes[pathname] || "Procheff Workspace";
  };

  return (
    <div className="sticky top-0 z-30 flex h-14 items-center justify-between bg-[#12161f]/80 backdrop-blur-xl px-6">
      {/* Page Title */}
      <h1 className="text-lg font-semibold text-white">
        {getPageTitle()}
      </h1>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all"
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />

                {/* Dropdown */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-white/10 bg-[#12161f]/95 backdrop-blur-xl shadow-2xl"
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
                    {unreadCount === 0 ? (
                      <div className="py-8 text-center text-sm text-gray-500">
                        Yeni bildirim yok
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {/* Placeholder notifications */}
                        {Array.from({ length: Math.min(unreadCount, 5) }).map(
                          (_, i) => (
                            <div
                              key={i}
                              className="rounded-lg bg-white/5 p-3 hover:bg-white/10 transition-colors"
                            >
                              <p className="text-sm text-gray-300">
                                Bildirim #{i + 1}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Az önce
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-white/10 p-2">
                    <Link
                      href="/notifications"
                      onClick={() => setShowNotifications(false)}
                      className="flex w-full items-center justify-center rounded-lg bg-white/5 px-3 py-2 text-sm font-medium text-indigo-300 hover:bg-white/10 transition-all"
                    >
                      Tümünü Görüntüle
                    </Link>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Settings */}
        <Link
          href="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all no-underline"
        >
          <Settings className="h-4.5 w-4.5" />
        </Link>

        {/* User Menu */}
        <Link
          href="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/15 hover:border-white/30 transition-all no-underline"
        >
          <User className="h-4.5 w-4.5" />
        </Link>
      </div>
    </div>
  );
}
