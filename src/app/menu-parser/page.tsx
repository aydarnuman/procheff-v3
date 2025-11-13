"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Calendar,
  Scale,
  Upload,
  Search,
  Download,
  Loader2,
  X,
  AlertCircle
} from "lucide-react";
import { useState } from "react";

// Tab Types
type TabType = 'planner' | 'gramaj' | 'parser';

// Components will be separated for clarity
import { MenuPlannerTab } from "@/components/menu/MenuPlannerTab";
import { GramajCalculatorTab } from "@/components/menu/GramajCalculatorTab";
import { FileParserTab } from "@/components/menu/FileParserTab";

export default function MenuRobotuPage() {
  const [activeTab, setActiveTab] = useState<TabType>('gramaj');

  const tabs = [
    {
      id: 'planner' as TabType,
      name: 'Menü Planlayıcı',
      icon: Calendar,
      color: 'from-purple-500 to-pink-500',
      description: 'Otomatik veya manuel menü planla'
    },
    {
      id: 'gramaj' as TabType,
      name: 'Gramaj Hesaplayıcı',
      icon: Scale,
      color: 'from-green-500 to-emerald-500',
      description: 'Kurum bazlı gramaj ve reçete'
    },
    {
      id: 'parser' as TabType,
      name: 'Dosya Çözümleyici',
      icon: FileText,
      color: 'from-blue-500 to-cyan-500',
      description: 'Menü dosyalarını AI ile analiz et'
    }
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
              <FileText className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Menü Robotu</h1>
              <p className="text-slate-400 text-sm mt-1">
                AI destekli profesyonel menü yönetim sistemi
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-2 rounded-2xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {tabs.map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`relative p-4 rounded-xl transition-all duration-300 text-left ${
                    isActive
                      ? 'bg-gradient-to-br from-slate-700 to-slate-800 shadow-lg'
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${tab.color} ${isActive ? 'shadow-lg' : 'opacity-70'}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold mb-1 ${isActive ? 'text-white' : 'text-slate-300'}`}>
                        {tab.name}
                      </h3>
                      <p className={`text-xs ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                        {tab.description}
                      </p>
                    </div>
                  </div>

                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${tab.color} rounded-b-xl`}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'planner' && <MenuPlannerTab />}
            {activeTab === 'gramaj' && <GramajCalculatorTab />}
            {activeTab === 'parser' && <FileParserTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
