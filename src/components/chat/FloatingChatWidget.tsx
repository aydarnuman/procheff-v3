/**
 * FloatingChatWidget - Floating chat button that opens chat panel
 * Features: Pulse animation, unread badge, smooth hover effects
 */

'use client';

import { useChatWidget } from '@/hooks/useChatWidget';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Sparkles } from 'lucide-react';
import { ChatPanel } from './ChatPanel';

export function FloatingChatWidget() {
  const { isOpen, toggle, unreadCount } = useChatWidget();

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 20
            }}
            className="fixed bottom-6 right-6 z-[9997]"
          >
            <motion.button
              onClick={toggle}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="relative group"
            >
              {/* Glow Effect */}
              <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600/40 via-pink-600/40 to-blue-600/40 blur-xl opacity-0 group-hover:opacity-100"
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 180, 360]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'linear'
                }}
              />

              {/* Main Button */}
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500
                shadow-2xl shadow-purple-500/50 border-2 border-white/20
                flex items-center justify-center
                group-hover:shadow-purple-500/70 transition-all duration-300">

                {/* Inner Circle with Icon */}
                <motion.div
                  className="absolute inset-1 rounded-full bg-slate-900/90 backdrop-blur-sm
                    flex items-center justify-center"
                  whileHover={{ rotate: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <MessageSquare className="w-7 h-7 text-purple-300 drop-shadow-lg" />
                </motion.div>

                {/* Unread Badge */}
                {unreadCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-pink-500
                      border-2 border-slate-900 shadow-lg
                      flex items-center justify-center"
                  >
                    <motion.span
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="text-xs font-bold text-white"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                  </motion.div>
                )}

                {/* Pulse Ring */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-purple-400/50"
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.5, 0, 0.5]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />
              </div>

              {/* Tooltip */}
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                whileHover={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute right-full mr-3 top-1/2 -translate-y-1/2
                  pointer-events-none whitespace-nowrap"
              >
                <div className="px-3 py-2 bg-slate-900/95 backdrop-blur-sm rounded-lg
                  border border-slate-700/50 shadow-xl">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-semibold text-white">AI Asistan</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Sorularınızı sorun
                  </p>
                </div>
              </motion.div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <ChatPanel />
    </>
  );
}

/**
 * Compact version for mobile/tablet (optional)
 */
export function CompactFloatingChatWidget() {
  const { isOpen, toggle } = useChatWidget();

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={toggle}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="fixed bottom-4 right-4 z-[9997]
              w-14 h-14 rounded-full
              bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500
              shadow-xl shadow-purple-500/50
              flex items-center justify-center
              border-2 border-white/20"
          >
            <MessageSquare className="w-6 h-6 text-white drop-shadow-lg" />
          </motion.button>
        )}
      </AnimatePresence>

      <ChatPanel />
    </>
  );
}
