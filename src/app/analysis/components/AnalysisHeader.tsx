'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Sparkles,
  Clock,
  DollarSign,
  ChevronDown,
  RefreshCw,
  FileText,
  Download,
  Settings,
  Zap,
  TrendingUp
} from 'lucide-react';

interface AIStats {
  model: string;
  confidence: number;
  tokensUsed: number;
  cost: number;
  processingTime: number;
}

interface AnalysisHeaderProps {
  aiStats: AIStats;
  onNewAnalysis: () => void;
  onExport: (format: 'pdf' | 'word' | 'excel') => void;
  isLoading?: boolean;
}

const AI_MODELS = [
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', icon: Brain },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', icon: Sparkles },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', icon: Zap },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', icon: TrendingUp }
];

export function AnalysisHeader({
  aiStats,
  onNewAnalysis,
  onExport,
  isLoading = false
}: AnalysisHeaderProps) {
  const [selectedModel, setSelectedModel] = useState(aiStats.model);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  const currentModel = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0];

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  const formatTokens = (tokens: number) => {
    if (tokens < 1000) return tokens.toString();
    return `${(tokens / 1000).toFixed(1)}K`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="glass-card border-b border-slate-800">
      <div className="px-6 py-4">
        {/* Title and Actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Brain className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI Analiz Sonuçları</h1>
              <p className="text-sm text-slate-400">Detaylı ihale analizi ve öneriler</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* New Analysis */}
            <button
              onClick={onNewAnalysis}
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Yeni Analiz</span>
            </button>

            {/* Teklif Hazırla */}
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>Teklif Hazırla</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showExportDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden z-50"
                >
                  <button
                    onClick={() => {
                      onExport('pdf');
                      setShowExportDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-red-400" />
                    PDF olarak indir
                  </button>
                  <button
                    onClick={() => {
                      onExport('word');
                      setShowExportDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-blue-400" />
                    Word olarak indir
                  </button>
                  <button
                    onClick={() => {
                      onExport('excel');
                      setShowExportDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-green-400" />
                    Excel olarak indir
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* AI Stats */}
        <div className="grid grid-cols-5 gap-4">
          {/* Model Selector */}
          <div className="relative">
            <button
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="w-full px-4 py-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2">
                <currentModel.icon className="w-4 h-4 text-indigo-400" />
                <div className="text-left">
                  <p className="text-xs text-slate-400">AI Model</p>
                  <p className="text-sm font-medium">{currentModel.name}</p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
            </button>

            {showModelDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full mt-2 w-full bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden z-50"
              >
                {AI_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setSelectedModel(model.id);
                      setShowModelDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors flex items-center gap-3 ${
                      selectedModel === model.id ? 'bg-slate-700' : ''
                    }`}
                  >
                    <model.icon className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm">{model.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Confidence Score */}
          <div className="px-4 py-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Güven Oranı</p>
                <p className={`text-lg font-bold ${getConfidenceColor(aiStats.confidence)}`}>
                  %{aiStats.confidence}
                </p>
              </div>
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-slate-700"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${(aiStats.confidence / 100) * 126} 126`}
                    className={getConfidenceColor(aiStats.confidence)}
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Processing Time */}
          <div className="px-4 py-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-xs text-slate-400">İşlem Süresi</p>
                <p className="text-sm font-medium">{formatTime(aiStats.processingTime)}</p>
              </div>
            </div>
          </div>

          {/* Tokens Used */}
          <div className="px-4 py-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-yellow-400" />
              <div>
                <p className="text-xs text-slate-400">Token Kullanımı</p>
                <p className="text-sm font-medium">{formatTokens(aiStats.tokensUsed)}</p>
              </div>
            </div>
          </div>

          {/* Cost */}
          <div className="px-4 py-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <DollarSign className="w-4 h-4 text-green-400" />
              <div>
                <p className="text-xs text-slate-400">Maliyet</p>
                <p className="text-sm font-medium">{formatCost(aiStats.cost)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
