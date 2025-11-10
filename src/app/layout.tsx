import { AppShell } from "@/components/shell/AppShell";
import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { Inter } from "next/font/google";
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
    <html lang="tr" className="bg-[var(--color-base)] text-[var(--color-text-primary)]">
      <body className={`${inter.variable} font-sans antialiased relative min-h-screen overflow-x-hidden`}>
        {/* Layer 1: Base gradient (Charcoal) */}
        <div
          className="fixed inset-0 -z-10 pointer-events-none"
          style={{
            background: "linear-gradient(135deg, #0A0A0A 0%, #141414 50%, #1E1E1E 100%)",
          }}
        />

        {/* Layer 2: Animated floating orbs */}
        <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
          {/* Orb 1 - Blue */}
          <div
            className="absolute w-96 h-96 rounded-full blur-3xl animate-float-slow"
            style={{
              background: "radial-gradient(circle, rgba(74, 158, 255, 0.15), transparent 70%)",
              top: "10%",
              left: "15%",
              animation: "float-slow 20s ease-in-out infinite",
            }}
          />
          {/* Orb 2 - Purple */}
          <div
            className="absolute w-80 h-80 rounded-full blur-3xl animate-float-medium"
            style={{
              background: "radial-gradient(circle, rgba(139, 92, 246, 0.12), transparent 70%)",
              top: "60%",
              right: "10%",
              animation: "float-medium 25s ease-in-out infinite",
            }}
          />
          {/* Orb 3 - Mint */}
          <div
            className="absolute w-72 h-72 rounded-full blur-3xl animate-float-fast"
            style={{
              background: "radial-gradient(circle, rgba(0, 217, 163, 0.08), transparent 70%)",
              bottom: "15%",
              left: "50%",
              animation: "float-fast 18s ease-in-out infinite",
            }}
          />
        </div>

        {/* Layer 3: Grid overlay (subtle) */}
        <div
          className="fixed inset-0 -z-10 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />

        {/* Layer 4: Noise texture for depth */}
        <div
          className="pointer-events-none fixed inset-0 -z-10 opacity-[0.02]"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E\")",
          }}
        />

        {/* Main content wrapper */}
        <SessionProvider>
          <div className="relative z-10">
            <AppShell>{children}</AppShell>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
