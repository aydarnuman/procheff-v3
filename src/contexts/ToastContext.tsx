"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import { Toast, ToastType } from "@/components/ui/Toast";

interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  progress?: number; // 0-100
  persistent?: boolean; // Don't auto-dismiss
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, description?: string) => string;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  loading: (title: string, description?: string) => string;
  updateToast: (id: string, updates: Partial<ToastMessage>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (type: ToastType, title: string, description?: string, persistent = false) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { id, type, title, description, persistent };

      setToasts((prev) => [...prev, newToast]);

      // Auto-dismiss after 5 seconds (unless persistent)
      if (!persistent) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 5000);
      }

      return id; // Return ID for updating
    },
    []
  );

  const success = useCallback(
    (title: string, description?: string) => showToast("success", title, description, false),
    [showToast]
  );

  const error = useCallback(
    (title: string, description?: string) => showToast("error", title, description, false),
    [showToast]
  );

  const warning = useCallback(
    (title: string, description?: string) => showToast("warning", title, description, false),
    [showToast]
  );

  const info = useCallback(
    (title: string, description?: string) => showToast("info", title, description, false),
    [showToast]
  );

  const loading = useCallback(
    (title: string, description?: string) => showToast("info", title, description, true),
    [showToast]
  );

  const updateToast = useCallback((id: string, updates: Partial<ToastMessage>) => {
    setToasts((prev) =>
      prev.map((toast) =>
        toast.id === id ? { ...toast, ...updates } : toast
      )
    );
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, loading, updateToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-md">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              type={toast.type}
              title={toast.title}
              description={toast.description}
              progress={toast.progress}
              persistent={toast.persistent}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
