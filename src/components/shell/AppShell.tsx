"use client";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { usePathname } from "next/navigation";
import { ModernSidebar } from "./ModernSidebar";
import { TopBar } from "./TopBar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  // Sign-in sayfası için sidebar gösterme
  const isAuthPage = pathname === "/signin" || pathname === "/signup";

  if (isAuthPage) {
    return (
      <>
        {children}
        <CommandPalette />
      </>
    );
  }

  return (
    <div className="relative min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Independent Sidebar - Full Height */}
      <ModernSidebar />
      
      {/* Main Content Area - Responsive to sidebar state */}
      <main className="transition-all duration-300 ease-out min-h-screen">
        {/* TopBar - Independent from sidebar (fixed positioning) */}
        <TopBar />
        <Breadcrumb />
        
        {/* Content Area */}
        <div
          className="relative z-10 pt-28 px-4 md:px-8 pb-6 transition-all duration-300"
          style={{ marginLeft: 'var(--sidebar-width, 0px)' }}
        >
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </div>
      </main>
      
      <CommandPalette />
    </div>
  );
}
