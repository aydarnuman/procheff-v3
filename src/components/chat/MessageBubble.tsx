/**
 * MessageBubble - Chat message component with markdown support
 */

import { motion } from 'framer-motion';
import { User, Bot, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '@/store/chatStore';

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
          ${
            isUser
              ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
              : 'bg-gradient-to-br from-purple-500 to-pink-500'
          }
        `}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {/* Message Bubble */}
        <div
          className={`
            rounded-2xl px-4 py-3
            ${
              isUser
                ? 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30'
                : 'glass-card'
            }
          `}
        >
          {isUser ? (
            // User message - plain text
            <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            // Assistant message - markdown
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Custom styling for markdown elements
                  p: ({ children }) => <p className="text-slate-200 leading-relaxed mb-2 last:mb-0">{children}</p>,
                  strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="text-cyan-300">{children}</em>,
                  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>,
                  li: ({ children }) => <li className="text-slate-300">{children}</li>,
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded text-xs font-mono">
                        {children}
                      </code>
                    ) : (
                      <code className="block bg-slate-900 text-slate-300 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => <pre className="my-2">{children}</pre>,
                  h1: ({ children }) => <h1 className="text-xl font-bold text-white mt-4 mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-bold text-white mt-3 mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-semibold text-white mt-2 mb-1">{children}</h3>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-indigo-500 pl-4 italic text-slate-400 my-2">
                      {children}
                    </blockquote>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-3">
                      <table className="min-w-full border border-slate-700 rounded-lg">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-slate-800">{children}</thead>,
                  tbody: ({ children }) => <tbody className="divide-y divide-slate-700">{children}</tbody>,
                  tr: ({ children }) => <tr>{children}</tr>,
                  th: ({ children }) => (
                    <th className="px-3 py-2 text-left text-xs font-semibold text-white">{children}</th>
                  ),
                  td: ({ children }) => <td className="px-3 py-2 text-sm text-slate-300">{children}</td>
                }}
              >
                {message.content}
              </ReactMarkdown>

              {/* Streaming indicator */}
              {isStreaming && (
                <div className="flex items-center gap-2 mt-2">
                  <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />
                  <span className="text-xs text-slate-400">Yazıyor...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className={`text-xs text-slate-500 px-2 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </div>
    </motion.div>
  );
}
