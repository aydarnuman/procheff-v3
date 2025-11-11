'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Database,
  Brain,
  TrendingUp,
  Shield,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Download,
  Eye,
  Calendar,
  Hash,
  DollarSign,
  Users,
  ChevronRight,
  RefreshCw,
  Search
} from 'lucide-react';
import { useAnalysisStore } from '@/store/analysisStore';
import type { DataPool } from '@/lib/document-processor/types';
import type { ContextualAnalysis, MarketAnalysis } from '@/lib/tender-analysis/types';
import { ContextualView } from '@/components/analysis/ContextualView';
import { RawDataView } from '@/components/analysis/RawDataView';
import { TablesView } from '@/components/analysis/TablesView';
import { ExportButtons } from '@/components/ui/ExportButtons';

type TabType = 'data-pool' | 'contextual' | 'deep';

export default function AnalysisResultPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [activeTab, setActiveTab] = useState<TabType>('data-pool');
  const [dataPool, setDataPool] = useState<DataPool | null>(null);
  const [contextualAnalysis, setContextualAnalysis] = useState<ContextualAnalysis | null>(null);
  const [marketAnalysis, setMarketAnalysis] = useState<MarketAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState<'contextual' | 'market' | null>(null);

  const { getAnalysisById, currentAnalysis } = useAnalysisStore();

  useEffect(() => {
    // Try to get analysis from store or fetch from API
    const fetchAnalysis = async () => {
      try {
        // Check store first
        let analysis = getAnalysisById(id);

        if (!analysis && currentAnalysis?.id === id) {
          analysis = currentAnalysis;
        }

        if (analysis?.dataPool) {
          setDataPool(analysis.dataPool);
          setLoading(false);

          // Check for existing analysis results
          fetchAnalysisResults();
          return;
        }

        // Fetch from API if not in store
        const response = await fetch(`/api/analysis/${id}`);
        if (!response.ok) {
          throw new Error('Analysis not found');
        }

        const data = await response.json();
        setDataPool(data.dataPool);
        setLoading(false);

        // Check for existing analysis results
        fetchAnalysisResults();
      } catch (error) {
        console.error('Failed to fetch analysis:', error);
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [id, getAnalysisById, currentAnalysis]);

  // Fetch analysis results from database
  const fetchAnalysisResults = async () => {
    try {
      // Fetch contextual analysis
      const contextualResponse = await fetch(`/api/analysis/results/${id}?stage=contextual`);
      if (contextualResponse.ok) {
        const data = await contextualResponse.json();
        if (data.analysis) {
          setContextualAnalysis(data.analysis);
        }
      }

      // Fetch market analysis
      const marketResponse = await fetch(`/api/analysis/results/${id}?stage=market`);
      if (marketResponse.ok) {
        const data = await marketResponse.json();
        if (data.analysis) {
          setMarketAnalysis(data.analysis);
        }
      }
    } catch (error) {
      console.error('Failed to fetch analysis results:', error);
    }
  };

  // Trigger contextual analysis
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
        setContextualAnalysis(data.analysis);
      } else {
        throw new Error('Contextual analysis failed');
      }
    } catch (error) {
      console.error('Contextual analysis error:', error);
    } finally {
      setAnalysisLoading(null);
    }
  };

  // Trigger market analysis
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
        setMarketAnalysis(data.marketAnalysis);
      } else {
        throw new Error('Market analysis failed');
      }
    } catch (error) {
      console.error('Market analysis error:', error);
    } finally {
      setAnalysisLoading(null);
    }
  };

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

  if (!dataPool) {
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

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="glass-card rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <button
              onClick={() => router.push('/analysis')}
              className="p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>

            <div>
              <h1 className="text-2xl font-bold text-white mb-2">İhale Analiz Sonuçları</h1>
              <p className="text-slate-400">
                {dataPool.documents.length} dosya • {dataPool.metadata.total_words} kelime •
                {dataPool.tables.length} tablo
              </p>

              {/* Warnings */}
              {dataPool.metadata.warnings.length > 0 && (
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

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap
                ${activeTab === tab.id
                  ? 'bg-gradient-to-r ' + tab.color + ' text-white shadow-lg'
                  : 'glass-card hover:bg-slate-800/50 text-slate-400'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{tab.name}</span>
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
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Data Pool Tab Component
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
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
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

// Contextual Analysis Tab
function ContextualTab({
  dataPool,
  analysis,
  onTriggerAnalysis,
  loading
}: {
  dataPool: DataPool;
  analysis: ContextualAnalysis | null;
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

function DeepTab({
  dataPool,
  contextualAnalysis,
  marketAnalysis
}: {
  dataPool: DataPool;
  contextualAnalysis: ContextualAnalysis | null;
  marketAnalysis: MarketAnalysis | null;
}) {
  return (
    <div className="glass-card rounded-xl p-8 text-center">
      <Shield className="w-16 h-16 text-orange-400 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-white mb-2">Derin Analiz</h2>
      <p className="text-slate-400 mb-6">
        AI danışman ile stratejik değerlendirme ve öneriler
      </p>
      {(!contextualAnalysis || !marketAnalysis) && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-4">
          <AlertCircle className="w-5 h-5 text-orange-400 mx-auto mb-2" />
          <p className="text-sm text-orange-300">
            Derin analiz için önce bağlamsal ve piyasa analizi tamamlanmalıdır.
          </p>
        </div>
      )}
      <div className="text-sm text-slate-500">
        <p>Veri havuzu: ✓ {dataPool.documents.length} doküman</p>
        <p>Bağlamsal analiz: {contextualAnalysis ? '✓ Tamamlandı' : '⏳ Bekliyor'}</p>
        <p>Piyasa analizi: {marketAnalysis ? '✓ Tamamlandı' : '⏳ Bekliyor'}</p>
      </div>
    </div>
  );
}

