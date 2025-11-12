'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, TrendingUp, TrendingDown, Download, Eye, Copy } from 'lucide-react';
import { AnimatedCounter } from '@/components/shared/animations/AnimatedCounter';
import { Badge } from '@/components/shared/ui/Badge';
import { MiniChart } from '@/components/shared/charts/MiniChart';
import { staggerItem } from '@/lib/utils/animation-variants';

interface CSVData {
  fileName: string;
  totalCost: number;
  confidence: number;
  trend: number[];
  breakdown: { label: string; value: number }[];
  source: string;
}

interface EnhancedCSVCostCardProps {
  data: CSVData;
  index: number;
  onViewDetails?: () => void;
  onExport?: () => void;
  onCompare?: () => void;
}

export function EnhancedCSVCostCard({
  data,
  index,
  onViewDetails,
  onExport,
  onCompare
}: EnhancedCSVCostCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const trendDirection = data.trend.length >= 2
    ? data.trend[data.trend.length - 1] > data.trend[0]
    : null;

  return (
    <motion.div
      className="glass-card p-5 hover:bg-slate-800/50 transition-all cursor-pointer relative overflow-hidden"
      variants={staggerItem}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.2 }}
    >
      {/* Gradient background on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 opacity-0"
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white truncate max-w-[200px]">
                {data.fileName}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">CSV Maliyeti</p>
            </div>
          </div>

          <Badge variant="info" size="sm">
            {data.confidence}% güven
          </Badge>
        </div>

        {/* Cost Display */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">
              <AnimatedCounter
                value={data.totalCost}
                decimals={2}
                duration={1}
              />
            </span>
            <span className="text-slate-400 text-sm">TL</span>
            {trendDirection !== null && (
              <div className="flex items-center gap-1 ml-2">
                {trendDirection ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
                <span className={`text-xs font-medium ${trendDirection ? 'text-green-400' : 'text-red-400'}`}>
                  {Math.abs(((data.trend[data.trend.length - 1] - data.trend[0]) / data.trend[0]) * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Mini Chart */}
        {data.trend.length > 0 && (
          <div className="mb-4">
            <MiniChart
              data={data.trend}
              color={trendDirection ? '#10b981' : '#ef4444'}
              height={50}
              width={280}
              showDots={false}
            />
          </div>
        )}

        {/* Breakdown Preview */}
        <div className="space-y-2 mb-4">
          {data.breakdown.slice(0, 3).map((item, i) => (
            <motion.div
              key={i}
              className="flex items-center justify-between text-sm"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <span className="text-slate-400">{item.label}</span>
              <span className="text-white font-medium">
                {item.value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
              </span>
            </motion.div>
          ))}
          {data.breakdown.length > 3 && (
            <p className="text-xs text-slate-500 text-center">
              +{data.breakdown.length - 3} daha...
            </p>
          )}
        </div>

        {/* Source Badge */}
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-700">
          <span className="text-xs text-slate-500">Kaynak:</span>
          <Badge variant="default" size="sm">
            {data.source}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {onViewDetails && (
            <motion.button
              className="flex-1 px-3 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onViewDetails}
            >
              <Eye className="w-3.5 h-3.5" />
              Detay
            </motion.button>
          )}
          {onExport && (
            <motion.button
              className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onExport}
              title="Excel'e aktar"
            >
              <Download className="w-3.5 h-3.5" />
            </motion.button>
          )}
          {onCompare && (
            <motion.button
              className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onCompare}
              title="Karşılaştır"
            >
              <Copy className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
