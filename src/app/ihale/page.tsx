'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink, Loader2, RefreshCw, Database, Cloud, Download, FileText, FileSpreadsheet, FileJson } from 'lucide-react';
import { usePipelineStore } from '@/store/usePipelineStore';

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
  const [exporting, setExporting] = useState<'csv' | 'json' | 'txt' | null>(null);

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

  const handleExport = async (format: 'csv' | 'json' | 'txt') => {
    try {
      setExporting(format);

      // First, ensure we have a session by logging in
      const loginRes = await fetch('/api/ihale/login', { method: 'POST' });
      if (!loginRes.ok) throw new Error('Login failed');

      // Call export API endpoint
      const exportRes = await fetch(`/api/ihale/proxy?endpoint=/export&format=${format}`);
      if (!exportRes.ok) throw new Error('Export failed');

      // Get the blob and download it
      const blob = await exportRes.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ihaleler_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      alert(`Export hatası: ${e.message}`);
    } finally {
      setExporting(null);
    }
  };

  useEffect(() => {
    // First load: read from database (fast!)
    // If database is empty, will auto-refresh from worker
    // User can click "Yenile" button to manually refresh
    fetchTenders(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div className="min-h-screen p-2">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="mb-3 px-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Hazır Yemek - Lokantacılık İhaleleri</h1>
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-400">
                Toplam <span className="text-indigo-400 font-semibold">{items.length}</span> ihale bulundu
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

          <div className="flex items-center gap-2">
            {/* Export Buttons */}
            <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-800/40 rounded-lg border border-slate-700/50">
              <Download className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400 mr-2">Dışa Aktar:</span>

              <button
                type="button"
                onClick={() => handleExport('csv')}
                disabled={exporting !== null || items.length === 0}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded border border-green-500/30 hover:border-green-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Excel/CSV formatında indir"
              >
                <FileSpreadsheet className={`w-3.5 h-3.5 ${exporting === 'csv' ? 'animate-pulse' : ''}`} />
                <span className="text-xs font-medium">CSV</span>
              </button>

              <button
                type="button"
                onClick={() => handleExport('json')}
                disabled={exporting !== null || items.length === 0}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded border border-blue-500/30 hover:border-blue-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="JSON formatında indir"
              >
                <FileJson className={`w-3.5 h-3.5 ${exporting === 'json' ? 'animate-pulse' : ''}`} />
                <span className="text-xs font-medium">JSON</span>
              </button>

              <button
                type="button"
                onClick={() => handleExport('txt')}
                disabled={exporting !== null || items.length === 0}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded border border-purple-500/30 hover:border-purple-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Metin dosyası olarak indir"
              >
                <FileText className={`w-3.5 h-3.5 ${exporting === 'txt' ? 'animate-pulse' : ''}`} />
                <span className="text-xs font-medium">TXT</span>
              </button>
            </div>

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
        <div className="glass-card rounded-lg border border-indigo-500/30 overflow-hidden shadow-2xl shadow-indigo-500/10">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-indigo-500/20 bg-slate-900/30">
                  <th className="text-center px-2 py-2 text-[10px] font-semibold text-indigo-400 whitespace-nowrap">Aciliyet</th>
                  <th className="text-left px-2 py-2 text-[10px] font-semibold text-indigo-400">Başlık</th>
                  <th className="text-left px-2 py-2 text-[10px] font-semibold text-indigo-400">Kurum</th>
                  <th className="text-left px-2 py-2 text-[10px] font-semibold text-indigo-400 whitespace-nowrap">Şehir</th>
                  <th className="text-left px-2 py-2 text-[10px] font-semibold text-indigo-400 whitespace-nowrap">İhale Türü</th>
                  <th className="text-center px-2 py-2 text-[10px] font-semibold text-indigo-400 whitespace-nowrap">Kısmi</th>
                  <th className="text-left px-2 py-2 text-[10px] font-semibold text-indigo-400 whitespace-nowrap">Yayın</th>
                  <th className="text-left px-2 py-2 text-[10px] font-semibold text-indigo-400 whitespace-nowrap">Teklif</th>
                  <th className="text-right px-2 py-2 text-[10px] font-semibold text-indigo-400 whitespace-nowrap">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  // API'den gelen değerleri kullan
                  const tenderDate = item.tenderDate || item.date || item.ihaleTarihi || item.tarih;
                  const daysRemaining = item.daysRemaining !== undefined ? item.daysRemaining : getDaysRemaining(tenderDate);
                  const urgency = getUrgencyColor(daysRemaining);
                  const isLoading = loadingItemId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`
                        border-b border-slate-800/30
                        hover:bg-indigo-500/10 hover:shadow-lg hover:shadow-indigo-500/5
                        transition-all duration-300
                        ${index % 2 === 0 ? 'bg-slate-900/10' : 'bg-transparent'}
                      `}
                    >
                      {/* Aciliyet Badge */}
                      <td className="px-2 py-2">
                        <div className="flex justify-center">
                          {daysRemaining !== null && daysRemaining <= 7 ? (
                            <span className={`
                              px-2 py-1 rounded-md text-[10px] font-bold
                              border whitespace-nowrap
                              ${urgency.bg} ${urgency.text} ${urgency.border}
                              animate-pulse
                            `}>
                              {urgency.label}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-xs">{daysRemaining ? `${daysRemaining} gün` : '-'}</span>
                          )}
                        </div>
                      </td>

                      {/* Başlık */}
                      <td className="px-2 py-2">
                        <div className="text-slate-300 text-xs max-w-[300px] truncate" title={item.title || '-'}>
                          {item.title || '-'}
                        </div>
                      </td>

                      {/* Kurum */}
                      <td className="px-2 py-2">
                        <div className="text-slate-300 text-xs max-w-[250px] truncate" title={item.organization || item.kurum || item.kurumAdi || '-'}>
                          {item.organization || item.kurum || item.kurumAdi || '-'}
                        </div>
                      </td>

                      {/* Şehir */}
                      <td className="px-2 py-2">
                        <div className="text-slate-300 text-xs whitespace-nowrap">
                          {item.city || item.sehir || item.il || '-'}
                        </div>
                      </td>

                      {/* İhale Türü */}
                      <td className="px-2 py-2">
                        <div className="text-slate-300 text-xs max-w-[180px] truncate" title={item.tenderType || '-'}>
                          {item.tenderType || '-'}
                        </div>
                      </td>

                      {/* Kısmi Teklif */}
                      <td className="px-2 py-2">
                        <div className="flex justify-center">
                          {item.partialBidAllowed ? (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-bold rounded border border-green-500/30">
                              ✓
                            </span>
                          ) : (
                            <span className="text-gray-500 text-xs">-</span>
                          )}
                        </div>
                      </td>

                      {/* Yayın Tarihi */}
                      <td className="px-2 py-2">
                        <div className="text-slate-400 text-xs whitespace-nowrap">
                          {item.publishDate || '-'}
                        </div>
                      </td>

                      {/* Teklif Tarihi */}
                      <td className="px-2 py-2">
                        <div className="text-slate-300 text-xs font-semibold whitespace-nowrap">
                          {tenderDate || '-'}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <button
                          onClick={() => {
                            setLoadingItemId(item.id);
                            // Pipeline'ı başlat ve detay sayfasına git
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
                            router.push(`/ihale/${item.id}`);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg border border-indigo-500/30 hover:border-indigo-500/50 transition-all duration-200 disabled:opacity-50"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span className="text-xs font-medium">Yükleniyor...</span>
                            </>
                          ) : (
                            <>
                              <span className="text-xs font-medium">Detay</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {items.length === 0 && (
            <div className="text-center text-slate-400 py-12 text-sm">
              Henüz ihale bulunamadı.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
