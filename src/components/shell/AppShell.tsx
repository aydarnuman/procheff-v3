"use client";

import { CommandPalette } from "@/components/ui/CommandPalette";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
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
      <Sidecar />
      <div className="flex h-screen overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden md:pl-52">
          <TopBar />
          <Breadcrumb />
          <div className="flex-1 overflow-y-auto p-3 md:p-6 bg-linear-to-br from-transparent via-black/5 to-transparent">
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
