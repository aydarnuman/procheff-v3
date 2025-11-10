'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Loader2, FileText, Calendar, MapPin, Building2, DollarSign } from 'lucide-react';

export default function IhaleDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/ihale/detail/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setDetail(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

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
        {/* Back Button */}
        <Link
          href="/ihale"
          className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-6 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Listeye Dön</span>
        </Link>

        {/* Title Card */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">{detail.title}</h1>
          <p className="text-sm text-slate-400">İhale ID: {detail.id}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Documents Section */}
            {detail.documents?.length > 0 && (
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
              <div
                className="prose prose-invert prose-indigo prose-sm max-w-none
                  prose-headings:text-white prose-p:text-slate-300
                  prose-strong:text-indigo-400 prose-a:text-indigo-400
                  prose-li:text-slate-300"
                dangerouslySetInnerHTML={{ __html: detail.html }}
              />
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
