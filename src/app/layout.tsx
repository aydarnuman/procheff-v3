import { AppShell } from "@/components/shell/AppShell";
import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/contexts/ToastContext";
import { QuickPipelineAction } from "@/components/ui/QuickPipelineAction";
import { FloatingChatWidgetWrapper } from "@/components/chat/FloatingChatWidgetWrapper";
import { ErrorSuppressor } from "@/components/ErrorSuppressor";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Procheff AI System",
  description: "AI destekli ihale analiz platformu - Claude Sonnet 4.5 & Gemini Vision",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="bg-(--color-base) text-(--color-text-primary)">
      <body className={`${inter.variable} font-sans antialiased relative min-h-screen overflow-x-hidden`}>
        {/* Layer 1: Base gradient (Charcoal) */}
        <div
          className="fixed inset-0 -z-10 pointer-events-none bg-base-gradient"
        />

        {/* Layer 2: Animated floating orbs */}
        <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
          {/* Orb 1 - Blue */}
          <div
            className="absolute w-96 h-96 rounded-full blur-3xl animate-float-slow orb-blue"
          />
          {/* Orb 2 - Purple */}
          <div
            className="absolute w-80 h-80 rounded-full blur-3xl animate-float-medium orb-purple"
          />
          {/* Orb 3 - Mint */}
          <div
            className="absolute w-72 h-72 rounded-full blur-3xl animate-float-fast orb-mint"
          />
        </div>

        {/* Layer 3: Grid overlay (subtle) */}
        <div
          className="fixed inset-0 -z-10 opacity-[0.03] pointer-events-none grid-overlay"
        />

        {/* Layer 4: Noise texture for depth */}
        <div
          className="pointer-events-none fixed inset-0 -z-10 opacity-[0.02] noise-texture"
        />

        {/* Main content wrapper */}
        <ErrorSuppressor />
        <SessionProvider>
          <ToastProvider>
            <div className="relative z-10">
              <AppShell>{children}</AppShell>
              <QuickPipelineAction />
              <FloatingChatWidgetWrapper />
            </div>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
