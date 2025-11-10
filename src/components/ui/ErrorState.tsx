"use client";

import { XCircle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface ErrorStateProps {
  title?: string;
  error: string;
  onRetry?: () => void;
  details?: string;
}

export function ErrorState({
  title = "Hata Oluştu",
  error,
  onRetry,
  details,
}: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center justify-center min-h-[400px] p-8"
    >
      <div className="glass-card p-8 rounded-2xl text-center border-red-500/30 max-w-md">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-red-500/20">
            <XCircle className="w-12 h-12 text-red-400" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-red-400 mb-2">{title}</h3>
        <p className="text-slate-300 mb-4">{error}</p>
        {details && (
          <p className="text-sm text-slate-400 mb-4">{details}</p>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg border border-indigo-500/30 hover:border-indigo-500/50 transition-all group"
          >
            <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
            <span className="font-medium">Tekrar Dene</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}