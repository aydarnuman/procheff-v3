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

interface RawDataViewProps {
  dataPool: DataPool;
  searchTerm: string;
}

export function RawDataView({ dataPool, searchTerm }: RawDataViewProps) {
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());

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
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            Kritik Tarihler (Kronolojik)
          </h3>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-purple-400/30"></div>

            <div className="space-y-4">
              {groupedData.criticalDates.map((date: CriticalDate, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-4"
                >
                  <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center relative z-10">
                    <Calendar className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="flex-1 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                    <div className="font-medium text-white mb-1">
                      {date.label}
                    </div>
                    <div className="text-lg text-slate-300">
                      {formatDate(date.value)}
                    </div>
                    <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {date.source}
                      {date.page && ` • Sayfa ${date.page}`}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
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
                <div className="p-4 bg-slate-900/50 border-t border-slate-700/50 max-h-96 overflow-y-auto">
                  <div className="space-y-3">
                    {doc.textBlocks
                      .filter(block => filterBySearch(block.text))
                      .map(block => (
                        <div key={block.block_id} className="p-3 bg-slate-800/30 rounded">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                              {block.block_id}
                            </span>
                            {(block as any).page_number && (
                              <span className="text-xs text-slate-500">
                                Sayfa: {(block as any).page_number}
                              </span>
                            )}
                          </div>
                          <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans">
                            {searchTerm ? highlightSearchTerm(block.text, searchTerm) : block.text}
                          </pre>
                        </div>
                      ))}
                  </div>
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