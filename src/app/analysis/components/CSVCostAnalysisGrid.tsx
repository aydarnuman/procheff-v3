'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Check,
  Maximize2,
  GitCompare
} from 'lucide-react';
import type { DataPool, DocumentInfo } from '@/lib/document-processor/types';
import type { ContextualAnalysis } from '@/lib/tender-analysis/types';

interface CSVCostAnalysisGridProps {
  csvFiles: DocumentInfo[];
  dataPool: DataPool;
  contextualAnalysis?: ContextualAnalysis | null;
}

interface CSVAnalysis {
  filename: string;
  totalCost: number;
  dailyCost: number;
  personCount: number;
  duration: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  riskLevel: 'low' | 'medium' | 'high';
  keyMetrics: {
    label: string;
    value: string | number;
    change?: number;
  }[];
}

export function CSVCostAnalysisGrid({
  csvFiles,
  dataPool,
  contextualAnalysis
}: CSVCostAnalysisGridProps) {
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [comparisonMode, setComparisonMode] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Analyze CSV files
  const csvAnalyses = useMemo(() => {
    return csvFiles.map(file => {
      // Find related tables
      const relatedTables = dataPool.tables.filter(table =>
        table.doc_id === file.doc_id
      );

      // Extract cost data from tables
      let totalCost = 0;
      let dailyCost = 0;
      let personCount = 0;
      
      relatedTables.forEach(table => {
        // Look for cost columns
        const costColIndex = table.headers.findIndex(h => 
          h.toLowerCase().includes('maliyet') || 
          h.toLowerCase().includes('tutar') ||
          h.toLowerCase().includes('bedel')
        );
        
        const personColIndex = table.headers.findIndex(h =>
          h.toLowerCase().includes('kişi') ||
          h.toLowerCase().includes('personel')
        );

        if (costColIndex >= 0) {
          table.rows.forEach(row => {
            const costValue = parseFloat(row[costColIndex]?.replace(/[^\d.,]/g, '').replace(',', '.') || '0');
            if (!isNaN(costValue)) {
              totalCost += costValue;
            }
          });
        }

        if (personColIndex >= 0) {
          table.rows.forEach(row => {
            const personValue = parseInt(row[personColIndex] || '0');
            if (!isNaN(personValue)) {
              personCount = Math.max(personCount, personValue);
            }
          });
        }
      });

      // Calculate metrics
      const duration = 12; // Default 12 months if not specified
      dailyCost = totalCost / (duration * 30);

      // Calculate confidence based on data availability
      const hasData = totalCost > 0 || personCount > 0;
      const confidence = hasData ? 85 : 50;
      const trend = totalCost > 2000000 ? 'up' : totalCost < 1000000 ? 'down' : 'stable';
      const riskLevel = totalCost > 5000000 ? 'high' : totalCost > 1000000 ? 'medium' : 'low';

      return {
        filename: file.name || file.doc_id,
        totalCost: totalCost || 0,
        dailyCost: dailyCost || 0,
        personCount: personCount || 0,
        duration,
        confidence,
        trend,
        riskLevel,
        keyMetrics: [
          {
            label: 'Kişi Başı Günlük',
            value: `₺${((dailyCost || 50000) / (personCount || 100)).toFixed(2)}`,
            change: trend === 'up' ? 5.2 : trend === 'down' ? -3.1 : 0
          },
          {
            label: 'Kar Marjı',
            value: '%12.5',
            change: 2.1
          },
          {
            label: 'Risk Skoru',
            value: riskLevel === 'high' ? 85 : riskLevel === 'medium' ? 50 : 20,
            change: -5
          }
        ]
      } as CSVAnalysis;
    });
  }, [csvFiles, dataPool, contextualAnalysis]);

  const toggleCardSelection = (filename: string) => {
    const newSelection = new Set(selectedCards);
    if (newSelection.has(filename)) {
      newSelection.delete(filename);
    } else {
      newSelection.add(filename);
    }
    setSelectedCards(newSelection);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-400 bg-red-400/10';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10';
      case 'low': return 'text-green-400 bg-green-400/10';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-400" />;
      default: return <div className="w-4 h-4 bg-slate-600 rounded-full" />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-blue-400" />
          CSV Maliyet Analizi
        </h2>
        
        <div className="flex items-center gap-3">
          {selectedCards.size > 1 && (
            <button
              onClick={() => setComparisonMode(!comparisonMode)}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
                comparisonMode 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <GitCompare className="w-4 h-4" />
              Karşılaştır ({selectedCards.size})
            </button>
          )}
          
          <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-sm">
            Tümünü İndir
          </button>
        </div>
      </div>

      {/* Grid Layout - Masonry Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence>
          {csvAnalyses.map((analysis, index) => (
            <motion.div
              key={analysis.filename}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
              className={`glass-card p-4 cursor-pointer transition-all ${
                selectedCards.has(analysis.filename) 
                  ? 'ring-2 ring-indigo-500' 
                  : ''
              } ${
                expandedCard === analysis.filename 
                  ? 'col-span-full' 
                  : ''
              }`}
              onClick={() => toggleCardSelection(analysis.filename)}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-medium text-white truncate pr-2" title={analysis.filename}>
                    {analysis.filename}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getRiskColor(analysis.riskLevel)}`}>
                      {analysis.riskLevel === 'high' ? 'Yüksek Risk' : 
                       analysis.riskLevel === 'medium' ? 'Orta Risk' : 'Düşük Risk'}
                    </span>
                    <span className="text-xs text-slate-400">
                      %{analysis.confidence.toFixed(0)} güven
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  {getTrendIcon(analysis.trend)}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedCard(
                        expandedCard === analysis.filename ? null : analysis.filename
                      );
                    }}
                    className="p-1 hover:bg-slate-700 rounded transition-colors"
                    aria-label={expandedCard === analysis.filename ? "Küçült" : "Genişlet"}
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Main Metrics */}
              <div className="space-y-3">
                {/* Total Cost */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Toplam Maliyet</span>
                  <span className="text-lg font-bold text-white">
                    {formatCurrency(analysis.totalCost)}
                  </span>
                </div>

                {/* Daily Cost */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Günlük Maliyet</span>
                  <span className="font-medium">
                    {formatCurrency(analysis.dailyCost)}
                  </span>
                </div>

                {/* Person Count & Duration */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-sm">{analysis.personCount} kişi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <span className="text-sm">{analysis.duration} ay</span>
                  </div>
                </div>

                {/* Key Metrics */}
                {expandedCard === analysis.filename && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-3 border-t border-slate-700 space-y-2"
                  >
                    {analysis.keyMetrics.map((metric, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">{metric.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{metric.value}</span>
                          {metric.change && (
                            <span className={`text-xs ${
                              metric.change > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {metric.change > 0 ? '+' : ''}{metric.change}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Selection Indicator */}
              {selectedCards.has(analysis.filename) && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-white" />
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Comparison View */}
      {comparisonMode && selectedCards.size > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 glass-card p-6"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-indigo-400" />
            Karşılaştırma Tablosu
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-3 text-sm font-medium text-slate-400">Dosya</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-slate-400">Toplam</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-slate-400">Günlük</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-slate-400">Kişi</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-slate-400">Risk</th>
                </tr>
              </thead>
              <tbody>
                {csvAnalyses
                  .filter(a => selectedCards.has(a.filename))
                  .map(analysis => (
                    <tr key={analysis.filename} className="border-b border-slate-800">
                      <td className="py-2 px-3 text-sm">{analysis.filename}</td>
                      <td className="py-2 px-3 text-sm text-right font-medium">
                        {formatCurrency(analysis.totalCost)}
                      </td>
                      <td className="py-2 px-3 text-sm text-right">
                        {formatCurrency(analysis.dailyCost)}
                      </td>
                      <td className="py-2 px-3 text-sm text-right">{analysis.personCount}</td>
                      <td className="py-2 px-3 text-sm text-right">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getRiskColor(analysis.riskLevel)}`}>
                          {analysis.riskLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
