'use client';

import { cn } from '@/lib/utils';
import { PIPELINE_STEPS, usePipelineStore } from '@/store/usePipelineStore';
import { AnimatePresence, motion } from 'framer-motion';
import { Brain, Calculator, ChevronRight, FileCheck, FileText, LucideIcon, RotateCcw } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const stepIcons: Record<number, LucideIcon> = {
  [PIPELINE_STEPS.TENDER_SELECT]: FileText,
  [PIPELINE_STEPS.MENU_UPLOAD]: FileText,
  [PIPELINE_STEPS.COST_ANALYSIS]: Calculator,
  [PIPELINE_STEPS.DECISION]: Brain,
  [PIPELINE_STEPS.PROPOSAL]: FileCheck,
};

const stepLabels: Record<number, string> = {
  [PIPELINE_STEPS.TENDER_SELECT]: 'İhale Seçimi',
  [PIPELINE_STEPS.MENU_UPLOAD]: 'Menü Yükleme',
  [PIPELINE_STEPS.COST_ANALYSIS]: 'Maliyet Analizi',
  [PIPELINE_STEPS.DECISION]: 'Karar Verme',
  [PIPELINE_STEPS.PROPOSAL]: 'Rapor',
};

const stepPaths: Record<number, string> = {
  [PIPELINE_STEPS.TENDER_SELECT]: '/ihale',
  [PIPELINE_STEPS.MENU_UPLOAD]: '/menu-parser',
  [PIPELINE_STEPS.COST_ANALYSIS]: '/cost-analysis',
  [PIPELINE_STEPS.DECISION]: '/decision',
  [PIPELINE_STEPS.PROPOSAL]: '/reports',
};

export function QuickPipelineAction() {
  const router = useRouter();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    currentStep,
    completedSteps,
    selectedTender,
    getProgress,
    resetPipeline,
    canProceedToStep
  } = usePipelineStore();

  // Don't show on non-pipeline pages
  if (!pathname.includes('/ihale') &&
      !pathname.includes('/menu-parser') &&
      !pathname.includes('/cost-analysis') &&
      !pathname.includes('/decision') &&
      !pathname.includes('/reports')) {
    return null;
  }

  // Don't show if no tender selected
  if (!selectedTender) {
    return null;
  }

  const progress = getProgress();
  const CurrentIcon = stepIcons[currentStep as number] || FileText; // Fallback to FileText if icon not found

  const handleStepClick = (step: string) => {
    const stepNumber = Number(step);
    if (canProceedToStep(stepNumber)) {
      router.push(stepPaths[stepNumber]);
      setIsExpanded(false);
    }
  };

  const handleReset = () => {
    if (confirm('Bu işlem tüm pipeline verilerini silecek. Emin misiniz?')) {
      resetPipeline();
      router.push('/ihale');
      setIsExpanded(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-20 right-0 w-64 glass-card p-4 mb-4"
          >
            <div className="space-y-3">
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>İlerleme</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden relative">
                  <div
                    className="absolute inset-y-0 left-0 bg-linear-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                    // Dynamic progress bar width requires inline style
                    style={{ width: `${progress}%` } as React.CSSProperties}
                  />
                </div>
              </div>

              {/* Pipeline Steps */}
              <div className="space-y-2">
                {Object.keys(stepLabels).map((step) => {
                  const stepNumber = Number(step);
                  const Icon = stepIcons[stepNumber];
                  const isCompleted = completedSteps.includes(stepNumber);
                  const isCurrent = currentStep === stepNumber;
                  const canProceed = canProceedToStep(stepNumber);

                  return (
                    <button
                      type="button"
                      key={step}
                      onClick={() => handleStepClick(step)}
                      disabled={!canProceed}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm",
                        isCurrent && "bg-indigo-600/30 border border-indigo-500/50",
                        isCompleted && !isCurrent && "bg-green-600/20 border border-green-500/30",
                        !canProceed && "opacity-50 cursor-not-allowed",
                        canProceed && !isCurrent && "hover:bg-slate-700/50"
                      )}
                    >
                      <Icon className={cn(
                        "w-4 h-4",
                        isCurrent && "text-indigo-400",
                        isCompleted && !isCurrent && "text-green-400",
                        !isCompleted && !isCurrent && "text-slate-400"
                      )} />
                      <span className={cn(
                        "flex-1 text-left",
                        isCurrent && "text-indigo-400 font-medium",
                        isCompleted && !isCurrent && "text-green-400",
                        !isCompleted && !isCurrent && "text-slate-400"
                      )}>
                        {stepLabels[stepNumber]}
                      </span>
                      {isCompleted && (
                        <span className="text-green-400 text-xs">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Reset Button */}
              <button
                type="button"
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 text-sm transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Pipeline&apos;ı Sıfırla
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "relative w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all",
          "bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500",
          isExpanded && "rotate-45"
        )}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Progress Ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="4"
            fill="none"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="rgba(255, 255, 255, 0.8)"
            strokeWidth="4"
            fill="none"
            strokeDasharray={`${(progress / 100) * 176} 176`}
            className="transition-all duration-500"
          />
        </svg>

        {/* Icon */}
        <div className="relative z-10">
          {isExpanded ? (
            <ChevronRight className="w-6 h-6 text-white rotate-90" />
          ) : CurrentIcon ? (
            <CurrentIcon className="w-6 h-6 text-white" />
          ) : (
            <FileText className="w-6 h-6 text-white" />
          )}
        </div>

        {/* Pulse Animation */}
        {!isExpanded && progress < 100 && (
          <motion.div
            className="absolute inset-0 rounded-full bg-linear-to-r from-indigo-600 to-purple-600"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          />
        )}
      </motion.button>
    </div>
  );
}