"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, User } from "lucide-react";
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
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        
        if (data.success) {
          setUnreadCount(data.unreadCount || 0);
        } else {
          console.error("API returned error:", data.error);
          setUnreadCount(0);
        }
      } catch (error) {
        console.error("Failed to fetch unread count:", error);
        // Gracefully handle errors by setting count to 0
        setUnreadCount(0);
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
      "/ihale-merkezi": "İhale Merkezi",
      "/auto": "Oto Analiz",
      "/ihale/workspace": "İhale Yükle",
      "/decision": "Karar",
      "/reports": "Raporlar",
      "/menu-parser": "Menü Parser",
      "/cost-analysis": "Maliyet Analizi",
      "/analysis": "Analiz Merkezi",
      "/monitor": "Monitoring",
      "/notifications": "Bildirimler",
      "/settings": "Ayarlar",
      "/profile": "Profil",
    };

    return routes[pathname] || "ProCheff";
  };

  return (
    <div className="
      fixed top-0 right-0 z-40 h-16 
      bg-slate-950/90 backdrop-blur-md border-b border-white/5
      shadow-[0_4px_24px_rgba(0,0,0,0.25)]
      transition-all duration-300 ease-out
      flex items-center justify-between px-6
      left-0 md:left-20 lg:left-[280px]
      w-full md:w-[calc(100%-80px)] lg:w-[calc(100%-280px)]
    ">
      {/* Page Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-white tracking-wide">
          {getPageTitle()}
        </h1>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all duration-300"
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
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
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-white/10 bg-[#0a0a0a] shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
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
                      <div className="py-8 text-center text-sm text-gray-400">
                        Yeni bildirim yok
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {/* Placeholder notifications */}
                        {Array.from({ length: Math.min(unreadCount, 5) }).map(
                          (_, i) => (
                            <div
                              key={i}
                              className="rounded-lg bg-white/5 p-3 hover:bg-white/10 transition-colors duration-300"
                            >
                              <p className="text-sm text-white">
                                Bildirim #{i + 1}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
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
        <Link
          href="/settings/profile"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all duration-300 no-underline"
        >
          <User className="h-4.5 w-4.5" />
        </Link>
      </div>
    </div>
  );
}
