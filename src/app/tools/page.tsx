'use client';

import { motion } from 'framer-motion';
import {
  FileText,
  Calculator,
  Brain,
  TrendingUp,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

const tools = [
  {
    id: 'menu-parser',
    name: 'Menü Robotu',
    description: 'AI ile akıllı menü analizi ve otomatik sınıflandırma',
    icon: FileText,
    href: '/menu-robot',
    color: 'from-blue-500 to-cyan-500',
    bgGradient: 'from-blue-500/10 to-cyan-500/10'
  },
  {
    id: 'cost-analysis',
    name: 'Maliyet Analizi',
    description: 'İhale ve menü maliyetlerini detaylı hesapla',
    icon: Calculator,
    href: '/cost-analysis',
    color: 'from-green-500 to-emerald-500',
    bgGradient: 'from-green-500/10 to-emerald-500/10'
  },
  {
    id: 'decision',
    name: 'Karar Motoru',
    description: 'AI destekli stratejik katılım kararı al',
    icon: Brain,
    href: '/decision',
    color: 'from-purple-500 to-pink-500',
    bgGradient: 'from-purple-500/10 to-pink-500/10'
  },
  {
    id: 'market',
    name: 'Piyasa Robotu',
    description: 'Güncel ürün fiyatlarını sorgula ve takip et',
    icon: TrendingUp,
    href: '/piyasa-robotu',
    color: 'from-orange-500 to-red-500',
    bgGradient: 'from-orange-500/10 to-red-500/10'
  }
];

export default function ToolsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
            <Sparkles className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Araçlar Merkezi</h1>
            <p className="text-slate-400 text-sm mt-1">
              AI destekli modüler araçlar - Her biri bağımsız kullanılabilir
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tools.map((tool, idx) => (
          <ToolCard key={tool.id} tool={tool} index={idx} />
        ))}
      </div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-6 rounded-2xl border border-slate-700/50"
      >
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">
              Nasıl Kullanılır?
            </h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                <span>Her araç <strong className="text-slate-300">bağımsız</strong> çalışır - tek başına kullanabilirsiniz</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">•</span>
                <span>Otomatik pipeline için <strong className="text-slate-300">Analiz Merkezi</strong>'ni kullanın</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-400 mt-1">•</span>
                <span>Araçlar birbirleriyle <strong className="text-slate-300">entegre</strong> - veri aktarabilirsiniz</span>
              </li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ToolCard({ tool, index }: { tool: typeof tools[0]; index: number }) {
  const Icon = tool.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link
        href={tool.href}
        className="group block relative overflow-hidden rounded-2xl border border-slate-700/50
          bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-sm
          hover:border-slate-600 transition-all duration-300
          hover:shadow-xl hover:shadow-black/20"
      >
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${tool.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

        {/* Content */}
        <div className="relative p-6">
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${tool.color} shadow-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <motion.div
              className="p-2 rounded-lg bg-slate-700/50 opacity-0 group-hover:opacity-100"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.2 }}
            >
              <ArrowRight className="w-5 h-5 text-slate-300" />
            </motion.div>
          </div>

          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">
            {tool.name}
          </h3>
          <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
            {tool.description}
          </p>

          {/* Bottom accent */}
          <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${tool.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
        </div>
      </Link>
    </motion.div>
  );
}
