"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  icon?: LucideIcon;
  iconColor?: string;
  value?: string | number | ReactNode;
  description?: string;
  loading?: boolean;
  variant?: "default" | "success" | "warning" | "error" | "info";
  children?: ReactNode;
  className?: string;
  action?: ReactNode;
}

const variantStyles = {
  default: {
    icon: "text-indigo-400",
    iconBg: "bg-indigo-500/20",
    border: "border-indigo-500/30",
  },
  success: {
    icon: "text-green-400",
    iconBg: "bg-green-500/20",
    border: "border-green-500/30",
  },
  warning: {
    icon: "text-yellow-400",
    iconBg: "bg-yellow-500/20",
    border: "border-yellow-500/30",
  },
  error: {
    icon: "text-red-400",
    iconBg: "bg-red-500/20",
    border: "border-red-500/30",
  },
  info: {
    icon: "text-blue-400",
    iconBg: "bg-blue-500/20",
    border: "border-blue-500/30",
  },
};

/**
 * Standardized Stat Card Component
 * For displaying statistics with consistent styling
 */
export function StatCard({
  title,
  icon: Icon,
  iconColor,
  value,
  description,
  loading = false,
  variant = "default",
  children,
  className = "",
  action,
}: StatCardProps) {
  const styles = variantStyles[variant];
  const finalIconColor = iconColor || styles.icon;
  const finalIconBg = styles.iconBg;

  if (loading) {
    return (
      <Card variant="elevated" className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            <div className="h-8 bg-slate-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        variant="elevated" 
        className={`h-full ${className} ${styles.border} border`}
      >
        {title && (
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {Icon && (
                  <div className={`p-2 rounded-lg ${finalIconBg}`}>
                    <Icon className={`w-5 h-5 ${finalIconColor}`} />
                  </div>
                )}
                <CardTitle className="text-base">{title}</CardTitle>
              </div>
              {action}
            </div>
            {description && (
              <p className="text-sm text-gray-400 mt-1">{description}</p>
            )}
          </CardHeader>
        )}
        <CardContent className={title ? "pt-0" : "p-6"}>
          {value !== undefined && (
            <div className="text-2xl font-bold text-white mb-2">
              {value}
            </div>
          )}
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}

