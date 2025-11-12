import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { DataPool } from '@/lib/document-processor/types';

// Types
export interface AnalysisResult {
  id: string;
  dataPool: DataPool;
  contextualAnalysis?: any;
  marketAnalysis?: any;
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    model: string;
    confidence: number;
    tokensUsed: number;
    cost: number;
    processingTime: number;
  };
}

export interface Collaborator {
  id: string;
  name: string;
  avatar?: string;
  cursor?: {
    x: number;
    y: number;
    activeElement?: string;
  };
  status: 'online' | 'idle' | 'offline';
  lastSeen: Date;
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  elementId: string;
  timestamp: Date;
  resolved: boolean;
}

export interface Annotation {
  id: string;
  userId: string;
  elementId: string;
  type: 'highlight' | 'note' | 'question';
  content: string;
  position: { x: number; y: number };
  timestamp: Date;
}

export interface Filter {
  type: 'document' | 'table' | 'date' | 'amount' | 'entity';
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'between';
  value: any;
}

export type SortCriteria = {
  field: string;
  direction: 'asc' | 'desc';
};

export type ExportFormat = 'pdf' | 'word' | 'excel' | 'ppt';

interface UpdateEvent {
  id: string;
  type: 'result' | 'comment' | 'annotation' | 'collaborator';
  action: 'create' | 'update' | 'delete';
  data: any;
  userId: string;
  timestamp: Date;
}

interface EnhancedAnalysisState {
  // Core state
  results: Map<string, AnalysisResult>;
  currentResultId: string | null;
  
  // UI state
  activeTab: 'extraction' | 'contextual' | 'deep';
  expandedCards: Set<string>;
  selectedItems: Set<string>;
  viewMode: 'compact' | 'detailed' | 'fullscreen';
  
  // Filters & Search
  filters: Filter[];
  searchQuery: string;
  sortBy: SortCriteria | null;
  
  // Real-time collaboration
  collaborators: Map<string, Collaborator>;
  comments: Comment[];
  annotations: Annotation[];
  updates: UpdateEvent[];
  
  // Cache
  cache: Map<string, { data: any; expires: number }>;
  
  // Actions
  setCurrentResult: (id: string) => void;
  updateResult: (id: string, data: Partial<AnalysisResult>) => void;
  deleteResult: (id: string) => void;
  
  // UI actions
  setActiveTab: (tab: 'extraction' | 'contextual' | 'deep') => void;
  toggleCard: (cardId: string) => void;
  toggleItem: (itemId: string) => void;
  setViewMode: (mode: 'compact' | 'detailed' | 'fullscreen') => void;
  
  // Filter actions
  applyFilter: (filter: Filter) => void;
  removeFilter: (index: number) => void;
  clearFilters: () => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (criteria: SortCriteria | null) => void;
  
  // Collaboration actions
  updateCollaborator: (collaborator: Collaborator) => void;
  removeCollaborator: (id: string) => void;
  addComment: (comment: Omit<Comment, 'id' | 'timestamp'>) => void;
  resolveComment: (id: string) => void;
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'timestamp'>) => void;
  removeAnnotation: (id: string) => void;
  
  // Export actions
  exportData: (format: ExportFormat, resultId?: string) => Promise<void>;
  
  // Cache actions
  getCached: <T>(key: string) => T | null;
  setCached: <T>(key: string, data: T, ttl?: number) => void;
  clearCache: () => void;
  
  // Real-time updates
  addUpdate: (update: Omit<UpdateEvent, 'id' | 'timestamp'>) => void;
  clearOldUpdates: () => void;
}

// Store implementation
export const useEnhancedAnalysisStore = create<EnhancedAnalysisState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        results: new Map(),
        currentResultId: null,
        activeTab: 'extraction',
        expandedCards: new Set(['tender-info', 'dates-duration']),
        selectedItems: new Set(),
        viewMode: 'detailed',
        filters: [],
        searchQuery: '',
        sortBy: null,
        collaborators: new Map(),
        comments: [],
        annotations: [],
        updates: [],
        cache: new Map(),

        // Core actions
        setCurrentResult: (id) => set((state) => {
          state.currentResultId = id;
        }),

        updateResult: (id, data) => set((state) => {
          const existing = state.results.get(id);
          if (existing) {
            state.results.set(id, {
              ...existing,
              ...data,
              updatedAt: new Date()
            });
          }
        }),

        deleteResult: (id) => set((state) => {
          state.results.delete(id);
          if (state.currentResultId === id) {
            state.currentResultId = null;
          }
        }),

        // UI actions
        setActiveTab: (tab) => set((state) => {
          state.activeTab = tab;
        }),

        toggleCard: (cardId) => set((state) => {
          if (state.expandedCards.has(cardId)) {
            state.expandedCards.delete(cardId);
          } else {
            state.expandedCards.add(cardId);
          }
        }),

        toggleItem: (itemId) => set((state) => {
          if (state.selectedItems.has(itemId)) {
            state.selectedItems.delete(itemId);
          } else {
            state.selectedItems.add(itemId);
          }
        }),

        setViewMode: (mode) => set((state) => {
          state.viewMode = mode;
        }),

        // Filter actions
        applyFilter: (filter) => set((state) => {
          state.filters.push(filter);
        }),

        removeFilter: (index) => set((state) => {
          state.filters.splice(index, 1);
        }),

        clearFilters: () => set((state) => {
          state.filters = [];
        }),

        setSearchQuery: (query) => set((state) => {
          state.searchQuery = query;
        }),

        setSortBy: (criteria) => set((state) => {
          state.sortBy = criteria;
        }),

        // Collaboration actions
        updateCollaborator: (collaborator) => set((state) => {
          state.collaborators.set(collaborator.id, collaborator);
        }),

        removeCollaborator: (id) => set((state) => {
          state.collaborators.delete(id);
        }),

        addComment: (comment) => set((state) => {
          state.comments.push({
            ...comment,
            id: Date.now().toString(),
            timestamp: new Date()
          });
        }),

        resolveComment: (id) => set((state) => {
          const comment = state.comments.find(c => c.id === id);
          if (comment) {
            comment.resolved = true;
          }
        }),

        addAnnotation: (annotation) => set((state) => {
          state.annotations.push({
            ...annotation,
            id: Date.now().toString(),
            timestamp: new Date()
          });
        }),

        removeAnnotation: (id) => set((state) => {
          const index = state.annotations.findIndex(a => a.id === id);
          if (index >= 0) {
            state.annotations.splice(index, 1);
          }
        }),

        // Export actions
        exportData: async (format, resultId) => {
          const state = get();
          const result = resultId 
            ? state.results.get(resultId) 
            : state.currentResultId 
              ? state.results.get(state.currentResultId)
              : null;

          if (!result) {
            throw new Error('No result to export');
          }

          // TODO: Implement actual export logic
          console.log('Exporting as', format, result);
          
          // Simulate async export
          await new Promise(resolve => setTimeout(resolve, 1000));
        },

        // Cache actions
        getCached: <T,>(key: string): T | null => {
          const state = get();
          const cached = state.cache.get(key);
          
          if (!cached) return null;
          
          if (cached.expires < Date.now()) {
            state.cache.delete(key);
            return null;
          }
          
          return cached.data as T;
        },

        setCached: <T,>(key: string, data: T, ttl = 3600000) => set((state) => {
          state.cache.set(key, {
            data,
            expires: Date.now() + ttl
          });
        }),

        clearCache: () => set((state) => {
          state.cache.clear();
        }),

        // Real-time updates
        addUpdate: (update) => set((state) => {
          state.updates.push({
            ...update,
            id: Date.now().toString(),
            timestamp: new Date()
          });
          
          // Keep only last 100 updates
          if (state.updates.length > 100) {
            state.updates = state.updates.slice(-100);
          }
        }),

        clearOldUpdates: () => set((state) => {
          const oneHourAgo = new Date(Date.now() - 3600000);
          state.updates = state.updates.filter(u => u.timestamp > oneHourAgo);
        })
      })),
      {
        name: 'enhanced-analysis-store',
        partialize: (state) => ({
          // Only persist essential data
          results: Array.from(state.results.entries()),
          currentResultId: state.currentResultId,
          activeTab: state.activeTab,
          viewMode: state.viewMode,
          filters: state.filters,
          sortBy: state.sortBy
        }),
        merge: (persistedState: any, currentState) => ({
          ...currentState,
          ...persistedState,
          // Convert arrays back to Maps
          results: new Map(persistedState.results || []),
          expandedCards: new Set(currentState.expandedCards),
          selectedItems: new Set(),
          collaborators: new Map(),
          cache: new Map()
        })
      }
    )
  )
);

// Selectors
export const selectCurrentResult = (state: EnhancedAnalysisState) => {
  if (!state.currentResultId) return null;
  return state.results.get(state.currentResultId);
};

export const selectFilteredResults = (state: EnhancedAnalysisState) => {
  let results = Array.from(state.results.values());
  
  // Apply filters
  state.filters.forEach(filter => {
    // TODO: Implement filter logic
  });
  
  // Apply search
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    results = results.filter(r => 
      JSON.stringify(r).toLowerCase().includes(query)
    );
  }
  
  // Apply sort
  if (state.sortBy) {
    results.sort((a, b) => {
      // TODO: Implement sort logic
      return 0;
    });
  }
  
  return results;
};

export const selectOnlineCollaborators = (state: EnhancedAnalysisState) => {
  return Array.from(state.collaborators.values()).filter(c => c.status === 'online');
};

export const selectUnresolvedComments = (state: EnhancedAnalysisState) => {
  return state.comments.filter(c => !c.resolved);
};
