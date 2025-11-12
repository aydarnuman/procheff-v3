/**
 * Proactive Suggestions Component
 * Displays automatic suggestions and alerts
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, X, ChevronRight, AlertCircle, Lightbulb,
  TrendingUp, Clock, BookOpen, Sparkles, Check,
  ChevronUp, ChevronDown, Info, Zap
} from 'lucide-react';
import { proactiveAssistant, type ProactiveSuggestion } from '@/lib/chat/proactive-assistant';

interface ProactiveSuggestionsProps {
  context?: any;
  position?: 'top' | 'bottom' | 'floating';
  maxSuggestions?: number;
}

export function ProactiveSuggestions({
  context = {},
  position = 'top',
  maxSuggestions = 3
}: ProactiveSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [executing, setExecuting] = useState<Set<string>>(new Set());
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    loadSuggestions();
    const interval = setInterval(loadSuggestions, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [context]);

  const loadSuggestions = async () => {
    const newSuggestions = await proactiveAssistant.getSuggestions({
      currentPage: window.location.pathname,
      ...context
    });

    setSuggestions(newSuggestions.slice(0, maxSuggestions));
  };

  const handleDismiss = async (suggestionId: string) => {
    setDismissed(prev => new Set(prev).add(suggestionId));
    await proactiveAssistant.dismissSuggestion(suggestionId);
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  const handleAction = async (suggestion: ProactiveSuggestion) => {
    if (!suggestion.action) return;

    setExecuting(prev => new Set(prev).add(suggestion.id));

    try {
      const result = await proactiveAssistant.executeAction(suggestion.id);

      // Handle the action result
      if (result.success) {
        // Remove the suggestion after successful execution
        setTimeout(() => {
          setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to execute action:', error);
    } finally {
      setExecuting(prev => {
        const next = new Set(prev);
        next.delete(suggestion.id);
        return next;
      });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert': return AlertCircle;
      case 'tip': return Lightbulb;
      case 'opportunity': return TrendingUp;
      case 'reminder': return Clock;
      case 'insight': return BookOpen;
      default: return Info;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'from-red-500 to-red-600';
      case 'high': return 'from-orange-500 to-orange-600';
      case 'medium': return 'from-indigo-500 to-purple-600';
      case 'low': return 'from-slate-500 to-slate-600';
      default: return 'from-slate-500 to-slate-600';
    }
  };

  if (suggestions.length === 0) return null;

  if (position === 'floating') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="fixed bottom-20 right-6 z-50 w-80"
      >
        <AnimatePresence>
          {suggestions.map((suggestion) => (
            <FloatingSuggestion
              key={suggestion.id}
              suggestion={suggestion}
              onDismiss={() => handleDismiss(suggestion.id)}
              onAction={() => handleAction(suggestion)}
              isExecuting={executing.has(suggestion.id)}
              isDismissed={dismissed.has(suggestion.id)}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: position === 'top' ? -20 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative ${position === 'bottom' ? 'mt-4' : 'mb-4'}`}
    >
      <div className="glass-card rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-700/50 bg-gradient-to-r
          from-indigo-500/10 via-purple-500/10 to-pink-500/10"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                <Bell className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="text-sm font-semibold text-white">
                Akıllı Öneriler
              </span>
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs rounded-full">
                {suggestions.length}
              </span>
            </div>
            <button
              onClick={() => setMinimized(!minimized)}
              className="p-1 hover:bg-slate-700/50 rounded transition-colors"
            >
              {minimized ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* Suggestions */}
        <AnimatePresence>
          {!minimized && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="divide-y divide-slate-700/50"
            >
              {suggestions.map((suggestion, index) => (
                <SuggestionItem
                  key={suggestion.id}
                  suggestion={suggestion}
                  onDismiss={() => handleDismiss(suggestion.id)}
                  onAction={() => handleAction(suggestion)}
                  isExecuting={executing.has(suggestion.id)}
                  isDismissed={dismissed.has(suggestion.id)}
                  delay={index * 0.1}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function SuggestionItem({
  suggestion,
  onDismiss,
  onAction,
  isExecuting,
  isDismissed,
  delay = 0
}: {
  suggestion: ProactiveSuggestion;
  onDismiss: () => void;
  onAction: () => void;
  isExecuting: boolean;
  isDismissed: boolean;
  delay?: number;
}) {
  const Icon = getIcon(suggestion.type);

  if (isDismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay }}
      className="px-4 py-3 hover:bg-slate-800/30 transition-colors group"
    >
      <div className="flex items-start gap-3">
        {/* Icon with priority color */}
        <div className={`p-2 rounded-lg bg-gradient-to-br ${getPriorityColor(suggestion.priority)}
          bg-opacity-20 shrink-0`}
        >
          {suggestion.icon ? (
            <span className="text-lg">{suggestion.icon}</span>
          ) : (
            <Icon className="w-4 h-4 text-white" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white mb-1">
            {suggestion.title}
          </h4>
          <p className="text-xs text-slate-400 mb-2">
            {suggestion.message}
          </p>

          {/* Action button */}
          {suggestion.action && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onAction}
              disabled={isExecuting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5
                bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300
                rounded-lg transition-colors text-xs font-medium
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExecuting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <Sparkles className="w-3 h-3" />
                  </motion.div>
                  Çalışıyor...
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3" />
                  {suggestion.action.label}
                </>
              )}
            </motion.button>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-slate-700/50 rounded opacity-0 group-hover:opacity-100
            transition-all"
        >
          <X className="w-3 h-3 text-slate-400" />
        </button>
      </div>
    </motion.div>
  );
}

function FloatingSuggestion({
  suggestion,
  onDismiss,
  onAction,
  isExecuting,
  isDismissed
}: {
  suggestion: ProactiveSuggestion;
  onDismiss: () => void;
  onAction: () => void;
  isExecuting: boolean;
  isDismissed: boolean;
}) {
  const Icon = getIcon(suggestion.type);

  if (isDismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -20 }}
      className="glass-card p-4 rounded-xl mb-3 shadow-lg"
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${getPriorityColor(suggestion.priority)}
          bg-opacity-20 shrink-0`}
        >
          {suggestion.icon ? (
            <span className="text-lg">{suggestion.icon}</span>
          ) : (
            <Icon className="w-5 h-5 text-white" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between mb-1">
            <h4 className="text-sm font-semibold text-white">
              {suggestion.title}
            </h4>
            <button
              onClick={onDismiss}
              className="p-0.5 hover:bg-slate-700/50 rounded"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          </div>

          <p className="text-xs text-slate-400 mb-3">
            {suggestion.message}
          </p>

          {suggestion.action && (
            <button
              onClick={onAction}
              disabled={isExecuting}
              className="w-full py-2 bg-gradient-to-r from-indigo-500 to-purple-500
                text-white rounded-lg hover:from-indigo-600 hover:to-purple-600
                transition-all duration-300 text-xs font-medium
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              {isExecuting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <Sparkles className="w-3 h-3" />
                  </motion.div>
                  Çalışıyor...
                </>
              ) : (
                <>
                  <ChevronRight className="w-3 h-3" />
                  {suggestion.action.label}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Mini notification style for critical alerts
export function ProactiveNotification({ suggestion }: { suggestion: ProactiveSuggestion }) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible || suggestion.priority !== 'critical') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="fixed top-4 right-4 z-50"
    >
      <div className="bg-gradient-to-r from-red-500 to-red-600 text-white
        px-4 py-3 rounded-lg shadow-lg flex items-center gap-3"
      >
        <AlertCircle className="w-5 h-5" />
        <div className="flex-1">
          <p className="font-semibold text-sm">{suggestion.title}</p>
          <p className="text-xs opacity-90">{suggestion.message}</p>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="p-1 hover:bg-white/20 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// Hook for using proactive suggestions
export function useProactiveSuggestions(context?: any) {
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSuggestions = async () => {
      setLoading(true);
      try {
        const newSuggestions = await proactiveAssistant.getSuggestions({
          currentPage: window.location.pathname,
          ...context
        });
        setSuggestions(newSuggestions);
      } catch (error) {
        console.error('Failed to load suggestions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSuggestions();
    const interval = setInterval(loadSuggestions, 60000);
    return () => clearInterval(interval);
  }, [context]);

  return { suggestions, loading };
}