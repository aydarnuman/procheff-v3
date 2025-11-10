import { create } from "zustand";

interface AnalysisData {
  id?: string;
  timestamp?: string;
  extracted_data?: Record<string, unknown>;
  contextual_analysis?: Record<string, unknown>;
  result?: Record<string, unknown>;
}

interface AnalysisState {
  current?: AnalysisData;
  history: AnalysisData[];
  setCurrent: (data: AnalysisData) => void;
  addToHistory: (data: AnalysisData) => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  current: undefined,
  history: [],
  setCurrent: (data) => set({ current: data }),
  addToHistory: (data) =>
    set((state) => ({ history: [...state.history, data] })),
}));
