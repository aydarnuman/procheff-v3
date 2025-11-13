/**
 * ChatPanel - Floating slide-in chat panel
 * Displays full chat interface in a side panel
 */

'use client';

import { useChatWidget } from '@/hooks/useChatWidget';
import { useChatStore } from '@/store/chatStore';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bot,
  ChevronRight,
  Minimize2,
  Trash2,
  X,
  Info,
  BarChart,
  Sparkles
} from 'lucide-react';
import { useState } from 'react';
import { ChatInterface } from './ChatInterface';
import { InputArea } from './InputArea';
import { AlertsWidget, MetricsWidget, PriceWidget } from './ContextWidgets';
import { AnalyticsWidget } from './AnalyticsWidget';
import { FeedbackMetrics } from './FeedbackWidget';

export function ChatPanel() {
  const { isOpen, close, minimize, isMinimized } = useChatWidget();
  const { messages, sendMessage, clearHistory, isLoading } = useChatStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300
            }}
            className="fixed right-0 top-0 h-screen z-[9999] flex"
          >
            {/* Main Chat Panel */}
            <div className={`relative flex flex-col bg-slate-900/95 backdrop-blur-xl border-l border-slate-800/50 shadow-2xl shadow-black/50 ${
              sidebarCollapsed ? 'w-[500px]' : 'w-[820px]'
            } transition-all duration-300`}>
              {/* Header */}
              <div className="relative backdrop-blur-xl bg-slate-900/95 border-b border-slate-800/50 p-4
                shadow-xl shadow-black/20 before:absolute before:inset-0
                before:bg-gradient-to-r before:from-indigo-500/5 before:via-purple-500/5 before:to-pink-500/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div
                      whileHover={{ scale: 1.05, rotate: 5 }}
                      transition={{ duration: 0.2 }}
                      className="relative p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20
                        border border-indigo-500/30 shadow-lg shadow-indigo-500/20
                        before:absolute before:inset-0.5 before:rounded-lg before:bg-gradient-to-br
                        before:from-white/10 before:to-transparent before:pointer-events-none"
                    >
                      <Bot className="relative z-10 w-6 h-6 text-indigo-300 drop-shadow-lg" />
                    </motion.div>
                    <div>
                      <h2 className="text-base font-bold text-white">AI İhale Asistanı</h2>
                      <p className="text-xs text-slate-400">Sorularınızı sorun</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {messages.length > 0 && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={clearHistory}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg
                          transition-colors"
                        title="Geçmişi temizle"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    )}

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                      className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800/70 text-slate-400 hover:text-white transition-colors"
                      title={sidebarCollapsed ? 'Bilgi panelini aç' : 'Bilgi panelini kapat'}
                    >
                      <ChevronRight className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={close}
                      className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800/70 text-slate-400 hover:text-white transition-colors"
                      title="Kapat"
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Chat Content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <ChatInterface />

                {/* Input Area */}
                <div className="p-4 pt-0">
                  <InputArea onSend={sendMessage} disabled={isLoading} />
                </div>
              </div>
            </div>

            {/* Context Sidebar */}
            {!sidebarCollapsed && (
              <motion.aside
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="w-80 bg-slate-900/95 backdrop-blur-xl border-l border-slate-800/50 p-4 overflow-y-auto"
              >
                <ContextPanel />
              </motion.aside>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ContextPanel() {
  const [activeTab, setActiveTab] = useState<'context' | 'analytics'>('context');

  return (
    <div className="space-y-4">
      {/* Tab Selector */}
      <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('context')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
            activeTab === 'context'
              ? 'bg-indigo-500 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Info className="w-4 h-4" />
          Bağlam
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
            activeTab === 'analytics'
              ? 'bg-indigo-500 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart className="w-4 h-4" />
          Analitik
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'context' ? (
        <ContextTabContent />
      ) : (
        <AnalyticsWidget />
      )}
    </div>
  );
}

function ContextTabContent() {
  return (
    <div className="space-y-3">
      {/* Capabilities */}
      <motion.div
        whileHover={{ scale: 1.01, y: -1 }}
        transition={{ duration: 0.2 }}
        className="relative group glass-card p-4 rounded-xl border border-slate-700/50
          hover:border-indigo-500/30 transition-all duration-300
          shadow-lg hover:shadow-xl hover:shadow-indigo-500/10
          before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br
          before:from-indigo-500/5 before:via-purple-500/5 before:to-pink-500/5 before:opacity-0
          before:group-hover:opacity-100 before:transition-opacity before:duration-300"
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🎯</span>
            <h4 className="text-sm font-bold text-white">Yetenekler</h4>
          </div>
          <ul className="space-y-2 text-xs text-slate-400">
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span className="group-hover:text-slate-300 transition-colors">İhale dokümanı analizi</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span className="group-hover:text-slate-300 transition-colors">Maliyet hesaplama</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span className="group-hover:text-slate-300 transition-colors">Stratejik tavsiye</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span className="group-hover:text-slate-300 transition-colors">Geçmiş deneyimlerden öğrenme</span>
            </li>
          </ul>
        </div>
      </motion.div>

      {/* Live Metrics */}
      <MetricsWidget />

      {/* Feedback Metrics */}
      <FeedbackMetrics />

      {/* Market Price Widget */}
      <PriceWidget />

      {/* Alerts Widget */}
      <AlertsWidget />

      {/* Quick Tips */}
      <div className="glass-card p-4 rounded-xl">
        <h4 className="text-sm font-semibold text-white mb-3">💡 İpuçları</h4>
        <ul className="space-y-2 text-xs text-slate-400">
          <li className="flex items-start gap-2">
            <Sparkles className="w-3 h-3 text-indigo-400 mt-0.5 shrink-0" />
            <span>Geçmiş analiz sonuçlarından öğrenen akıllı bir asistanım</span>
          </li>
          <li className="flex items-start gap-2">
            <Sparkles className="w-3 h-3 text-purple-400 mt-0.5 shrink-0" />
            <span>Benzer ihaleleri bulup karşılaştırabilirim</span>
          </li>
          <li className="flex items-start gap-2">
            <Sparkles className="w-3 h-3 text-pink-400 mt-0.5 shrink-0" />
            <span>Stratejik tavsiyeler ve risk değerlendirmesi yapabilirim</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
