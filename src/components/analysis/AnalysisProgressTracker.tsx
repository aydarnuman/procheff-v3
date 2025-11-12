/**
 * Analysis Progress Tracker
 * Real-time progress tracking component for AI analysis
 */

'use client';

import { motion } from 'framer-motion';
import { Brain, FileText, Database, Shield, CheckCircle, TrendingUp } from 'lucide-react';

interface AnalysisProgressTrackerProps {
  stage: string;
  progress: number; // 0-100
  details?: string;
}

const STAGE_ICONS: Record<string, typeof FileText> = {
  'Veri çıkarılıyor': FileText,
  'Tablolar analiz ediliyor': Database,
  'Risk değerlendirmesi': Shield,
  'Bağlamsal analiz': Brain,
  'Sonuçlar birleştiriliyor': CheckCircle,
  'Derin analiz': TrendingUp,
};

export function AnalysisProgressTracker({ 
  stage, 
  progress, 
  details 
}: AnalysisProgressTrackerProps) {
  const StageIcon = STAGE_ICONS[stage] || Brain;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl p-4 shadow-2xl"
      >
        {/* Progress Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Brain className="w-5 h-5 text-purple-400 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white">AI Analizi Devam Ediyor</h4>
            <p className="text-xs text-slate-400 truncate">{stage}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>İlerleme</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Details */}
        {details && (
          <p className="text-xs text-slate-500">{details}</p>
        )}

        {/* Stage Icon */}
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <StageIcon className="w-3 h-3" />
          <span>{stage}</span>
        </div>
      </motion.div>
    </div>
  );
}

