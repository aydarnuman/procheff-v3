/**
 * InputArea - Chat input with file upload support
 */

import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Paperclip, Loader2, Command } from 'lucide-react';
import { getCommandSuggestions } from '@/lib/chat/commands';

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function InputArea({ onSend, disabled = false }: Props) {
  const [message, setMessage] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setMessage('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Update command suggestions
    if (value.startsWith('/')) {
      setSuggestions(getCommandSuggestions(value));
    } else {
      setSuggestions([]);
    }

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const selectSuggestion = (suggestion: string) => {
    setMessage(suggestion + ' ');
    setSuggestions([]);
    textareaRef.current?.focus();
  };

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex gap-3 items-end">
        {/* File Upload Button (Future feature) */}
        <button
          disabled={disabled}
          className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          title="Dosya ekle (Yakında)"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Message Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Mesajınızı yazın veya / ile komut başlatın..."
            className="w-full px-4 py-3 bg-slate-800 rounded-lg text-white placeholder:text-slate-500
              focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none
              disabled:opacity-50 disabled:cursor-not-allowed"
            rows={1}
            style={{ minHeight: '48px', maxHeight: '200px' }}
          />

          {/* Command suggestions dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-2 glass-card rounded-lg overflow-hidden">
              {suggestions.map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => selectSuggestion(cmd)}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-indigo-500/20
                    transition-colors flex items-center gap-2"
                >
                  <Command className="w-4 h-4 text-indigo-400" />
                  <span className="font-mono">{cmd}</span>
                </button>
              ))}
            </div>
          )}

          {/* Character counter */}
          {message.length > 0 && (
            <div className="absolute right-3 bottom-2 text-xs text-slate-500">
              {message.length}
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className="p-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500
            hover:from-indigo-600 hover:to-purple-600 text-white transition-all
            disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0
            shadow-lg hover:shadow-xl disabled:shadow-none"
        >
          {disabled ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Tips */}
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>💡 İpucu: Soru sorun veya <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-indigo-400">/help</kbd> ile komutları görün</span>
      </div>
    </div>
  );
}
