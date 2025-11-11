/**
 * Analysis Store
 * State management for tender analysis workflow
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DataPool } from '@/lib/document-processor/types';

export type AnalysisStage =
  | 'idle'
  | 'uploading'
  | 'extracting'
  | 'contextual'
  | 'market'
  | 'deep'
  | 'completed'
  | 'failed';

export interface FileWithMetadata {
  file: File;
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
}

export interface ContextualAnalysis {
  operasyonel_riskler: {
    seviye: 'dusuk' | 'orta' | 'yuksek';
    nedenler: string[];
    aciklama: string;
    kaynak: string[];
  };
  maliyet_sapma_olasiligi: {
    oran: number;
    neden: string;
    kaynak: string[];
  };
  zaman_uygunlugu: {
    yeterli: boolean;
    gerekce: string;
    kaynak: string[];
  };
  genel_oneri: string;
}

export interface MarketAnalysis {
  cost_items: Array<{
    product_key: string;
    name: string;
    unit: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    confidence: number;
    source_mix: string[];
  }>;
  total_cost: number;
  forecast: {
    next_month_total: number;
    confidence: number;
    trend: 'up' | 'down' | 'stable';
  };
}

export interface DeepAnalysis {
  firsat_analizi: {
    puan: number;
    firsatlar: string[];
    kaynak: string[];
  };
  risk_analizi: {
    seviye: 'dusuk' | 'orta' | 'yuksek';
    riskler: Array<{
      risk: string;
      olasilik: number;
      etki: number;
      onlem: string;
      kaynak: string;
    }>;
  };
  maliyet_stratejisi: {
    tavsiye: string;
    gizli_maliyetler: string[];
    optimizasyon: string[];
    kaynak: string[];
  };
  operasyonel_plan: {
    personel: string;
    ekipman: string;
    lojistik: string;
    kaynak: string[];
  };
  teklif_stratejisi: {
    fiyat_politikasi: string;
    farklilastirma: string[];
    kaynak: string[];
  };
  karar_onerisi: {
    karar: 'KATIL' | 'DIKKATLI_KATIL' | 'KATILMA';
    puan: number;
    gerekce: string;
    kritik_noktalar: string[];
    kaynak: string[];
  };
}

export interface AnalysisResult {
  id: string;
  created_at: string;
  status: AnalysisStage;

  // Input files
  files: FileWithMetadata[];

  // Extracted data
  dataPool?: DataPool;

  // Analysis results
  contextual?: ContextualAnalysis;
  market?: MarketAnalysis;
  deep?: DeepAnalysis;

  // Metadata
  scores?: {
    risk: number;
    opportunity: number;
    feasibility: number;
    confidence: number;
  };

  duration_ms?: number;
  cost_usd?: number;
  warnings?: string[];
}

interface AnalysisState {
  // Current analysis
  currentAnalysis: AnalysisResult | null;

  // Analysis history
  history: AnalysisResult[];

  // Stage tracking
  currentStage: AnalysisStage;
  stageProgress: Record<AnalysisStage, number>;

  // Error state
  error: string | null;

  // Actions
  startNewAnalysis: (files: File[]) => string;
  updateFileStatus: (fileId: string, status: FileWithMetadata['status'], progress?: number) => void;
  setDataPool: (dataPool: DataPool) => void;
  setContextualAnalysis: (analysis: ContextualAnalysis) => void;
  setMarketAnalysis: (analysis: MarketAnalysis) => void;
  setDeepAnalysis: (analysis: DeepAnalysis) => void;
  setStage: (stage: AnalysisStage, progress?: number) => void;
  setError: (error: string | null) => void;
  completeAnalysis: (scores: AnalysisResult['scores']) => void;
  reset: () => void;

  // Getters
  getAnalysisById: (id: string) => AnalysisResult | undefined;
  getCurrentProgress: () => number;
}

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentAnalysis: null,
      history: [],
      currentStage: 'idle',
      stageProgress: {
        idle: 0,
        uploading: 0,
        extracting: 0,
        contextual: 0,
        market: 0,
        deep: 0,
        completed: 0,
        failed: 0
      },
      error: null,

      // Actions
      startNewAnalysis: (files: File[]) => {
        const id = generateAnalysisId();
        const analysis: AnalysisResult = {
          id,
          created_at: new Date().toISOString(),
          status: 'uploading',
          files: files.map(file => ({
            file,
            id: generateFileId(),
            status: 'pending',
            progress: 0
          }))
        };

        set({
          currentAnalysis: analysis,
          currentStage: 'uploading',
          error: null,
          stageProgress: {
            idle: 100,
            uploading: 0,
            extracting: 0,
            contextual: 0,
            market: 0,
            deep: 0,
            completed: 0,
            failed: 0
          }
        });

        return id;
      },

      updateFileStatus: (fileId, status, progress = 0) => {
        set(state => {
          if (!state.currentAnalysis) return state;

          const updatedFiles = state.currentAnalysis.files.map(f =>
            f.id === fileId ? { ...f, status, progress } : f
          );

          const overallProgress = calculateOverallProgress(updatedFiles);

          return {
            currentAnalysis: {
              ...state.currentAnalysis,
              files: updatedFiles
            },
            stageProgress: {
              ...state.stageProgress,
              uploading: overallProgress
            }
          };
        });
      },

      setDataPool: (dataPool) => {
        set(state => ({
          currentAnalysis: state.currentAnalysis
            ? {
                ...state.currentAnalysis,
                dataPool,
                status: 'extracting' as AnalysisStage
              }
            : null,
          currentStage: 'extracting',
          stageProgress: {
            ...state.stageProgress,
            extracting: 100
          }
        }));
      },

      setContextualAnalysis: (analysis) => {
        set(state => ({
          currentAnalysis: state.currentAnalysis
            ? {
                ...state.currentAnalysis,
                contextual: analysis,
                status: 'contextual' as AnalysisStage
              }
            : null,
          stageProgress: {
            ...state.stageProgress,
            contextual: 100
          }
        }));
      },

      setMarketAnalysis: (analysis) => {
        set(state => ({
          currentAnalysis: state.currentAnalysis
            ? {
                ...state.currentAnalysis,
                market: analysis,
                status: 'market' as AnalysisStage
              }
            : null,
          stageProgress: {
            ...state.stageProgress,
            market: 100
          }
        }));
      },

      setDeepAnalysis: (analysis) => {
        set(state => ({
          currentAnalysis: state.currentAnalysis
            ? {
                ...state.currentAnalysis,
                deep: analysis,
                status: 'deep' as AnalysisStage
              }
            : null,
          stageProgress: {
            ...state.stageProgress,
            deep: 100
          }
        }));
      },

      setStage: (stage, progress = 0) => {
        set(state => ({
          currentStage: stage,
          currentAnalysis: state.currentAnalysis
            ? {
                ...state.currentAnalysis,
                status: stage
              }
            : null,
          stageProgress: {
            ...state.stageProgress,
            [stage]: progress
          }
        }));
      },

      setError: (error) => {
        set(state => ({
          error,
          currentStage: error ? 'failed' : state.currentStage,
          currentAnalysis: state.currentAnalysis && error
            ? {
                ...state.currentAnalysis,
                status: 'failed' as AnalysisStage,
                warnings: [...(state.currentAnalysis.warnings || []), error]
              }
            : state.currentAnalysis
        }));
      },

      completeAnalysis: (scores) => {
        set(state => {
          if (!state.currentAnalysis) return state;

          const completedAnalysis = {
            ...state.currentAnalysis,
            status: 'completed' as AnalysisStage,
            scores,
            duration_ms: Date.now() - new Date(state.currentAnalysis.created_at).getTime()
          };

          return {
            currentAnalysis: completedAnalysis,
            history: [...state.history, completedAnalysis],
            currentStage: 'completed',
            stageProgress: {
              ...state.stageProgress,
              completed: 100
            }
          };
        });
      },

      reset: () => {
        set({
          currentAnalysis: null,
          currentStage: 'idle',
          error: null,
          stageProgress: {
            idle: 0,
            uploading: 0,
            extracting: 0,
            contextual: 0,
            market: 0,
            deep: 0,
            completed: 0,
            failed: 0
          }
        });
      },

      // Getters
      getAnalysisById: (id) => {
        return get().history.find(a => a.id === id);
      },

      getCurrentProgress: () => {
        const { currentStage, stageProgress } = get();
        return stageProgress[currentStage] || 0;
      }
    }),
    {
      name: 'analysis-store',
      partialize: (state) => ({
        history: state.history.slice(-10) // Keep only last 10 analyses
      })
    }
  )
);

// Helper functions
function generateAnalysisId(): string {
  return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function calculateOverallProgress(files: FileWithMetadata[]): number {
  if (files.length === 0) return 0;
  const total = files.reduce((sum, f) => sum + f.progress, 0);
  return Math.round(total / files.length);
}