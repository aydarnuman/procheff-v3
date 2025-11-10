"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart4,
  Bell,
  Briefcase,
  ChevronDown,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Menu,
  Settings,
  UploadCloud,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children?: NavItem[];
};

const NAV: NavItem[] = [
  { label: "Merkez Yönetim", href: "/merkez-yonetim", icon: LayoutDashboard },
  {
    label: "Analiz Merkezi",
    href: "/analysis",
    icon: Briefcase,
    children: [
      { label: "Yeni Analiz", href: "/analysis", icon: UploadCloud },
      { label: "Geçmiş", href: "/analysis/history", icon: FileText },
    ]
  },
  { label: "Menü Parser", href: "/menu-parser", icon: Utensils },
  { label: "İhale", href: "/ihale", icon: ClipboardList },
  { label: "Raporlar", href: "/reports", icon: FileText },
  { label: "Monitoring", href: "/monitor", icon: BarChart4 },
  { label: "Bildirimler", href: "/notifications", icon: Bell },
  {
    label: "Ayarlar",
    href: "/settings",
    icon: Settings,
    children: [
      { label: "Profil", href: "/settings/profile", icon: Settings },
      { label: "Pipeline", href: "/settings/pipeline", icon: Settings },
      { label: "Veritabanı", href: "/settings/database", icon: Settings },
      { label: "Loglar", href: "/settings/logs", icon: Settings },
      { label: "Güvenlik", href: "/settings/security", icon: Settings },
    ]
  },
];

export function Sidecar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activePipelines, setActivePipelines] = useState(0);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    "/analysis": true // Analiz Merkezi default açık
  });

  // Fetch active pipeline count
  useEffect(() => {
    async function fetchActivePipelines() {
      try {
        const res = await fetch("/api/orchestrate/active-count");
        const data = await res.json();
        if (data.success) {
          setActivePipelines(data.count || 0);
        }
      } catch (error) {
        console.error("Failed to fetch active pipelines:", error);
      }
    }

    fetchActivePipelines();

    // Refresh every 10 seconds (more frequent for active jobs)
    const interval = setInterval(fetchActivePipelines, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleMenu = (href: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [href]: !prev[href]
    }));
  };

  function Item({ item }: { item: NavItem }) {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus[item.href];
    const isChildActive = hasChildren && item.children?.some(child =>
      pathname === child.href || pathname.startsWith(child.href + "/")
    );
    const active = pathname === item.href || pathname.startsWith(item.href + "/") || isChildActive;

    if (hasChildren) {
      return (
        <div className="w-full relative group/parent">
          <div
            onClick={() => toggleMenu(item.href)}
            className="w-full no-underline cursor-pointer"
            title={item.label}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleMenu(item.href); }}
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative h-12 rounded-xl flex items-center gap-3 px-3 transition-all duration-300 ${
                active
                  ? "bg-indigo-500/20 border border-indigo-500/50 shadow-lg shadow-indigo-500/20"
                  : "bg-slate-900/40 border border-slate-700/50 hover:border-indigo-500/40 hover:bg-slate-800/60"
              }`}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 transition-all duration-300 ${
                  active ? "text-indigo-300 drop-shadow-[0_0_8px_rgba(129,140,248,0.6)]" : "text-slate-400 group-hover/parent:text-white"
                }`}
              />

              <span className={`text-xs font-medium transition-all duration-300 flex-1 ${
                active ? "text-white" : "text-slate-400/80 group-hover/parent:text-white"
              }`}>
                {item.label}
              </span>

              <ChevronDown
                className={`w-4 h-4 flex-shrink-0 transition-all duration-300 ${
                  active ? "text-indigo-300" : "text-slate-500 group-hover/parent:text-slate-300"
                } ${isExpanded ? 'rotate-180' : ''}`}
              />
            </motion.div>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-1 space-y-1 ml-2"
              >
                {item.children?.map((child) => (
                  <SubItem key={child.href} item={child} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    return (
      <Link href={item.href} className="no-underline group/single">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`relative h-12 rounded-xl flex items-center gap-3 px-3 transition-all duration-300 ${
            active
              ? "bg-indigo-500/20 border border-indigo-500/50 shadow-lg shadow-indigo-500/20"
              : "bg-slate-900/40 border border-slate-700/50 hover:border-indigo-500/40 hover:bg-slate-800/60"
          }`}
        >
          <Icon
            className={`w-5 h-5 flex-shrink-0 transition-all duration-300 ${
              active ? "text-indigo-300 drop-shadow-[0_0_8px_rgba(129,140,248,0.6)]" : "text-slate-400 group-hover/single:text-white"
            }`}
          />

          <span className={`text-xs font-medium transition-all duration-300 ${
            active ? "text-white" : "text-slate-400/80 group-hover/single:text-white"
          }`}>
            {item.label}
          </span>
        </motion.div>
      </Link>
    );
  }

  function SubItem({ item }: { item: NavItem }) {
    const Icon = item.icon;
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
    const showPipelineBadge = item.href === "/analysis/history" && activePipelines > 0;

    return (
      <Link href={item.href} className="no-underline group/sub" title={item.label}>
        <motion.div
          whileHover={{ scale: 1.02, x: 2 }}
          whileTap={{ scale: 0.98 }}
          className={`relative h-10 rounded-lg flex items-center gap-2 px-3 transition-all duration-300 ${
            active
              ? "bg-indigo-500/15 border border-indigo-500/40 shadow-md shadow-indigo-500/20"
              : "bg-slate-800/30 border border-slate-700/40 hover:border-indigo-500/30 hover:bg-slate-700/50"
          }`}
        >
          <Icon
            className={`w-4 h-4 flex-shrink-0 transition-all duration-300 ${
              active ? "text-indigo-300" : "text-slate-500 group-hover/sub:text-slate-300"
            }`}
          />

          <span className={`text-[11px] font-medium transition-all duration-300 ${
            active ? "text-indigo-200" : "text-slate-500 group-hover/sub:text-slate-300"
          }`}>
            {item.label}
          </span>

          {showPipelineBadge && (
            <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-pink-600 text-[9px] font-bold text-white animate-pulse shadow-lg shadow-red-500/50 border border-red-400/30">
              {activePipelines > 9 ? "9+" : activePipelines}
            </span>
          )}
        </motion.div>
      </Link>
    );
  }

  const Desktop = (
    <div className="hidden md:flex flex-col fixed left-4 top-1/2 -translate-y-1/2 gap-2 z-40 w-44">
      {/* Navigation Buttons */}
      {NAV.map((it) => (
        <Item item={it} key={it.href} />
      ))}
    </div>
  );

  const Mobile = (
    <>
      <button
        aria-label="Menüyü aç"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 w-14 h-14 rounded-2xl border border-transparent hover:border-indigo-500/40 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300"
      >
        <Menu className="h-6 w-6" />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2 w-44"
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {NAV.map((it) => (
                <div key={it.href} onClick={() => setMobileOpen(false)}>
                  <Item item={it} />
                </div>
              ))}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <>
      {Desktop}
      {Mobile}
    </>
  );
}
