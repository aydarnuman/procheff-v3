"use client";

import { Check, FileText, Calculator, Brain, Target, FileOutput } from "lucide-react";
import { motion } from "framer-motion";
import { usePipelineStore, PIPELINE_STEPS } from "@/store/usePipelineStore";

const steps = [
  { id: PIPELINE_STEPS.TENDER_SELECT, label: "İhale Seçimi", icon: FileText },
  { id: PIPELINE_STEPS.TENDER_DETAIL, label: "İhale Detay", icon: FileText },
  { id: PIPELINE_STEPS.MENU_UPLOAD, label: "Menü Yükle", icon: FileOutput },
  { id: PIPELINE_STEPS.COST_ANALYSIS, label: "Maliyet Analizi", icon: Calculator },
  { id: PIPELINE_STEPS.DECISION, label: "Karar", icon: Brain },
  { id: PIPELINE_STEPS.PROPOSAL, label: "Teklif", icon: Target },
];

export function PipelineProgress() {
  const { currentStep, completedSteps } = usePipelineStore();

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between relative">
        {/* Progress Line Background */}
        <div className="absolute left-0 right-0 top-5 h-0.5 bg-slate-700" />

        {/* Active Progress Line */}
        <motion.div
          className="absolute left-0 top-5 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500"
          initial={{ width: 0 }}
          animate={{
            width: `${((completedSteps.length - 1) / (steps.length - 1)) * 100}%`,
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />

        {/* Steps */}
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className="relative z-10 flex flex-col items-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1, type: "spring" }}
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  transition-all duration-300 border-2
                  ${
                    isCompleted
                      ? "bg-gradient-to-br from-indigo-500 to-purple-500 border-indigo-400"
                      : isCurrent
                      ? "bg-slate-800 border-indigo-400 animate-pulse"
                      : "bg-slate-800 border-slate-600"
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 text-white" />
                ) : (
                  <Icon
                    className={`w-5 h-5 ${
                      isCurrent ? "text-indigo-400" : "text-slate-400"
                    }`}
                  />
                )}
              </motion.div>

              <motion.span
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.2 }}
                className={`
                  absolute -bottom-6 text-xs whitespace-nowrap
                  ${
                    isCompleted
                      ? "text-indigo-400 font-semibold"
                      : isCurrent
                      ? "text-white font-semibold"
                      : "text-slate-400"
                  }
                `}
              >
                {step.label}
              </motion.span>
            </div>
          );
        })}
      </div>
    </div>
  );
}