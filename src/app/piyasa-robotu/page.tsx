'use client';

import { useState } from 'react';
import { Search, Loader2, Package, History, AlertTriangle } from 'lucide-react';
import { PriceCard } from '@/components/market/PriceCard';
import { BulkUploader } from '@/components/market/BulkUploader';
import { TrendChart } from '@/components/market/TrendChart';
import { MarketFusion } from '@/lib/market/schema';
import { motion } from 'framer-motion';

type Tab = 'single' | 'bulk' | 'history';

export default function PiyasaRobotuPage() {
  const [activeTab, setActiveTab] = useState<Tab>('single');

  // Tek ürün state
  const [product, setProduct] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ data: MarketFusion; productName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Geçmiş state
  const [historyProduct, setHistoryProduct] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<any>(null);

  // Tek ürün sorgulama
  const handleSearch = async () => {
    if (!product.trim()) {
      setError('Lütfen ürün adı girin');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/market/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product }),
      });

      const data = await response.json();

      if (data.ok) {
        setResult({
          data: data.data,
          productName: product,
        });
      } else {
        setError(data.message || 'Fiyat bilgisi bulunamadı');
      }
    } catch (err) {
      setError('Ağ hatası: ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  };

  // Geçmiş sorgulama
  const handleHistorySearch = async () => {
    if (!historyProduct.trim()) {
      alert('Lütfen ürün adı girin');
      return;
    }

    setHistoryLoading(true);
    setHistoryData(null);

    try {
      const response = await fetch(
        `/api/market/history?product=${encodeURIComponent(historyProduct)}&months=12`
      );

      const data = await response.json();

      if (data.ok) {
        setHistoryData(data);
      } else {
        alert(data.message || 'Geçmiş veri bulunamadı');
      }
    } catch (err) {
      alert('Ağ hatası: ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Piyasa Robotu</h1>
          <p className="text-slate-400 text-sm">
            Gerçek zamanlı piyasa fiyatları ve akıllı tahminler
          </p>
        </div>

        {/* Mock Data Warning Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card border-amber-500/30 p-4 rounded-xl mb-6"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-amber-400 font-semibold mb-1">
                ⚠️ Geliştirme Modu
              </h3>
              <p className="text-sm text-slate-300">
                Piyasa verileri şu an <strong className="text-amber-300">mock data</strong> kullanıyor.
                Gerçek TÜİK API ve web scraping entegrasyonu henüz tamamlanmadı.
                Gösterilen fiyatlar <strong className="text-amber-300">tahmin amaçlıdır</strong> ve
                gerçek piyasa koşullarını yansıtmayabilir.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-700/50">
          <button
            onClick={() => setActiveTab('single')}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === 'single'
                ? 'text-indigo-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Search className="w-4 h-4 inline-block mr-2" />
            Tek Ürün
            {activeTab === 'single' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === 'bulk'
                ? 'text-indigo-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4 inline-block mr-2" />
            Toplu Yükleme
            {activeTab === 'bulk' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === 'history'
                ? 'text-indigo-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4 inline-block mr-2" />
            Geçmiş / Trend
            {activeTab === 'history' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
              />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {/* Tek Ürün */}
          {activeTab === 'single' && (
            <div className="space-y-6">
              {/* Search Input */}
              <div className="glass-card">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Ürün adı girin (örn: tavuk eti, zeytinyağı, makarna)"
                    className="flex-1 px-4 py-3 bg-slate-900/40 border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg transition-colors text-white font-medium flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sorgulanıyor...
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Fiyatı Getir
                      </>
                    )}
                  </button>
                </div>
                {error && (
                  <p className="mt-3 text-sm text-red-400">{error}</p>
                )}
              </div>

              {/* Result */}
              {result && (
                <PriceCard data={result.data} productName={result.productName} />
              )}
            </div>
          )}

          {/* Toplu Yükleme */}
          {activeTab === 'bulk' && <BulkUploader />}

          {/* Geçmiş / Trend */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              {/* Search Input */}
              <div className="glass-card">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={historyProduct}
                    onChange={(e) => setHistoryProduct(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleHistorySearch()}
                    placeholder="Ürün adı girin (örn: tavuk eti)"
                    className="flex-1 px-4 py-3 bg-slate-900/40 border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                  <button
                    onClick={handleHistorySearch}
                    disabled={historyLoading}
                    className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg transition-colors text-white font-medium flex items-center gap-2"
                  >
                    {historyLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Yükleniyor...
                      </>
                    ) : (
                      <>
                        <History className="w-5 h-5" />
                        Geçmişi Getir
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Chart */}
              {historyData && historyData.series && (
                <TrendChart
                  data={historyData.series}
                  productName={historyProduct}
                  stats={historyData.stats}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
