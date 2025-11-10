"use client";

import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface LoadingStateProps {
  message?: string;
  description?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingState({
  message = "Yükleniyor...",
  description,
  size = "md",
}: LoadingStateProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const textClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-xl",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center justify-center min-h-[400px] p-8"
    >
      <div className="glass-card p-8 rounded-2xl text-center max-w-sm">
        <Loader2
          className={`${sizeClasses[size]} text-indigo-400 animate-spin mx-auto mb-4`}
        />
        <p className={`${textClasses[size]} text-slate-300 font-medium`}>
          {message}
        </p>
        {description && (
          <p className="text-sm text-slate-400 mt-2">{description}</p>
        )}
      </div>
    </motion.div>
  );
}