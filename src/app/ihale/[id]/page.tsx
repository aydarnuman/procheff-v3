'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Loader2, FileText, Calendar, DollarSign, Upload, ExternalLink } from 'lucide-react';
import { usePipelineStore, PIPELINE_STEPS } from '@/store/usePipelineStore';

export default function IhaleDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        daysRemaining: selectedTender.daysRemaining,
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
            setDetail((prev: any) => ({
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
          setDetail((prev: any) => ({
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
      } catch (e: any) {
        console.error('Error fetching tender detail:', e);

        // If we have basic data from selectedTender, show it with error message
        if (selectedTender) {
          setDetail((prev: any) => ({
            ...prev,
            html: `
              <div class="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p class="text-yellow-400 font-semibold mb-2">Detaylı Bilgi Alınamadı</p>
                <p class="text-slate-300">${e.message}</p>
                <p class="text-slate-400 text-sm mt-2">Temel bilgiler veritabanından yüklendi.</p>
              </div>
            `
          }));
          setError('');
        } else {
          setError(e.message);
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

  if (!detail) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      {/* Progress Bar - Fixed at top */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-slate-900/80 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Pipeline İlerlemesi</span>
            <span className="text-indigo-400 font-bold">{getProgress()}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-700 ease-out rounded-full"
              style={{ width: `${getProgress()}%` }}
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
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg shadow-indigo-500/25"
            >
              <Upload className="w-4 h-4" />
              Menü Yükle ve Devam Et
            </button>
          </div>
        </div>

        {/* Main Header Card */}
        <div className="glass-card rounded-2xl p-8 mb-8 bg-gradient-to-br from-slate-800/40 via-slate-800/30 to-transparent border border-slate-700/50">
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
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Key Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-card rounded-xl p-5 bg-gradient-to-br from-slate-800/30 to-transparent">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Yayın Tarihi</p>
                    <p className="text-sm font-semibold text-white">{detail.publishDate || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-xl p-5 bg-gradient-to-br from-slate-800/30 to-transparent">
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
            </div>

            {/* Documents Section */}
            {detail.documents && detail.documents.length > 0 && (
              <div className="glass-card rounded-xl p-6 bg-gradient-to-br from-slate-800/20 to-transparent">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    İhale Dokümanları
                  </h2>
                  <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded-full font-semibold">
                    {detail.documents.length} Dosya
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {detail.documents.map((doc: any, i: number) => (
                    <a
                      key={i}
                      href={`/api/ihale/proxy?url=${encodeURIComponent(doc.url)}`}
                      className="flex items-center gap-3 p-3.5 bg-slate-800/40 hover:bg-slate-800/60 rounded-lg border border-slate-700/50 hover:border-indigo-500/50 transition-all group"
                      download
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                        <Download className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors truncate">
                          {doc.title}
                        </p>
                      </div>
                      <ArrowLeft className="w-4 h-4 text-slate-500 rotate-180 group-hover:translate-x-1 transition-transform" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed HTML Content */}
            <div className="glass-card rounded-xl p-6 bg-gradient-to-br from-slate-800/20 to-transparent">
              <h2 className="text-lg font-semibold text-white mb-4 pb-3 border-b border-slate-700/50">
                İhale Detayları
              </h2>
              {detail.html ? (
                <div
                  className="tender-html-content text-sm text-slate-300 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: detail.html }}
                />
              ) : (
                <div className="p-6 bg-slate-800/30 rounded-lg border border-slate-700/50">
                  <p className="text-slate-400 text-sm">Detaylı bilgi yükleniyor...</p>
                  <p className="text-xs text-slate-500 mt-2">
                    İhalebul.com&apos;dan veri çekiliyor
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1 space-y-4">

            {/* Quick Actions */}
            <div className="glass-card rounded-xl p-5 bg-gradient-to-br from-indigo-500/10 to-transparent border-indigo-500/30">
              <h3 className="text-sm font-semibold text-white mb-3">Hızlı İşlemler</h3>
              <div className="space-y-2">
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
            </div>

            {/* Important Dates */}
            <div className="glass-card rounded-xl p-5 bg-gradient-to-br from-slate-800/30 to-transparent">
              <h3 className="text-sm font-semibold text-white mb-3">Önemli Tarihler</h3>
              <div className="space-y-3">
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
            </div>

            {/* Additional Info */}
            {detail.tenderNumber && (
              <div className="glass-card rounded-xl p-5 bg-gradient-to-br from-slate-800/30 to-transparent">
                <h3 className="text-sm font-semibold text-white mb-3">Referans Bilgileri</h3>
                <div>
                  <p className="text-xs text-slate-500 mb-1">İlan No</p>
                  <p className="text-sm font-mono text-slate-200">{detail.tenderNumber}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
