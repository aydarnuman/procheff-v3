'use client';

import { motion } from 'framer-motion';
import { Brain, Clock, DollarSign, Sparkles, Download, Share2, Archive } from 'lucide-react';
import { Badge } from '@/components/shared/ui/Badge';
import { StatsGauge } from './StatsGauge';
import { QuickActionsDropdown } from './QuickActionsDropdown';
import { fadeInDown } from '@/lib/utils/animation-variants';

interface AnalysisHeaderProps {
  title: string;
  duration?: number;
  tokenUsage?: number;
  cost?: number;
  confidence?: number;
  model?: string;
  status?: 'completed' | 'processing' | 'error';
  onExport?: () => void;
  onShare?: () => void;
  onArchive?: () => void;
}

export function AnalysisHeader({
  title,
  duration,
  tokenUsage,
  cost,
  confidence = 85,
  model = 'Claude Sonnet 4.5',
  status = 'completed',
  onExport,
  onShare,
  onArchive
}: AnalysisHeaderProps) {
  return (
    <motion.div
      className="glass-card rounded-xl p-6 mb-6"
      variants={fadeInDown}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-start justify-between">
        {/* Left: Title & Model */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <Brain className="w-8 h-8 text-indigo-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">{title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="purple" size="sm" icon={Sparkles}>
                  {model}
                </Badge>
                <Badge
                  variant={status === 'completed' ? 'success' : status === 'error' ? 'error' : 'info'}
                  size="sm"
                  pulse={status === 'processing'}
                  dot
                >
                  {status === 'completed' ? 'Tamamlandı' : status === 'error' ? 'Hata' : 'İşleniyor'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Stats Ticker */}
          <div className="flex flex-wrap gap-4">
            {duration && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">
                  {duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(1)}s`}
                </span>
              </div>
            )}

            {tokenUsage && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">TOKENS:</span>
                <span className="text-sm text-slate-300 font-mono">
                  {tokenUsage.toLocaleString()}
                </span>
              </div>
            )}

            {cost !== undefined && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400 font-medium">
                  ${cost.toFixed(4)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Confidence Gauge & Actions */}
        <div className="flex items-center gap-4">
          <StatsGauge value={confidence} label="Güven" />

          <QuickActionsDropdown
            actions={[
              { label: 'PDF İndir', icon: Download, onClick: onExport },
              { label: 'Paylaş', icon: Share2, onClick: onShare },
              { label: 'Arşivle', icon: Archive, onClick: onArchive }
            ].filter(a => a.onClick)}
          />
        </div>
      </div>
    </motion.div>
  );
}
