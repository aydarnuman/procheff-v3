"use client";

import { CommandPalette } from "@/components/ui/CommandPalette";
import { usePathname } from "next/navigation";
import { Sidecar } from "./Sidecar";
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
    <>
      <div className="flex h-screen overflow-hidden">
        <Sidecar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-transparent via-black/5 to-transparent">
            <div className="max-w-[1600px] mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
      <CommandPalette />
    </>
  );
}
