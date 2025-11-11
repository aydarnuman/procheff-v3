'use client';
import { ReplicaFrame } from '@/components/tender/ReplicaFrame';
import { TenderDetailDisplay } from '@/components/tender/TenderDetailDisplay';
import { PipelineNavigator } from '@/components/ui/PipelineNavigator';
import { ExportButtons } from '@/components/ui/ExportButtons';
import { PIPELINE_STEPS, usePipelineStore } from '@/store/usePipelineStore';
import {
    ArrowLeft,
    BarChart3,
    Calendar,
    ChevronDown,
    ChevronUp,
    DollarSign,
    Download,
    ExternalLink,
    FileJson,
    FileSpreadsheet,
    FileText,
    FileType,
    Image as ImageIcon,
    Loader2,
    Monitor,
    Upload
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function IhaleDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  interface DocumentType {
    url: string;
    name?: string;
    [key: string]: unknown;
  }

  interface TenderDetail {
    id?: string;
    title?: string;
    status?: string;
    bulletin_date?: string;
    deadline?: string;
    institution?: string;
    description?: string;
    organization?: string;
    city?: string;
    tenderType?: string;
    partialBidAllowed?: boolean;
    publishDate?: string;
    tenderDate?: string;
    daysRemaining?: number;
    tenderNumber?: string;
    html?: string;
    html_iframe?: string;
    html_raw?: string;
    html_snapshot?: string;
    html_formatted?: string;
    documents?: DocumentType[];
    ai_parsed?: any;
    estimatedCost?: string;
    url?: string;
    [key: string]: unknown;
  }

  const [detail, setDetail] = useState<TenderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [renderMode, setRenderMode] = useState<'replica' | 'snapshot'>('snapshot');
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState({
    quickActions: true,
    dates: true,
    reference: true
  });

  const {
    selectedTender,
    setCurrentStep,
    markStepCompleted,
    getProgress
  } = usePipelineStore();

  useEffect(() => {
    // Set current step
    setCurrentStep(PIPELINE_STEPS.TENDER_DETAIL);
    markStepCompleted(PIPELINE_STEPS.TENDER_DETAIL);

    // If we have selectedTender from the store, use that data first
    if (selectedTender) {
      // We have basic data from the list, show it immediately
      setDetail({
        id: selectedTender.id,
        title: selectedTender.title,
        organization: selectedTender.organization,
        city: selectedTender.city,
        tenderType: selectedTender.tenderType,
        partialBidAllowed: selectedTender.partialBidAllowed,
        publishDate: selectedTender.publishDate,
        tenderDate: selectedTender.tenderDate,
        daysRemaining: (selectedTender.daysRemaining ?? undefined) as number | undefined,
        tenderNumber: selectedTender.tenderNumber,
        url: selectedTender.url,
        documents: [],
        html: '<p class="text-slate-400">Detaylı bilgiler yükleniyor...</p>'
      });
      setLoading(false);
    }

    // Then try to fetch full details from API (with HTML content and documents)
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/ihale/detail/${id}`);
        const data = await res.json();

        if (!res.ok) {
          // If login failed, show warning but keep basic data
          if (data.error === 'login_failed' && selectedTender) {
            setDetail((prev: TenderDetail | null) => ({
              ...prev,
              html: `
                <div class="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p class="text-red-400 font-semibold mb-2">İhalebul.com Bağlantı Hatası</p>
                  <p class="text-slate-300">${data.message || 'İhalebul.com\'a bağlanılamadı.'}</p>
                  <p class="text-slate-400 text-sm mt-2">Temel bilgiler veritabanından yüklendi.</p>
                </div>
              `
            }));
            setError('');
          } else {
            throw new Error(data.message || data.error);
          }
        } else {
          // Successfully fetched from ihalebul.com
          // The API now returns multiple HTML formats
          setDetail((prev: TenderDetail | null) => ({
            ...prev,
            ...data,
            // Keep the existing fields if API doesn't return them
            organization: data.organization || prev?.organization,
            city: data.city || prev?.city,
            tenderType: data.tenderType || prev?.tenderType,
            partialBidAllowed: data.partialBidAllowed ?? prev?.partialBidAllowed,
            publishDate: data.publishDate || prev?.publishDate,
            tenderDate: data.tenderDate || prev?.tenderDate,
            daysRemaining: data.daysRemaining ?? prev?.daysRemaining
          }));
          setError('');
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Bilinmeyen hata';
        console.error('Error fetching tender detail:', e);

        // If we have basic data from selectedTender, show it with error message
        if (selectedTender) {
          setDetail((prev: TenderDetail | null) => ({
            ...prev,
            html: `
              <div class="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p class="text-yellow-400 font-semibold mb-2">Detaylı Bilgi Alınamadı</p>
                <p class="text-slate-300">${errorMessage}</p>
                <p class="text-slate-400 text-sm mt-2">Temel bilgiler veritabanından yüklendi.</p>
              </div>
            `
          }));
          setError('');
        } else {
          setError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id, setCurrentStep, markStepCompleted, selectedTender]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 rounded-2xl text-center">
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-lg text-slate-300">İhale detayları yükleniyor...</p>
          <p className="text-sm text-slate-400 mt-2">İhalebul.com&apos;dan veri çekiliyor</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 rounded-2xl text-center border-red-500/30">
          <div className="text-red-400 text-lg mb-2">❌ Hata</div>
          <div className="text-slate-300">{error}</div>
          <Link
            href="/ihale"
            className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg border border-indigo-500/30 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Listeye Dön
          </Link>
        </div>
      </div>
    );
  }

  const getProgressClass = () => {
    const progress = getProgress();
    if (progress >= 90) return 'progress-100';
    if (progress >= 80) return 'progress-90';
    if (progress >= 70) return 'progress-80';
    if (progress >= 60) return 'progress-70';
    if (progress >= 50) return 'progress-60';
    if (progress >= 40) return 'progress-50';
    if (progress >= 30) return 'progress-40';
    if (progress >= 20) return 'progress-30';
    if (progress >= 10) return 'progress-20';
    return progress > 0 ? 'progress-10' : 'progress-0';
  };

  if (!detail) return null;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-900 to-slate-800">
      {/* Progress Bar - Fixed at top */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-slate-900/80 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Pipeline İlerlemesi</span>
            <span className="text-indigo-400 font-bold">{getProgress()}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
            <div
              className={`h-full bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-700 ease-out rounded-full ${getProgressClass()}`}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/ihale"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-all group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-medium">İhale Listesi</span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setCurrentStep(PIPELINE_STEPS.MENU_UPLOAD);
                router.push('/menu-parser');
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg shadow-indigo-500/25"
            >
              <Upload className="w-4 h-4" />
              Menü Yükle ve Devam Et
            </button>
          </div>
        </div>

        {/* Main Header Card */}
        <div className="glass-card rounded-2xl p-8 mb-8 bg-linear-to-br from-slate-800/40 via-slate-800/30 to-transparent border border-slate-700/50">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  #{detail.tenderNumber || detail.id}
                </span>
                {detail.daysRemaining !== null && detail.daysRemaining !== undefined && (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                    detail.daysRemaining < 0 ? 'bg-gray-500/20 text-gray-400 border-gray-500/30' :
                    detail.daysRemaining === 0 ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse' :
                    detail.daysRemaining <= 3 ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                    detail.daysRemaining <= 7 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                    'bg-green-500/20 text-green-400 border-green-500/30'
                  } border`}>
                    {detail.daysRemaining < 0 ? 'Süresi Geçti' :
                     detail.daysRemaining === 0 ? '⚠️ BUGÜN!' :
                     detail.daysRemaining === 1 ? '1 Gün Kaldı' :
                     `${detail.daysRemaining} Gün Kaldı`}
                  </span>
                )}
              </div>

              <h1 className="text-2xl lg:text-3xl font-bold text-white mb-4 leading-tight">
                {detail.title}
              </h1>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Kurum</p>
                  <p className="text-sm font-semibold text-slate-200">{detail.organization || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Şehir</p>
                  <p className="text-sm font-semibold text-slate-200">{detail.city || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">İhale Türü</p>
                  <p className="text-sm font-semibold text-slate-200">{detail.tenderType || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Teklif Tarihi</p>
                  <p className="text-sm font-semibold text-indigo-400">{detail.tenderDate || '-'}</p>
                </div>
              </div>
            </div>

            {/* Export buttons in header */}
            <div className="flex-shrink-0">
              <ExportButtons tenderId={id} type="tender" />
            </div>
          </div>
        </div>

        {/* Key Information Grid - Full Width */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="glass-card rounded-xl p-5 bg-linear-to-br from-slate-800/30 to-transparent">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Yayın Tarihi</p>
                <p className="text-sm font-semibold text-white">{detail.publishDate || '-'}</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 bg-linear-to-br from-slate-800/30 to-transparent">
            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-green-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Kısmi Teklif</p>
                <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold ${
                  detail.partialBidAllowed
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                }`}>
                  {detail.partialBidAllowed ? '✓ Verilebilir' : '✗ Verilemez'}
                </span>
              </div>
            </div>
          </div>

          {detail.publishDate && (
            <div className="glass-card rounded-xl p-5 bg-linear-to-br from-slate-800/30 to-transparent">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-indigo-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Yayınlanma</p>
                  <p className="text-sm font-semibold text-slate-200">{detail.publishDate}</p>
                </div>
              </div>
            </div>
          )}

          {detail.tenderDate && (
            <div className="glass-card rounded-xl p-5 bg-linear-to-br from-slate-800/30 to-transparent">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Son Teklif</p>
                  <p className="text-sm font-bold text-indigo-400">{detail.tenderDate}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Full Width - İhale Detayları */}
        <div className="glass-card rounded-xl overflow-hidden bg-linear-to-br from-slate-800/20 to-transparent mb-6">
              <div
                onClick={() => setDetailsExpanded(!detailsExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-700/10 transition-colors group cursor-pointer"
              >
                <h2 className="text-base font-semibold text-slate-300 transition-none">
                  İhale Detayları
                </h2>

                <div className="flex items-center gap-3">
                  {/* Render Mode Toggle */}
                  {detailsExpanded && (
                    <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-lg" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setRenderMode('snapshot')}
                        className={`
                          flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all
                          ${renderMode === 'snapshot'
                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                            : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
                          }
                        `}
                        title="Anlık Görünüm - Hızlı ve optimize edilmiş"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Anlık</span>
                      </button>
                      <button
                        onClick={() => setRenderMode('replica')}
                        className={`
                          flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all
                          ${renderMode === 'replica'
                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                            : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
                          }
                        `}
                        title="Birebir Görünüm - Orijinal site görünümü"
                      >
                        <Monitor className="w-3.5 h-3.5" />
                        <span>Birebir</span>
                      </button>
                    </div>
                  )}

                  {detailsExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                  )}
                </div>
              </div>

              {/* Accordion Content */}
              {detailsExpanded && (
                <div className="px-6 pb-6 pt-2 border-t border-slate-700/50">
                  {/* Conditional Rendering based on mode */}
                  {renderMode === 'replica' ? (
                    detail.html_iframe ? (
                      <ReplicaFrame
                        html={String(detail.html_iframe)}
                        title="İhale Detayları - Birebir Görünüm"
                      />
                    ) : detail.html_raw ? (
                      <ReplicaFrame
                        html={String(detail.html_raw)}
                        title="İhale Detayları - Birebir Görünüm"
                      />
                    ) : (
                      <div className="p-6 bg-slate-800/30 rounded-lg border border-slate-700/50">
                        <p className="text-slate-400 text-sm">Birebir görünüm yükleniyor...</p>
                      </div>
                    )
                  ) : (
                    <TenderDetailDisplay
                      html={String(detail.html_snapshot || detail.html_formatted || detail.html || '')}
                      aiParsedData={detail.ai_parsed as any}
                    />
                  )}
                </div>
              )}
        </div>

        {/* Two Column Layout - Documents & Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left - Documents Section */}
          <div className="lg:col-span-2">
            {(() => {
              // Remove duplicates based on URL
              const uniqueDocuments = (detail.documents || []).filter((doc: any, index: number, self: any[]) =>
                index === self.findIndex((d: any) => d.url === doc.url)
              );

              const totalFiles = uniqueDocuments.length + (detail.ai_parsed ? 3 : 0);

              // Only show section if there's at least one file (CSV or documents)
              if (totalFiles === 0) return null;

              return (
              <div className="glass-card rounded-xl p-6 bg-linear-to-br from-slate-800/20 to-transparent">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    İhale Dokümanları
                  </h2>
                  <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded-full font-semibold">
                    {totalFiles} Dosya
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {/* AI Parsed Data Exports */}
                  {detail.ai_parsed && (
                    <>
                      {/* TXT Export */}
                      <a
                        href={`/api/ihale/export-csv/${id}?format=txt`}
                        className="flex items-center gap-3 p-4 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/30 hover:border-blue-500/50 transition-all group"
                        download
                      >
                        <div className="shrink-0 w-12 h-12 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <FileType className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-medium text-blue-300 group-hover:text-blue-200 transition-colors">
                            Metin İçerik (TXT)
                          </p>
                          <p className="text-xs text-blue-500/70">
                            Özet + key-value bilgileri + paragraflar
                          </p>
                        </div>
                        <Download className="w-5 h-5 text-blue-400 group-hover:translate-y-0.5 transition-transform shrink-0" />
                      </a>

                      {/* CSV Export */}
                      <a
                        href={`/api/ihale/export-csv/${id}?format=csv`}
                        className="flex items-center gap-3 p-4 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/30 hover:border-emerald-500/50 transition-all group"
                        download
                      >
                        <div className="shrink-0 w-12 h-12 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-medium text-emerald-300 group-hover:text-emerald-200 transition-colors">
                            Tablolar (CSV)
                          </p>
                          <p className="text-xs text-emerald-500/70">
                            Tüm tablolar Excel formatında
                          </p>
                        </div>
                        <Download className="w-5 h-5 text-emerald-400 group-hover:translate-y-0.5 transition-transform shrink-0" />
                      </a>

                      {/* JSON Export */}
                      <a
                        href={`/api/ihale/export-csv/${id}?format=json`}
                        className="flex items-center gap-3 p-4 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg border border-purple-500/30 hover:border-purple-500/50 transition-all group"
                        download
                      >
                        <div className="shrink-0 w-12 h-12 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <FileJson className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-medium text-purple-300 group-hover:text-purple-200 transition-colors">
                            Tüm Veriler (JSON)
                          </p>
                          <p className="text-xs text-purple-500/70">
                            Sections + tables + text (programmatic kullanım)
                          </p>
                        </div>
                        <Download className="w-5 h-5 text-purple-400 group-hover:translate-y-0.5 transition-transform shrink-0" />
                      </a>
                    </>
                  )}
                  {uniqueDocuments.map((doc: any, i: number) => {
                    // Helper to get file type icon color and background
                    const getFileTypeColor = (type?: string) => {
                      const t = (type || '').toLowerCase();
                      if (t === 'pdf') {
                        return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' };
                      }
                      if (t === 'docx' || t === 'doc') {
                        return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' };
                      }
                      if (t === 'xlsx' || t === 'xls') {
                        return { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' };
                      }
                      if (t === 'zip' || t === 'rar') {
                        return { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' };
                      }
                      return { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' };
                    };

                    const colors = getFileTypeColor(doc.fileType);

                    return (
                      <a
                        key={i}
                        href={`/api/ihale/proxy?url=${encodeURIComponent(doc.url)}&worker=true`}
                        className="flex items-center gap-3 p-4 bg-slate-800/40 hover:bg-slate-800/60 rounded-lg border border-slate-700/50 hover:border-indigo-500/50 transition-all group"
                        download={doc.filename || true}
                      >
                        <div className={`shrink-0 w-12 h-12 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                          {doc.fileType ? (
                            <span className={`text-xs font-bold ${colors.text}`}>
                              {doc.fileType}
                            </span>
                          ) : (
                            <FileText className={`w-5 h-5 ${colors.text}`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors truncate">
                            {doc.title}
                          </p>
                          {doc.filename && (
                            <p className="text-xs text-slate-500 font-mono truncate">
                              {doc.filename}
                            </p>
                          )}
                        </div>
                        <Download className="w-5 h-5 text-indigo-400 group-hover:translate-y-0.5 transition-transform shrink-0" />
                      </a>
                    );
                  })}
                </div>
              </div>
              );
            })()}
          </div>

          {/* Right - Sidebar */}
          <div className="lg:col-span-1 space-y-4">

            {/* Quick Actions */}
            <div className="glass-card rounded-xl overflow-hidden bg-linear-to-br from-indigo-500/10 to-transparent border-indigo-500/30">
              <div
                onClick={() => setSidebarExpanded(prev => ({ ...prev, quickActions: !prev.quickActions }))}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-700/10 transition-colors group cursor-pointer"
              >
                <h3 className="text-sm font-semibold text-white transition-none">Hızlı İşlemler</h3>
                {sidebarExpanded.quickActions ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                )}
              </div>
              {sidebarExpanded.quickActions && (
                <div className="px-4 pb-4 space-y-2">
                  <a
                    href={`https://www.ihalebul.com/tender/${id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-slate-800/40 hover:bg-slate-800/60 rounded-lg transition-all group"
                  >
                    <span className="text-sm text-slate-300 group-hover:text-white">
                      İhalebul.com&apos;da Aç
                    </span>
                    <ExternalLink className="w-4 h-4 text-indigo-400" />
                  </a>
                </div>
              )}
            </div>

            {/* Important Dates */}
            <div className="glass-card rounded-xl overflow-hidden bg-linear-to-br from-slate-800/30 to-transparent">
              <div
                onClick={() => setSidebarExpanded(prev => ({ ...prev, dates: !prev.dates }))}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-700/10 transition-colors group cursor-pointer"
              >
                <h3 className="text-sm font-semibold text-white transition-none">Önemli Tarihler</h3>
                {sidebarExpanded.dates ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                )}
              </div>
              {sidebarExpanded.dates && (
                <div className="px-4 pb-4 space-y-3">
                  {detail.publishDate && (
                    <div className="pb-3 border-b border-slate-700/30">
                      <p className="text-xs text-slate-500 mb-1">Yayınlanma</p>
                      <p className="text-sm font-medium text-slate-200">{detail.publishDate}</p>
                    </div>
                  )}
                  {detail.tenderDate && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Son Teklif</p>
                      <p className="text-sm font-bold text-indigo-400">{detail.tenderDate}</p>
                      {detail.daysRemaining !== undefined && detail.daysRemaining !== null && (
                        <p className={`text-xs mt-1.5 font-medium ${
                          detail.daysRemaining < 0 ? 'text-gray-400' :
                          detail.daysRemaining === 0 ? 'text-red-400 animate-pulse' :
                          detail.daysRemaining <= 3 ? 'text-red-400' :
                          detail.daysRemaining <= 7 ? 'text-yellow-400' :
                          'text-green-400'
                        }`}>
                          {detail.daysRemaining < 0 ? '⏰ Süre doldu' :
                           detail.daysRemaining === 0 ? '🔴 BUGÜN SON GÜN!' :
                           detail.daysRemaining === 1 ? '⚠️ Yarın son gün' :
                           `⏳ ${detail.daysRemaining} gün kaldı`}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Additional Info */}
            {detail.tenderNumber && (
              <div className="glass-card rounded-xl overflow-hidden bg-linear-to-br from-slate-800/30 to-transparent">
                <div
                  onClick={() => setSidebarExpanded(prev => ({ ...prev, reference: !prev.reference }))}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-700/10 transition-colors group cursor-pointer"
                >
                  <h3 className="text-sm font-semibold text-white transition-none">Referans Bilgileri</h3>
                  {sidebarExpanded.reference ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                  )}
                </div>
                {sidebarExpanded.reference && (
                  <div className="px-4 pb-4">
                    <p className="text-xs text-slate-500 mb-1">İlan No</p>
                    <p className="text-sm font-mono text-slate-200">{detail.tenderNumber}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Pipeline Navigation */}
        <div className="mt-8">
          <PipelineNavigator
            currentStep="tender"
            enableNext={true}
          />

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <button
              onClick={() => {
                // Save tender data to pipeline store
                usePipelineStore.getState().updateSelectedTender({
                  id,
                  title: detail.title,
                  organization: detail.organization,
                  ...({
                    kurum: detail.organization,
                    ihale_no: detail.tenderNumber || id,
                    ihale_turu: detail.tenderType,
                    butce: detail.estimatedCost,
                    kisi_sayisi: 0 // Will be filled in menu parser
                  } as any)
                } as any);
                usePipelineStore.getState().markStepCompleted(PIPELINE_STEPS.TENDER_DETAIL);
                router.push('/menu-parser');
              }}
              className="flex items-center justify-center gap-2 px-6 py-3 btn-gradient rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              <Upload className="w-5 h-5" />
              Menü Yükle ve Devam Et
            </button>

            <button
              onClick={() => router.push(`/analysis/${id}`)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800/50 hover:bg-slate-800/70 border border-slate-700 rounded-lg font-medium transition-colors"
            >
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              3-Tab Analizi Görüntüle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
