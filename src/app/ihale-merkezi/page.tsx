'use client';

import { fadeInUp, staggerContainer } from '@/lib/animations';
import { motion } from 'framer-motion';
import { Brain, FileText, Zap } from "lucide-react";
import Link from "next/link";

export default function IhaleMerkeziPage() {
  const modules = [
    {
      title: "İhale Döküman Analizi",
      description: "PDF, DOCX dosyalarını yükleyin, AI otomatik analiz etsin",
      href: "/auto",
      icon: Zap,
      color: "from-yellow-500 via-orange-500 to-red-500",
      badge: "Ana Özellik"
    },
    {
      title: "AI Teklif Karar Motoru",
      description: "İhaleye katılmalı mı? Risk analizi ve karar desteği",
      href: "/decision",
      icon: Brain,
      color: "from-pink-500 to-rose-600",
    },
    {
      title: "AI Teklif Raporu",
      description: "PDF ve Excel formatında detaylı analiz raporları",
      href: "/reports",
      icon: FileText,
      color: "from-cyan-500 to-blue-600",
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
      <motion.div className="mb-8" variants={fadeInUp}>
        <h1 className="text-4xl font-bold mb-3 bg-linear-to-r from-white to-indigo-300 bg-clip-text text-transparent">
          İhale Merkezi
        </h1>
        <p className="text-lg text-gray-400">
          AI destekli ihale analiz ve karar destek sistemi
        </p>
      </motion.div>

      {/* Module Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={staggerContainer}
      >
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <motion.div key={module.href} variants={fadeInUp}>
              <Link href={module.href} className="block group no-underline">
                <div className="glass-card relative h-full p-6 hover:scale-105 transition-transform duration-300">
                  {/* Icon */}
                  <motion.div
                    className={`w-14 h-14 rounded-xl bg-linear-to-br ${module.color} p-3 mb-4 shadow-lg`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <Icon className="w-full h-full text-white" />
                  </motion.div>

                  {/* Content */}
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">
                      {module.title}
                    </h3>
                    {module.badge && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 border border-yellow-500/40 text-yellow-300">
                        {module.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">
                    {module.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Stats Section */}
      <motion.div variants={fadeInUp} className="mt-12">
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Sistem Özellikleri
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-400 mb-2">OCR</div>
              <div className="text-sm text-gray-400">Gemini Vision 2.0 ile otomatik metin çıkarma</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-400 mb-2">AI</div>
              <div className="text-sm text-gray-400">Claude Sonnet 4.5 ile derin analiz</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-400 mb-2">Rapor</div>
              <div className="text-sm text-gray-400">PDF & Excel formatında detaylı raporlar</div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
