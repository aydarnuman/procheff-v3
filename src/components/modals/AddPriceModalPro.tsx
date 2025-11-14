'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Sparkles, Loader2, CheckCircle2, AlertTriangle, Info,
  ShoppingBag, TrendingUp, DollarSign, Zap, Store,
  Package, Tag, BarChart3, Brain, Search, Activity,
  TrendingDown, Clock, AlertCircle, ChevronRight
} from 'lucide-react';
import { usePriceStore } from '@/store/price-store';

interface AddPriceModalProProps {
  isOpen: boolean;
  onClose: () => void;
}

// Simüle edilmiş market verileri için
const MARKET_PLACEHOLDERS = [
  { name: 'Migros', status: 'searching', icon: '🟢' },
  { name: 'CarrefourSA', status: 'searching', icon: '🔵' },
  { name: 'A101', status: 'searching', icon: '🔴' },
  { name: 'BİM', status: 'searching', icon: '🟡' },
  { name: 'ŞOK', status: 'searching', icon: '🟣' },
  { name: 'Getir', status: 'searching', icon: '🟠' },
  { name: 'Trendyol', status: 'searching', icon: '⚪' }
];

export function AddPriceModalPro({ isOpen, onClose }: AddPriceModalProProps) {
  const [productName, setProductName] = useState('');
  const [currentStep, setCurrentStep] = useState<'input' | 'detecting' | 'results'>('input');
  const [detectedProduct, setDetectedProduct] = useState<any>(null);
  const [marketPrices, setMarketPrices] = useState<any[]>([]);
  const [aiPrediction, setAiPrediction] = useState<any>(null);
  const [isSearchingMarkets, setIsSearchingMarkets] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { addProductCard, setMarketPrices: saveMarketPrices } = usePriceStore();

  // Market arama simülasyonu
  useEffect(() => {
    if (currentStep === 'results' && marketPrices.length === 0) {
      setIsSearchingMarkets(true);
      
      // Her 500ms'de bir market ekle
      MARKET_PLACEHOLDERS.forEach((market, index) => {
        setTimeout(() => {
          setMarketPrices(prev => {
            const updated = [...prev];
            // %70 ihtimalle fiyat bul
            if (Math.random() > 0.3) {
              updated.push({
                market_name: market.name,
                unit_price: 35 + Math.random() * 15,
                status: 'found',
                icon: market.icon,
                confidence: 0.85 + Math.random() * 0.15,
                package_size: 1,
                unit: 'kg'
              });
            } else {
              updated.push({
                market_name: market.name,
                status: 'not_found',
                icon: market.icon,
                reason: 'Stok bilgisi bulunamadı'
              });
            }
            return updated;
          });
          
          if (index === MARKET_PLACEHOLDERS.length - 1) {
            setIsSearchingMarkets(false);
          }
        }, 500 * (index + 1));
      });
    }
  }, [currentStep, marketPrices.length]);

  const handleDetectProduct = async () => {
    if (!productName.trim()) {
      setError('Lütfen ürün adı girin');
      return;
    }

    setCurrentStep('detecting');
    setError(null);

    // Simüle edilmiş tespit
    setTimeout(() => {
      const detected = {
        id: `product_${Date.now()}`,
        name: productName,
        normalized_name: productName.toLowerCase().replace(/\s+/g, '_'),
        category: 'Bakliyat',
        subcategory: 'Kuru Baklagil',
        icon: '🌾',
        brand: null,
        tags: ['protein', 'lif', 'demir'],
        // YENİ ALANLAR
        detected_weight: '1 kg',
        detected_type: productName.includes('kırmızı') ? 'Kırmızı Mercimek' : 'Yeşil Mercimek',
        suggested_sku: `Tariş ${productName} 1kg`,
        nutrition_score: 'A',
        shelf_life: '12 ay'
      };
      
      setDetectedProduct(detected);

      // AI tahminini de ekle
      const aiPred = {
        baseline_price: 38.50,
        market_average: 37.80,
        price_range: { min: 32.90, max: 44.90 },
        trend: -2.3,
        confidence: 0.92,
        last_month_avg: 39.40,
        regional_price: {
          istanbul: 39.90,
          ankara: 37.50,
          izmir: 36.90
        }
      };
      
      setAiPrediction(aiPred);
      setCurrentStep('results');
    }, 2000);
  };

  const handleSave = () => {
    if (detectedProduct) {
      addProductCard(detectedProduct);
      
      // Market fiyatlarını kaydet
      if (marketPrices.length > 0) {
        const validPrices = marketPrices
          .filter(p => p.status === 'found')
          .map(p => ({
            ...p,
            product_card_id: detectedProduct.id,
            product_key: detectedProduct.normalized_name,
            data_source: 'web'
          }));
        
        saveMarketPrices(detectedProduct.id, validPrices);
      }
      
      // Reset
      setProductName('');
      setDetectedProduct(null);
      setMarketPrices([]);
      setAiPrediction(null);
      setCurrentStep('input');
      onClose();
    }
  };

  const handleCancel = () => {
    setProductName('');
    setDetectedProduct(null);
    setMarketPrices([]);
    setAiPrediction(null);
    setCurrentStep('input');
    setError(null);
    onClose();
  };

  // Ortalama fiyat hesaplama
  const getAveragePrice = () => {
    const validPrices = marketPrices.filter(p => p.status === 'found');
    if (validPrices.length === 0) return aiPrediction?.baseline_price || 0;
    return validPrices.reduce((sum, p) => sum + p.unit_price, 0) / validPrices.length;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)' }}
          onClick={handleCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
              {/* Header */}
              <div className="relative bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 backdrop-blur-xl p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-white/10">
                      <ShoppingBag className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Profesyonel Ürün Ekleme</h2>
                      <p className="text-sm text-gray-400">AI destekli tespit • Market taraması • Fiyat istihbaratı</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center gap-2 mt-4">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                    currentStep === 'input' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-500'
                  }`}>
                    <Search className="w-4 h-4" />
                    <span className="text-xs font-medium">Ürün Girişi</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                    currentStep === 'detecting' ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-gray-500'
                  }`}>
                    <Brain className="w-4 h-4" />
                    <span className="text-xs font-medium">AI Analizi</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                    currentStep === 'results' ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-500'
                  }`}>
                    <Store className="w-4 h-4" />
                    <span className="text-xs font-medium">Market Verileri</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {/* Input Step */}
                {currentStep === 'input' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="text-sm font-medium text-gray-300 flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4" />
                        Ürün Adı
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={productName}
                          onChange={(e) => setProductName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleDetectProduct()}
                          placeholder="Örn: Kırmızı Mercimek, Domates, Zeytinyağı..."
                          className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                          autoFocus
                        />
                        <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                      </div>
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
                      >
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <span className="text-red-300">{error}</span>
                      </motion.div>
                    )}

                    <button
                      onClick={handleDetectProduct}
                      disabled={!productName.trim()}
                      className="w-full relative group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                      <div className="relative px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-semibold flex items-center justify-center gap-2">
                        <Brain className="w-5 h-5" />
                        <span>Ürünü Analiz Et</span>
                      </div>
                    </button>
                  </motion.div>
                )}

                {/* Detecting Step */}
                {currentStep === 'detecting' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-12 space-y-6"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-2xl opacity-30 animate-pulse" />
                      <Brain className="relative w-16 h-16 text-purple-400 animate-pulse" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-xl font-medium text-white">AI Analiz Yapıyor</p>
                      <p className="text-gray-400">Ürün özellikleri tespit ediliyor...</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </motion.div>
                )}

                {/* Results Step */}
                {currentStep === 'results' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                  >
                    {/* 1. AI Detection Panel */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-emerald-600/10 rounded-xl blur-xl" />
                      <div className="relative bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-6 h-6 text-green-400" />
                            <span className="font-bold text-green-400">Ürün Başarıyla Tespit Edildi</span>
                          </div>
                          <span className="text-4xl">{detectedProduct?.icon}</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Ürün</p>
                            <p className="text-white font-semibold">{detectedProduct?.name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Tespit Edilen Gramaj</p>
                            <p className="text-white font-semibold">{detectedProduct?.detected_weight}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Tür</p>
                            <p className="text-white font-semibold">{detectedProduct?.detected_type}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Kategori</p>
                            <p className="text-white font-semibold">{detectedProduct?.category}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Önerilen SKU</p>
                            <p className="text-white font-semibold text-sm">{detectedProduct?.suggested_sku}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Raf Ömrü</p>
                            <p className="text-white font-semibold">{detectedProduct?.shelf_life}</p>
                          </div>
                        </div>

                        {detectedProduct?.tags && (
                          <div className="mt-4 flex items-center gap-2">
                            <Tag className="w-4 h-4 text-gray-400" />
                            <div className="flex flex-wrap gap-2">
                              {detectedProduct.tags.map((tag: string, i: number) => (
                                <span key={i} className="px-2 py-1 bg-white/10 text-white text-xs rounded-full">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2. Fiyat İstihbaratı Katmanı */}
                    <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Brain className="w-5 h-5 text-blue-400" />
                          <span className="font-bold text-white">AI Fiyat İstihbaratı</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                          <span className="text-xs text-gray-400">Güven: %{(aiPrediction?.confidence * 100 || 92).toFixed(0)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-black/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="w-4 h-4 text-green-400" />
                            <p className="text-xs text-gray-400">AI Tahmin</p>
                          </div>
                          <p className="text-xl font-bold text-white">₺{aiPrediction?.baseline_price?.toFixed(2) || '38.50'}</p>
                        </div>

                        <div className="bg-black/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <BarChart3 className="w-4 h-4 text-blue-400" />
                            <p className="text-xs text-gray-400">Piyasa Ort.</p>
                          </div>
                          <p className="text-xl font-bold text-white">₺{aiPrediction?.market_average?.toFixed(2) || '37.80'}</p>
                        </div>

                        <div className="bg-black/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            {aiPrediction?.trend < 0 ? (
                              <TrendingDown className="w-4 h-4 text-green-400" />
                            ) : (
                              <TrendingUp className="w-4 h-4 text-red-400" />
                            )}
                            <p className="text-xs text-gray-400">Aylık Trend</p>
                          </div>
                          <p className={`text-xl font-bold ${aiPrediction?.trend < 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {aiPrediction?.trend > 0 ? '+' : ''}{aiPrediction?.trend?.toFixed(1) || '-2.3'}%
                          </p>
                        </div>

                        <div className="bg-black/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Activity className="w-4 h-4 text-purple-400" />
                            <p className="text-xs text-gray-400">Fiyat Aralığı</p>
                          </div>
                          <p className="text-sm font-bold text-white">
                            ₺{aiPrediction?.price_range?.min?.toFixed(2) || '32.90'} - ₺{aiPrediction?.price_range?.max?.toFixed(2) || '44.90'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 text-yellow-400 mt-0.5" />
                          <div className="text-xs text-gray-300">
                            <p className="font-medium mb-1">Bölgesel Fiyat Farkları:</p>
                            <div className="flex gap-4">
                              <span>İstanbul: ₺{aiPrediction?.regional_price?.istanbul?.toFixed(2) || '39.90'}</span>
                              <span>Ankara: ₺{aiPrediction?.regional_price?.ankara?.toFixed(2) || '37.50'}</span>
                              <span>İzmir: ₺{aiPrediction?.regional_price?.izmir?.toFixed(2) || '36.90'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. Market Sonuçları Paneli */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Store className="w-5 h-5 text-purple-400" />
                          <span className="font-bold text-white">Gerçek Zamanlı Market Taraması</span>
                        </div>
                        {isSearchingMarkets && (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                            <span className="text-xs text-gray-400">Taranıyor...</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {(marketPrices.length > 0 ? marketPrices : MARKET_PLACEHOLDERS).map((market, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`p-3 rounded-lg border ${
                              marketPrices.length === 0 
                                ? 'bg-gray-800/30 border-gray-700/50' 
                                : market.status === 'found'
                                  ? 'bg-green-500/5 border-green-500/20'
                                  : 'bg-red-500/5 border-red-500/20'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{market.icon}</span>
                                <div>
                                  <p className="font-medium text-white">{market.market_name || market.name}</p>
                                  {marketPrices.length === 0 ? (
                                    <p className="text-xs text-gray-500">Veri çekiliyor...</p>
                                  ) : market.status === 'found' ? (
                                    <p className="text-xs text-gray-400">Güven: %{(market.confidence * 100).toFixed(0)}</p>
                                  ) : (
                                    <p className="text-xs text-red-400">{market.reason}</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                {marketPrices.length === 0 ? (
                                  <div className="flex gap-1">
                                    <div className="w-1 h-1 bg-gray-500 rounded-full animate-pulse" />
                                    <div className="w-1 h-1 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                                    <div className="w-1 h-1 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                                  </div>
                                ) : market.status === 'found' ? (
                                  <p className="text-lg font-bold text-white">₺{market.unit_price.toFixed(2)}</p>
                                ) : (
                                  <AlertCircle className="w-5 h-5 text-gray-500" />
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {marketPrices.length > 0 && (
                        <div className="mt-4 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-white/10">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-400">Ortalama Piyasa Fiyatı</p>
                              <p className="text-2xl font-bold text-white">₺{getAveragePrice().toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-400">Başarılı Tarama</p>
                              <p className="text-lg font-bold text-green-400">
                                {marketPrices.filter(p => p.status === 'found').length}/{marketPrices.length}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10 bg-black/30">
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleCancel}
                    className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
                  >
                    İptal
                  </button>
                  
                  {currentStep === 'results' && (
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-400">
                        {marketPrices.filter(p => p.status === 'found').length > 0 ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                            <span>Kayıt için hazır</span>
                          </div>
                        ) : isSearchingMarkets ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                            <span>Market verileri toplanıyor...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-yellow-400" />
                            <span>AI tahminleri kullanılacak</span>
                          </div>
                        )}
                      </div>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSave}
                        disabled={!detectedProduct || isSearchingMarkets}
                        className="relative group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                        <div className="relative px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-white font-bold flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Sisteme Kaydet</span>
                        </div>
                      </motion.button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
