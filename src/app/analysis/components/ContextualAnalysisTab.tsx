'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Calendar,
  FileText,
  CheckCircle,
  DollarSign,
  Users,
  Package,
  Wrench,
  Brain,
  AlertTriangle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Shield,
  Clock,
  Target,
  BarChart3,
  Lightbulb,
  AlertCircle,
  Info
} from 'lucide-react';
import type { DataPool } from '@/lib/document-processor/types';
import type { ContextualAnalysis } from '@/lib/tender-analysis/types';

interface ContextualAnalysisTabProps {
  dataPool: DataPool;
  analysis: ContextualAnalysis | null;
  expandedCards: Set<string>;
  onToggleCard: (cardId: string) => void;
  onTriggerAnalysis?: () => void;
}

// Fixed cards configuration
const FIXED_CARDS = [
  {
    id: 'tender-info',
    title: 'İhale Bilgileri',
    icon: Building2,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20'
  },
  {
    id: 'dates-duration',
    title: 'Tarihler & Süreler',
    icon: Calendar,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20'
  },
  {
    id: 'service-details',
    title: 'Hizmet Detayları',
    icon: FileText,
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20'
  },
  {
    id: 'documents-requirements',
    title: 'Belgeler & Yeterlik',
    icon: CheckCircle,
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20'
  }
];

// Expandable cards configuration
const EXPANDABLE_CARDS = [
  {
    id: 'cost-guarantees',
    title: 'Maliyet & Teminatlar',
    icon: DollarSign,
    emoji: '💰',
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'personnel-list',
    title: 'Personel Listesi',
    icon: Users,
    emoji: '👥',
    color: 'from-blue-500 to-indigo-500'
  },
  {
    id: 'material-list',
    title: 'Malzeme Listesi',
    icon: Package,
    emoji: '🥬',
    color: 'from-yellow-500 to-orange-500'
  },
  {
    id: 'equipment-assets',
    title: 'Ekipman & Demirbaş',
    icon: Wrench,
    emoji: '🔧',
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'analysis-recommendations',
    title: 'Analiz & Öneriler',
    icon: Brain,
    emoji: '🤖',
    color: 'from-red-500 to-rose-500'
  }
];

export function ContextualAnalysisTab({
  dataPool,
  analysis,
  expandedCards,
  onToggleCard,
  onTriggerAnalysis
}: ContextualAnalysisTabProps) {
  const [showRiskMatrix, setShowRiskMatrix] = useState(false);

  if (!analysis) {
    return (
      <div className="glass-card p-12 text-center">
        <Brain className="w-16 h-16 text-purple-400 mx-auto mb-4" />
        <h3 className="text-2xl font-semibold mb-2">Bağlamsal Analiz</h3>
        <p className="text-slate-400 mb-6 max-w-md mx-auto">
          İhale dokümanlarınızın detaylı analizini yaparak kritik bilgileri ve riskleri tespit edin
        </p>
        <button
          onClick={onTriggerAnalysis}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2 mx-auto"
        >
          <Brain className="w-5 h-5" />
          Analizi Başlat
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fixed Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {FIXED_CARDS.map((card, index) => {
          const Icon = card.icon;
          
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`glass-card p-4 ${card.bgColor} ${card.borderColor} border`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 bg-linear-to-br ${card.color} rounded-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-medium text-white">{card.title}</h3>
              </div>

              <div className="space-y-2">
                {card.id === 'tender-info' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Risk Seviyesi</span>
                      <span className="font-medium">{analysis.operasyonel_riskler?.seviye || '-'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Risk Skoru</span>
                      <span className="font-medium">{analysis.operasyonel_riskler?.skor || '-'}/100</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Genel Puan</span>
                      <span className="font-medium text-green-400">
                        {analysis.genel_degerlendirme?.puan || '-'}/100
                      </span>
                    </div>
                  </>
                )}

                {card.id === 'dates-duration' && (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-purple-400" />
                      <span className="text-slate-400">Zaman Uygunluğu:</span>
                      <span className="font-medium">{analysis.zaman_uygunlugu?.yeterli ? 'Uygun' : 'Riskli'}</span>
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">İlan Tarihi</span>
                        <span>15.01.2025</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Son Başvuru</span>
                        <span className="text-orange-400">30.01.2025</span>
                      </div>
                    </div>
                    <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full w-3/4 bg-linear-to-r from-purple-500 to-pink-500 rounded-full" />
                    </div>
                  </>
                )}

                {card.id === 'service-details' && (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-green-400" />
                      <span className="text-slate-400">Personel:</span>
                      <span className="font-medium">{analysis.personel_gereksinimi?.tahmini_sayi || '-'}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {['Yemek', 'Temizlik', 'Güvenlik'].map(service => (
                        <span
                          key={service}
                          className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {card.id === 'documents-requirements' && (
                  <>
                    <div className="space-y-2">
                      {['Mali Yeterlik', 'Teknik Yeterlik', 'İş Deneyimi'].map(req => (
                        <div key={req} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span>{req}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-orange-400">
                      <AlertCircle className="w-3 h-3 inline mr-1" />
                      2 eksik belge
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Expandable Cards */}
      <div className="space-y-3">
        {EXPANDABLE_CARDS.map((card, index) => {
  // const Icon = card.icon;  // Unused variable
          const isExpanded = expandedCards.has(card.id);

          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="glass-card overflow-hidden"
            >
              <button
                onClick={() => onToggleCard(card.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{card.emoji}</span>
                  <h3 className="text-lg font-medium">{card.title}</h3>
                  <span className="px-2 py-1 bg-slate-700 rounded text-xs">
                    {card.id === 'cost-guarantees' && '₺12.5M'}
                    {card.id === 'personnel-list' && '150 kişi'}
                    {card.id === 'material-list' && '45 kalem'}
                    {card.id === 'equipment-assets' && '12 adet'}
                    {card.id === 'analysis-recommendations' && '8 öneri'}
                  </span>
                </div>
                
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="px-6 pb-6"
                  >
                    <div className="pt-4 border-t border-slate-700">
                      {card.id === 'cost-guarantees' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-800/50 rounded-lg">
                              <p className="text-sm text-slate-400 mb-1">Toplam Maliyet</p>
                              <p className="text-2xl font-bold text-green-400">₺12,500,000</p>
                              <p className="text-xs text-slate-500 mt-1">Yıllık</p>
                            </div>
                            <div className="p-4 bg-slate-800/50 rounded-lg">
                              <p className="text-sm text-slate-400 mb-1">Geçici Teminat</p>
                              <p className="text-2xl font-bold text-yellow-400">₺375,000</p>
                              <p className="text-xs text-slate-500 mt-1">%3 oranında</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-medium flex items-center gap-2">
                              <BarChart3 className="w-4 h-4 text-blue-400" />
                              Maliyet Dağılımı
                            </h4>
                            <div className="space-y-1">
                              {[
                                { label: 'Personel', value: 65, color: 'bg-blue-500' },
                                { label: 'Malzeme', value: 25, color: 'bg-green-500' },
                                { label: 'Operasyonel', value: 10, color: 'bg-purple-500' }
                              ].map(item => (
                                <div key={item.label}>
                                  <div className="flex justify-between text-sm mb-1">
                                    <span>{item.label}</span>
                                    <span>%{item.value}</span>
                                  </div>
                                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${item.color} rounded-full`}
                                      // Dynamic width requires inline style for progress bars
                                      style={{ width: `${item.value}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {card.id === 'analysis-recommendations' && (
                        <div className="space-y-4">
                          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <div className="flex items-start gap-3">
                              <Lightbulb className="w-5 h-5 text-yellow-400 mt-0.5" />
                              <div>
                                <h4 className="font-medium mb-1">Kritik Öneri</h4>
                                <p className="text-sm text-slate-300">
                                  Personel maliyetleri sektör ortalamasının %15 üzerinde. 
                                  Vardiya optimizasyonu ile %8-10 tasarruf sağlanabilir.
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { icon: Target, label: 'Hedef Kar Marjı', value: '%12-15' },
                              { icon: Shield, label: 'Risk Seviyesi', value: 'Orta' },
                              { icon: TrendingUp, label: 'Büyüme Potansiyeli', value: '%20' },
                              { icon: Clock, label: 'ROI Süresi', value: '18 ay' }
                            ].map(metric => (
                              <div key={metric.label} className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg">
                                <metric.icon className="w-4 h-4 text-indigo-400" />
                                <div className="text-sm">
                                  <p className="text-slate-400">{metric.label}</p>
                                  <p className="font-medium">{metric.value}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Risk & Recommendation Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Risk Matrix */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="glass-card p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Risk Matrisi
            </h3>
            <button
              onClick={() => setShowRiskMatrix(!showRiskMatrix)}
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              {showRiskMatrix ? 'Gizle' : 'Detay'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Finansal', level: 'medium', score: 65 },
              { label: 'Operasyonel', level: 'low', score: 30 },
              { label: 'Yasal', level: 'low', score: 20 }
            ].map(risk => (
              <div key={risk.label} className="text-center">
                <div className={`
                  h-20 rounded-lg flex items-center justify-center mb-2
                  ${risk.level === 'high' ? 'bg-red-500/20 border border-red-500/30' :
                    risk.level === 'medium' ? 'bg-yellow-500/20 border border-yellow-500/30' :
                    'bg-green-500/20 border border-green-500/30'}
                `}>
                  <span className="text-2xl font-bold">{risk.score}</span>
                </div>
                <span className="text-xs text-slate-400">{risk.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="glass-card p-4"
        >
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-400" />
            Hızlı Öneriler
          </h3>
          
          <div className="space-y-2">
            {[
              'Geçici teminat mektubu için 3 banka teklifi alın',
              'Personel devir oranını %10\'un altında tutun',
              'Aylık maliyet raporlaması sistemi kurun'
            ].map((tip, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5" />
                <span className="text-slate-300">{tip}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
