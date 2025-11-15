'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, FileText, Calendar, Hash, Users, type LucideIcon } from 'lucide-react';
import type { DataPool } from '@/lib/document-processor/types';
import { Badge } from '@/components/shared/ui/Badge';
import { staggerContainer, staggerItem } from '@/lib/utils/animation-variants';

interface EnhancedRawDataViewerProps {
  dataPool: DataPool;
  searchTerm?: string;
}

export function EnhancedRawDataViewer({ dataPool, searchTerm = '' }: EnhancedRawDataViewerProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Extract basic info
  const basicInfo = dataPool.basicInfo || {};

  // Group text blocks by document
  const groupedBlocks = dataPool.textBlocks.reduce((acc, block: any) => {
    const source = block.source || block.doc_id;
    if (!acc[source]) acc[source] = [];
    acc[source].push(block);
    return acc;
  }, {} as Record<string, typeof dataPool.textBlocks>);

  // Highlight search term
  const highlightText = (text: string) => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.split(regex).map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-500/30 text-yellow-200">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Basic Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {basicInfo.kurum && (
          <InfoCard
            icon={FileText}
            label="Kurum"
            value={basicInfo.kurum}
            color="blue"
          />
        )}
        {basicInfo.butce && (
          <InfoCard
            icon={Hash}
            label="Bütçe"
            value={basicInfo.butce}
            color="green"
          />
        )}
        {basicInfo.kisilik && (
          <InfoCard
            icon={Users}
            label="Kişilik"
            value={basicInfo.kisilik}
            color="purple"
          />
        )}
        {basicInfo.sure && (
          <InfoCard
            icon={Calendar}
            label="Süre"
            value={basicInfo.sure}
            color="orange"
          />
        )}
      </div>

      {/* Dates Timeline */}
      {dataPool.dates.length > 0 && (
        <motion.div variants={staggerItem} className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              Tarihler
            </h3>
            <Badge variant="purple" size="sm">{dataPool.dates.length}</Badge>
          </div>
          <div className="space-y-3">
            {dataPool.dates.slice(0, 5).map((date, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/30 transition-colors"
                variants={staggerItem}
              >
                <div className="w-2 h-2 rounded-full bg-purple-400" />
                <span className="text-white font-medium">{(date as any).formatted || (date as any).value}</span>
                {(date as any).label && (
                  <span className="text-slate-400 text-sm">• {(date as any).label}</span>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Grouped Text Blocks by Document */}
      {Object.entries(groupedBlocks).map(([source, blocks]) => (
        <motion.div
          key={source}
          variants={staggerItem}
          className="glass-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold">{source}</h3>
              <p className="text-slate-400 text-sm mt-1">
                {blocks.length} metin bloğu
              </p>
            </div>
            <button
              onClick={() => handleCopy(blocks.map((b: any) => b.text).join('\n\n'), source)}
              className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-300 text-sm transition-colors flex items-center gap-2"
            >
              {copiedSection === source ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  Kopyalandı
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Kopyala
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            {blocks.slice(0, 10).map((block, i) => (
              <div
                key={i}
                className="text-slate-300 text-sm leading-relaxed p-3 rounded-lg bg-slate-800/30"
              >
                {highlightText((block as any).text)}
                {(block as any).page && (
                  <span className="text-xs text-slate-500 ml-2">
                    (Sayfa {(block as any).page})
                  </span>
                )}
              </div>
            ))}
            {blocks.length > 10 && (
              <p className="text-slate-500 text-sm text-center">
                +{blocks.length - 10} blok daha...
              </p>
            )}
          </div>
        </motion.div>
      ))}

      {/* Entities */}
      {dataPool.entities.length > 0 && (
        <motion.div variants={staggerItem} className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Tespit Edilen Varlıklar</h3>
            <Badge variant="info" size="sm">{dataPool.entities.length}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {dataPool.entities.slice(0, 20).map((entity: any, i) => (
              <Badge key={i} variant="default" size="sm">
                {entity.text}
                {entity.type && (
                  <span className="ml-1.5 text-[10px] opacity-60">
                    ({entity.type})
                  </span>
                )}
              </Badge>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  color
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  color: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  };

  return (
    <motion.div
      className="glass-card p-4"
      variants={staggerItem}
      whileHover={{ scale: 1.02, y: -2 }}
    >
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color as keyof typeof colorClasses]} border flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-white font-semibold text-sm">{value}</p>
    </motion.div>
  );
}
