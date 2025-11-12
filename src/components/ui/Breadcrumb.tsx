"use client";

import { motion } from "framer-motion";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface BreadcrumbItem {
  label: string;
  href: string;
}

const pathNameMap: Record<string, string> = {
  "/": "Ana Sayfa",
  "/auto": "Oto Analiz",
  "/auto/history": "Geçmiş",
  "/ihale": "İhale",
  "/ihale/history": "Geçmiş",
  "/decision": "Karar Analizi",
  "/reports": "Raporlar",
  "/menu-parser": "Menü Parser",
  "/cost-analysis": "Maliyet Analizi",
  "/monitor": "Monitoring",
  "/notifications": "Bildirimler",
  "/settings": "Ayarlar",
  "/settings/profile": "Profil",
  "/settings/pipeline": "Pipeline",
  "/settings/database": "Veritabanı",
  "/settings/reports": "Rapor Ayarları",
  "/settings/logs": "Loglar",
  "/settings/security": "Güvenlik",
};

export function Breadcrumb() {
  const pathname = usePathname();

  // Don't show on home or auth pages
  if (pathname === "/" || pathname === "/signin" || pathname === "/signup") {
    return null;
  }

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Ana Sayfa", href: "/" },
  ];

  let currentPath = "";
  segments.forEach((segment) => {
    currentPath += `/${segment}`;
    const label = pathNameMap[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
    breadcrumbs.push({ label, href: currentPath });
  });

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 py-3 text-sm border-b border-white/5 
                 bg-linear-to-r from-white/2 to-transparent
                 pl-8 pr-4 md:pr-6
                 fixed top-16 right-0 z-[55]
                 backdrop-blur-sm"
      style={{
        left: 'var(--sidebar-width, 0px)',
      }}
    >
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const isFirst = index === 0;

        return (
          <div key={crumb.href} className="flex items-center gap-2">
            {isFirst ? (
              <Link
                href={crumb.href}
                className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors group"
              >
                <Home className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="hidden md:inline">{crumb.label}</span>
              </Link>
            ) : (
              <>
                <ChevronRight className="w-4 h-4 text-gray-600" />
                {isLast ? (
                  <span className="text-white font-medium flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-linear-to-r from-indigo-500 to-purple-600 animate-pulse" />
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-gray-400 hover:text-white transition-colors hover:underline decoration-indigo-500/50"
                  >
                    {crumb.label}
                  </Link>
                )}
              </>
            )}
          </div>
        );
      })}
    </motion.nav>
  );
}
