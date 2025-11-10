"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  type: ToastType;
  title: string;
  description?: string;
  onClose: () => void;
}

const toastConfig = {
  success: {
    icon: CheckCircle2,
    gradient: "from-green-500/20 to-emerald-500/20",
    border: "border-green-500/50",
    iconColor: "text-green-400",
    shadow: "shadow-green-500/20",
    glow: "drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]",
  },
  error: {
    icon: XCircle,
    gradient: "from-red-500/20 to-rose-500/20",
    border: "border-red-500/50",
    iconColor: "text-red-400",
    shadow: "shadow-red-500/20",
    glow: "drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]",
  },
  warning: {
    icon: AlertTriangle,
    gradient: "from-yellow-500/20 to-amber-500/20",
    border: "border-yellow-500/50",
    iconColor: "text-yellow-400",
    shadow: "shadow-yellow-500/20",
    glow: "drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]",
  },
  info: {
    icon: Info,
    gradient: "from-blue-500/20 to-cyan-500/20",
    border: "border-blue-500/50",
    iconColor: "text-blue-400",
    shadow: "shadow-blue-500/20",
    glow: "drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]",
  },
};

export function Toast({ type, title, description, onClose }: ToastProps) {
  const config = toastConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`
        relative overflow-hidden rounded-xl p-4 pr-12
        bg-gradient-to-br ${config.gradient}
        backdrop-blur-xl border ${config.border}
        shadow-2xl ${config.shadow}
        min-w-[320px] max-w-md
      `}
    >
      {/* Animated gradient background */}
      <div
        className={`
          absolute inset-0 bg-gradient-to-r ${config.gradient} 
          opacity-0 group-hover:opacity-100 animate-pulse
          transition-opacity duration-500
        `}
      />

      {/* Content */}
      <div className="relative flex items-start gap-3">
        <div className={`${config.glow}`}>
          <Icon className={`w-5 h-5 ${config.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white text-sm mb-0.5">{title}</h4>
          {description && (
            <p className="text-xs text-gray-300 leading-relaxed">{description}</p>
          )}
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 transition-colors group"
        aria-label="Kapat"
      >
        <X className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
      </button>

      {/* Progress bar */}
      <motion.div
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: 5, ease: "linear" }}
        className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r ${config.gradient}`}
      />
    </motion.div>
  );
}
