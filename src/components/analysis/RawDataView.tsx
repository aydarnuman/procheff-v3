'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Calendar,
  Hash,
  Info,
  ChevronDown,
  MapPin,
  User,
  AlertCircle,
  Building,
  DollarSign,
  Users,
  Clock
} from 'lucide-react';
import type { DataPool } from '@/lib/document-processor/types';
import {
  extractBasicInfo,
  extractCriticalDates,
  groupByDocument,
  extractDetails,
  formatDate,
  highlightSearchTerm,
  type BasicInfo,
  type CriticalDate,
  type GroupedDocument,
  type ExtractedDetails
} from '@/lib/analysis/helpers';
import { PaginatedTextViewer } from './PaginatedTextViewer';

interface RawDataViewProps {
  dataPool: DataPool;
  searchTerm: string;
}

export function RawDataView({ dataPool, searchTerm }: RawDataViewProps) {
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [showRawText, setShowRawText] = useState<Record<string, boolean>>({});

  // Group data logically
  const groupedData = useMemo(() => {
    return {
      basicInfo: extractBasicInfo(dataPool),
      criticalDates: extractCriticalDates(dataPool),
      documentContents: groupByDocument(dataPool),
      details: extractDetails(dataPool)
    };
  }, [dataPool]);

  // Toggle document expansion
  const toggleDoc = (docId: string) => {
    const newExpanded = new Set(expandedDocs);
    if (newExpanded.has(docId)) {
      newExpanded.delete(docId);
    } else {
      newExpanded.add(docId);
    }
    setExpandedDocs(newExpanded);
  };

  // Filter by search term
  const filterBySearch = (text: string) => {
    if (!searchTerm) return true;
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  };

  // Get icon for basic info type
  const getBasicInfoIcon = (key: string) => {
    switch (key) {
      case 'institution':
        return <Building className="w-5 h-5 text-blue-400" />;
      case 'budget':
        return <DollarSign className="w-5 h-5 text-green-400" />;
      case 'person_count':
        return <Users className="w-5 h-5 text-purple-400" />;
      default:
        return <Info className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      {groupedData.basicInfo.length > 0 && (
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-400" />
            Temel İhale Bilgileri
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groupedData.basicInfo.map((info: BasicInfo) => (
              <div key={info.key} className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-800/50 rounded-lg">
                    {getBasicInfoIcon(info.key)}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-slate-500 mb-1">{info.label}</div>
                    <div className="text-lg font-medium text-white">
                      {searchTerm ? highlightSearchTerm(info.value, searchTerm) : info.value}
                    </div>
                    <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Kaynak: {info.source}
                      {info.page && ` • Sayfa ${info.page}`}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Critical Dates */}
      {groupedData.criticalDates.length > 0 && (
        <div className="glass-card rounded-2xl p-5 border border-purple-500/15 bg-gradient-to-br from-purple-500/10 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              Kritik Tarihler
            </h3>
            <span className="text-xs text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full">
              Kronolojik
            </span>
          </div>

          <div className="space-y-3">
            {groupedData.criticalDates.map((date: CriticalDate, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 hover:border-purple-500/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-purple-300" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">
                    {date.label}
                  </div>
                  <div className="text-sm text-slate-300">
                    {formatDate(date.value)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                    <FileText className="w-3 h-3" />
                    {date.source}
                    {date.page && ` • Sayfa ${date.page}`}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Document Contents */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-green-400" />
          Doküman İçerikleri
        </h3>

        <div className="space-y-3">
          {groupedData.documentContents.map((doc: GroupedDocument) => (
            <div key={doc.doc_id} className="border border-slate-700/50 rounded-lg overflow-hidden">
              <div
                className="p-4 bg-slate-800/30 cursor-pointer hover:bg-slate-800/50 transition-colors"
                onClick={() => toggleDoc(doc.doc_id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium text-white">{doc.name}</span>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-slate-400">{doc.type_guess}</span>
                      <span className="text-xs text-slate-400">
                        {(doc.size / 1024).toFixed(1)} KB
                      </span>
                      <span className="text-xs text-slate-400">
                        {doc.textBlocks.length} metin bloğu
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform ${
                      expandedDocs.has(doc.doc_id) ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Expanded content */}
              {expandedDocs.has(doc.doc_id) && (
                <div className="p-4 bg-slate-900/50 border-t border-slate-700/50">
                  {/* Toggle between blocks view and raw text view */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setShowRawText(prev => ({ ...prev, [doc.doc_id]: !prev[doc.doc_id] }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        showRawText[doc.doc_id]
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'bg-slate-700/50 text-slate-400 hover:text-white'
                      }`}
                    >
                      {showRawText[doc.doc_id] ? '📄 Ham Metin' : '📋 Bloklar'}
                    </button>
                  </div>

                  {showRawText[doc.doc_id] ? (
                    /* Paginated Raw Text View */
                    <PaginatedTextViewer
                      text={doc.textBlocks
                        .filter(block => filterBySearch(block.text))
                        .map(block => block.text)
                        .join('\n\n')}
                      linesPerPage={50}
                    />
                  ) : (
                    /* Blocks View */
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {doc.textBlocks
                        .filter(block => filterBySearch(block.text))
                        .map(block => (
                          <div key={block.block_id} className="p-3 bg-slate-800/30 rounded">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                                {block.block_id}
                              </span>
                              <div className="flex items-center gap-2">
                                {block.page && (
                                  <span className="text-xs text-slate-500">
                                    Sayfa: {block.page}
                                  </span>
                                )}
                                {block.source && (
                                  <span className="text-xs text-cyan-400 flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    {block.source}
                                  </span>
                                )}
                              </div>
                            </div>
                            <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans">
                              {searchTerm ? highlightSearchTerm(block.text, searchTerm) : block.text}
                            </pre>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Detected Details */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Hash className="w-5 h-5 text-orange-400" />
          Tespit Edilen Detaylar
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Locations */}
          {groupedData.details.locations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Lokasyonlar
              </h4>
              <div className="space-y-2">
                {groupedData.details.locations.map((loc, i) => (
                  <div key={i} className="p-2 bg-slate-800/30 rounded border border-slate-700/50">
                    <div className="text-sm text-white">
                      {searchTerm ? highlightSearchTerm(loc.value, searchTerm) : loc.value}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {loc.source}
                      {(loc as any).page_number && ` • S.${(loc as any).page_number}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Officials */}
          {groupedData.details.officials.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Yetkililer
              </h4>
              <div className="space-y-2">
                {groupedData.details.officials.map((off, i) => (
                  <div key={i} className="p-2 bg-slate-800/30 rounded border border-slate-700/50">
                    <div className="text-sm text-white">
                      {searchTerm ? highlightSearchTerm(off.value, searchTerm) : off.value}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {off.source}
                      {(off as any).page_number && ` • S.${(off as any).page_number}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Special Conditions */}
          {groupedData.details.conditions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Özel Şartlar
              </h4>
              <div className="space-y-2">
                {groupedData.details.conditions.map((cond, i) => (
                  <div key={i} className="p-2 bg-slate-800/30 rounded border border-slate-700/50">
                    <div className="text-sm text-white">
                      {searchTerm ? highlightSearchTerm(cond.value, searchTerm) : cond.value}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {cond.source}
                      {(cond as any).page_number && ` • S.${(cond as any).page_number}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Empty state if no details found */}
        {groupedData.details.locations.length === 0 &&
         groupedData.details.officials.length === 0 &&
         groupedData.details.conditions.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Henüz tespit edilen detay bulunmamaktadır.</p>
          </div>
        )}
      </div>
    </div>
  );
}