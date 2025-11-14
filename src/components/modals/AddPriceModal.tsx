'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Sparkles, Loader2, CheckCircle2, AlertTriangle,
  ShoppingBag, TrendingUp, DollarSign, Zap, Store,
  Package, Tag, BarChart3
} from 'lucide-react';
import { usePriceStore } from '@/store/price-store';

interface AddPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddPriceModal({ isOpen, onClose }: AddPriceModalProps) {
  const [productName, setProductName] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [isFetchingPrices, setIsFetchingPrices] = useState(false);
  const [detectedProduct, setDetectedProduct] = useState<any>(null);
  const [fetchedPrices, setFetchedPrices] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { addProductCard, setMarketPrices } = usePriceStore();

  const handleDetectProduct = async () => {
    if (!productName.trim()) {
      setError('Lütfen ürün adı girin');
      return;
    }

    setIsDetecting(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/detect-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: productName.trim() })
      });

      if (!response.ok) throw new Error('Ürün tespit edilemedi');
      
      const data = await response.json();
      setDetectedProduct(data.product);
      
      // Automatically fetch prices after detection
      await fetchPrices(data.product.id);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Bir hata oluştu');
    } finally {
      setIsDetecting(false);
    }
  };

  const fetchPrices = async (productCardId: string) => {
    setIsFetchingPrices(true);
    
    try {
      const response = await fetch('/api/ai/fetch-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productCardId,
          productName: productName.trim()
        })
      });

      if (!response.ok) throw new Error('Fiyatlar çekilemedi');
      
      const data = await response.json();
      setFetchedPrices(data);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fiyat çekme hatası');
    } finally {
      setIsFetchingPrices(false);
    }
  };

  const handleSave = () => {
    if (detectedProduct && fetchedPrices) {
      addProductCard(detectedProduct);
      setMarketPrices(detectedProduct.id, fetchedPrices.prices);
      
      setProductName('');
      setDetectedProduct(null);
      setFetchedPrices(null);
      setError(null);
      onClose();
    }
  };

  const handleCancel = () => {
    setProductName('');
    setDetectedProduct(null);
    setFetchedPrices(null);
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)' }}
          onClick={handleCancel}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-3xl blur-2xl opacity-30" />
            
            {/* Modal content */}
            <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl shadow-2xl border border-white/10 overflow-hidden">
              {/* Header with gradient */}
              <div className="relative bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-blue-600/20 backdrop-blur-xl p-6 border-b border-white/10">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                      <ShoppingBag className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Yeni Ürün Ekle</h2>
                      <p className="text-sm text-gray-400">AI ile otomatik tespit ve fiyat çekme</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Product Input Section */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Ürün Adı
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur opacity-20 group-focus-within:opacity-40 transition-opacity" />
                    <input
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleDetectProduct()}
                      placeholder="Örn: Domates, Süt, Zeytinyağı..."
                      className="relative w-full px-5 py-4 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors text-lg"
                    />
                    {productName && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        <Sparkles className="w-5 h-5 text-purple-400" />
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Error Message */}
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

                {/* Detected Product Card */}
                {detectedProduct && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-2xl blur-xl" />
                    <div className="relative bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-6 h-6 text-green-400" />
                          <span className="font-bold text-green-400">Ürün Tespit Edildi!</span>
                        </div>
                        <span className="text-4xl">{detectedProduct.icon}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Ürün Adı</p>
                          <p className="text-white font-semibold">{detectedProduct.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Kategori</p>
                          <p className="text-white font-semibold">{detectedProduct.category}</p>
                        </div>
                        {detectedProduct.brand && (
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Marka</p>
                            <p className="text-white font-semibold">{detectedProduct.brand}</p>
                          </div>
                        )}
                        {detectedProduct.tags?.length > 0 && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-400 mb-2">Etiketler</p>
                            <div className="flex flex-wrap gap-2">
                              {detectedProduct.tags.map((tag: string, i: number) => (
                                <span
                                  key={i}
                                  className="px-3 py-1 bg-white/10 text-white text-xs rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Fetched Prices */}
                {fetchedPrices && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Store className="w-5 h-5 text-purple-400" />
                        <span className="font-bold text-white">Market Fiyatları</span>
                      </div>
                      <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                        {fetchedPrices.prices.length} market bulundu
                      </span>
                    </div>
                    
                    {/* Price List */}
                    <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                      {fetchedPrices.prices
                        .sort((a: any, b: any) => a.unit_price - b.unit_price)
                        .map((price: any, i: number) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`relative p-4 rounded-xl ${
                              i === 0 
                                ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30' 
                                : 'bg-white/5 border border-white/10'
                            }`}
                          >
                            {i === 0 && (
                              <div className="absolute -top-2 -right-2">
                                <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full font-bold">
                                  EN UCUZ
                                </span>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {i === 0 && <Zap className="w-5 h-5 text-yellow-400" />}
                                <div>
                                  <p className="font-semibold text-white capitalize">
                                    {price.market_name.replace('_', ' ')}
                                  </p>
                                  {price.brand && (
                                    <p className="text-xs text-gray-400">{price.brand}</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-white">
                                  ₺{price.unit_price.toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {price.package_size} {price.unit}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                    </div>
                    
                    {/* Price Stats */}
                    {fetchedPrices.stats && fetchedPrices.stats.min != null && (
                      <div className="grid grid-cols-4 gap-3 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl border border-white/10">
                        <div className="text-center">
                          <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-1" />
                          <p className="text-xs text-gray-400">En Ucuz</p>
                          <p className="font-bold text-green-400">
                            ₺{(fetchedPrices.stats.min || 0).toFixed(2)}
                          </p>
                        </div>
                        <div className="text-center">
                          <TrendingUp className="w-5 h-5 text-red-400 mx-auto mb-1 rotate-180" />
                          <p className="text-xs text-gray-400">En Pahalı</p>
                          <p className="font-bold text-red-400">
                            ₺{(fetchedPrices.stats.max || 0).toFixed(2)}
                          </p>
                        </div>
                        <div className="text-center">
                          <BarChart3 className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                          <p className="text-xs text-gray-400">Ortalama</p>
                          <p className="font-bold text-white">
                            ₺{(fetchedPrices.stats.avg || 0).toFixed(2)}
                          </p>
                        </div>
                        <div className="text-center">
                          <DollarSign className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                          <p className="text-xs text-gray-400">Fark</p>
                          <p className="font-bold text-purple-400">
                            %{fetchedPrices.stats.min && fetchedPrices.stats.max 
                              ? ((fetchedPrices.stats.max / fetchedPrices.stats.min - 1) * 100).toFixed(0)
                              : '0'}
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Loading States */}
                {(isDetecting || isFetchingPrices) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-12 space-y-4"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-xl opacity-50 animate-pulse" />
                      <Loader2 className="relative w-12 h-12 animate-spin text-purple-400" />
                    </div>
                    <p className="text-white font-medium">
                      {isDetecting ? 'AI ürünü tespit ediyor...' : 'Gerçek fiyatlar çekiliyor...'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {isDetecting ? 'Kategori ve özellikler belirleniyor' : '7+ marketten canlı veri alınıyor'}
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/10 bg-black/30 backdrop-blur">
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleCancel}
                    className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
                  >
                    İptal
                  </button>
                  
                  {!detectedProduct ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleDetectProduct}
                      disabled={!productName.trim() || isDetecting}
                      className="relative group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity" />
                      <div className="relative px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-bold flex items-center gap-2">
                        {isDetecting ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Sparkles className="w-5 h-5" />
                        )}
                        <span>Ürünü Tespit Et</span>
                      </div>
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSave}
                      disabled={!fetchedPrices || isFetchingPrices}
                      className="relative group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity" />
                      <div className="relative px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-white font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Kaydet</span>
                      </div>
                    </motion.button>
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