'use client';

/**
 * Analysis Detail Page - Enterprise Grade
 * 
 * ✅ Zustand'dan okur (single source of truth)
 * ✅ Local state yok
 * ✅ useLoadAnalysis() hook kullanır
 */

import { ContextualView } from '@/components/analysis/ContextualView';
import { RawDataView } from '@/components/analysis/RawDataView';
import { TablesView } from '@/components/analysis/TablesView';
import { ExportButtons } from '@/components/ui/ExportButtons';
import { ToastContainer, useToast } from '@/components/ui/ToastNotification';
import type { DataPool } from '@/lib/document-processor/types';
import type { ContextualAnalysis, MarketAnalysis } from '@/lib/tender-analysis/types';
import { useAnalysisStore, useLoadAnalysis } from '@/store/analysisStore';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  Brain,
  Calendar,
  Check,
  Database,
  Download,
  FileText,
  Grid3x3,
  Hash,
  Loader2,
  Search,
  Shield
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

type TabType = 'data-pool' | 'contextual' | 'deep';

export default function AnalysisResultPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // ========================================
  // ✅ REFACTOR: Use Zustand (Single Source)
  // ========================================
  
  // Load analysis from API → Zustand (only once)
  const { loading, error: loadError } = useLoadAnalysis(id);
  
  // Read from Zustand (passive)
  const analysis = useAnalysisStore(s => s.currentAnalysis);
  const {
    setContextualAnalysis,
    setMarketAnalysis,
    setDeepAnalysis
  } = useAnalysisStore();

  // UI state (not data state)
  const [activeTab, setActiveTab] = useState<TabType>('data-pool');
  const [analysisLoading, setAnalysisLoading] = useState<'contextual' | 'market' | 'deep' | null>(null);

  const { toasts, removeToast, success, error: showError } = useToast();

  // ========================================
  // Loading State
  // ========================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Analiz yükleniyor...</p>
        </div>
      </div>
    );
  }

  // ========================================
  // Error State
  // ========================================
  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass-card p-8">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Hata</h2>
          <p className="text-slate-400 mb-6">{loadError}</p>
          <button
            onClick={() => router.push('/analysis')}
            className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
          >
            Yeni Analiz Başlat
          </button>
        </div>
      </div>
    );
  }

  // ========================================
  // Not Found State
  // ========================================
  if (!analysis || !analysis.dataPool) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass-card p-8">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Analiz Bulunamadı</h2>
          <p className="text-slate-400 mb-6">Bu ID ile eşleşen bir analiz bulunamadı.</p>
          <button
            onClick={() => router.push('/analysis')}
            className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
          >
            Yeni Analiz Başlat
          </button>
        </div>
      </div>
    );
  }

  // ========================================
  // Processing State with REAL Progress (Backend Data)
  // ========================================
  if (analysis.status === 'pending' || analysis.status === 'processing') {
    // ✅ REAL Progress: Based on actual backend completion
    const hasDataPool = !!analysis.dataPool;
    const hasContextual = !!analysis.contextual_analysis;
    const hasMarket = !!analysis.market_analysis;
    const isCompleted = analysis.status === 'completed';
    
    const progressSteps = [
      { 
        key: 'datapool', 
        label: 'Veri Havuzu Oluşturuldu', 
        completed: hasDataPool 
      },
      { 
        key: 'contextual', 
        label: 'Bağlamsal Analiz', 
        completed: hasContextual,
        active: hasDataPool && !hasContextual
      },
      { 
        key: 'market', 
        label: 'Pazar Analizi', 
        completed: hasMarket,
        active: hasContextual && !hasMarket
      },
      { 
        key: 'complete', 
        label: 'Tamamlandı', 
        completed: isCompleted,
        active: hasMarket && !isCompleted
      }
    ];
    
    const completedCount = progressSteps.filter(s => s.completed).length;
    const progressPercent = (completedCount / progressSteps.length) * 100;

    return (
      <div className="fixed inset-0 flex items-center justify-center p-6 z-50">
        {/* Soft Backdrop Blur */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="relative text-center glass-card p-10 max-w-lg w-full"
          style={{
            background: 'linear-gradient(135deg, rgba(21, 24, 33, 0.95) 0%, rgba(29, 32, 40, 0.9) 100%)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 100px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Animated Brain Icon with Glow */}
          <div className="relative mb-8">
            <motion.div
              animate={{ 
                rotate: 360,
                scale: [1, 1.05, 1],
              }}
              transition={{ 
                rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
              }}
              className="relative"
            >
              <Brain className="w-20 h-20 text-purple-400 mx-auto drop-shadow-2xl" />
              <div className="absolute inset-0 blur-2xl bg-purple-500/30 -z-10" />
            </motion.div>
          </div>

          <h2 className="text-3xl font-bold text-white mb-3 bg-gradient-to-r from-white via-purple-100 to-white bg-clip-text text-transparent">
            {analysis.status === 'pending' ? 'Analiz Başlatılıyor' : 'Analiz Devam Ediyor'}
          </h2>

          <p className="text-slate-400 text-base mb-8 leading-relaxed">
            {analysis.status === 'pending'
              ? 'İhale dosyaları işleniyor ve AI analizi hazırlanıyor...'
              : 'Claude Sonnet 4.5 detaylı analiz gerçekleştiriyor...'}
          </p>

          {/* Modern Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm font-medium mb-3">
              <span className="text-slate-300">İlerleme</span>
              <span className="text-purple-400 font-bold">{Math.round(progressPercent)}%</span>
            </div>
            <div className="h-3 bg-slate-900/50 rounded-full overflow-hidden border border-slate-700/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
                className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 relative"
                style={{
                  boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              </motion.div>
            </div>
          </div>

          {/* Modern Progress Steps */}
          <div className="space-y-3 mb-8">
            {progressSteps.map((step, idx) => (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ 
                  delay: idx * 0.15,
                  duration: 0.5,
                  ease: [0.34, 1.56, 0.64, 1]
                }}
                className={`
                  relative flex items-center gap-4 text-sm font-medium px-4 py-3 rounded-xl
                  transition-all duration-300
                  ${step.completed
                    ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                    : step.active
                    ? 'bg-purple-500/10 border border-purple-500/30 text-purple-300'
                    : 'bg-slate-800/30 border border-slate-700/50 text-slate-500'
                  }
                `}
              >
                {/* Icon */}
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full
                  ${step.completed
                    ? 'bg-green-500/20 text-green-400'
                    : step.active
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'bg-slate-700/30 text-slate-600'
                  }
                `}>
                  {step.completed ? (
                    <Check className="w-5 h-5" />
                  ) : step.active ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-current" />
                  )}
                </div>
                
                {/* Label */}
                <span className="flex-1 text-left">{step.label}</span>
                
                {/* Glow effect for active */}
                {step.active && (
                  <div className="absolute inset-0 rounded-xl blur-xl bg-purple-500/20 -z-10" />
                )}
              </motion.div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Bu sayfa otomatik güncellenecek</span>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-700">
            <p className="text-xs text-slate-400 mb-3">Başka işlerle ilgilenebilirsiniz:</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => router.push('/ihale')}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
              >
                📋 İhale Listesi
              </button>
              <button
                onClick={() => router.push('/analysis')}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
              >
                📊 Yeni Analiz
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ========================================
  // ✅ Data from Zustand
  // ========================================
  const dataPool = analysis.dataPool;
  const contextualAnalysis = analysis.contextual_analysis;
  const marketAnalysis = analysis.market_analysis;
  const deepAnalysis = analysis.deep_analysis;

  // ========================================
  // Analysis Trigger Functions
  // (Now updates Zustand!)
  // ========================================
  
  const triggerContextualAnalysis = async () => {
    if (!dataPool) return;

    setAnalysisLoading('contextual');
    try {
      const response = await fetch('/api/analysis/contextual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId: id, dataPool })
      });

      if (response.ok) {
        const data = await response.json();
        
        // ✅ Update Zustand (single source of truth)
        setContextualAnalysis(id, data.analysis);
        
        success('✅ Bağlamsal Analiz Tamamlandı', 'Sonuçlar hazır!');
      } else {
        throw new Error('Contextual analysis failed');
      }
    } catch (error) {
      console.error('Contextual analysis error:', error);
      showError('❌ Analiz Başarısız', 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setAnalysisLoading(null);
    }
  };

  const triggerMarketAnalysis = async () => {
    if (!dataPool) return;

    setAnalysisLoading('market');
    try {
      const response = await fetch('/api/analysis/market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId: id, dataPool })
      });

      if (response.ok) {
        const data = await response.json();
        
        // ✅ Update Zustand
        setMarketAnalysis(id, data.marketAnalysis);
        
        success('✅ Pazar Analizi Tamamlandı', 'Sonuçlar hazır!');
      } else {
        throw new Error('Market analysis failed');
      }
    } catch (error) {
      console.error('Market analysis error:', error);
      showError('❌ Analiz Başarısız', 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setAnalysisLoading(null);
    }
  };

  const triggerDeepAnalysis = async () => {
    if (!dataPool) return;

    setAnalysisLoading('deep');
    try {
      const response = await fetch('/api/analysis/deep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId: id, dataPool })
      });

      if (response.ok) {
        const data = await response.json();
        
        // ✅ Update Zustand
        setDeepAnalysis(id, data.deep_analysis);
        
        success('✅ Derin Analiz Tamamlandı', 'Stratejik öneriler hazır!');
      } else {
        throw new Error('Deep analysis failed');
      }
    } catch (error) {
      console.error('Deep analysis error:', error);
      showError('❌ Analiz Başarısız', 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setAnalysisLoading(null);
    }
  };

  // ========================================
  // Tab Configuration
  // ========================================
  const tabs = [
    {
      id: 'data-pool' as TabType,
      name: '📊 Veri Havuzu',
      icon: Database,
      color: 'from-blue-500 to-cyan-500',
      description: 'Tüm veriler ve tablolar'
    },
    {
      id: 'contextual' as TabType,
      name: '🧠 Bağlamsal Analiz',
      icon: Brain,
      color: 'from-purple-500 to-pink-500',
      description: 'Tablo analisti - kritik bilgiler'
    },
    {
      id: 'deep' as TabType,
      name: '🤖 Derin Analiz',
      icon: Shield,
      color: 'from-orange-500 to-red-500',
      description: 'AI danışman - stratejik değerlendirme'
    }
  ];

  // ========================================
  // Render
  // ========================================
  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div className="min-h-screen pb-20">
        {/* Premium Header */}
      <div className="glass-card rounded-3xl p-8 mb-8 border border-white/10">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-5">
            <button
              onClick={() => router.push('/analysis')}
              className="group p-3 rounded-xl hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-purple-500/30"
              title="Geri"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-purple-400 transition-colors" />
            </button>

            <div>
              <h1 className="text-3xl font-bold text-white mb-3 bg-gradient-to-r from-white via-purple-100 to-white bg-clip-text">
                İhale Analiz Sonuçları
              </h1>
              <div className="flex items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300">
                  <Database className="w-4 h-4" />
                  {dataPool.documents.length} dosya
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300">
                  <FileText className="w-4 h-4" />
                  {dataPool.metadata.total_words.toLocaleString('tr-TR')} kelime
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  <Grid3x3 className="w-4 h-4" />
                  {dataPool.tables.length} tablo
                </span>
              </div>

              {/* Warnings */}
                {dataPool.metadata.warnings && dataPool.metadata.warnings.length > 0 && (
                <div className="mt-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-yellow-400 font-medium">Uyarılar:</p>
                    <ul className="text-xs text-slate-400 mt-1">
                      {dataPool.metadata.warnings.map((warning, i) => (
                        <li key={i}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <ExportButtons analysisId={id} type="analysis" />
          </div>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative flex items-center gap-3 px-6 py-3.5 rounded-2xl
                font-semibold text-sm transition-all duration-300 whitespace-nowrap
                border backdrop-blur-sm
                ${isActive
                  ? 'bg-gradient-to-r ' + tab.color + ' text-white border-white/20 shadow-2xl scale-105'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-slate-300 hover:border-white/20'
                }
              `}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
              <span>{tab.name}</span>
              
              {/* Active indicator glow */}
              {isActive && (
                <div className="absolute inset-0 rounded-2xl blur-xl opacity-50 -z-10"
                  style={{
                    background: `linear-gradient(135deg, ${
                      tab.id === 'data-pool' ? 'rgba(99, 102, 241, 0.4)' :
                      tab.id === 'contextual' ? 'rgba(139, 92, 246, 0.4)' :
                      'rgba(236, 72, 153, 0.4)'
                    }, transparent)`
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'data-pool' && <DataPoolTab dataPool={dataPool} />}
          {activeTab === 'contextual' && (
            <ContextualTab
              dataPool={dataPool}
              analysis={contextualAnalysis}
              onTriggerAnalysis={triggerContextualAnalysis}
              loading={analysisLoading === 'contextual'}
            />
          )}
          {activeTab === 'deep' && (
            <DeepTab
              dataPool={dataPool}
              contextualAnalysis={contextualAnalysis}
              marketAnalysis={marketAnalysis}
                deepAnalysis={deepAnalysis}
                onTriggerAnalysis={triggerDeepAnalysis}
                loading={analysisLoading === 'deep'}
            />
          )}
        </motion.div>
      </AnimatePresence>
      </div>
    </>
  );
}

// ========================================
// Data Pool Tab Component
// ========================================
function DataPoolTab({ dataPool }: { dataPool: DataPool }) {
  const [subTab, setSubTab] = useState<'raw-data' | 'tables'>('raw-data');
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span className="text-xs text-slate-400">Dokümanlar</span>
          </div>
          <div className="text-2xl font-bold text-white">{dataPool.documents.length}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-5 h-5 text-green-400" />
            <span className="text-xs text-slate-400">Tablolar</span>
          </div>
          <div className="text-2xl font-bold text-white">{dataPool.tables.length}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            <span className="text-xs text-slate-400">Tarihler</span>
          </div>
          <div className="text-2xl font-bold text-white">{dataPool.dates.length}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-5 h-5 text-orange-400" />
            <span className="text-xs text-slate-400">Kelime</span>
          </div>
          <div className="text-2xl font-bold text-white">{dataPool.metadata.total_words}</div>
        </motion.div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="glass-card rounded-xl p-1">
        <div className="flex gap-1">
          <button
            onClick={() => setSubTab('raw-data')}
            className={`
              flex-1 px-4 py-3 rounded-lg font-medium transition-all
              ${subTab === 'raw-data'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}
            `}
          >
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" />
              Ham Veri
            </div>
          </button>

          <button
            onClick={() => setSubTab('tables')}
            className={`
              flex-1 px-4 py-3 rounded-lg font-medium transition-all
              ${subTab === 'tables'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}
            `}
          >
            <div className="flex items-center justify-center gap-2">
              <Database className="w-4 h-4" />
              Tablolar
            </div>
          </button>
        </div>
      </div>

      {/* Search Box */}
      <div className="glass-card p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={subTab === 'raw-data' ? 'Ham verilerde ara...' : 'Tablolarda ara...'}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button 
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            title="İndir"
          >
            <Download className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Sub-tab Content */}
      <AnimatePresence mode="wait">
        {subTab === 'raw-data' && (
          <motion.div
            key="raw-data"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <RawDataView dataPool={dataPool} searchTerm={searchTerm} />
          </motion.div>
        )}

        {subTab === 'tables' && (
          <motion.div
            key="tables"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <TablesView tables={dataPool.tables} searchTerm={searchTerm} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ========================================
// Contextual Analysis Tab
// ========================================
function ContextualTab({
  dataPool,
  analysis,
  onTriggerAnalysis,
  loading
}: {
  dataPool: DataPool;
  analysis: ContextualAnalysis | null | undefined;
  onTriggerAnalysis: () => void;
  loading: boolean;
}) {
  if (!analysis) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <Brain className="w-16 h-16 text-purple-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Bağlamsal Analiz</h2>
        <p className="text-slate-400 mb-6">
          İhale dokümanlarının risk ve fırsat değerlendirmesi yapılmamış.
        </p>
        <button
          onClick={onTriggerAnalysis}
          disabled={loading}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium
            hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50
            disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analiz Yapılıyor...
            </>
          ) : (
            <>
              <Brain className="w-5 h-5" />
              Bağlamsal Analiz Başlat
            </>
          )}
        </button>
      </div>
    );
  }

  return <ContextualView analysis={analysis} />;
}

// ========================================
// Deep Analysis Tab
// ========================================
function DeepTab({
  dataPool,
  contextualAnalysis,
  marketAnalysis,
  deepAnalysis,
  onTriggerAnalysis,
  loading
}: {
  dataPool: DataPool;
  contextualAnalysis: ContextualAnalysis | null | undefined;
  marketAnalysis: MarketAnalysis | null | undefined;
  deepAnalysis: any;
  onTriggerAnalysis: () => void;
  loading: boolean;
}) {
  // If deep analysis already exists, show it
  if (deepAnalysis) {
    return (
      <div className="glass-card rounded-xl p-8">
        <h2 className="text-xl font-semibold text-white mb-4">🤖 Derin Analiz Sonuçları</h2>
        <pre className="text-slate-300 text-sm">{JSON.stringify(deepAnalysis, null, 2)}</pre>
      </div>
    );
  }

  // Prerequisites check
  const canAnalyze = contextualAnalysis && marketAnalysis;

  return (
    <div className="glass-card rounded-xl p-8 text-center">
      <Shield className="w-16 h-16 text-orange-400 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-white mb-2">Derin Analiz</h2>
      <p className="text-slate-400 mb-6">
        AI danışman ile stratejik değerlendirme ve öneriler
      </p>
      
      {!canAnalyze && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-4">
          <AlertCircle className="w-5 h-5 text-orange-400 mx-auto mb-2" />
          <p className="text-sm text-orange-300">
            Derin analiz için önce bağlamsal ve pazar analizi tamamlanmalıdır.
          </p>
        </div>
      )}
      
      <div className="text-sm text-slate-500 mb-6">
        <p>Veri havuzu: ✓ {dataPool.documents.length} doküman</p>
        <p>Bağlamsal analiz: {contextualAnalysis ? '✓ Tamamlandı' : '⏳ Bekliyor'}</p>
        <p>Pazar analizi: {marketAnalysis ? '✓ Tamamlandı' : '⏳ Bekliyor'}</p>
      </div>

      {canAnalyze && (
        <button
          onClick={onTriggerAnalysis}
          disabled={loading}
          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium
            hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50
            disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analiz Yapılıyor...
            </>
          ) : (
            <>
              <Shield className="w-5 h-5" />
              Derin Analiz Başlat
            </>
          )}
        </button>
      )}
    </div>
  );
}
