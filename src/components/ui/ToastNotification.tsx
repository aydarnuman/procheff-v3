'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X, Loader2, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastNotificationProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
  loading: Loader2,
};

const colors = {
  success: 'from-green-500 to-green-600',
  error: 'from-red-500 to-red-600',
  info: 'from-blue-500 to-blue-600',
  warning: 'from-yellow-500 to-yellow-600',
  loading: 'from-purple-500 to-purple-600',
};

export function ToastNotification({ toast, onClose }: ToastNotificationProps) {
  const Icon = icons[toast.type];
  const colorClass = colors[toast.type];

  useEffect(() => {
    if (toast.type !== 'loading' && toast.duration !== 0) {
      const timer = setTimeout(() => {
        onClose(toast.id);
      }, toast.duration || 3000);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.5 }}
      className="pointer-events-auto max-w-sm w-full bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-800 overflow-hidden"
    >
      <div className={`h-1 bg-gradient-to-r ${colorClass}`} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 bg-gradient-to-br ${colorClass} bg-opacity-20 rounded-xl`}>
            <Icon className={`w-5 h-5 text-white ${toast.type === 'loading' ? 'animate-spin' : ''}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold">{toast.title}</h3>
            {toast.message && (
              <p className="mt-1 text-sm text-slate-400">{toast.message}</p>
            )}
            {toast.action && (
              <button
                onClick={toast.action.onClick}
                className="mt-2 text-sm font-medium text-blue-400 hover:text-blue-300"
              >
                {toast.action.label}
              </button>
            )}
          </div>
          <button
            onClick={() => onClose(toast.id)}
            className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Toast Container
export function ToastContainer({ toasts, onClose }: { toasts: Toast[], onClose: (id: string) => void }) {
  return (
    <div className="fixed bottom-0 right-0 p-6 z-50 pointer-events-none">
      <AnimatePresence mode="sync">
        <div className="flex flex-col gap-3">
          {toasts.map(toast => (
            <ToastNotification key={toast.id} toast={toast} onClose={onClose} />
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
}

// Toast Hook
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (toast: Omit<Toast, 'id'>) => {
    // ✅ FIX: Generate unique ID using timestamp + random string
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    setToasts(prev => [...prev, { ...toast, id }]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const success = (title: string, message?: string) => 
    showToast({ type: 'success', title, message });

  const error = (title: string, message?: string) => 
    showToast({ type: 'error', title, message });

  const info = (title: string, message?: string) => 
    showToast({ type: 'info', title, message });

  const warning = (title: string, message?: string) => 
    showToast({ type: 'warning', title, message });

  const loading = (title: string, message?: string) => 
    showToast({ type: 'loading', title, message, duration: 0 });

  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    info,
    warning,
    loading,
  };
}
