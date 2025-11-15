'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Building, 
  Calendar, 
  MapPin, 
  Clock, 
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { AILogger } from '@/lib/ai/logger';

interface Tender {
  id: string;
  title: string;
  organization: string;
  city: string;
  tenderType: string;
  publishDate: string;
  tenderDate: string;
  daysRemaining: number;
  workName?: string;
  tenderNumber?: string;
}

interface IhaleSelectorProps {
  onTenderSelect: (tender: Tender) => void;
  disabled?: boolean;
}

export function IhaleSelector({ onTenderSelect, disabled }: IhaleSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch ihale listesi
  const fetchTenders = async (refresh = false) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/ihale/list${refresh ? '?refresh=true' : ''}`);
      const data = await response.json();
      
      if (data.items) {
        setTenders(data.items);
        AILogger.info('İhale listesi alındı', { 
          count: data.items.length, 
          source: data.source 
        });
      }
    } catch (error) {
      console.error('İhale listesi alınamadı:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenders();
  }, []);

  // Filtered ve sorted tenders
  const filteredTenders = useMemo(() => {
    if (!searchQuery.trim()) return tenders.slice(0, 10); // İlk 10'u göster
    
    const query = searchQuery.toLowerCase().trim();
    return tenders.filter(tender => 
      tender.id.toLowerCase().includes(query) ||
      tender.title.toLowerCase().includes(query) ||
      tender.organization.toLowerCase().includes(query) ||
      tender.city.toLowerCase().includes(query) ||
      tender.tenderNumber?.toLowerCase().includes(query) ||
      tender.workName?.toLowerCase().includes(query)
    ).slice(0, 20); // Max 20 sonuç
  }, [tenders, searchQuery]);

  // İhale seçim handler
  const handleTenderSelect = async (tender: Tender) => {
    setSelectedTender(tender);
    setLoadingFiles(true);
    setShowResults(false);
    
    try {
      AILogger.info('İhale seçildi, dosyalar ekleniyor', { 
        tenderId: tender.id, 
        title: tender.title 
      });
      
      await onTenderSelect(tender);
    } catch (error) {
      console.error('İhale dosyaları eklenemedi:', error);
    } finally {
      setLoadingFiles(false);
    }
  };

  return (
    <div className="w-full mb-6">
      {/* Ana Panel */}
      <div className="bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60 backdrop-blur-xl rounded-2xl border border-purple-500/20 overflow-hidden">
        {/* Header */}
        <div 
          className="p-4 border-b border-slate-700/30 cursor-pointer flex items-center justify-between"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl flex items-center justify-center border border-purple-500/30">
              <Building className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">İhale Seçin</h3>
              <p className="text-xs text-slate-400">
                {selectedTender ? 
                  `Seçili: ${selectedTender.title.slice(0, 50)}...` :
                  'İhale ID girin veya listeden seçin'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loadingFiles && (
              <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
            )}
            {selectedTender && !loadingFiles && (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            )}
            {isExpanded ? 
              <ChevronUp className="w-4 h-4 text-slate-400" /> : 
              <ChevronDown className="w-4 h-4 text-slate-400" />
            }
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4">
                {/* Arama kutusu */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="İhale ID, başlık veya kurum ara..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowResults(true);
                    }}
                    onFocus={() => setShowResults(true)}
                    disabled={disabled || loadingFiles}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all disabled:opacity-50"
                  />
                  {loading && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-400 animate-spin" />
                  )}
                </div>

                {/* Hızlı Erişim Butonları */}
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchTenders(true)}
                    disabled={loading || loadingFiles}
                    className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-xs text-blue-300 transition-all disabled:opacity-50"
                  >
                    🔄 Yenile
                  </button>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setShowResults(false);
                      setSelectedTender(null);
                    }}
                    disabled={loadingFiles}
                    className="px-3 py-2 bg-slate-600/20 hover:bg-slate-600/30 border border-slate-600/30 rounded-lg text-xs text-slate-300 transition-all disabled:opacity-50"
                  >
                    ✨ Temizle
                  </button>
                </div>

                {/* Seçili İhale Bilgileri */}
                {selectedTender && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-xs font-medium text-green-300">Seçili İhale</span>
                    </div>
                    <div className="text-sm font-medium text-white mb-1">
                      {selectedTender.title}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                      <div className="flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        {selectedTender.organization}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {selectedTender.city}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(selectedTender.publishDate).toLocaleDateString('tr-TR')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {selectedTender.daysRemaining} gün kaldı
                      </div>
                    </div>
                    {loadingFiles && (
                      <div className="mt-2 pt-2 border-t border-green-500/20">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-3 h-3 text-green-400 animate-spin" />
                          <span className="text-xs text-green-300">Dosyalar ekleniyor...</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Sonuç Listesi */}
                <AnimatePresence>
                  {showResults && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="max-h-60 overflow-y-auto border border-slate-700/30 rounded-lg bg-slate-800/30 backdrop-blur-sm"
                    >
                      {filteredTenders.length > 0 ? (
                        <div className="divide-y divide-slate-700/30">
                          {filteredTenders.map((tender, index) => (
                            <motion.div
                              key={tender.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.02 }}
                              className="p-3 hover:bg-slate-700/30 cursor-pointer transition-all group"
                              onClick={() => handleTenderSelect(tender)}
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg flex items-center justify-center border border-purple-500/30">
                                  <FileText className="w-4 h-4 text-purple-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  {/* Başlık */}
                                  <div className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                                    {tender.title}
                                  </div>
                                  
                                  {/* İhale ID */}
                                  <div className="text-xs text-purple-400 font-mono mt-0.5">
                                    ID: {tender.id}
                                  </div>
                                  
                                  {/* Alt bilgiler - grid */}
                                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-slate-400">
                                    <div className="flex items-center gap-1">
                                      <Building className="w-3 h-3" />
                                      <span className="truncate">{tender.organization}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      <span>{tender.city}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      <span>{new Date(tender.publishDate).toLocaleDateString('tr-TR')}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock className={`w-3 h-3 ${
                                        tender.daysRemaining <= 3 ? 'text-red-400' :
                                        tender.daysRemaining <= 7 ? 'text-yellow-400' :
                                        'text-green-400'
                                      }`} />
                                      <span className={
                                        tender.daysRemaining <= 3 ? 'text-red-400' :
                                        tender.daysRemaining <= 7 ? 'text-yellow-400' :
                                        'text-green-400'
                                      }>
                                        {tender.daysRemaining} gün
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex-shrink-0">
                                  <Download className="w-4 h-4 text-slate-400 group-hover:text-purple-400 transition-colors" />
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-slate-400">
                          {loading ? (
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm">İhaleler aranıyor...</span>
                            </div>
                          ) : searchQuery ? (
                            <div>
                              <p className="text-sm">&apos;<span className="text-white">{searchQuery}</span>&apos; için sonuç bulunamadı</p>
                              <p className="text-xs mt-1">İhale ID, başlık veya kurum adı ile deneyin</p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm">İhale bulunamadı</p>
                              <button
                                onClick={() => fetchTenders(true)}
                                className="mt-2 px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded text-xs text-blue-300 transition-all"
                              >
                                🔄 Listeyi Yenile
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Usage Hint */}
                <div className="text-xs text-slate-500 text-center">
                  💡 İpucu: İhale ID girin (ör: 1762377106337) veya başlık/kurum ile arama yapın
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


