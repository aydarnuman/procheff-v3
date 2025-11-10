'use client';

import {
  Activity,
  Brain,
  Calculator,
  FileBarChart,
  FileText,
  ScrollText,
  Sparkles,
  Target
} from "lucide-react";
import Link from "next/link";
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { staggerContainer, fadeInUp } from '@/lib/animations';

export default function Home() {
  const modules = [
    {
      title: "⚡ Oto-Analiz Pipeline",
      description: "Tek tıkla Upload → OCR → Analiz → Karar → Rapor (NEW!)",
      href: "/auto",
      icon: Sparkles,
      color: "from-yellow-500 via-orange-500 to-red-500",
      badge: "NEW"
    },
    {
      title: "İhale Analiz Workspace",
      description: "Gemini OCR + Claude ile otomatik ihale döküman analizi",
      href: "/ihale/workspace",
      icon: Brain,
      color: "from-indigo-500 to-purple-600",
    },
    {
      title: "Menü Parser",
      description: "CSV/PDF menü dosyalarını yapılandırılmış veriye dönüştür",
      href: "/menu-parser",
      icon: FileText,
      color: "from-emerald-500 to-teal-600",
    },
    {
      title: "Maliyet Analizi",
      description: "AI destekli maliyet hesaplama ve kar marjı optimizasyonu",
      href: "/cost-analysis",
      icon: Calculator,
      color: "from-amber-500 to-orange-600",
    },
    {
      title: "Karar Motoru",
      description: "Claude Sonnet 4.5 ile stratejik ihale katılım kararı",
      href: "/decision",
      icon: Target,
      color: "from-pink-500 to-rose-600",
    },
    {
      title: "Rapor Oluştur",
      description: "PDF ve Excel formatında detaylı analiz raporları",
      href: "/reports",
      icon: FileBarChart,
      color: "from-cyan-500 to-blue-600",
    },
    {
      title: "Monitoring Dashboard",
      description: "AI performans metrikleri ve gerçek zamanlı izleme",
      href: "/monitor",
      icon: Activity,
      color: "from-violet-500 to-purple-600",
    },
    {
      title: "Log Viewer",
      description: "Sistem logları ve AI karar geçmişi",
      href: "/logs",
      icon: ScrollText,
      color: "from-slate-500 to-gray-600",
    },
  ];

  return (
    <motion.div
      className="max-w-7xl mx-auto"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      {/* Hero Section */}
      <motion.div className="text-center mb-12" variants={fadeInUp}>
        <h1 className="h1 mb-4 flex items-center justify-center gap-4">
          <Sparkles className="w-12 h-12 text-[var(--color-accent-blue)] animate-pulse-glow" />
          <span className="glow-text-blue">Procheff AI System</span>
        </h1>
        <p className="body-lg text-[var(--color-text-secondary)] max-w-3xl mx-auto mb-6">
          Claude Sonnet 4.5 & Gemini Vision ile Gelişmiş İhale Analiz Platformu
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Badge variant="info" size="md">
            🤖 Claude Sonnet 4.5
          </Badge>
          <Badge variant="success" size="md">
            👁️ Gemini Vision OCR
          </Badge>
          <Badge variant="neutral" size="md">
            ⚡ Next.js 16
          </Badge>
        </div>
      </motion.div>

      {/* Module Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        variants={staggerContainer}
      >
        {modules.map((module, index) => {
          const Icon = module.icon;
          return (
            <motion.div key={module.href} variants={fadeInUp}>
              <Link href={module.href} className="block group">
                <Card
                  hoverable
                  className="relative h-full p-6 transition-all duration-300"
                >
                  {/* NEW Badge */}
                  {module.badge && (
                    <div className="absolute top-4 right-4">
                      <Badge variant="warning" size="sm" pulse>
                        {module.badge}
                      </Badge>
                    </div>
                  )}

                  {/* Icon */}
                  <motion.div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${module.color} p-3 mb-4 shadow-lg`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <Icon className="w-full h-full text-white" />
                  </motion.div>

                  {/* Content */}
                  <h3 className="h4 mb-2 group-hover:text-[var(--color-accent-blue)] transition-colors">
                    {module.title}
                  </h3>
                  <p className="body-sm text-[var(--color-text-tertiary)] line-clamp-2">
                    {module.description}
                  </p>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Info Section */}
      <motion.div variants={fadeInUp} className="mt-12">
        <Card variant="elevated" className="p-8">
          <h2 className="h3 mb-6 flex items-center gap-2">
            <span>🎯</span>
            <span>Sistem Özellikleri</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              'Otomatik OCR analizi',
              'Real-time tracking',
              'TypeScript strict',
              'SQLite log sistemi',
              'Zod validation',
              'PDF & Excel rapor',
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                className="flex items-center gap-3 body"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <span className="text-[var(--color-accent-mint)] text-xl">✓</span>
                <span className="text-[var(--color-text-primary)]">{feature}</span>
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
