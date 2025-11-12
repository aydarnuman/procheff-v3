"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart4,
  Bell,
  Brain,
  Calculator,
  ChevronRight,
  Database,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  Layers,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Palette,
  ScrollText,
  Settings,
  Shield,
  Star,
  TrendingUp,
  UploadCloud,
  User
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * ProCheff Sidebar v3 – Synerque Clone (Dribbble)
 * - Open width: 260px, Closed width: 80px
 * - Dark, borderless, soft-shadow, smooth hover
 * - Tasks submenu with colored dots
 * - Collapsed hover panel (floating card on hover)
 * - Active route detection with usePathname
 */

// Premium Design System Constants
const HOVER = "hover:bg-[rgba(255,255,255,0.05)]";
const ACTIVE = "bg-[#1E212A]"; // surface-2

function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

// Gradient logo badge
function LogoBadge() {
  return (
    <div
      className="h-9 w-9 rounded-full shadow-md bg-[radial-gradient(120%_120%_at_20%_20%,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.08)_38%,rgba(0,0,0,0)_62%),linear-gradient(135deg,#2b2b2b,#171717)]"
      aria-label="ProCheff"
    />
  );
}

// Types
type Item = {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badge?: string | number;
  id?: string;
  colorIndex?: number;
};

// Data
const primary: Item[] = [
  { id: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard },
  { id: "analysis", label: "Analiz Merkezi", href: "/analysis", icon: TrendingUp },
  { id: "ihale", label: "İhale Listesi", href: "/ihale", icon: FileText },
  { id: "reports", label: "Raporlar", href: "/reports", icon: FileBarChart },
  { id: "admin", label: "Admin Panel", href: "/admin", icon: Shield },
];

const tasksChildren: Item[] = [
  { id: "inprogress", label: "In progress", href: "/analysis", icon: BarChart4, colorIndex: 0 },
  { id: "paused", label: "Paused", href: "/analysis/history", icon: UploadCloud, colorIndex: 1 },
  { id: "bugs", label: "Bugs", href: "/cost-analysis", icon: FileText, colorIndex: 2, badge: "12" },
  { id: "done", label: "Done", href: "/decision", icon: Star, colorIndex: 3 },
];

const tools: Item[] = [
  { id: "menu-parser", label: "Menü Parser", href: "/menu-parser", icon: FileText },
  { id: "cost-analysis", label: "Maliyet Analizi", href: "/cost-analysis", icon: Calculator },
  { id: "decision", label: "Karar Motoru", href: "/decision", icon: Brain },
  { id: "market", label: "Piyasa Robotu", href: "/piyasa-robotu", icon: TrendingUp },
];

const secondary: Item[] = [
  { id: "chat", label: "AI Asistan", href: "/chat", icon: MessageSquare, badge: "NEW" },
  { id: "notifications", label: "Bildirimler", href: "/notifications", icon: Bell, badge: "3" },
  { id: "monitoring", label: "Monitoring", href: "/monitor", icon: Activity },
  { id: "settings", label: "Ayarlar", href: "/settings", icon: Settings },
];

const settingsChildren: Item[] = [
  { id: "profile", label: "Profil", href: "/settings/profile", icon: User },
  { id: "pipeline", label: "Pipeline", href: "/settings/pipeline", icon: Settings },
  { id: "ai", label: "AI Model", href: "/settings/ai", icon: Brain },
  { id: "notifications", label: "Bildirimler", href: "/settings/notifications", icon: Bell },
  { id: "appearance", label: "Görünüm", href: "/settings/appearance", icon: Palette },
  { id: "database", label: "Veritabanı", href: "/settings/database", icon: Database },
  { id: "reports-settings", label: "Raporlar", href: "/settings/reports", icon: FileSpreadsheet },
  { id: "security", label: "Güvenlik", href: "/settings/security", icon: Shield },
  { id: "logs", label: "Loglar", href: "/settings/logs", icon: ScrollText },
  { id: "api", label: "API", href: "/settings/api", icon: Layers },
];

export function ModernSidebar() {
  const pathname = usePathname();
  // Use pathname directly instead of state
  const path = pathname || "/";

  const [open, setOpen] = useState(false);
  const [hoverPanel, setHoverPanel] = useState<string | null>(null);
  const [hoverPanelY, setHoverPanelY] = useState<number>(180);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toggleMenu = (menuId: string) => {
    if (!open) return; // Collapsed modda accordion çalışmasın
    setExpandedMenus(prev =>
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  // Update CSS variable when sidebar width changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const updateWidth = () => {
      // Mobile'da sidebar yok
      if (window.innerWidth < 768) {
        document.documentElement.style.setProperty('--sidebar-width', '0px');
      } else {
        const width = open ? 280 : 80;
        document.documentElement.style.setProperty('--sidebar-width', `${width}px`);
      }
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [open]);

  const SidebarContent = (
    <motion.aside
      animate={{ width: open ? 280 : 80 }}
      transition={{
        duration: 0.35,
        ease: [0.32, 0.72, 0, 1],
        type: "tween"
      }}
      onClick={() => setOpen((o) => !o)}
      data-sidebar="true"
      className={cn(
        "fixed left-0 top-0 h-screen select-none z-50",
        // Premium ton-based surface (Material 3)
        "bg-[#16181F]",
        "backdrop-blur-xl",
        // Hairline border (Fluent)
        "border-r border-[rgba(255,255,255,0.06)]",
        // Low-opacity shadow for elevation
        "shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
        "cursor-pointer will-change-[width] overflow-x-hidden overflow-y-auto",
        // Subtle tonal overlay
        "before:absolute before:inset-0 before:bg-[rgba(99,102,241,0.04)] before:pointer-events-none",
        // Refined border glow
        "after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-linear-to-b after:from-transparent after:via-indigo-500/12 after:to-transparent"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "px-4 py-4 flex items-center justify-center bg-[#0A0F1C] border-b border-[rgba(255,255,255,0.06)] overflow-hidden"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <motion.div
            animate={{ scale: open ? 1 : 1 }}
            transition={{ duration: 0.35 }}
          >
            <LogoBadge />
          </motion.div>
          <AnimatePresence mode="wait">
            {open && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                className="leading-tight whitespace-nowrap overflow-hidden"
              >
                <div className="text-[16px] font-semibold tracking-[-0.01em] text-[#E6E7EA]">ProCheff</div>
                <div className="text-[11px] font-medium text-[#9AA1AE]">Task manager</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* NAVIGATION */}
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <nav className="px-3 pt-6 flex flex-col gap-1.5">
          {primary.map((it) => (
            <NavItem
              key={it.id}
              item={it}
              active={isActive(it.href)}
              open={open}
              onCollapsedHover={(id, y) => {
                // Clear any pending close timeout
                if (closeTimeoutRef.current) {
                  clearTimeout(closeTimeoutRef.current);
                  closeTimeoutRef.current = null;
                }
                if (it.id === "analysis") {
                  setHoverPanel("tasks");
                } else {
                  setHoverPanel(id);
                }
                setHoverPanelY(y);
              }}
              onCollapsedLeave={() => {
                // Delay closing to allow mouse to move to panel
                closeTimeoutRef.current = setTimeout(() => {
                  setHoverPanel(null);
                }, 150);
              }}
            />
          ))}

          {/* Tools Section */}
          {open && (
            <div className="px-3 pt-4 pb-2">
              <div className="text-[11px] font-semibold text-[#9AA1AE] px-2 mb-2 tracking-wide uppercase">
                Araçlar
              </div>
              {tools.map((it) => (
                <NavItem
                  key={it.id}
                  item={it}
                  active={isActive(it.href)}
                  open={open}
                  small={true}
                  onCollapsedHover={(id, y) => {
                    if (closeTimeoutRef.current) {
                      clearTimeout(closeTimeoutRef.current);
                      closeTimeoutRef.current = null;
                    }
                    setHoverPanel("tools");
                    setHoverPanelY(y);
                  }}
                  onCollapsedLeave={() => {
                    closeTimeoutRef.current = setTimeout(() => {
                      setHoverPanel(null);
                    }, 150);
                  }}
                />
              ))}
            </div>
          )}

          {secondary.map((it) => (
            <div key={it.id}>
              <NavItem
                item={it}
                active={isActive(it.href)}
                open={open}
                hasChildren={it.id === "settings"}
                isExpanded={expandedMenus.includes("settings")}
                onToggle={() => toggleMenu("settings")}
                onCollapsedHover={(id, y) => {
                  // Clear any pending close timeout
                  if (closeTimeoutRef.current) {
                    clearTimeout(closeTimeoutRef.current);
                    closeTimeoutRef.current = null;
                  }
                  if (it.id === "settings") {
                    setHoverPanel("settings");
                  } else {
                    setHoverPanel(id);
                  }
                  setHoverPanelY(y);
                }}
                onCollapsedLeave={() => {
                  // Delay closing to allow mouse to move to panel
                  closeTimeoutRef.current = setTimeout(() => {
                    setHoverPanel(null);
                  }, 150);
                }}
              />

              {/* Settings Submenu - Accordion */}
              <AnimatePresence>
                {open && it.id === "settings" && expandedMenus.includes("settings") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                    className="ml-6 mt-1 mb-2 space-y-1 overflow-hidden"
                  >
                    {settingsChildren.map(child => (
                      <NavItem
                        key={child.id}
                        item={child}
                        active={isActive(child.href)}
                        open={open}
                        small={true}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>
      </div>


      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom gradient fade */}
      <div className="h-16 bg-linear-to-t from-[#0A0F1C]/80 to-transparent pointer-events-none" />

      {/* Footer user - ultra minimal + glassmorphism + glow */}
      <div
        className={cn("px-3 pb-2 relative")}
        onClick={(e) => e.stopPropagation()}
      >
        <Link
          href="/settings/profile"
          className={cn(
            "rounded-xl p-2 flex items-center backdrop-blur-md border border-[rgba(255,255,255,0.06)] no-underline",
            open ? "gap-2.5" : "gap-1 justify-center",
            "bg-[rgba(255,255,255,0.03)] shadow-[0_4px_16px_rgba(0,0,0,0.25)]",
            "hover:bg-[rgba(255,255,255,0.06)] hover:shadow-[0_8px_24px_rgba(99,102,241,0.2)] transition-all duration-150 ease-out",
            "cursor-pointer"
          )}
        >
          <div
            className="h-8 w-8 rounded-full ring-1 ring-[rgba(255,255,255,0.12)] bg-linear-to-tr from-[#7c3aed] to-[#2563eb] flex items-center justify-center text-[11px] font-bold text-white shadow-lg"
            title={!open ? "ProCheff Admin - admin@procheff.com" : undefined}
          >
            PC
          </div>
          {open && (
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-[#E6E7EA] truncate tracking-[-0.01em]">ProCheff Admin</div>
            </div>
          )}
        </Link>
      </div>
    </motion.aside>
  );

  const MobileMenu = (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 w-12 h-12 rounded-xl bg-[#1E212A] border border-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#E6E7EA] shadow-[0_4px_16px_rgba(0,0,0,0.3)] hover:bg-[rgba(255,255,255,0.05)] transition-all duration-150 ease-out"
        aria-label="Open menu"
        title="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/80 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="fixed left-0 top-0 z-50 md:hidden h-screen"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
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

      {/* Hover Panels - Rendered via Portal to document.body */}
      {typeof window !== 'undefined' && createPortal(
        <AnimatePresence mode="wait">
          {!open && hoverPanel === "tasks" && (
            <HoverPanel
              items={tasksChildren}
              pathname={path}
              onEnter={() => {
                if (closeTimeoutRef.current) {
                  clearTimeout(closeTimeoutRef.current);
                  closeTimeoutRef.current = null;
                }
              }}
              onLeave={() => setHoverPanel(null)}
              title="Analiz Merkezi"
              yPosition={hoverPanelY}
            />
          )}
          {!open && hoverPanel === "tools" && (
            <HoverPanel
              items={tools}
              pathname={path}
              onEnter={() => {
                if (closeTimeoutRef.current) {
                  clearTimeout(closeTimeoutRef.current);
                  closeTimeoutRef.current = null;
                }
              }}
              onLeave={() => setHoverPanel(null)}
              title="Araçlar"
              yPosition={hoverPanelY}
            />
          )}
          {!open && hoverPanel === "settings" && (
            <HoverPanel
              items={settingsChildren}
              pathname={path}
              onEnter={() => {
                if (closeTimeoutRef.current) {
                  clearTimeout(closeTimeoutRef.current);
                  closeTimeoutRef.current = null;
                }
              }}
              onLeave={() => setHoverPanel(null)}
              title="Ayarlar"
              yPosition={hoverPanelY}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

function NavItem({
  item,
  active,
  open,
  small,
  hasChildren,
  isExpanded,
  onToggle,
  onCollapsedHover,
  onCollapsedLeave,
}: {
  item: Item;
  active?: boolean;
  open: boolean;
  small?: boolean;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  onCollapsedHover?: (id: string, y: number) => void;
  onCollapsedLeave?: () => void;
}) {
  const Icon = item.icon;
  const colorDot = (idx?: number) => {
    const colors = ["bg-sky-400", "bg-violet-400", "bg-rose-500", "bg-yellow-400"];
    return <span className={cn("h-2 w-2 rounded-full", colors[idx ?? 0])} />;
  };

  const content = (
    <>
      <div className="relative shrink-0">
        <Icon
          className={cn(
            small ? "w-[18px] h-[18px]" : "w-5 h-5",
            // Icon colors with passive/active states
            active ? "text-[#FFFFFF] stroke-2" : "text-[#9AA1AE] stroke-[1.75]",
            "group-hover:text-[#CBD2E0] transition-colors duration-150 ease-out"
          )}
        />
        {!open && item.badge && (
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-sky-400 ring-2 ring-[#16181F]" />
        )}
      </div>
      <AnimatePresence mode="wait">
        {open && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden"
          >
            {typeof item.colorIndex === "number" && <div className="shrink-0">{colorDot(item.colorIndex)}</div>}
            <span className="flex-1 truncate text-[15px] tracking-[-0.01em] whitespace-nowrap">{item.label}</span>
            {item.badge && (
              <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-lg bg-[rgba(255,255,255,0.08)] text-[#CBD2E0]">
                {item.badge}
              </span>
            )}
            {hasChildren && (
              <ChevronRight
                className={cn(
                  "w-4 h-4 transition-transform duration-200 shrink-0",
                  isExpanded && "rotate-90"
                )}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  const handleClick = (e: React.MouseEvent) => {
    if (hasChildren && open) {
      e.preventDefault();
      onToggle?.();
    }
  };

  return (
    <Link
      href={item.href}
      onClick={handleClick}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3.5 py-2.5",
        "transition-all duration-150 ease-out no-underline",
        // Text colors with AA/AAA compliance
        active ? "text-[#E6E7EA] font-semibold" : "text-[#B6BBC6] font-medium",
        // Hover state
        !active && "hover:text-[#CBD2E0]",
        HOVER,
        // Active state with surface-2
        active && ACTIVE,
        active && "border border-[rgba(255,255,255,0.08)] shadow-[0_2px_8px_rgba(0,0,0,0.2)]",
        small && "text-[14px]",
        hasChildren && open && "cursor-pointer"
      )}
      title={!open ? item.label : undefined}
      onMouseEnter={!open ? (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        onCollapsedHover?.(item.id!, rect.top);
      } : undefined}
      onMouseLeave={!open ? () => onCollapsedLeave?.() : undefined}
    >
      {content}
    </Link>
  );
}

function HoverPanel({
  items,
  pathname,
  onEnter,
  onLeave,
  title,
  yPosition,
}: {
  items: Item[];
  pathname: string;
  onEnter?: () => void;
  onLeave: () => void;
  title: string;
  yPosition: number;
} & { onEnter?: () => void }) {
  const colorDot = (idx?: number) => {
    const colorClasses = ["bg-sky-400", "bg-violet-400", "bg-rose-500", "bg-yellow-400"];
    return (
      <span
        className={cn("h-2 w-2 rounded-full", colorClasses[idx ?? 0])}
      />
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
      className="fixed left-[92px] w-60 rounded-xl bg-[#1E212A] border border-[rgba(255,255,255,0.06)] shadow-[0_12px_40px_rgba(0,0,0,0.45)] p-3 pointer-events-auto backdrop-blur-xl"
      style={{
        top: `${yPosition}px`,
        zIndex: 99999
      }}
      role="dialog"
      onMouseEnter={() => onEnter?.()}
      onMouseLeave={onLeave}
    >
      <div className="text-[11px] font-semibold text-[#9AA1AE] px-2 pb-2 mb-1.5 border-b border-[rgba(255,255,255,0.08)] tracking-wide uppercase">
        {title}
      </div>
      {items.map((it) => {
        const isActive = pathname === it.href;
        return (
          <Link
            key={it.id}
            href={it.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-150 ease-out no-underline",
              isActive
                ? "bg-[rgba(255,255,255,0.08)] text-[#E6E7EA] font-semibold"
                : "hover:bg-[rgba(255,255,255,0.05)] text-[#B6BBC6] font-medium hover:text-[#CBD2E0]"
            )}
          >
            {typeof it.colorIndex === "number" && colorDot(it.colorIndex)}
            <it.icon
              className={cn(
                "w-[18px] h-[18px]",
                isActive ? "text-[#FFFFFF] stroke-2" : "text-[#9AA1AE] stroke-[1.75]"
              )}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[14px] truncate tracking-[-0.01em]">{it.label}</div>
            </div>
            {it.badge && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.08)] text-[#CBD2E0]">
                {it.badge}
              </span>
            )}
          </Link>
        );
      })}
    </motion.div>
  );
}
