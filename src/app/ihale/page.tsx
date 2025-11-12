'use client';
import { MetricCard } from '@/components/ui/MetricCard';
import { usePipelineStore } from '@/store/usePipelineStore';
import { motion } from 'framer-motion';
import { AlertTriangle, Building2, Calendar, Clock, Cloud, Database, ExternalLink, FileText, Loader2, MapPin, RefreshCw, Search, Sparkles, TrendingUp, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

// Gün farkı hesaplama
function getDaysRemaining(dateStr: string | null | undefined): number | null {
  if (!dateStr || dateStr === '-') return null;

  try {
    let targetDate: Date;

    // DD.MM.YYYY formatını kontrol et
    if (dateStr.includes('.')) {
      const parts = dateStr.split('.');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JavaScript ayları 0-11 arası
        const year = parseInt(parts[2], 10);
        targetDate = new Date(year, month, day);
      } else {
        return null;
      }
    }
    // DD/MM/YYYY veya diğer formatlar için
    else if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        targetDate = new Date(year, month, day);
      } else {
        return null;
      }
    }
    // ISO format (YYYY-MM-DD) veya diğer standart formatlar
    else {
      targetDate = new Date(dateStr);
    }

    // Geçersiz tarih kontrolü
    if (isNaN(targetDate.getTime())) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  } catch {
    return null;
  }
}

// Renk belirleme
function getUrgencyColor(days: number | null): { bg: string; text: string; border: string; label: string } {
  if (days === null || days < 0) return { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30', label: 'Geçti' };
  if (days === 0) return { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/40', label: 'BUGÜN!' };
  if (days === 1) return { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/40', label: '1 gün' };
  if (days === 2) return { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/40', label: '2 gün' };
  if (days === 3) return { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/40', label: '3 gün' };
  if (days === 4) return { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/40', label: '4 gün' };
  if (days === 5) return { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/40', label: '5 gün' };
  if (days === 6) return { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/40', label: '6 gün' };
  if (days === 7) return { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/40', label: '7 gün' };
  return { bg: 'bg-transparent', text: 'text-gray-400', border: 'border-transparent', label: `${days} gün` };
}

export default function IhalePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'worker' | 'database'>('database');
  const [searchTerm, setSearchTerm] = useState('');

  const router = useRouter();
  const { startNewPipeline, resetPipeline } = usePipelineStore();

  const fetchTenders = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
        // Login first for refresh
        const loginRes = await fetch('/api/ihale/login', { method: 'POST' });
        if (!loginRes.ok) throw new Error('Login failed');
      }

      // Get list (with refresh param if needed)
      const url = refresh ? '/api/ihale/list?refresh=true' : '/api/ihale/list';
      const listRes = await fetch(url);
      const data = await listRes.json();
      if (!listRes.ok) throw new Error(data.error);

      setItems(data.items);
      setDataSource(data.source || 'database');
      setError('');

      // If database is empty on first load, auto-refresh from worker
      if (!refresh && data.items.length === 0) {
        console.log('📭 Database is empty, auto-refreshing from worker...');
        setTimeout(() => fetchTenders(true), 100);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  useEffect(() => {
    // First load: read from database (fast!)
    // If database is empty, will auto-refresh from worker
    // User can click "Yenile" button to manually refresh
    fetchTenders(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter items based on search term (must be before early returns to follow Rules of Hooks)
  const filteredItems = useMemo(() => {
    if (!searchTerm || !searchTerm.trim()) {
      return items;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    
    return items.filter((item) => {
      if (!item) return false;
      
      // Helper function to safely get string value
      const getString = (value: any): string => {
        if (value === null || value === undefined) return '';
        return String(value).toLowerCase();
      };
      
      // Kayıt No (tenderNumber) - try to extract from title if missing
      let tenderNumber = getString(item.tenderNumber || item.tender_number || item.ilan_no || item.ihale_no || item.number);
      
      // If tenderNumber is missing, try to extract from title
      if (!tenderNumber && item.title) {
        const titleStr = String(item.title);
        const patterns = [
          /^(\d{4}\/\d+)\s*-\s*/,      // 2025/1845237
          /^(ILN\d+)\s*-\s*/i,         // ILN02328625
          /^(\d{2}DT\d+)\s*-\s*/i,     // 25DT2004948
          /^([A-Z]{2,}\d+)\s*-\s*/i    // Other formats
        ];
        
        for (const pattern of patterns) {
          const match = titleStr.match(pattern);
          if (match) {
            tenderNumber = match[1].toLowerCase();
            break;
          }
        }
      }
      
      // İsim (title, workName)
      const title = getString(item.title);
      const workName = getString(item.workName || item.work_name || item.isin_adi);
      
      // Şehir
      const city = getString(item.city || item.sehir || item.il);
      
      // Kurum (içerik araması için)
      const organization = getString(item.organization || item.kurum || item.kurumAdi);
      
      // İhale türü
      const tenderType = getString(item.tenderType || item.tender_type);
      
      // Genel içerik araması (tüm alanlar)
      return (
        (tenderNumber && tenderNumber.includes(searchLower)) ||
        (title && title.includes(searchLower)) ||
        (workName && workName.includes(searchLower)) ||
        (city && city.includes(searchLower)) ||
        (organization && organization.includes(searchLower)) ||
        (tenderType && tenderType.includes(searchLower))
      );
    });
  }, [items, searchTerm]);

  if (loading) {
    return (
      <div className="min-h-screen p-6 md:p-8 flex items-center justify-center">
        <div className="glass-card p-8 rounded-2xl text-center">
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-lg text-slate-300">İhaleler yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 md:p-8 flex items-center justify-center">
        <div className="glass-card p-8 rounded-2xl text-center border-red-500/30">
          <div className="text-red-400 text-lg mb-2">Hata Oluştu</div>
          <div className="text-slate-300">{error}</div>
          <button
            onClick={() => fetchTenders(false)}
            className="mt-6 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg border border-indigo-500/30 transition-all"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  // Calculate statistics (use filtered items if searching, otherwise all items)
  const calculateStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let newToday = 0;
    let urgentToday = 0;
    let urgentWeek = 0;

    const itemsToProcess = searchTerm ? filteredItems : items;
    itemsToProcess.forEach((item) => {
      const tenderDate = item.tenderDate || item.date || item.ihaleTarihi || item.tarih;
      const daysRemaining = item.daysRemaining !== undefined ? item.daysRemaining : getDaysRemaining(tenderDate);
      
      // Yeni eklenen (bugün eklenen - publish date kontrolü)
      const publishDate = item.publishDate || item.publish_date;
      if (publishDate) {
        const pubDate = new Date(publishDate);
        pubDate.setHours(0, 0, 0, 0);
        if (pubDate.getTime() === today.getTime()) {
          newToday++;
        }
      }

      // Bugün teklif verilecek
      if (daysRemaining === 0) {
        urgentToday++;
      }

      // 7 gün içinde acil
      if (daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7) {
        urgentWeek++;
      }
    });

    return {
      total: searchTerm ? filteredItems.length : items.length,
      newToday,
      urgentToday,
      urgentWeek,
    };
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen p-2">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="mb-6 px-2">
          <h1 className="text-2xl font-bold text-white mb-1">Hazır Yemek - Lokantacılık İhaleleri</h1>
          <p className="text-sm text-slate-400">
            İhale listesi
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 px-2">
          <MetricCard
            title="Toplam İhale"
            value={stats.total}
            icon={FileText}
            iconColor="text-indigo-400"
            iconBg="bg-indigo-500/20"
            gradientFrom="from-indigo-500/10"
            gradientTo="to-purple-500/10"
          />
          <MetricCard
            title="Yeni Eklenen"
            value={stats.newToday}
            icon={Sparkles}
            iconColor="text-emerald-400"
            iconBg="bg-emerald-500/20"
            gradientFrom="from-emerald-500/10"
            gradientTo="to-teal-500/10"
            description="Bugün eklenen ihaleler"
          />
          <MetricCard
            title="Bugün Son Gün"
            value={stats.urgentToday}
            icon={AlertTriangle}
            iconColor="text-red-400"
            iconBg="bg-red-500/20"
            gradientFrom="from-red-500/10"
            gradientTo="to-orange-500/10"
            description="Bugün teklif verilecek"
          />
          <MetricCard
            title="Acil İhaleler"
            value={stats.urgentWeek}
            icon={TrendingUp}
            iconColor="text-amber-400"
            iconBg="bg-amber-500/20"
            gradientFrom="from-amber-500/10"
            gradientTo="to-yellow-500/10"
            description="7 gün içinde"
          />
        </div>

        {/* Header Actions */}
        <div className="mb-3 px-2 flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-400">
                Toplam <span className="text-indigo-400 font-semibold">{items.length}</span> ihale bulundu
                {searchTerm && (
                  <span className="ml-2 text-slate-500">
                    (<span className="text-indigo-400">{filteredItems.length}</span> filtrelenmiş)
                  </span>
                )}
              </p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800/50 rounded text-[10px] text-slate-400">
                {dataSource === 'worker' ? (
                  <>
                    <Cloud className="w-3 h-3" />
                    Worker
                  </>
                ) : (
                  <>
                    <Database className="w-3 h-3" />
                    Database
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Search Bar - Database'den Yenile butonuna kadar uzar */}
          <div className="flex items-center gap-2 flex-1">
            <div className="relative w-full group">
              {/* Subtle shimmer glow effect */}
              <div className="absolute -inset-0.5 bg-linear-to-r from-white/5 via-white/10 to-white/5 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 animate-pulse"></div>
              
              <div className="relative bg-linear-to-br from-slate-900/60 via-slate-800/50 to-slate-900/60 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl shadow-black/30 overflow-hidden">
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <div className="p-1.5 rounded-lg bg-slate-700/30 border border-white/10 backdrop-blur-sm">
                    <Search className="h-4 w-4 text-slate-300" />
                  </div>
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ara..."
                  className="w-full pl-14 pr-12 py-2.5 bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition-all relative z-10"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-200 hover:scale-110 transition-all duration-200 z-10"
                    title="Temizle"
                  >
                    <div className="p-1 rounded-full hover:bg-slate-700/50 transition-colors">
                      <X className="h-4 w-4" />
                    </div>
                  </button>
                )}
                
                {/* Subtle border shimmer */}
                <div className="absolute inset-0 rounded-xl border border-white/5 group-hover:border-white/20 transition-all duration-500 pointer-events-none"></div>
              </div>
            </div>
            {searchTerm && (
              <motion.span 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800/50 border border-white/10 backdrop-blur-sm text-xs"
              >
                <Search className="h-3 w-3 text-slate-300" />
                <span className="text-slate-200 font-semibold">{filteredItems.length}</span>
              </motion.span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => fetchTenders(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg border border-indigo-500/30 hover:border-indigo-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">
                {refreshing ? 'Yenileniyor...' : 'Yenile'}
              </span>
            </button>
          </div>
        </div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative rounded-2xl overflow-hidden bg-linear-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-2xl"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50 bg-linear-to-r from-indigo-500/10 via-purple-500/5 to-pink-500/5">
                  <th className="text-center px-3 py-3 text-xs font-medium text-indigo-300/80 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>Aciliyet</span>
                    </div>
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-indigo-300/80 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3 h-3" />
                      <span>Kayıt No</span>
                    </div>
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-indigo-300/80 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3 h-3" />
                      <span>Kurum</span>
                    </div>
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-indigo-300/80 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3 h-3" />
                      <span>İşin Adı</span>
                    </div>
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-indigo-300/80 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" />
                      <span>Şehir</span>
                    </div>
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-medium text-indigo-300/80 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>Teklif</span>
                    </div>
                  </th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-indigo-300/80 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <ExternalLink className="w-3 h-3" />
                      <span>Kaynak</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item, index) => {
                  // API'den gelen değerleri kullan
                  const tenderDate = item.tenderDate || item.date || item.ihaleTarihi || item.tarih;
                  const daysRemaining = item.daysRemaining !== undefined ? item.daysRemaining : getDaysRemaining(tenderDate);
                  const urgency = getUrgencyColor(daysRemaining);
                  const isLoading = loadingItemId === item.id;

                  return (
                      <motion.tr
                      key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.02 }}
                        whileHover={{ 
                          y: -2,
                          backgroundColor: 'rgba(99, 102, 241, 0.1)',
                          transition: { duration: 0.2 }
                        }}
                        onClick={() => {
                          // Spinner'ı göster (sayfa değişmeden önce)
                          setLoadingItemId(item.id);
                          
                          // Pipeline'ı başlat
                          startNewPipeline({
                            id: item.id,
                            tenderNumber: item.tenderNumber || item.tender_number || '',
                            title: item.title || '',
                            organization: item.organization || item.kurum || item.kurumAdi || '',
                            city: item.city || item.sehir || item.il || '',
                            tenderType: item.tenderType || item.tender_type || '',
                            partialBidAllowed: item.partialBidAllowed || item.partial_bid_allowed || false,
                            publishDate: item.publishDate || item.publish_date || '',
                            tenderDate: tenderDate || '',
                            daysRemaining: daysRemaining,
                            url: item.url || ''
                          });
                          
                          // State güncellemesinin tamamlanmasını bekle, sonra spinner görünsün
                          // React state güncellemesi asenkron, bu yüzden birkaç frame bekliyoruz
                          // Spinner'ın render olması için yeterli zaman ver
                          requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                              // Spinner görünsün diye yeterli süre bekle (600ms)
                              setTimeout(() => {
                                router.push(`/ihale/${item.id}`);
                              }, 600);
                            });
                          });
                        }}
                      className={`
                        border-b border-slate-800/30
                          transition-all duration-300 group
                          ${index % 2 === 0 ? 'bg-slate-900/5' : 'bg-transparent'}
                          hover:bg-indigo-500/10 hover:shadow-lg hover:shadow-indigo-500/10
                          hover:border-indigo-500/30
                          cursor-pointer
                      `}
                    >
                      {/* Aciliyet Badge */}
                      <td className="px-3 py-3">
                        <div className="flex justify-center items-center">
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                          ) : daysRemaining !== null && daysRemaining <= 7 ? (
                            <motion.span
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              whileHover={{ scale: 1.1 }}
                              className={`
                                inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium
                                border whitespace-nowrap backdrop-blur-sm
                              ${urgency.bg} ${urgency.text} ${urgency.border}
                                shadow-md
                              `}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                urgency.text.includes('red') ? 'bg-red-400' :
                                urgency.text.includes('orange') ? 'bg-orange-400' :
                                urgency.text.includes('yellow') ? 'bg-yellow-400' :
                                'bg-gray-400'
                              } animate-pulse`} />
                              {urgency.label}
                            </motion.span>
                          ) : (
                            <span className="text-slate-500/80 text-xs font-normal">
                              {daysRemaining ? `${daysRemaining} gün` : '-'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Kayıt Numarası */}
                      <td className="px-3 py-3">
                        <div className="group/item">
                          {(() => {
                            // Try multiple field names
                            let tenderNumber = item.tenderNumber || item.tender_number || item.ilan_no || item.ihale_no || item.number;
                            
                            // If tenderNumber is missing or '-', try to extract from title
                            if ((!tenderNumber || tenderNumber === '-') && item.title) {
                              // Try multiple patterns: "2025/1845237 - ...", "ILN02328625 - ...", "25DT2004948 - ..."
                              const patterns = [
                                /^(\d{4}\/\d+)\s*-\s*/,      // 2025/1845237
                                /^(ILN\d+)\s*-\s*/i,         // ILN02328625
                                /^(\d{2}DT\d+)\s*-\s*/i,     // 25DT2004948
                                /^([A-Z]{2,}\d+)\s*-\s*/i    // Other formats
                              ];
                              
                              for (const pattern of patterns) {
                                const match = item.title.match(pattern);
                                if (match) {
                                  tenderNumber = match[1];
                                  break;
                                }
                              }
                            }
                            
                            if (tenderNumber && tenderNumber !== '-') {
                              return (
                                <div className="flex flex-col gap-0.5">
                                  <div className="text-indigo-400/90 text-xs font-medium group-hover/item:text-indigo-300 transition-colors leading-tight whitespace-nowrap">
                                    {tenderNumber}
                                  </div>
                                  <div className="text-[10px] text-slate-500/60 font-mono opacity-60">
                                    ID: {item.id?.toString().slice(-6) || 'N/A'}
                                  </div>
                                </div>
                              );
                            }
                            
                            // Fallback: show ID if no tender number
                            return (
                              <div className="flex flex-col gap-0.5">
                                <div className="text-slate-500/70 text-xs font-mono font-light">
                                  {item.id?.toString().slice(-8) || 'N/A'}
                                </div>
                                <div className="text-[10px] text-slate-600/60 italic font-light">
                                  No number
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Kurum */}
                      <td className="px-3 py-3">
                        <div className="text-slate-300/90 text-xs font-normal max-w-[250px] truncate group-hover:text-white transition-colors leading-relaxed" title={item.organization || item.kurum || item.kurumAdi || '-'}>
                          {item.organization || item.kurum || item.kurumAdi || '-'}
                        </div>
                      </td>

                      {/* İşin Adı */}
                      <td className="px-3 py-3">
                        <div className="text-slate-300/90 text-xs font-normal max-w-[300px] truncate group-hover:text-white transition-colors leading-relaxed" title={item.workName || item.work_name || item.isin_adi || item.title || '-'}>
                          {item.workName || item.work_name || item.isin_adi || item.title || '-'}
                        </div>
                      </td>

                      {/* Şehir */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-indigo-400/70" />
                          <span className="text-slate-300/90 text-xs font-normal whitespace-nowrap group-hover:text-white transition-colors">
                            {item.city || item.sehir || item.il || '-'}
                          </span>
                        </div>
                      </td>

                      {/* Teklif Tarihi */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-indigo-400/70" />
                          <span className="text-white/90 text-xs font-normal whitespace-nowrap group-hover:text-indigo-300 transition-colors">
                            {tenderDate || '-'}
                          </span>
                        </div>
                      </td>

                      {/* Orijinal İhale Sayfası */}
                      <td className="px-3 py-3">
                        <div className="flex justify-center">
                          {item.url ? (
                            <motion.a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => {
                                e.stopPropagation(); // Row click'i engelle
                              }}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-500/20 text-indigo-400/90 text-xs font-medium rounded-md border border-indigo-500/30 hover:bg-indigo-500/30 hover:text-indigo-300 hover:border-indigo-400/50 transition-all duration-200 backdrop-blur-sm"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>İhaleBul</span>
                            </motion.a>
                          ) : (
                            <span className="text-slate-600/60 text-xs font-light">-</span>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Search className="w-8 h-8 text-slate-500/50" />
                        <p className="text-slate-400 text-sm">
                          {searchTerm ? (
                            <>
                              "<span className="text-indigo-400 font-semibold">{searchTerm}</span>" için sonuç bulunamadı
                            </>
                          ) : (
                            'İhale bulunamadı'
                          )}
                        </p>
                        {searchTerm && (
                          <button
                            onClick={() => setSearchTerm('')}
                            className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                          >
                            Aramayı temizle
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {items.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="inline-flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-slate-800/50 border border-slate-700/50">
                  <FileText className="w-12 h-12 text-slate-500" />
                </div>
                <div>
                  <p className="text-slate-400 text-lg font-semibold mb-2">Henüz ihale bulunamadı</p>
                  <p className="text-slate-500 text-sm">"Yenile" butonuna basarak ihaleleri çekebilirsiniz</p>
                </div>
            </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
