'use client';

import { fadeInUp, staggerContainer } from '@/lib/animations';
import { motion } from 'framer-motion';
import { Sparkles } from "lucide-react";
import Link from "next/link";

export default function Home() {

  return (
    <motion.div
      className="flex items-center justify-center min-h-[80vh]"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      <div className="max-w-4xl mx-auto text-center">
        {/* Hero Section */}
        <motion.div variants={fadeInUp}>
          <div className="flex items-center justify-center gap-4 mb-6">
            <Sparkles className="w-16 h-16 text-indigo-400 animate-pulse" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-linear-to-r from-white via-indigo-200 to-purple-300 bg-clip-text text-transparent">
            İhale Analiz Sistemi
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Dosyalarınızı yükleyin, AI otomatik analiz etsin, rapor üretsin
          </p>

          {/* Main CTA Button */}
          <motion.div
            variants={fadeInUp}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link
              href="/analysis"
              className="inline-flex items-center gap-3 px-12 py-6 text-2xl font-semibold text-white bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl shadow-indigo-500/50 hover:shadow-indigo-500/80 transition-all duration-300 no-underline group"
            >
              <Sparkles className="w-8 h-8 group-hover:rotate-12 transition-transform" />
              <span>Analizi Başlat</span>
              <motion.span
                className="text-3xl"
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                →
              </motion.span>
            </Link>
          </motion.div>

          {/* Features */}
          <motion.div variants={fadeInUp} className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6">
              <div className="text-4xl mb-3">📄</div>
              <h3 className="text-lg font-semibold text-white mb-2">Otomatik OCR</h3>
              <p className="text-sm text-gray-400">PDF, DOCX, TXT dosyalarından otomatik metin çıkarma</p>
            </div>
            <div className="glass-card p-6">
              <div className="text-4xl mb-3">🤖</div>
              <h3 className="text-lg font-semibold text-white mb-2">AI Analiz</h3>
              <p className="text-sm text-gray-400">Claude Sonnet 4.5 ile derin analiz ve karar desteği</p>
            </div>
            <div className="glass-card p-6">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="text-lg font-semibold text-white mb-2">Raporlar</h3>
              <p className="text-sm text-gray-400">PDF ve Excel formatında detaylı analiz raporları</p>
            </div>
          </motion.div>

          {/* Tech Stack */}
          <motion.div variants={fadeInUp} className="mt-10 flex items-center justify-center gap-3 flex-wrap">
            <span className="px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium">
              🤖 Claude Sonnet 4.5
            </span>
            <span className="px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium">
              👁️ Gemini Vision OCR
            </span>
            <span className="px-4 py-2 rounded-full bg-gray-500/10 border border-gray-500/20 text-gray-300 text-sm font-medium">
              ⚡ Next.js 16
            </span>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
