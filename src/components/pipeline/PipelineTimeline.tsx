"use client";

import { motion } from "framer-motion";
import {
  UploadCloud,
  Brain,
  Calculator,
  Target,
  FileText,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Loader2,
  Clock,
} from "lucide-react";
import { PIPELINE_CONFIG } from "@/lib/jobs/pipeline-config";

export interface TimelineStep {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  duration?: number;
  error?: string;
  timestamp?: string;
}

interface PipelineTimelineProps {
  steps: TimelineStep[];
  currentStep: string | null;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  UploadCloud,
  Brain,
  Calculator,
  Target,
  FileText,
  FileSpreadsheet,
};

export function PipelineTimeline({
  steps,
  currentStep,
}: PipelineTimelineProps) {
  return (
    <div className="space-y-2">
      {PIPELINE_CONFIG.steps.map((configStep, index) => {
        const step = steps.find((s) => s.id === configStep.id) || {
          id: configStep.id,
          name: configStep.name,
          status: "pending" as const,
        };

        const Icon = iconMap[configStep.icon] || Brain;
        const isActive = currentStep === step.id;
        const isCompleted = step.status === "completed";
        const isFailed = step.status === "failed";
        const isSkipped = step.status === "skipped";
        const isRunning = step.status === "running" || isActive;

        return (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative flex items-start gap-4"
          >
            {/* Connector Line */}
            {index < PIPELINE_CONFIG.steps.length - 1 && (
              <div
                className={`absolute left-5 top-12 h-full w-0.5 ${
                  isCompleted
                    ? "bg-emerald-500/50"
                    : isFailed
                      ? "bg-red-500/50"
                      : "bg-slate-700"
                }`}
              />
            )}

            {/* Icon */}
            <div
              className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                isCompleted
                  ? "border-emerald-500 bg-emerald-500/20"
                  : isFailed
                    ? "border-red-500 bg-red-500/20"
                    : isRunning
                      ? "border-indigo-500 bg-indigo-500/20 animate-pulse"
                      : isSkipped
                        ? "border-yellow-500/50 bg-yellow-500/10"
                        : "border-slate-700 bg-slate-900"
              }`}
            >
              {isCompleted && (
                <Check className="h-5 w-5 text-emerald-400" />
              )}
              {isFailed && (
                <AlertCircle className="h-5 w-5 text-red-400" />
              )}
              {isRunning && (
                <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
              )}
              {!isCompleted && !isFailed && !isRunning && (
                <Icon
                  className={`h-5 w-5 ${
                    isSkipped ? "text-yellow-400/50" : "text-gray-500"
                  }`}
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-6">
              <div className="flex items-center justify-between">
                <h3
                  className={`text-sm font-medium ${
                    isCompleted
                      ? "text-emerald-300"
                      : isFailed
                        ? "text-red-300"
                        : isRunning
                          ? "text-indigo-300"
                          : isSkipped
                            ? "text-yellow-300/70"
                            : "text-gray-400"
                  }`}
                >
                  {step.name}
                </h3>

                {step.duration && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    {(step.duration / 1000).toFixed(1)}s
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div className="mt-1">
                {isCompleted && (
                  <span className="text-xs text-emerald-400">✓ Completed</span>
                )}
                {isFailed && (
                  <span className="text-xs text-red-400">✗ Failed</span>
                )}
                {isRunning && (
                  <span className="text-xs text-indigo-400">
                    ● Processing...
                  </span>
                )}
                {isSkipped && (
                  <span className="text-xs text-yellow-400/70">
                    ⊘ Skipped
                  </span>
                )}
                {step.status === "pending" && (
                  <span className="text-xs text-gray-500">○ Pending</span>
                )}
              </div>

              {/* Error Message */}
              {step.error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2"
                >
                  <p className="text-xs text-red-300">{step.error}</p>
                </motion.div>
              )}

              {/* Timestamp */}
              {step.timestamp && (
                <p className="mt-1 text-xs text-gray-600">
                  {new Date(step.timestamp).toLocaleTimeString()}
                </p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
