/**
 * Planning Wizard Component
 * Interactive multi-step wizard for guided workflows
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlanningStore } from '@/store/planningStore';
import {
  X, ChevronLeft, ChevronRight, Check,
  Loader2, AlertCircle, Sparkles, Target
} from 'lucide-react';

export function PlanningWizard() {
  const {
    activePlan,
    currentStep,
    currentTemplate,
    isWizardOpen,
    submitCurrentStep,
    goToPreviousStep,
    cancelWizard,
    closeWizard
  } = usePlanningStore();

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Reset form data when step changes
  useEffect(() => {
    if (currentStep) {
      // Pre-fill with existing data if any
      const existingData: Record<string, any> = {};
      currentStep.questions.forEach((q: any) => {
        if (activePlan?.collectedData[q.id]) {
          existingData[q.id] = activePlan.collectedData[q.id];
        }
      });
      setFormData(existingData);
      setValidationErrors({});
    }
  }, [currentStep, activePlan]);

  if (!isWizardOpen || !activePlan || !currentStep) {
    return null;
  }

  const handleInputChange = (questionId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [questionId]: value
    }));

    // Clear validation error for this field
    if (validationErrors[questionId]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const result = submitCurrentStep(formData);

      if (result && !result.success && result.errors) {
        setValidationErrors(result.errors);
      }
    } catch (error) {
      console.error('Failed to submit step:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProgress = () => {
    if (!activePlan || !currentTemplate) return 0;
    return (activePlan.completedSteps.length / currentTemplate.stepCount) * 100;
  };

  return (
    <AnimatePresence>
      {isWizardOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed bottom-24 right-6 z-50 w-[480px] max-h-[600px]
            backdrop-blur-xl bg-slate-900/95 rounded-2xl shadow-2xl
            border border-slate-700/50 overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800/50 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                  <Target className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {currentTemplate?.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Adım {activePlan.completedSteps.length + 1} / {currentTemplate?.stepCount}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={closeWizard}
                  className="p-1.5 hover:bg-slate-800/50 rounded-lg transition-colors"
                  title="Küçült"
                >
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
                <button
                  onClick={cancelWizard}
                  className="p-1.5 hover:bg-slate-800/50 rounded-lg transition-colors"
                  title="İptal"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                animate={{ width: `${getProgress()}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[400px]">
            <h4 className="text-lg font-semibold text-white mb-2">
              {currentStep.title}
            </h4>
            <p className="text-sm text-slate-400 mb-6">
              {currentStep.description}
            </p>

            {/* Questions */}
            <div className="space-y-5">
              {currentStep.questions.map((question: any) => (
                <QuestionField
                  key={question.id}
                  question={question}
                  value={formData[question.id]}
                  onChange={(value) => handleInputChange(question.id, value)}
                  error={validationErrors[question.id]}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-800/50 bg-slate-900/50">
            <div className="flex items-center justify-between">
              <button
                onClick={goToPreviousStep}
                disabled={activePlan.completedSteps.length === 0}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Geri
              </button>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500
                  text-white rounded-lg hover:from-indigo-600 hover:to-purple-600
                  transition-all duration-300 flex items-center gap-2
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    İşleniyor...
                  </>
                ) : currentStep.nextStep === 'complete' ? (
                  <>
                    <Check className="w-4 h-4" />
                    Tamamla
                  </>
                ) : (
                  <>
                    İleri
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Question Field Component
function QuestionField({ question, value, onChange, error }: any) {
  switch (question.type) {
    case 'text':
      return (
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            {question.text}
            {question.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700
              text-white rounded-lg focus:outline-none focus:ring-2
              focus:ring-indigo-500 focus:border-transparent transition-all"
            placeholder={question.examples ? question.examples[0] : ''}
          />
          {error && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {error}
            </p>
          )}
        </div>
      );

    case 'number':
      return (
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            {question.text}
            {question.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          <input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700
              text-white rounded-lg focus:outline-none focus:ring-2
              focus:ring-indigo-500 focus:border-transparent transition-all"
            placeholder={question.examples ? question.examples[0] : ''}
            min={question.validation?.min}
            max={question.validation?.max}
          />
          {error && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {error}
            </p>
          )}
        </div>
      );

    case 'select':
      return (
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            {question.text}
            {question.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700
              text-white rounded-lg focus:outline-none focus:ring-2
              focus:ring-indigo-500 focus:border-transparent transition-all"
          >
            <option value="">Seçiniz...</option>
            {question.options.map((option: any) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {error && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {error}
            </p>
          )}
        </div>
      );

    case 'multiselect':
      return (
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            {question.text}
            {question.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          <div className="space-y-2">
            {question.options.map((option: any) => (
              <label
                key={option.value}
                className="flex items-center gap-3 p-2 hover:bg-slate-800/50
                  rounded-lg cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={(value || []).includes(option.value)}
                  onChange={(e) => {
                    const currentValues = value || [];
                    if (e.target.checked) {
                      onChange([...currentValues, option.value]);
                    } else {
                      onChange(currentValues.filter((v: string) => v !== option.value));
                    }
                  }}
                  className="w-4 h-4 text-indigo-500 bg-slate-800 border-slate-600
                    rounded focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-sm text-white">{option.label}</span>
              </label>
            ))}
          </div>
          {error && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {error}
            </p>
          )}
        </div>
      );

    default:
      return null;
  }
}

// Wizard Trigger Button
export function WizardTrigger() {
  const { startWizard, activePlan, reopenWizard } = usePlanningStore();
  const [showMenu, setShowMenu] = useState(false);

  const templates = [
    { id: 'ihale_degerlendirme', name: 'İhale Değerlendirme', icon: '📊' },
    { id: 'maliyet_optimizasyon', name: 'Maliyet Optimizasyon', icon: '💰' },
    { id: 'menu_planlama', name: 'Menü Planlama', icon: '🍽️' }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {activePlan ? (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={reopenWizard}
          className="p-4 bg-gradient-to-r from-purple-500 to-pink-500
            rounded-full shadow-lg shadow-purple-500/25 text-white
            hover:shadow-xl hover:shadow-purple-500/30 transition-all"
        >
          <Target className="w-6 h-6" />
        </motion.button>
      ) : (
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowMenu(!showMenu)}
            className="p-4 bg-gradient-to-r from-indigo-500 to-purple-500
              rounded-full shadow-lg shadow-indigo-500/25 text-white
              hover:shadow-xl hover:shadow-indigo-500/30 transition-all"
          >
            <Sparkles className="w-6 h-6" />
          </motion.button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                className="absolute bottom-full right-0 mb-3 w-64
                  glass-card rounded-xl p-3 space-y-2"
              >
                <p className="text-xs text-slate-400 mb-2">Rehberli Sihirbazlar</p>
                {templates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => {
                      startWizard(template.id);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 p-3
                      hover:bg-slate-800/50 rounded-lg transition-colors
                      text-left"
                  >
                    <span className="text-2xl">{template.icon}</span>
                    <span className="text-sm text-white">{template.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}