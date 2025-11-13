'use client';

import { AILogger } from '@/lib/ai/logger';
import type { DataPool } from '@/lib/document-processor/types';
import type { ContextualAnalysis, MarketAnalysis } from '@/lib/tender-analysis/types';
import { useEnhancedAnalysisStore } from '@/store/enhancedAnalysisStore';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronRight,
  Download,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AnalysisHeader } from './AnalysisHeader';
import { ContextualAnalysisTab } from './ContextualAnalysisTab';
import { CSVCostAnalysisGrid } from './CSVCostAnalysisGrid';
import { DataExtractionTab } from './DataExtractionTab';
import { DeepAnalysisTab } from './DeepAnalysisTab';
import { EnhancedTabNavigation } from './EnhancedTabNavigation';

export type TabType = 'extraction' | 'contextual' | 'deep';
export type ViewMode = 'compact' | 'detailed' | 'fullscreen';

interface EnhancedAnalysisResultsProps {
  analysisId: string;
  dataPool: DataPool;
  contextualAnalysis?: ContextualAnalysis | null;
  marketAnalysis?: MarketAnalysis | null;
  onAnalysisUpdate?: (type: 'contextual' | 'market') => Promise<void>;
}

export function EnhancedAnalysisResults({
  analysisId,
  dataPool,
  contextualAnalysis,
  marketAnalysis,
  onAnalysisUpdate
}: EnhancedAnalysisResultsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('extraction');
  const [viewMode, setViewMode] = useState<ViewMode>('detailed');
  
  // Enhanced store
  const {
    expandedCards,
    selectedItems,
    filters,
    searchQuery,
    toggleCard,
    setSearchQuery,
    applyFilter,
    clearFilters
  } = useEnhancedAnalysisStore();

  // AI Stats
  const [aiStats, setAiStats] = useState({
    model: 'claude-3-5-sonnet-20241022',
    confidence: 0,
    tokensUsed: 0,
    cost: 0,
    processingTime: 0
  });

  // Calculate stats from dataPool
  useEffect(() => {
    if (dataPool) {
      const totalWords = dataPool.metadata?.total_words || 0;
      const confidence = Math.min(95, 70 + (totalWords / 1000)); // Mock confidence
      const tokensUsed = Math.round(totalWords * 1.3); // Approximate tokens
      const cost = tokensUsed * 0.000003; // $3 per 1M tokens
      
      setAiStats({
        model: 'claude-3-5-sonnet-20241022',
        confidence: Math.round(confidence),
        tokensUsed,
        cost,
        processingTime: dataPool.metadata?.extraction_time_ms || 0
      });
    }
  }, [dataPool]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.altKey) {
        switch (e.key) {
          case '1':
            setActiveTab('extraction');
            break;
          case '2':
            setActiveTab('contextual');
            break;
          case '3':
            setActiveTab('deep');
            break;
          case 'n':
            if (onAnalysisUpdate) {
              handleNewAnalysis();
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onAnalysisUpdate]);

  const handleNewAnalysis = async () => {
    setIsLoading(true);
    try {
      if (onAnalysisUpdate) {
        await onAnalysisUpdate('contextual');
        AILogger.success('New analysis triggered', { analysisId });
      }
    } catch (error) {
      AILogger.error('Analysis failed', { error });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = useCallback(async (format: 'pdf' | 'word' | 'excel') => {
    AILogger.info('Export requested', { format, analysisId });
    // TODO: Implement export functionality
  }, [analysisId]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3
      }
    }
  };

  // Extract CSV files from dataPool
  const csvFiles = dataPool.documents.filter(doc => 
    doc.name?.toLowerCase().endsWith('.csv')
  );

  return (
    <motion.div 
      className="min-h-screen bg-slate-950"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <AnalysisHeader
          aiStats={aiStats}
          onNewAnalysis={handleNewAnalysis}
          onExport={handleExport}
          isLoading={isLoading}
        />
      </motion.div>

      {/* CSV Cost Analysis Grid */}
      {csvFiles.length > 0 && (
        <motion.div 
          variants={itemVariants}
          className="px-6 py-4"
        >
          <CSVCostAnalysisGrid
            csvFiles={csvFiles}
            dataPool={dataPool}
            contextualAnalysis={contextualAnalysis}
          />
        </motion.div>
      )}

      {/* Tab Navigation */}
      <motion.div 
        variants={itemVariants}
        className="px-6 py-4 sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800"
      >
        <EnhancedTabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          badges={{
            extraction: {
              count: dataPool.tables.length + dataPool.textBlocks.length,
              color: 'blue'
            },
            contextual: {
              count: contextualAnalysis ? 1 : 0,
              color: 'purple'
            },
            deep: {
              count: marketAnalysis ? 1 : 0,
              color: 'green'
            }
          }}
        />
      </motion.div>

      {/* Tab Content */}
      <motion.div 
        variants={itemVariants}
        className="px-6 py-6"
      >
        <AnimatePresence mode="wait">
          {activeTab === 'extraction' && (
            <motion.div
              key="extraction"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <DataExtractionTab
                dataPool={dataPool}
                viewMode={viewMode}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </motion.div>
          )}

          {activeTab === 'contextual' && (
            <motion.div
              key="contextual"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <ContextualAnalysisTab
                dataPool={dataPool}
                analysis={contextualAnalysis ?? null}
                expandedCards={expandedCards}
                onToggleCard={toggleCard}
                onTriggerAnalysis={() => onAnalysisUpdate?.('contextual')}
              />
            </motion.div>
          )}

          {activeTab === 'deep' && (
            <motion.div
              key="deep"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <DeepAnalysisTab
                dataPool={dataPool}
                contextualAnalysis={contextualAnalysis}
                marketAnalysis={marketAnalysis}
                onTriggerAnalysis={() => onAnalysisUpdate?.('market')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Action Buttons */}
      <motion.div 
        variants={itemVariants}
        className="fixed bottom-6 right-6 flex gap-3"
      >
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Önizlemeye Dön
        </button>
        
        <button
          onClick={handleNewAnalysis}
          disabled={isLoading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Yeni Analiz
        </button>
        
        <button
          onClick={() => handleExport('pdf')}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          PDF İndir
        </button>
      </motion.div>
    </motion.div>
  );
}
