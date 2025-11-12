/**
 * Analysis Store - Enterprise Grade
 * 
 * 🎯 SINGLE SOURCE OF TRUTH
 * - analysisHistory[] (all analyses)
 * - currentAnalysis (selected one)
 * 
 * UI sadece buradan okur, asla DB'ye gitmez!
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { DataPool } from '@/lib/document-processor/types';

// ========================================
// Types (Enterprise Format)
// ========================================

export interface ContextualAnalysis {
  genel_degerlendirme?: {
    puan: number;
    kategori: string;
    oneriler: string[];
  };
  riskler?: Array<{
    kategori: string;
    seviye: string;
    aciklama: string;
  }>;
  firsatlar?: string[];
}

export interface MarketAnalysis {
  comparison?: {
    risk_level: 'low' | 'medium' | 'high';
    market_position: string;
  };
  pricing?: {
    estimated_cost: number;
    market_average: number;
  };
}

export interface DeepAnalysis {
  maliyet_detay?: {
    toplam: number;
    breakdown: Array<{
      kategori: string;
      tutar: number;
    }>;
  };
  karar?: {
    oneri: 'participate' | 'skip' | 'watch';
    neden: string;
    riskler: string[];
  };
}

// ========================================
// MergedAnalysis (API'den gelen format)
// ========================================

export interface AnalysisResult {
  // Core Identity
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  
  // Timeline
  created_at: string;
  updated_at: string;
  timeline?: {
    started_at: string;
    completed_at: string;
    duration_ms: number;
  };
  
  // DataPool (from data_pools table)
  dataPool?: DataPool;
  
  // Analysis Results (added progressively)
  contextual_analysis?: ContextualAnalysis;
  market_analysis?: MarketAnalysis;
  deep_analysis?: DeepAnalysis;
  
  // Metadata
  inputFiles?: Array<{name: string; size: number; hash?: string}>;
  steps?: string[];
  error?: string | null;
  warnings?: string | null;
  
  // Stats
  stats?: {
    documents: number;
    tables: number;
    textBlocks: number;
    entities: number;
    amounts: number;
  };
}

// ========================================
// Store Interface
// ========================================

interface AnalysisStore {
  // ✅ STATE - Single Source of Truth
  analysisHistory: AnalysisResult[];
  currentAnalysis: AnalysisResult | null;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // ✅ ACTIONS - Store Management
  addAnalysis: (analysis: AnalysisResult) => void;
  updateAnalysis: (id: string, updates: Partial<AnalysisResult>) => void;
  deleteAnalysis: (id: string) => void;
  setCurrentAnalysis: (id: string) => void;
  clearCurrentAnalysis: () => void;
  
  // ✅ ACTIONS - Analysis Results
  setDataPool: (id: string, dataPool: DataPool) => void;
  setContextualAnalysis: (id: string, analysis: ContextualAnalysis) => void;
  setMarketAnalysis: (id: string, analysis: MarketAnalysis) => void;
  setDeepAnalysis: (id: string, analysis: DeepAnalysis) => void;
  
  // ✅ ACTIONS - Status Updates
  setStatus: (id: string, status: AnalysisResult['status']) => void;
  setError: (id: string, error: string) => void;
  
  // ✅ GETTERS
  getAnalysisById: (id: string) => AnalysisResult | undefined;
  getRecentAnalyses: (limit?: number) => AnalysisResult[];
  getCompletedAnalyses: () => AnalysisResult[];
  
  // ✅ UTILITIES
  reset: () => void;
  cleanupOldAnalyses: () => void;
}

// ========================================
// Store Implementation
// ========================================

// ========================================
// Store with conditional persist (SSR-safe)
// ========================================

const storeConfig = (set: any, get: any) => ({
        // ========================================
        // Initial State
        // ========================================
        analysisHistory: [],
        currentAnalysis: null,
        isLoading: false,
        error: null,

        // ========================================
        // Store Management Actions
        // ========================================
        
        /**
         * Add new analysis to history
         * Called when API returns merged analysis
         */
        addAnalysis: (analysis) => set((state) => {
          // Prevent duplicates
          const exists = state.analysisHistory.some(a => a.id === analysis.id);
          if (exists) {
            return {
              analysisHistory: state.analysisHistory.map(a =>
                a.id === analysis.id ? analysis : a
              )
            };
          }
          
          return {
            analysisHistory: [analysis, ...state.analysisHistory]
          };
        }),

        /**
         * Update existing analysis
         * Called when analysis progresses (contextual → market → deep)
         */
        updateAnalysis: (id, updates) => set((state) => ({
          analysisHistory: state.analysisHistory.map(a =>
            a.id === id 
              ? { ...a, ...updates, updated_at: new Date().toISOString() } 
              : a
          ),
          currentAnalysis: state.currentAnalysis?.id === id
            ? { ...state.currentAnalysis, ...updates, updated_at: new Date().toISOString() }
            : state.currentAnalysis
        })),

        /**
         * Delete analysis from history
         */
        deleteAnalysis: (id) => set((state) => ({
          analysisHistory: state.analysisHistory.filter(a => a.id !== id),
          currentAnalysis: state.currentAnalysis?.id === id ? null : state.currentAnalysis
        })),

        /**
         * Set current analysis (for detail page)
         */
        setCurrentAnalysis: (id) => set((state) => ({
          currentAnalysis: state.analysisHistory.find(a => a.id === id) || null,
          error: null
        })),

        /**
         * Clear current analysis
         */
        clearCurrentAnalysis: () => set({ currentAnalysis: null }),

        // ========================================
        // Analysis Results Actions
        // ========================================
        
        /**
         * Set DataPool (from API merged response)
         */
        setDataPool: (id, dataPool) => 
          get().updateAnalysis(id, { dataPool }),

        /**
         * Add contextual analysis result
         */
        setContextualAnalysis: (id, analysis) => 
          get().updateAnalysis(id, { contextual_analysis: analysis }),

        /**
         * Add market analysis result
         */
        setMarketAnalysis: (id, analysis) => 
          get().updateAnalysis(id, { market_analysis: analysis }),

        /**
         * Add deep analysis result
         */
        setDeepAnalysis: (id, analysis) => 
          get().updateAnalysis(id, { deep_analysis: analysis }),

        // ========================================
        // Status Update Actions
        // ========================================
        
        /**
         * Update analysis status
         */
        setStatus: (id, status) => 
          get().updateAnalysis(id, { status }),

        /**
         * Set error message
         */
        setError: (id, error) => 
          get().updateAnalysis(id, { error, status: 'failed' }),

        // ========================================
        // Getters
        // ========================================
        
        /**
         * Get analysis by ID
         */
        getAnalysisById: (id) => 
          get().analysisHistory.find(a => a.id === id),

        /**
         * Get recent analyses (limit 20 by default)
         */
        getRecentAnalyses: (limit = 20) => 
          get().analysisHistory.slice(0, limit),

        /**
         * Get only completed analyses
         */
        getCompletedAnalyses: () => 
          get().analysisHistory.filter(a => a.status === 'completed'),

        // ========================================
        // Utilities
        // ========================================
        
        /**
         * Reset entire store
         */
        reset: () => set({
          analysisHistory: [],
          currentAnalysis: null,
          isLoading: false,
          error: null
        }),

        /**
         * Cleanup old analyses (older than 30 days)
         */
        cleanupOldAnalyses: () => set((state) => {
          const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
          return {
            analysisHistory: state.analysisHistory.filter(a => 
              new Date(a.created_at).getTime() > thirtyDaysAgo
            )
          };
        })
});

// ✅ SSR-Safe: Only use persist on client-side
export const useAnalysisStore = typeof window !== 'undefined'
  ? create<AnalysisStore>()(
      devtools(
        persist(
          storeConfig,
          {
            name: 'analysis-storage',
            version: 2,
            partialize: (state) => ({
              // Only persist last 50 analyses (prevent localStorage bloat)
              analysisHistory: state.analysisHistory.slice(0, 50)
            })
          }
        ),
        { name: 'AnalysisStore' }
      )
    )
  : create<AnalysisStore>()(
      devtools(
        storeConfig,
        { name: 'AnalysisStore' }
      )
    );

// ========================================
// Hooks (Convenience)
// ========================================

/**
 * Hook to load analysis from API and store in Zustand
 * 
 * ✅ Includes polling for pending/processing analyses
 */
export function useLoadAnalysis(id: string) {
  const { getAnalysisById, addAnalysis, setCurrentAnalysis, updateAnalysis } = useAnalysisStore();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;

    async function loadAnalysis() {
      try {
        const response = await fetch(`/api/analysis/${id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        
        const mergedAnalysis = await response.json();
        
        // ✅ Add or update in Zustand
        const existing = getAnalysisById(id);
        if (existing) {
          updateAnalysis(id, mergedAnalysis);
        } else {
          addAnalysis(mergedAnalysis);
        }
        setCurrentAnalysis(id);
        setError(null);
        setLoading(false);

        // ✅ Start polling if analysis is still in progress
        const status = mergedAnalysis.status;
        if (status === 'pending' || status === 'processing') {
          if (!pollInterval) {
            console.log('🔄 Starting polling for analysis:', id, 'status:', status);
            pollInterval = setInterval(() => {
              loadAnalysis(); // Poll every 2 seconds
            }, 2000);
          }
        } else {
          // ✅ Stop polling when completed/failed
          if (pollInterval) {
            console.log('✅ Stopping polling - analysis complete:', id, 'status:', status);
            clearInterval(pollInterval);
            pollInterval = null;
          }
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
        
        // Stop polling on error
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      }
    }

    loadAnalysis();

    // ✅ Cleanup: stop polling on unmount
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [id]);

  return { loading, error };
}

// ========================================
// Export for backward compatibility
// ========================================

// Re-export types for convenience
export type { DataPool };

// React import for hooks
import React from 'react';
