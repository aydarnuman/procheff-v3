/**
 * Feedback Widget Component
 * Interactive feedback collection for AI responses
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ThumbsUp, ThumbsDown, Star, Send, X,
  MessageSquare, TrendingUp, AlertCircle,
  ChevronDown, Sparkles, Check
} from 'lucide-react';

interface FeedbackWidgetProps {
  messageId: string;
  conversationId: string;
  message: string;
  response: string;
  onClose?: () => void;
}

export function FeedbackWidget({
  messageId,
  conversationId,
  message,
  response,
  onClose
}: FeedbackWidgetProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [selectedImprovements, setSelectedImprovements] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const improvements = [
    { id: 'accuracy', label: 'Daha doğru bilgi', icon: '🎯' },
    { id: 'detail', label: 'Daha fazla detay', icon: '📊' },
    { id: 'speed', label: 'Daha hızlı yanıt', icon: '⚡' },
    { id: 'clarity', label: 'Daha açık ifade', icon: '💡' },
    { id: 'relevance', label: 'Daha ilgili içerik', icon: '🔍' },
    { id: 'examples', label: 'Daha fazla örnek', icon: '📝' }
  ];

  const handleSubmit = async () => {
    if (rating === 0) return;

    setIsSubmitting(true);

    try {
      const apiResponse = await fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          conversationId,
          rating,
          feedback,
          improvements: selectedImprovements,
          context: {
            query: message,
            response: message
          }
        })
      });

      if (apiResponse.ok) {
        setIsSubmitted(true);
        setTimeout(() => {
          if (onClose) onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-6 rounded-xl text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500
            rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <Check className="w-8 h-8 text-white" />
        </motion.div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Teşekkürler!
        </h3>
        <p className="text-sm text-slate-400">
          Geri bildiriminiz sistemi geliştirmemize yardımcı olacak
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800/50 bg-gradient-to-r
        from-indigo-500/10 via-purple-500/10 to-pink-500/10"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Bu yanıt nasıldı?
              </h3>
              <p className="text-xs text-slate-400">
                Geri bildiriminiz ile öğreniyoruz
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800/50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Star Rating */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <motion.button
              key={star}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              onClick={() => setRating(star)}
              className="p-1"
            >
              <Star
                className={`w-8 h-8 transition-all ${
                  star <= (hoveredRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-slate-600'
                }`}
              />
            </motion.button>
          ))}
        </div>

        {rating > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-center text-sm text-slate-400"
          >
            {rating === 1 && 'Kötü 😞'}
            {rating === 2 && 'Yetersiz 😐'}
            {rating === 3 && 'Orta 🙂'}
            {rating === 4 && 'İyi 😊'}
            {rating === 5 && 'Mükemmel 🎉'}
          </motion.div>
        )}

        {/* Show details for low ratings */}
        <AnimatePresence>
          {rating > 0 && rating <= 3 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {/* Improvement suggestions */}
              <div>
                <p className="text-sm text-slate-400 mb-3">
                  Neleri geliştirebiliriz?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {improvements.map((improvement) => (
                    <button
                      key={improvement.id}
                      onClick={() => {
                        setSelectedImprovements((prev) =>
                          prev.includes(improvement.id)
                            ? prev.filter((id) => id !== improvement.id)
                            : [...prev, improvement.id]
                        );
                      }}
                      className={`p-2 rounded-lg border transition-all text-left
                        flex items-center gap-2 text-sm ${
                          selectedImprovements.includes(improvement.id)
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                            : 'border-slate-700 hover:border-slate-600 text-slate-400'
                        }`}
                    >
                      <span>{improvement.icon}</span>
                      <span className="text-xs">{improvement.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback text */}
              <div>
                <p className="text-sm text-slate-400 mb-2">
                  Ek yorumlarınız (opsiyonel)
                </p>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Nasıl daha iyi yapabiliriz?"
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700
                    text-white rounded-lg focus:outline-none focus:ring-2
                    focus:ring-indigo-500 focus:border-transparent transition-all
                    text-sm resize-none"
                  rows={3}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick positive feedback for high ratings */}
        <AnimatePresence>
          {rating >= 4 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Neyi beğendiniz? (opsiyonel)"
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700
                  text-white rounded-lg focus:outline-none focus:ring-2
                  focus:ring-indigo-500 focus:border-transparent transition-all
                  text-sm resize-none"
                rows={2}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit button */}
        <AnimatePresence>
          {rating > 0 && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500
                text-white rounded-lg hover:from-indigo-600 hover:to-purple-600
                transition-all duration-300 flex items-center justify-center gap-2
                disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <Sparkles className="w-5 h-5" />
                  </motion.div>
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Geri Bildirimi Gönder
                </>
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Inline feedback buttons for message bubbles
export function InlineFeedbackButtons({
  messageId,
  conversationId,
  message,
  response
}: {
  messageId: string;
  conversationId: string;
  message: string;
  response: string;
}) {
  const [showWidget, setShowWidget] = useState(false);
  const [quickRating, setQuickRating] = useState<'up' | 'down' | null>(null);

  const handleQuickFeedback = async (type: 'up' | 'down') => {
    setQuickRating(type);

    // Send quick feedback
    await fetch('/api/chat/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId,
        conversationId,
        rating: type === 'up' ? 5 : 2,
        context: {
          query: message,
          response: response
        }
      })
    });

    // Show detailed widget for negative feedback
    if (type === 'down') {
      setTimeout(() => setShowWidget(true), 300);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 mt-2">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleQuickFeedback('up')}
          disabled={quickRating !== null}
          className={`p-1.5 rounded-lg transition-all ${
            quickRating === 'up'
              ? 'bg-green-500/20 text-green-400'
              : 'hover:bg-slate-800/50 text-slate-500 hover:text-slate-300'
          } disabled:cursor-default`}
        >
          <ThumbsUp className="w-4 h-4" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleQuickFeedback('down')}
          disabled={quickRating !== null}
          className={`p-1.5 rounded-lg transition-all ${
            quickRating === 'down'
              ? 'bg-red-500/20 text-red-400'
              : 'hover:bg-slate-800/50 text-slate-500 hover:text-slate-300'
          } disabled:cursor-default`}
        >
          <ThumbsDown className="w-4 h-4" />
        </motion.button>

        <button
          onClick={() => setShowWidget(!showWidget)}
          className="p-1.5 hover:bg-slate-800/50 rounded-lg transition-colors
            text-slate-500 hover:text-slate-300"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence>
        {showWidget && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-3"
          >
            <FeedbackWidget
              messageId={messageId}
              conversationId={conversationId}
              message={message}
              response={response}
              onClose={() => setShowWidget(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Feedback metrics display
export function FeedbackMetrics() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/chat/feedback/metrics');
      const data = await response.json();
      setMetrics(data.metrics);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 rounded-xl space-y-3"
    >
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-4 h-4 text-green-400" />
        <h4 className="text-sm font-semibold text-white">Geri Bildirim Metrikleri</h4>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-slate-400">Ortalama Puan</p>
          <p className="text-lg font-bold text-white">
            {metrics.averageRating}/5
          </p>
        </div>
        <div>
          <p className="text-slate-400">Memnuniyet</p>
          <p className="text-lg font-bold text-green-400">
            {metrics.satisfactionRate}%
          </p>
        </div>
      </div>

      {metrics.improvementAreas.length > 0 && (
        <div className="pt-3 border-t border-slate-700/50">
          <p className="text-xs text-slate-400 mb-2">Gelişim Alanları</p>
          <div className="space-y-1">
            {metrics.improvementAreas.slice(0, 3).map((area: any) => (
              <div key={area.area} className="flex justify-between text-xs">
                <span className="text-slate-300">{area.area}</span>
                <span className="text-yellow-400">{area.count} öneri</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => window.location.href = '/chat/feedback'}
        className="w-full px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20
          text-indigo-400 rounded-lg transition-colors text-xs"
      >
        Tüm Geri Bildirimleri Gör
      </button>
    </motion.div>
  );
}