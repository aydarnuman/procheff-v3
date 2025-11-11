/**
 * Pipeline State Management Store
 * İhale analiz pipeline'ı boyunca veri akışını yönetir
 * Veri kaybını önler ve sayfalararası veri aktarımını sağlar
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Type Definitions
export interface Tender {
  id: string;
  tenderNumber?: string;
  title: string;
  organization: string;
  city: string;
  tenderType?: string;
  partialBidAllowed?: boolean;
  publishDate?: string;
  tenderDate?: string;
  daysRemaining?: number | null;
  url?: string;
  budget?: string;
  duration?: string;
}

export interface MenuItem {
  yemek: string;
  gramaj: number;
  ogun?: string;
  kisi?: number;
  kategori?: string;
}

export interface CostAnalysis {
  gunluk_kisi_maliyeti?: string;
  tahmini_toplam_gider?: string;
  onerilen_karlilik_orani?: string;
  riskli_kalemler?: string[];
  maliyet_dagilimi?: {
    hammadde?: string;
    iscilik?: string;
    genel_giderler?: string;
    kar?: string;
  };
  optimizasyon_onerileri?: string[];
  raw_output?: string;
  parse_error?: boolean;
}

export interface Decision {
  karar: "Katıl" | "Katılma" | "Dikkatli Katıl";
  gerekce: string;
  risk_orani: string;
  tahmini_kar_orani: string;
  stratejik_oneriler?: string[];
  kritik_noktalar?: string[];
}

export interface PipelineState {
  // Current Pipeline Data
  selectedTender: Tender | null;
  menuData: MenuItem[] | null;
  costAnalysis: CostAnalysis | null;
  decision: Decision | null;

  // Pipeline Metadata
  pipelineId: string | null;
  currentStep: number;
  completedSteps: number[];
  lastUpdated: string | null;

  // Actions
  setSelectedTender: (tender: Tender) => void;
  updateSelectedTender: (tender: Partial<Tender>) => void;
  setMenuData: (data: MenuItem[]) => void;
  setCostAnalysis: (data: CostAnalysis) => void;
  setDecision: (data: Decision) => void;

  // Pipeline Management
  startNewPipeline: (tender: Tender) => void;
  resetPipeline: () => void;
  markStepCompleted: (step: number) => void;
  setCurrentStep: (step: number) => void;

  // Utility
  isPipelineComplete: () => boolean;
  getProgress: () => number;
  canProceedToStep: (step: number) => boolean;
}

// Pipeline Steps
export const PIPELINE_STEPS = {
  TENDER_SELECT: 1,
  TENDER_DETAIL: 2,
  MENU_UPLOAD: 3,
  COST_ANALYSIS: 4,
  DECISION: 5,
  PROPOSAL: 6,
} as const;

// Store Implementation
export const usePipelineStore = create<PipelineState>()(
  persist(
    (set, get) => ({
      // Initial State
      selectedTender: null,
      menuData: null,
      costAnalysis: null,
      decision: null,
      pipelineId: null,
      currentStep: PIPELINE_STEPS.TENDER_SELECT,
      completedSteps: [],
      lastUpdated: null,

      // Actions
      setSelectedTender: (tender) =>
        set((state) => ({
          selectedTender: tender,
          lastUpdated: new Date().toISOString(),
          completedSteps: state.completedSteps.includes(PIPELINE_STEPS.TENDER_SELECT)
            ? state.completedSteps
            : [...state.completedSteps, PIPELINE_STEPS.TENDER_SELECT],
        })),

      updateSelectedTender: (tenderUpdate) =>
        set((state) => ({
          selectedTender: state.selectedTender
            ? { ...state.selectedTender, ...tenderUpdate }
            : null,
          lastUpdated: new Date().toISOString(),
        })),

      setMenuData: (data) =>
        set((state) => ({
          menuData: data,
          lastUpdated: new Date().toISOString(),
          completedSteps: state.completedSteps.includes(PIPELINE_STEPS.MENU_UPLOAD)
            ? state.completedSteps
            : [...state.completedSteps, PIPELINE_STEPS.MENU_UPLOAD],
        })),

      setCostAnalysis: (data) =>
        set((state) => ({
          costAnalysis: data,
          lastUpdated: new Date().toISOString(),
          completedSteps: state.completedSteps.includes(PIPELINE_STEPS.COST_ANALYSIS)
            ? state.completedSteps
            : [...state.completedSteps, PIPELINE_STEPS.COST_ANALYSIS],
        })),

      setDecision: (data) =>
        set((state) => ({
          decision: data,
          lastUpdated: new Date().toISOString(),
          completedSteps: state.completedSteps.includes(PIPELINE_STEPS.DECISION)
            ? state.completedSteps
            : [...state.completedSteps, PIPELINE_STEPS.DECISION],
        })),

      // Pipeline Management
      startNewPipeline: (tender) =>
        set({
          selectedTender: tender,
          menuData: null,
          costAnalysis: null,
          decision: null,
          pipelineId: `pipeline-${Date.now()}`,
          currentStep: PIPELINE_STEPS.TENDER_DETAIL,
          completedSteps: [PIPELINE_STEPS.TENDER_SELECT],
          lastUpdated: new Date().toISOString(),
        }),

      resetPipeline: () =>
        set({
          selectedTender: null,
          menuData: null,
          costAnalysis: null,
          decision: null,
          pipelineId: null,
          currentStep: PIPELINE_STEPS.TENDER_SELECT,
          completedSteps: [],
          lastUpdated: null,
        }),

      markStepCompleted: (step) =>
        set((state) => ({
          completedSteps: state.completedSteps.includes(step)
            ? state.completedSteps
            : [...state.completedSteps, step],
          lastUpdated: new Date().toISOString(),
        })),

      setCurrentStep: (step) =>
        set({
          currentStep: step,
          lastUpdated: new Date().toISOString(),
        }),

      // Utility Functions
      isPipelineComplete: () => {
        const state = get();
        return (
          state.selectedTender !== null &&
          state.menuData !== null &&
          state.costAnalysis !== null &&
          state.decision !== null
        );
      },

      getProgress: () => {
        const state = get();
        const totalSteps = Object.keys(PIPELINE_STEPS).length;
        return Math.round((state.completedSteps.length / totalSteps) * 100);
      },

      canProceedToStep: (step) => {
        const state = get();
        const requiredSteps: { [key: number]: number[] } = {
          [PIPELINE_STEPS.TENDER_DETAIL]: [PIPELINE_STEPS.TENDER_SELECT],
          [PIPELINE_STEPS.MENU_UPLOAD]: [PIPELINE_STEPS.TENDER_SELECT],
          [PIPELINE_STEPS.COST_ANALYSIS]: [PIPELINE_STEPS.TENDER_SELECT, PIPELINE_STEPS.MENU_UPLOAD],
          [PIPELINE_STEPS.DECISION]: [
            PIPELINE_STEPS.TENDER_SELECT,
            PIPELINE_STEPS.MENU_UPLOAD,
            PIPELINE_STEPS.COST_ANALYSIS,
          ],
          [PIPELINE_STEPS.PROPOSAL]: [
            PIPELINE_STEPS.TENDER_SELECT,
            PIPELINE_STEPS.MENU_UPLOAD,
            PIPELINE_STEPS.COST_ANALYSIS,
            PIPELINE_STEPS.DECISION,
          ],
        };

        const required = requiredSteps[step] || [];
        return required.every((s) => state.completedSteps.includes(s));
      },
    }),
    {
      name: "pipeline-storage", // localStorage key
      partialize: (state) => ({
        // Persist only essential data
        selectedTender: state.selectedTender,
        menuData: state.menuData,
        costAnalysis: state.costAnalysis,
        decision: state.decision,
        pipelineId: state.pipelineId,
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
);