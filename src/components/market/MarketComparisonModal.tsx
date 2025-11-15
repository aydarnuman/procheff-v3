'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import type {} from '@/lib/market/schema';

interface MarketPrice {
  market: string;
  price: number;
  stock_status?: string;
  brand?: string;
  url?: string;
  last_updated?: string;
}

interface MarketComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  productKey: string;
  aiPrice?: number;
  aiConfidence?: number;
}

export function MarketComparisonModal({
  isOpen,
  onClose,
  productName,
  productKey,
  aiPrice,
  aiConfidence
}: MarketComparisonModalProps) {
  const [loading, setLoading] = useState(true);
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMarketPrices();
    }
  }, [isOpen, productKey]);

  const fetchMarketPrices = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Real API endpoint
      const response = await fetch(`/api/market/compare?product=${productKey}`);
      const data = await response.json();
      
      if (data.ok && data.prices) {
        setMarketPrices(data.prices);
      } else {
        throw new Error(data.error || 'Veri alınamadı');
      }
    } catch (error) {
      setError('Market fiyatları yüklenemedi');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // İstatistik hesaplama
  const stats = {
    min: marketPrices.length > 0 ? Math.min(...marketPrices.filter(m => m.stock_status !== 'out_of_stock').map(m => m.price)) : 0,
    max: marketPrices.length > 0 ? Math.max(...marketPrices.filter(m => m.stock_status !== 'out_of_stock').map(m => m.price)) : 0,
    avg: marketPrices.length > 0 ? marketPrices.filter(m => m.stock_status !== 'out_of_stock').reduce((sum, m) => sum + m.price, 0) / marketPrices.filter(m => m.stock_status !== 'out_of_stock').length : 0
  };

  const getMarketLogo = (market: string) => {
    const logos: Record<string, string> = {
      'Migros': '🟠',
      'A101': '🔵',
      'ŞOK': '🟡',
      'CarrefourSA': '🔴',
      'BİM': '🟣'
    };
    return logos[market] || '🛒';
  };

  const getStockStatus = (status?: string) => {
    switch (status) {
      case 'in_stock':
        return { text: 'Stokta', color: 'text-green-400', icon: '✅' };
      case 'limited':
        return { text: 'Az kaldı', color: 'text-yellow-400', icon: '⚠️' };
      case 'out_of_stock':
        return { text: 'Tükendi', color: 'text-red-400', icon: '❌' };
      default:
        return { text: 'Bilinmiyor', color: 'text-gray-400', icon: '❓' };
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed inset-x-4 top-[50%] -translate-y-[50%] md:inset-x-auto md:left-[50%] md:-translate-x-[50%] md:w-[600px] z-50"
          >
            <div className="glass-card border border-white/20 shadow-2xl">
              {/* Header */}
              <div className="flex items-start justify-between p-6 border-b border-white/10">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Market Fiyat Karşılaştırması</h2>
                  <p className="text-sm text-slate-400">{productName}</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {loading ? (
                  <div className="py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
                    <p className="text-slate-400">Market fiyatları yükleniyor...</p>
                  </div>
                ) : error ? (
                  <div className="py-12 text-center">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
                    <p className="text-red-400">{error}</p>
                  </div>
                ) : (
                  <>
                    {/* İstatistikler */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                        <p className="text-xs text-slate-400 mb-1">En Düşük</p>
                        <p className="text-2xl font-bold text-green-400">{stats.min.toFixed(2)} ₺</p>
                      </div>
                      <div className="text-center p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                        <p className="text-xs text-slate-400 mb-1">Ortalama</p>
                        <p className="text-2xl font-bold text-blue-400">{stats.avg.toFixed(2)} ₺</p>
                      </div>
                      <div className="text-center p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                        <p className="text-xs text-slate-400 mb-1">Fiyat Aralığı</p>
                        <p className="text-xl font-bold text-orange-400">
                          {(stats.max - stats.min).toFixed(2)} ₺
                        </p>
                      </div>
                    </div>

                    {/* Market Listesi */}
                    <div className="space-y-3 mb-6">
                      {marketPrices.map((market, index) => {
                        const stockStatus = getStockStatus(market.stock_status);
                        const isLowest = market.price === stats.min && market.stock_status !== 'out_of_stock';
                        
                        return (
                          <motion.div
                            key={market.market}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`p-4 rounded-xl border transition-all ${
                              isLowest
                                ? 'bg-green-500/10 border-green-500/30 shadow-lg shadow-green-500/20'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            } ${market.stock_status === 'out_of_stock' ? 'opacity-60' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="text-3xl">{getMarketLogo(market.market)}</div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-white">{market.market}</h4>
                                    {isLowest && (
                                      <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">
                                        En Ucuz
                                      </span>
                                    )}
                                  </div>
                                  {market.brand && (
                                    <p className="text-xs text-slate-500">Marka: {market.brand}</p>
                                  )}
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-xs ${stockStatus.color}`}>
                                      {stockStatus.icon} {stockStatus.text}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <p className="text-2xl font-bold text-white">
                                  {market.price.toFixed(2)} ₺
                                </p>
                                {market.url && (
                                  <a
                                    href={market.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                  >
                                    Ürüne Git
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* AI Karşılaştırma */}
                    {aiPrice && (
                      <div className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">🤖</span>
                            <div>
                              <p className="text-sm font-semibold text-white">AI Tahmini</p>
                              <p className="text-xs text-slate-400">
                                Güven: %{aiConfidence ? (aiConfidence * 100).toFixed(0) : '85'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-indigo-400">
                              {aiPrice.toFixed(2)} ₺
                            </p>
                            <p className="text-xs text-slate-400">
                              {aiPrice < stats.avg ? (
                                <span className="text-green-400">Ortalamadan düşük</span>
                              ) : (
                                <span className="text-orange-400">Ortalamadan yüksek</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Son Güncelleme */}
                    <p className="text-xs text-slate-500 text-center mt-4">
                      Son güncelleme: {new Date().toLocaleString('tr-TR')}
                    </p>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
