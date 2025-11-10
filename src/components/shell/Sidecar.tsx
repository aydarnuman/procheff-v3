"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart4,
  Brain,
  Calculator,
  FileText,
  Menu,
  Settings,
  UploadCloud,
  Utensils,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const NAV: NavItem[] = [
  { label: "Oto Analiz", href: "/auto", icon: Zap },
  { label: "İhale Yükle", href: "/ihale/workspace", icon: UploadCloud },
  { label: "Menü Parser", href: "/menu-parser", icon: Utensils },
  { label: "Maliyet", href: "/cost-analysis", icon: Calculator },
  { label: "Karar", href: "/decision", icon: Brain },
  { label: "Raporlar", href: "/reports", icon: FileText },
  { label: "Monitoring", href: "/monitor", icon: BarChart4 },
  { label: "Ayarlar", href: "/settings", icon: Settings },
];

export function Sidecar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activePipelines, setActivePipelines] = useState(0);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

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

  function Item({ item }: { item: NavItem }) {
    const Icon = item.icon;
    const active =
      pathname === item.href || pathname.startsWith(item.href + "/");
    const isAutoPipeline = item.href === "/auto";
    const isFirstItem = item.href === "/auto";
    const showPipelineBadge = isAutoPipeline && activePipelines > 0;

    return (
      <Link 
        href={item.href} 
        className="no-underline group"
        title={item.label}
      >
        <motion.div
          whileHover={{ scale: 1.1, rotate: 2 }}
          whileTap={{ scale: 0.9 }}
          className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
            isFirstItem
              ? active
                ? "bg-blue-500/20 border border-blue-400/40 shadow-lg shadow-blue-500/30"
                : "bg-blue-500/10 border border-blue-400/20 hover:bg-blue-500/20 hover:border-blue-400/40 hover:shadow-lg hover:shadow-blue-500/30"
              : active
              ? "bg-white/10 border border-white/20 shadow-lg shadow-white/10"
              : "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-white/10"
          }`}
        >
          <Icon
            className={`w-5 h-5 transition-all duration-300 ${
              isFirstItem
                ? active 
                  ? "text-blue-300" 
                  : "text-blue-400 group-hover:text-blue-300"
                : active 
                ? "text-white" 
                : "text-gray-400 group-hover:text-white"
            }`}
          />

          {/* Pipeline Badge */}
          {showPipelineBadge && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white animate-pulse shadow-lg shadow-red-500/50">
              {activePipelines > 9 ? "9+" : activePipelines}
            </span>
          )}
        </motion.div>
      </Link>
    );
  }

  const Desktop = (
    <div className="hidden md:flex flex-col items-center justify-center h-dvh py-6 gap-3 px-3" style={{ borderRight: 'none', boxShadow: 'none' }}>
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
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all"
      >
        <Menu className="h-5 w-5" />
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
              className="fixed left-0 top-0 z-50 h-dvh w-64 flex flex-col py-4 px-2 bg-[#12161f]/80 backdrop-blur-xl border-r border-white/10"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Close Button */}
              <button
                aria-label="Menüyü kapat"
                onClick={() => setMobileOpen(false)}
                className="self-end mb-4 w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Navigation */}
              <nav className="flex flex-col gap-3 overflow-y-auto">
                {NAV.map((it) => (
                  <div key={it.href} onClick={() => setMobileOpen(false)} className="w-full">
                    <Item item={it} />
                  </div>
                ))}
              </nav>
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
