'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Loader2, FileText, Calendar, MapPin, Building2, DollarSign, Upload } from 'lucide-react';
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
        const res = await fetch(`/api/ihale/detail/${id}`);

        // If we get 401, it means no session - that's okay, we can still use basic data
        if (res.status === 401) {
          if (selectedTender) {
            // We already have basic data, just update HTML to inform user
            setDetail((prev: any) => ({
              ...prev,
              html: `
                <div class="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p class="text-yellow-400 font-semibold mb-2">İhalebul.com bağlantısı yok</p>
                  <p class="text-slate-300">Detaylı bilgiler için önce İhalebul.com'a giriş yapmanız gerekiyor.</p>
                  <p class="text-slate-400 text-sm mt-2">Temel bilgiler veritabanından yüklendi.</p>
                </div>
              `
            }));
            setError('');
          } else {
            setError('İhale bilgileri bulunamadı. Lütfen ihale listesinden seçim yapın.');
          }
        } else {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          // Merge the fetched data with existing data
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
        }
      } catch (e: any) {
        // If we have basic data from selectedTender, don't show error
        if (!selectedTender) {
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
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
            <span>Pipeline İlerlemesi</span>
            <span>{getProgress()}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${getProgress()}%` }}
            />
          </div>
        </div>

        {/* Back Button and Selected Tender Info */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/ihale"
            className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Listeye Dön</span>
          </Link>

          {selectedTender && (
            <div className="text-sm text-slate-400">
              <span className="text-slate-500">Seçili İhale:</span> {selectedTender.organization} - {selectedTender.city}
            </div>
          )}
        </div>

        {/* Title Card with Action Button */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{detail.title}</h1>
              <p className="text-sm text-slate-400">İhale ID: {detail.id}</p>
            </div>
            <button
              onClick={() => {
                setCurrentStep(PIPELINE_STEPS.MENU_UPLOAD);
                router.push('/menu-parser');
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg"
            >
              <Upload className="w-5 h-5" />
              Menü Yükle
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Documents Section */}
            {detail.documents && detail.documents.length > 0 && (
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-xl font-semibold text-white">Dokümanlar</h2>
                  <span className="ml-auto px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-xs rounded-full font-medium">
                    {detail.documents.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {detail.documents.map((doc: any, i: number) => (
                    <a
                      key={i}
                      href={`/api/ihale/proxy?url=${encodeURIComponent(doc.url)}`}
                      className="flex items-center gap-3 p-3 bg-slate-800/30 hover:bg-slate-800/50 rounded-lg border border-slate-700/30 hover:border-indigo-500/40 transition-all duration-200 group"
                      download
                    >
                      <Download className="w-4 h-4 text-indigo-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{doc.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* HTML Content */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Detay Bilgileri</h2>
              {detail.html ? (
                <div
                  className="prose prose-invert prose-indigo prose-sm max-w-none
                    prose-headings:text-white prose-p:text-slate-300
                    prose-strong:text-indigo-400 prose-a:text-indigo-400
                    prose-li:text-slate-300"
                  dangerouslySetInnerHTML={{ __html: detail.html }}
                />
              ) : (
                <div className="p-4 bg-slate-800/30 rounded-lg">
                  <p className="text-slate-400">Detaylı bilgi mevcut değil.</p>
                  <p className="text-sm text-slate-500 mt-2">
                    İhalebul.com'dan detaylı bilgi almak için önce ihale listesini yenileyin.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info Card */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Hızlı Bilgi</h3>
              <div className="space-y-4">
                {/* İlan No */}
                {detail.tenderNumber && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">İlan Numarası</p>
                    <p className="text-sm text-white font-mono">{detail.tenderNumber}</p>
                  </div>
                )}

                {/* İdare */}
                <div className="flex items-start gap-3">
                  <Building2 className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 mb-1">İdare</p>
                    <p className="text-sm text-white">{detail.organization || '-'}</p>
                  </div>
                </div>

                {/* Şehir */}
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 mb-1">Şehir</p>
                    <p className="text-sm text-white">{detail.city || '-'}</p>
                  </div>
                </div>

                {/* İhale Türü */}
                {detail.tenderType && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">İhale Türü</p>
                    <p className="text-sm text-white">{detail.tenderType}</p>
                  </div>
                )}

                {/* Kısmi Teklif */}
                {detail.partialBidAllowed !== undefined && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Kısmi Teklif</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      detail.partialBidAllowed
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}>
                      {detail.partialBidAllowed ? 'Verilebilir' : 'Verilemez'}
                    </span>
                  </div>
                )}

                <div className="border-t border-slate-700/30 pt-4"></div>

                {/* Yayın Tarihi */}
                {detail.publishDate && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400 mb-1">Yayın Tarihi</p>
                      <p className="text-sm text-white">{detail.publishDate}</p>
                    </div>
                  </div>
                )}

                {/* Teklif Tarihi */}
                {detail.tenderDate && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400 mb-1">Teklif Tarihi</p>
                      <p className="text-sm text-white font-bold">{detail.tenderDate}</p>
                      {detail.daysRemaining !== undefined && detail.daysRemaining !== null && (
                        <p className={`text-xs mt-1 ${
                          detail.daysRemaining < 0 ? 'text-red-400' :
                          detail.daysRemaining <= 7 ? 'text-yellow-400' :
                          'text-green-400'
                        }`}>
                          {detail.daysRemaining < 0 ? 'Süresi geçti' :
                           detail.daysRemaining === 0 ? 'Bugün!' :
                           `${detail.daysRemaining} gün kaldı`}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* External Link */}
            <a
              href={`https://www.ihalebul.com/tender/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card rounded-2xl p-4 flex items-center justify-between hover:border-indigo-500/40 transition-all group"
            >
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                İhalebul&apos;da Görüntüle
              </span>
              <ArrowLeft className="w-4 h-4 text-indigo-400 rotate-180 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
