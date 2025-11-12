"use client";

import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  gradientFrom?: string;
  gradientTo?: string;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  description?: string;
  loading?: boolean;
  children?: ReactNode;
  className?: string;
}

/**
 * Premium Metric Card Component
 * Modern design with gradients, glows, and smooth animations
 */
export function MetricCard({
  title,
  value,
  icon: Icon,
  iconColor = "text-indigo-400",
  iconBg = "bg-indigo-500/20",
  gradientFrom = "from-indigo-500/10",
  gradientTo = "to-purple-500/10",
  trend,
  description,
  loading = false,
  children,
  className = "",
}: MetricCardProps) {
  if (loading) {
    return (
      <Card variant="elevated" className={className}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-3 bg-slate-700/50 rounded-lg w-1/2"></div>
            <div className="h-8 bg-slate-700/50 rounded-lg"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="group"
    >
      <div
        className={`
          relative h-full rounded-2xl overflow-hidden
          bg-gradient-to-br ${gradientFrom} ${gradientTo}
          border border-slate-700/50
          backdrop-blur-xl
          shadow-xl shadow-black/20
          transition-all duration-500 ease-out
          group-hover:border-slate-600/60
          group-hover:shadow-2xl group-hover:shadow-indigo-500/10
          ${className}
        `}
      >
        {/* Animated gradient overlay */}
        <div
          className={`
            absolute inset-0 opacity-0 group-hover:opacity-100
            bg-gradient-to-br ${gradientFrom} ${gradientTo}
            transition-opacity duration-500
            pointer-events-none
          `}
        />

        {/* Glow effect */}
        <div
          className={`
            absolute -inset-0.5 opacity-0 group-hover:opacity-100
            bg-gradient-to-br ${gradientFrom} ${gradientTo}
            blur-xl transition-opacity duration-500
            pointer-events-none -z-10
          `}
        />

        <CardContent className="relative z-10 p-4">
          {/* Header with icon */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <motion.div
                className={`
                  relative p-2 rounded-lg
                  ${iconBg}
                  backdrop-blur-sm
                  border border-white/10
                  group-hover:border-white/20
                  transition-all duration-300
                `}
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Icon className={`w-5 h-5 ${iconColor} drop-shadow-lg`} />
                {/* Icon glow */}
                <div
                  className={`
                    absolute inset-0 rounded-xl
                    ${iconBg.replace('/20', '/30')}
                    blur-md opacity-0 group-hover:opacity-100
                    transition-opacity duration-300
                  `}
                />
              </motion.div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  {title}
                </span>
              </div>
            </div>
          </div>

          {/* Value */}
          <motion.div
            className="mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="text-3xl font-bold text-white mb-1 tracking-tight">
              {value}
            </div>
          </motion.div>

          {/* Trend indicator */}
          {trend && (
            <motion.div
              className={`
                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                ${trend.positive !== false 
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }
                backdrop-blur-sm
                text-xs font-semibold
              `}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <span>{trend.positive !== false ? "↑" : "↓"}</span>
              <span>{trend.value} {trend.label}</span>
            </motion.div>
          )}

          {/* Description */}
          {description && (
            <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
              {description}
            </p>
          )}

          {children}

          {/* Decorative corner accent */}
          <div
            className={`
              absolute top-0 right-0 w-32 h-32
              bg-gradient-to-br ${gradientFrom} ${gradientTo}
              opacity-0 group-hover:opacity-20
              blur-3xl transition-opacity duration-500
              pointer-events-none
            `}
          />
        </CardContent>
      </div>
    </motion.div>
  );
}
