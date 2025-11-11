/**
 * ChatInterface - Main chat component with message list
 */

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Sparkles } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { MessageBubble } from './MessageBubble';

export function ChatInterface() {
  const { messages } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
      <AnimatePresence>
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </AnimatePresence>
      <div ref={messagesEndRef} />
    </div>
  );
}

function EmptyState() {
  const examplePrompts = [
    {
      icon: '📊',
      title: 'İhale Analizi',
      prompt: 'Bu ihaleye katılmamı önerir misin?'
    },
    {
      icon: '💰',
      title: 'Maliyet Hesaplama',
      prompt: 'Günlük kişi başı maliyet nasıl hesaplanır?'
    },
    {
      icon: '🎯',
      title: 'Strateji Önerisi',
      prompt: 'Sağlık Bakanlığı ihalelerinde dikkat edilecek noktalar neler?'
    },
    {
      icon: '📈',
      title: 'Benzer İhaleler',
      prompt: 'Geçmişte benzer ihalelerde ne karar verdik?'
    }
  ];

  const { sendMessage } = useChatStore();

  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-3xl"
      >
        {/* Icon */}
        <div className="mb-6">
          <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
            <Sparkles className="w-12 h-12 text-indigo-400" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          AI İhale Asistanı
        </h2>
        <p className="text-slate-400 mb-8 max-w-lg mx-auto">
          Merhaba! Ben ProCheff AI asistanıyım. İhale analizi, maliyet hesaplama ve stratejik kararlar konusunda size
          yardımcı olabilirim.
        </p>

        {/* Example Prompts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8">
          {examplePrompts.map((example, idx) => (
            <motion.button
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => sendMessage(example.prompt)}
              className="glass-card p-4 text-left hover:bg-slate-800/50 transition-all group rounded-xl"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{example.icon}</span>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-indigo-400 transition-colors">
                    {example.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{example.prompt}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Tips */}
        <div className="mt-8 glass-card rounded-xl p-4">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-indigo-400 mt-0.5" />
            <div className="flex-1 text-left">
              <h4 className="text-sm font-semibold text-white mb-1">💡 İpuçları</h4>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• Geçmiş analiz sonuçlarından öğrenen akıllı bir asistanım</li>
                <li>• Benzer ihaleleri bulup karşılaştırabilirim</li>
                <li>• Stratejik tavsiyeler ve risk değerlendirmesi yapabilirim</li>
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
