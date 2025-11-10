"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart4,
  Brain,
  Briefcase,
  Calculator,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Layers,
  Menu,
  Search,
  Settings,
  UploadCloud,
  Utensils,
  Zap,
  Bell,
  Home,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badge?: number;
  children?: NavItem[];
};

const NAV: NavItem[] = [
  {
    label: "Analiz Merkezi",
    href: "/analysis",
    icon: Briefcase,
    children: [
      { label: "Yeni Analiz", href: "/analysis", icon: UploadCloud },
      { label: "Geçmiş", href: "/analysis/history", icon: FileText },
    ],
  },
  { label: "Menü Parser", href: "/menu-parser", icon: Utensils },
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
      { label: "Raporlar", href: "/settings/reports", icon: Settings },
      { label: "Loglar", href: "/settings/logs", icon: Settings },
      { label: "Güvenlik", href: "/settings/security", icon: Settings },
    ],
  },
];

export function ModernSidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activePipelines, setActivePipelines] = useState(0);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    "/analysis": true,
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
    const interval = setInterval(fetchActivePipelines, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleMenu = (href: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [href]: !prev[href],
    }));
  };

  // Filter navigation based on search
  const filteredNav = NAV.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const matchesLabel = item.label.toLowerCase().includes(query);
    const matchesChildren = item.children?.some((child) =>
      child.label.toLowerCase().includes(query)
    );
    return matchesLabel || matchesChildren;
  });

  function NavItem({ item, isChild = false }: { item: NavItem; isChild?: boolean }) {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isMenuExpanded = expandedMenus[item.href];
    const isChildActive =
      hasChildren &&
      item.children?.some(
        (child) => pathname === child.href || pathname.startsWith(child.href + "/")
      );
    const active =
      pathname === item.href ||
      pathname.startsWith(item.href + "/") ||
      isChildActive;

    // Show badge for active pipelines on Analysis History
    const showBadge = item.href === "/analysis/history" && activePipelines > 0;

    if (hasChildren && !isChild) {
      return (
        <div className="w-full">
          <button
            onClick={() => toggleMenu(item.href)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden
              ${
                active
                  ? "bg-gradient-to-r from-indigo-600/30 to-purple-600/30 border border-indigo-500/50 shadow-lg shadow-indigo-500/20"
                  : "hover:bg-white/5 border border-transparent hover:border-white/10"
              }
            `}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-r from-indigo-600/0 via-purple-600/10 to-indigo-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                active ? "animate-pulse" : ""
              }`}
            />
            <Icon
              className={`w-5 h-5 transition-all duration-300 relative z-10 ${
                active
                  ? "text-indigo-300 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]"
                  : "text-gray-400 group-hover:text-white"
              }`}
            />
            {isExpanded && (
              <>
                <span
                  className={`flex-1 text-left font-medium transition-colors duration-300 relative z-10 ${
                    active ? "text-white" : "text-gray-300 group-hover:text-white"
                  }`}
                >
                  {item.label}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-all duration-300 relative z-10 ${
                    isMenuExpanded ? "rotate-180" : ""
                  } ${active ? "text-indigo-300" : "text-gray-500 group-hover:text-white"}`}
                />
              </>
            )}
          </button>

          <AnimatePresence>
            {isMenuExpanded && isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-1 ml-4 space-y-1"
              >
                {item.children?.map((child) => (
                  <NavItem key={child.href} item={child} isChild={true} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    return (
      <Link href={item.href} className="no-underline w-full">
        <motion.div
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden ${
            isChild ? "pl-8" : ""
          }
            ${
              active
                ? "bg-gradient-to-r from-indigo-600/30 to-purple-600/30 border border-indigo-500/50 shadow-lg shadow-indigo-500/20"
                : "hover:bg-white/5 border border-transparent hover:border-white/10"
            }
          `}
        >
          <div
            className={`absolute inset-0 bg-gradient-to-r from-indigo-600/0 via-purple-600/10 to-indigo-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
              active ? "animate-pulse" : ""
            }`}
          />
          <div className="relative">
            <Icon
              className={`w-5 h-5 transition-all duration-300 ${
                active
                  ? "text-indigo-300 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]"
                  : "text-gray-400 group-hover:text-white"
              }`}
            />
            {showBadge && (
              <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-pink-600 text-[10px] font-bold text-white animate-pulse shadow-lg shadow-red-500/50 border border-red-400/30">
                {activePipelines > 9 ? "9+" : activePipelines}
              </span>
            )}
          </div>
          {isExpanded && (
            <span
              className={`flex-1 text-left font-medium transition-colors duration-300 ${
                active ? "text-white" : "text-gray-300 group-hover:text-white"
              }`}
            >
              {item.label}
            </span>
          )}
        </motion.div>
      </Link>
    );
  }

  const SidebarContent = (
    <motion.aside
      animate={{ width: isExpanded ? 280 : 80 }}
      className="fixed left-0 top-0 h-screen bg-gradient-to-b from-slate-950/95 via-slate-900/95 to-slate-950/95 backdrop-blur-xl border-r border-white/10 shadow-2xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-gradient-to-r from-indigo-600/10 to-purple-600/10">
        <div className="flex items-center justify-between">
          {isExpanded ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/50">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-white text-lg tracking-tight">
                  ProCheff
                </h2>
                <p className="text-xs text-gray-400">v3.0</p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/50 mx-auto">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors border border-transparent hover:border-white/20"
            aria-label={isExpanded ? "Daralt" : "Genişlet"}
          >
            {isExpanded ? (
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>

        {/* Search Bar */}
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {filteredNav.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 bg-gradient-to-r from-indigo-600/5 to-purple-600/5">
        {isExpanded ? (
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex items-center justify-between">
              <span>Aktif Pipeline</span>
              <span className="font-bold text-indigo-400">{activePipelines}</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: activePipelines > 0 ? "100%" : "0%" }}
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
              />
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 animate-pulse" />
          </div>
        )}
      </div>
    </motion.aside>
  );

  const MobileMenu = (
    <>
      <button
        aria-label="Menüyü aç"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:border-indigo-500/50 transition-all shadow-lg hover:shadow-indigo-500/20"
      >
        <Menu className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="fixed left-0 top-0 z-50 md:hidden"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div onClick={() => setMobileOpen(false)}>{SidebarContent}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <>
      <div className="hidden md:block">{SidebarContent}</div>
      {MobileMenu}
    </>
  );
}
