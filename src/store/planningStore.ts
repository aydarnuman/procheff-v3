/**
 * Planning Store - State management for multi-turn planning
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { planningEngine, type PlanningState } from '@/lib/chat/planning-engine';

interface PlanningStoreState {
  // Current planning session
  activePlan: PlanningState | null;
  currentStep: any | null;
  currentTemplate: any | null;
  isWizardOpen: boolean;

  // History
  completedPlans: any[];

  // Actions
  startWizard: (templateId: string) => void;
  submitCurrentStep: (data: Record<string, any>) => void;
  goToPreviousStep: () => void;
  cancelWizard: () => void;
  closeWizard: () => void;
  reopenWizard: () => void;
  clearHistory: () => void;
}

export const usePlanningStore = create<PlanningStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      activePlan: null,
      currentStep: null,
      currentTemplate: null,
      isWizardOpen: false,
      completedPlans: [],

      // Start a new wizard
      startWizard: (templateId: string) => {
        try {
          const planState = planningEngine.startPlanning(templateId);
          const currentStep = planningEngine.getCurrentStep(planState.planId);
          const templates = planningEngine.getAvailableTemplates();
          const currentTemplate = templates.find(t => t.id === templateId);

          set({
            activePlan: planState,
            currentStep,
            currentTemplate,
            isWizardOpen: true
          });
        } catch (error) {
          console.error('Failed to start wizard:', error);
        }
      },

      // Submit current step data
      submitCurrentStep: (data: Record<string, any>) => {
        const state = get();
        if (!state.activePlan) return;

        const result = planningEngine.submitStep(state.activePlan.planId, data);

        if (result.success) {
          if (result.isComplete) {
            // Planning completed
            const completedData = planningEngine.getCompletedPlanData(state.activePlan.planId);

            set(state => ({
              completedPlans: [...state.completedPlans, completedData],
              activePlan: null,
              currentStep: null,
              isWizardOpen: false
            }));

            // Return completed data for processing
            return completedData;
          } else {
            // Move to next step
            const updatedPlan = planningEngine.getState(state.activePlan.planId);

            set({
              activePlan: updatedPlan,
              currentStep: result.nextStep
            });
          }
        } else {
          // Validation errors
          console.error('Validation errors:', result.errors);

          // Update state with validation errors
          if (state.activePlan) {
            state.activePlan.validationErrors = result.errors || {};
            set({ activePlan: { ...state.activePlan } });
          }
        }

        return result;
      },

      // Go to previous step
      goToPreviousStep: () => {
        const state = get();
        if (!state.activePlan) return;

        const previousStep = planningEngine.goBack(state.activePlan.planId);
        if (previousStep) {
          const updatedPlan = planningEngine.getState(state.activePlan.planId);

          set({
            activePlan: updatedPlan,
            currentStep: previousStep
          });
        }
      },

      // Cancel wizard
      cancelWizard: () => {
        const state = get();
        if (state.activePlan) {
          planningEngine.cancelPlanning(state.activePlan.planId);
        }

        set({
          activePlan: null,
          currentStep: null,
          currentTemplate: null,
          isWizardOpen: false
        });
      },

      // Close wizard (minimize)
      closeWizard: () => {
        set({ isWizardOpen: false });
      },

      // Reopen wizard
      reopenWizard: () => {
        const state = get();
        if (state.activePlan) {
          set({ isWizardOpen: true });
        }
      },

      // Clear history
      clearHistory: () => {
        set({ completedPlans: [] });
      }
    }),
    {
      name: 'planning-store',
      partialize: (state) => ({
        // Only persist completed plans
        completedPlans: state.completedPlans
      })
    }
  )
);

// Helper functions
export function getProgressPercentage(): number {
  const state = usePlanningStore.getState();
  if (!state.activePlan) return 0;

  return planningEngine.getProgress(state.activePlan.planId);
}

export function getAvailableTemplates() {
  return planningEngine.getAvailableTemplates();
}