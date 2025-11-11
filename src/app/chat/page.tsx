/**
 * Chat Page - AI Assistant Interface
 * Features: Streaming responses, context awareness, learning from history
 */

'use client';

import { ChatInterface } from '@/components/chat/ChatInterface';
import { AlertsWidget, MetricsWidget, PriceWidget } from '@/components/chat/ContextWidgets';
import { InputArea } from '@/components/chat/InputArea';
import { useChatStore } from '@/store/chatStore';
import { motion } from 'framer-motion';
import { Bot, ChevronLeft, ChevronRight, Info, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function ChatPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { messages, sendMessage, clearHistory, isLoading } = useChatStore();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative backdrop-blur-xl bg-slate-900/95 border-b border-slate-800/50 p-6
          shadow-xl shadow-black/20 before:absolute before:inset-0 
          before:bg-linear-to-r before:from-indigo-500/5 before:via-purple-500/5 before:to-pink-500/5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ duration: 0.2 }}
              className="relative p-3 rounded-2xl bg-linear-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 
                border border-indigo-500/30 shadow-lg shadow-indigo-500/20
                before:absolute before:inset-0.5 before:rounded-xl before:bg-linear-to-br 
                before:from-white/10 before:to-transparent before:pointer-events-none"
            >
              <Bot className="relative z-10 w-7 h-7 text-indigo-300 drop-shadow-lg" />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold text-white">AI İhale Asistanı</h1>
              <p className="text-sm text-slate-400">Sorularınızı sorun, ihale analizi yapın</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={clearHistory}
                className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg
                  transition-colors flex items-center gap-2 text-sm"
                title="Geçmişi temizle"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Temizle</span>
              </button>
            )}

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800/70 text-slate-400 hover:text-white transition-colors"
              title={sidebarCollapsed ? 'Bilgi panelini aç' : 'Bilgi panelini kapat'}
            >
              {sidebarCollapsed ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatInterface />

          {/* Input Area */}
          <div className="p-6 pt-0">
            <InputArea onSend={sendMessage} disabled={isLoading} />
          </div>
        </div>

        {/* Context Sidebar */}
        {!sidebarCollapsed && (
          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-80 glass-card rounded-none border-l border-slate-800/50 p-6 overflow-y-auto"
          >
            <ContextPanel />
          </motion.aside>
        )}
      </div>
    </div>
  );
}

function ContextPanel() {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center gap-2">
        <Info className="w-5 h-5 text-indigo-400" />
        <h3 className="text-lg font-semibold text-white">Bağlam</h3>
      </div>

      {/* Info Cards */}
      <div className="space-y-4">
        {/* Capabilities */}
        <motion.div 
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ duration: 0.2 }}
          className="relative group glass-card p-5 rounded-2xl border border-slate-700/50 
            hover:border-indigo-500/30 transition-all duration-300
            shadow-lg hover:shadow-xl hover:shadow-indigo-500/10
            before:absolute before:inset-0 before:rounded-2xl before:bg-linear-to-br
            before:from-indigo-500/5 before:via-purple-500/5 before:to-pink-500/5 before:opacity-0
            before:group-hover:opacity-100 before:transition-opacity before:duration-300"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🎯</span>
              <h4 className="text-sm font-bold text-white">Yetenekler</h4>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-0.5 text-sm">✓</span>
                <span className="group-hover:text-slate-300 transition-colors">İhale dokümanı analizi</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-0.5 text-sm">✓</span>
                <span className="group-hover:text-slate-300 transition-colors">Maliyet hesaplama</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-0.5 text-sm">✓</span>
                <span className="group-hover:text-slate-300 transition-colors">Stratejik tavsiye</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-0.5 text-sm">✓</span>
                <span className="group-hover:text-slate-300 transition-colors">Geçmiş deneyimlerden öğrenme</span>
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Live Metrics */}
        <MetricsWidget />

        {/* Market Price Widget */}
        <PriceWidget />

        {/* Alerts Widget */}
        <AlertsWidget />

        {/* Memory Status */}
        <div className="glass-card p-4 rounded-xl">
          <h4 className="text-sm font-semibold text-white mb-3">🧠 Hafıza</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Öğrenilmiş kurallar</span>
              <span className="text-white font-medium">-</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Geçmiş analizler</span>
              <span className="text-white font-medium">-</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Benzer ihaleler</span>
              <span className="text-white font-medium">-</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            💡 İpucu: Analiz yaptıkça hafızam güçlenecek
          </p>
        </div>

        {/* Quick Tips */}
        <div className="glass-card p-4 rounded-xl">
          <h4 className="text-sm font-semibold text-white mb-3">💬 Nasıl Kullanılır?</h4>
          <ul className="space-y-2 text-xs text-slate-400">
            <li>• Doğal dilde soru sorun</li>
            <li>• &ldquo;Analiz et&rdquo;, &ldquo;Hesapla&rdquo;, &ldquo;Öner&rdquo; gibi komutlar kullanın</li>
            <li>• Geçmiş kararlarınızı sorun</li>
            <li>• Benzer ihaleleri karşılaştırın</li>
          </ul>
        </div>

        {/* Examples */}
        <div className="glass-card p-4 rounded-xl">
          <h4 className="text-sm font-semibold text-white mb-3">📚 Örnek Sorular</h4>
          <div className="space-y-2 text-xs text-slate-400">
            <div className="bg-slate-800/50 rounded px-2 py-1.5">
              &ldquo;Bu ihaleye katılmamı önerir misin?&rdquo;
            </div>
            <div className="bg-slate-800/50 rounded px-2 py-1.5">
              &ldquo;Günlük kişi başı maliyet nasıl hesaplanır?&rdquo;
            </div>
            <div className="bg-slate-800/50 rounded px-2 py-1.5">
              &ldquo;Sağlık ihalelerinde dikkat edilmesi gerekenler?&rdquo;
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-xs text-slate-500 text-center pt-4 border-t border-slate-800/50">
        <p>Powered by Claude Sonnet 4.5</p>
        <p className="mt-1">Öğrenen AI Asistan</p>
      </div>
    </div>
  );
}
