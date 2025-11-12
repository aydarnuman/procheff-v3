/**
 * ChatInterface - Main chat component with message list
 */

import { useChatStore } from '@/store/chatStore';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquare, Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';
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
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            previousMessage={index > 0 && messages[index - 1].role === 'user' ? messages[index - 1] : undefined}
          />
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
          <div className="inline-flex p-4 rounded-2xl bg-linear-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
            <Sparkles className="w-12 h-12 text-indigo-400" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold mb-3 bg-linear-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          AI İhale Asistanı
        </h2>
        <p className="text-slate-400 mb-8 max-w-lg mx-auto">
          Merhaba! Ben ProCheff AI asistanıyım. İhale analizi, maliyet hesaplama ve stratejik kararlar konusunda size
          yardımcı olabilirim.
        </p>

        {/* Example Prompts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          {examplePrompts.map((example, idx) => (
            <motion.button
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => sendMessage(example.prompt)}
              className="group relative glass-card p-6 text-left rounded-2xl border border-slate-700/50 
                hover:border-indigo-500/30 transition-all duration-300
                shadow-lg hover:shadow-xl hover:shadow-indigo-500/10
                before:absolute before:inset-0 before:rounded-2xl before:bg-linear-to-br
                before:from-indigo-500/5 before:via-purple-500/5 before:to-pink-500/5 before:opacity-0
                before:group-hover:opacity-100 before:transition-opacity before:duration-300"
            >
              <div className="relative z-10 flex items-start gap-4">
                <motion.span 
                  className="text-3xl shrink-0 group-hover:scale-110 transition-transform duration-200"
                  whileHover={{ rotate: 10 }}
                >
                  {example.icon}
                </motion.span>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">
                    {example.title}
                  </h3>
                  <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors line-clamp-2">
                    {example.prompt}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Tips */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.01, y: -1 }}
          className="group mt-8 glass-card rounded-2xl p-5 border border-slate-700/50
            hover:border-indigo-500/30 transition-all duration-300
            shadow-lg hover:shadow-xl hover:shadow-indigo-500/10
            before:absolute before:inset-0 before:rounded-2xl before:bg-linear-to-br
            before:from-indigo-500/5 before:via-purple-500/5 before:to-pink-500/5 before:opacity-0
            before:group-hover:opacity-100 before:transition-opacity before:duration-300"
        >
          <div className="relative z-10 flex items-start gap-3">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              transition={{ duration: 0.2 }}
            >
              <MessageSquare className="w-5 h-5 text-indigo-400 mt-1" />
            </motion.div>
            <div className="flex-1 text-left">
              <h4 className="text-sm font-bold text-white mb-3 group-hover:text-indigo-300 transition-colors">💡 İpuçları</h4>
              <ul className="text-xs text-slate-400 space-y-2 group-hover:text-slate-300 transition-colors">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 text-xs mt-0.5">•</span>
                  <span>Geçmiş analiz sonuçlarından öğrenen akıllı bir asistanım</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 text-xs mt-0.5">•</span>
                  <span>Benzer ihaleleri bulup karşılaştırabilirim</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-400 text-xs mt-0.5">•</span>
                  <span>Stratejik tavsiyeler ve risk değerlendirmesi yapabilirim</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
