'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Brain,
  Zap,
  TrendingUp,
  MessageSquare,
  FileText,
  Download,
  Send,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  Target,
  Shield,
  Lightbulb,
  GitCompare,
  Quote,
  BookOpen,
  Info
} from 'lucide-react';
import type { DataPool } from '@/lib/document-processor/types';
import type { ContextualAnalysis, MarketAnalysis } from '@/lib/tender-analysis/types';

interface DeepAnalysisTabProps {
  dataPool: DataPool;
  contextualAnalysis?: ContextualAnalysis | null;
  marketAnalysis?: MarketAnalysis | null;
  onTriggerAnalysis?: () => void;
}

interface ModelComparison {
  model: string;
  icon: React.ComponentType<{ className?: string }>;
  confidence: number;
  verdict: 'recommended' | 'caution' | 'not-recommended';
  reasoning: string;
  keyPoints: string[];
}

interface QAPair {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
  model: string;
  citations: string[];
}

export function DeepAnalysisTab({
  dataPool,
  contextualAnalysis,
  marketAnalysis,
  onTriggerAnalysis
}: DeepAnalysisTabProps) {
  const [selectedModel, setSelectedModel] = useState('claude-3-5-sonnet');
  const [showComparison, setShowComparison] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));
  const [qaHistory, setQaHistory] = useState<QAPair[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  if (!marketAnalysis) {
    return (
      <div className="glass-card p-12 text-center">
        <Sparkles className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h3 className="text-2xl font-semibold mb-2">Derin Analiz</h3>
        <p className="text-slate-400 mb-6 max-w-md mx-auto">
          Yapay zeka ile detaylı piyasa analizi, risk değerlendirmesi ve stratejik öneriler
        </p>
        <button
          onClick={onTriggerAnalysis}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2 mx-auto"
        >
          <Sparkles className="w-5 h-5" />
          Derin Analiz Başlat
        </button>
      </div>
    );
  }

  const modelComparisons: ModelComparison[] = [
    {
      model: 'Claude 3.5 Sonnet',
      icon: Brain,
      confidence: 92,
      verdict: 'recommended',
      reasoning: 'Yüksek kar marjı potansiyeli ve düşük operasyonel risk',
      keyPoints: [
        'Personel maliyetleri optimize edilebilir',
        'Piyasa koşulları uygun',
        'Deneyimli ekip avantajı'
      ]
    },
    {
      model: 'GPT-4 Turbo',
      icon: Zap,
      confidence: 88,
      verdict: 'caution',
      reasoning: 'Orta seviye risk, dikkatli planlama gerekli',
      keyPoints: [
        'Nakit akışı yönetimi kritik',
        'Rekabet yoğun',
        'Kar marjı sınırlı'
      ]
    },
    {
      model: 'Gemini 1.5 Pro',
      icon: TrendingUp,
      confidence: 85,
      verdict: 'recommended',
      reasoning: 'Uzun vadeli büyüme potansiyeli yüksek',
      keyPoints: [
        'Sektör büyüme trendinde',
        'Müşteri memnuniyeti yüksek',
        'Teknoloji yatırımı gerekli'
      ]
    }
  ];

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleAskQuestion = async () => {
    if (!currentQuestion.trim()) return;
    
    setIsAsking(true);
    
    // Simulate AI response
    setTimeout(() => {
      const newQA: QAPair = {
        id: Date.now().toString(),
        question: currentQuestion,
        answer: `Bu sorunuza göre, ${currentQuestion.toLowerCase().includes('risk') 
          ? 'operasyonel risk seviyesi orta düzeydedir. Ana risk faktörleri personel devir hızı ve hammadde fiyat dalgalanmalarıdır.'
          : 'ihale şartnamesi gerekliliklerini karşılayabilecek kapasiteye sahipsiniz. Özellikle deneyimli ekibiniz bu konuda avantaj sağlıyor.'}`,
        timestamp: new Date(),
        model: selectedModel,
        citations: ['Şartname Madde 4.2', 'Teknik Şartname s.12']
      };
      
      setQaHistory(prev => [...prev, newQA]);
      setCurrentQuestion('');
      setIsAsking(false);
    }, 1500);
  };

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case 'recommended':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'caution':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'not-recommended':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return null;
    }
  };

  // Removed unused getVerdictColor function

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden"
      >
        <button
          onClick={() => toggleSection('summary')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-linear-to-br from-indigo-500 to-purple-500 rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold">Yönetici Özeti</h3>
          </div>
          {expandedSections.has('summary') ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        <AnimatePresence>
          {expandedSections.has('summary') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-6 pb-6"
            >
              <div className="pt-4 border-t border-slate-700 space-y-4">
                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                  <p className="text-sm leading-relaxed">
                    <span className="font-semibold text-indigo-400">Ana Değerlendirme:</span>{' '}
                    Bu ihaleye girmeniz önerilmektedir. Tahmini kar marjı %12-15 aralığında olup,
                    operasyonel riskler yönetilebilir düzeydedir. Mevcut deneyiminiz ve altyapınız
                    ihale gereksinimlerini karşılamaktadır.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400">%92</div>
                    <p className="text-sm text-slate-400 mt-1">Başarı Olasılığı</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-400">Orta</div>
                    <p className="text-sm text-slate-400 mt-1">Risk Seviyesi</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400">18 ay</div>
                    <p className="text-sm text-slate-400 mt-1">ROI Süresi</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Model Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-purple-400" />
            Model Karşılaştırması
          </h3>
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            {showComparison ? 'Özet Görünüm' : 'Detaylı Karşılaştırma'}
          </button>
        </div>

        {showComparison ? (
          <div className="space-y-3">
            {modelComparisons.map((comparison) => {
              const Icon = comparison.icon;
              
              return (
                <div
                  key={comparison.model}
                  className="p-4 bg-slate-800/50 rounded-lg border border-slate-700"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-indigo-400" />
                      <div>
                        <h4 className="font-medium">{comparison.model}</h4>
                        <p className="text-sm text-slate-400">{comparison.reasoning}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">%{comparison.confidence}</span>
                      {getVerdictIcon(comparison.verdict)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    {comparison.keyPoints.map((point, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5" />
                        <span className="text-slate-300">{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-4">
            {modelComparisons.map((comparison) => {
              const Icon = comparison.icon;
              
              return (
                <button
                  key={comparison.model}
                  onClick={() => setSelectedModel(comparison.model)}
                  className={`
                    p-4 rounded-lg border-2 transition-all
                    ${selectedModel === comparison.model 
                      ? 'border-indigo-500 bg-indigo-500/10' 
                      : 'border-slate-700 hover:border-slate-600'
                    }
                  `}
                >
                  <Icon className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                  <p className="text-sm font-medium">{comparison.model}</p>
                  <div className="flex items-center gap-1 mt-2 justify-center">
                    <span className="text-lg font-bold">%{comparison.confidence}</span>
                    {getVerdictIcon(comparison.verdict)}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Key Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {/* Strengths */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            Güçlü Yönler
          </h3>
          <div className="space-y-3">
            {[
              { title: 'Deneyimli Ekip', desc: '10+ yıllık sektör deneyimi' },
              { title: 'Mali Yeterlik', desc: 'Güçlü finansal göstergeler' },
              { title: 'Referanslar', desc: 'Benzer 5 başarılı proje' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risks */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            Risk Faktörleri
          </h3>
          <div className="space-y-3">
            {[
              { title: 'Personel Devri', desc: 'Sektör ortalaması %20' },
              { title: 'Hammadde Fiyatları', desc: 'Dalgalanma riski yüksek' },
              { title: 'Rekabet', desc: '3 güçlü rakip firma' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Interactive Q&A */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-6"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          Soru & Cevap
        </h3>

        {/* Question Input */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={currentQuestion}
            onChange={(e) => setCurrentQuestion(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
            placeholder="İhale hakkında sorularınızı sorun..."
            className="flex-1 px-4 py-2 bg-slate-800/50 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleAskQuestion}
            disabled={isAsking || !currentQuestion.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isAsking ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Q&A History */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {qaHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Henüz soru sorulmadı</p>
            </div>
          ) : (
            qaHistory.map((qa) => (
              <div key={qa.id} className="p-4 bg-slate-800/30 rounded-lg space-y-2">
                <div className="flex items-start gap-2">
                  <Quote className="w-4 h-4 text-blue-400 mt-0.5" />
                  <p className="font-medium text-sm">{qa.question}</p>
                </div>
                <div className="pl-6 space-y-2">
                  <p className="text-sm text-slate-300">{qa.answer}</p>
                  {qa.citations.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <BookOpen className="w-3 h-3" />
                      <span>Kaynak: {qa.citations.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Suggested Questions */}
        {qaHistory.length === 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-xs text-slate-500 mb-2">Örnek sorular:</p>
            <div className="flex flex-wrap gap-2">
              {[
                'Bu ihaleye girmeli miyim?',
                'En büyük riskler nelerdir?',
                'Kar marjı ne kadar olur?',
                'Rakiplerim kimler?'
              ].map((question) => (
                <button
                  key={question}
                  onClick={() => setCurrentQuestion(question)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-full text-xs transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Export Options */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex items-center justify-center gap-4"
      >
        <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2">
          <Download className="w-4 h-4" />
          Word Raporu
        </button>
        <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2">
          <FileText className="w-4 h-4" />
          PDF Raporu
        </button>
        <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          PowerPoint Sunum
        </button>
      </motion.div>
    </div>
  );
}
