'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, RefreshCw, Trash2, Edit, TrendingUp, TrendingDown, 
  Minus, Clock, Store, Package, Star, AlertTriangle, Bell
} from 'lucide-react';
import { usePriceStore } from '@/store/price-store';
import { formatPrice, getPriceLevel } from '@/lib/utils/price-utils';

interface ProductDetailModalProps {
  isOpen: boolean;
  productId: string;
  onClose: () => void;
}

const PRICE_LEVELS = {
  best_price: { label: 'EN UCUZ', color: 'bg-green-500', icon: '🏆' },
  cheap: { label: 'UCUZ', color: 'bg-green-400', icon: '✅' },
  normal: { label: 'NORMAL', color: 'bg-yellow-400', icon: '💰' },
  expensive: { label: 'PAHALI', color: 'bg-orange-400', icon: '⭐' },
  very_expensive: { label: 'ÇOK PAHALI', color: 'bg-red-500', icon: '🔴' }
};

export function ProductDetailModal({ isOpen, productId, onClose }: ProductDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'prices' | 'history' | 'alerts'>('prices');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [targetPrice, setTargetPrice] = useState('');
  
  const { 
    getProductWithPrices, 
    fetchPrices, 
    deleteProductCard,
    addPriceAlert
  } = usePriceStore();
  
  const { product, prices } = getProductWithPrices(productId);

  useEffect(() => {
    if (product && activeTab === 'history') {
      // Load price history via API
      fetch(`/api/market/history/${encodeURIComponent(product.normalized_name || product.name)}`)
        .then(res => res.json())
        .then(data => setPriceHistory(data.history || []))
        .catch(err => console.error('Failed to load history:', err));
    }
  }, [product, activeTab]);

  const handleRefreshPrices = async () => {
    setIsRefreshing(true);
    await fetchPrices(productId);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleDelete = () => {
    if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
      deleteProductCard(productId);
      onClose();
    }
  };

  const handleSetAlert = () => {
    if (!targetPrice || isNaN(parseFloat(targetPrice))) return;
    
    addPriceAlert({
      id: `alert_${Date.now()}`,
      productCardId: productId,
      targetPrice: parseFloat(targetPrice),
      alertType: 'price_drop',
      isActive: true,
      createdAt: new Date()
    });
    
    setTargetPrice('');
    alert('Fiyat uyarısı oluşturuldu!');
  };

  if (!product) return null;

  const allPrices = prices.map(p => p.unit_price);
  const avgPrice = allPrices.length > 0 
    ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length 
    : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-4xl bg-white rounded-xl shadow-xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center gap-4">
                <span className="text-4xl">{product.icon}</span>
                <div>
                  <h2 className="text-2xl font-bold">{product.name}</h2>
                  <p className="text-sm text-gray-600">
                    {product.category} {product.subcategory && `• ${product.subcategory}`}
                  </p>
                  {product.tags && product.tags.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {product.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefreshPrices}
                  disabled={isRefreshing}
                  className="p-2 hover:bg-white rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 hover:bg-white text-red-600 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('prices')}
                className={`flex-1 px-4 py-3 font-medium transition-colors ${
                  activeTab === 'prices' 
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <Store className="w-5 h-5 inline-block mr-2" />
                Fiyat Karşılaştırma
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 px-4 py-3 font-medium transition-colors ${
                  activeTab === 'history' 
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <Clock className="w-5 h-5 inline-block mr-2" />
                Fiyat Geçmişi
              </button>
              <button
                onClick={() => setActiveTab('alerts')}
                className={`flex-1 px-4 py-3 font-medium transition-colors ${
                  activeTab === 'alerts' 
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <Bell className="w-5 h-5 inline-block mr-2" />
                Fiyat Uyarıları
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: '500px' }}>
              {activeTab === 'prices' && (
                <div className="space-y-4">
                  {/* Price Stats */}
                  {prices.length > 0 && (
                    <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">En Ucuz</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatPrice(Math.min(...allPrices))}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">En Pahalı</p>
                        <p className="text-2xl font-bold text-red-600">
                          {formatPrice(Math.max(...allPrices))}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Ortalama</p>
                        <p className="text-2xl font-bold text-gray-700">
                          {formatPrice(avgPrice)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Fark</p>
                        <p className="text-2xl font-bold text-orange-600">
                          %{((Math.max(...allPrices) / Math.min(...allPrices) - 1) * 100).toFixed(0)}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Market Prices Table */}
                  <div className="space-y-2">
                    {prices.length > 0 ? (
                      prices
                        .sort((a, b) => a.unit_price - b.unit_price)
                        .map((price, index) => {
                          const level = getPriceLevel(price.unit_price, allPrices);
                          const levelInfo = PRICE_LEVELS[level as keyof typeof PRICE_LEVELS];
                          
                          return (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className={`p-4 rounded-lg border ${
                                index === 0 ? 'border-green-300 bg-green-50' : 'border-gray-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">{levelInfo.icon}</span>
                                  <div>
                                    <p className="font-semibold text-lg capitalize">
                                      {price.market_name.replace('_', ' ')}
                                    </p>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      {price.brand && (
                                        <>
                                          <span>{price.brand}</span>
                                          <span>•</span>
                                        </>
                                      )}
                                      <span>
                                        {price.package_size} {price.unit}
                                      </span>
                                      {price.is_promotion && (
                                        <>
                                          <span>•</span>
                                          <span className="text-red-600 font-medium">
                                            Promosyon!
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="text-right">
                                  <p className="text-2xl font-bold">
                                    {formatPrice(price.unit_price)}
                                  </p>
                                  {price.discount_price && (
                                    <p className="text-sm text-gray-500 line-through">
                                      {formatPrice(price.discount_price)}
                                    </p>
                                  )}
                                  <span className={`inline-block px-2 py-1 text-xs text-white rounded ${levelInfo.color}`}>
                                    {levelInfo.label}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                <span>Güven: {(price.confidence_score * 100).toFixed(0)}%</span>
                                <span>Kaynak: {price.data_source.toUpperCase()}</span>
                                <span>Güncelleme: {new Date(price.last_verified || Date.now()).toLocaleString('tr-TR')}</span>
                              </div>
                            </motion.div>
                          );
                        })
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <Store className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>Henüz fiyat bilgisi yok</p>
                        <button
                          onClick={handleRefreshPrices}
                          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Fiyatları Getir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-4">
                  {priceHistory.length > 0 ? (
                    <div className="space-y-2">
                      {priceHistory.map((entry, index) => (
                        <div
                          key={index}
                          className="p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {entry.change_percent > 0 ? (
                                <TrendingUp className="w-5 h-5 text-red-500" />
                              ) : entry.change_percent < 0 ? (
                                <TrendingDown className="w-5 h-5 text-green-500" />
                              ) : (
                                <Minus className="w-5 h-5 text-gray-400" />
                              )}
                              <div>
                                <p className="font-medium capitalize">
                                  {entry.market_name.replace('_', ' ')}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {new Date(entry.changed_at).toLocaleString('tr-TR')}
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 line-through">
                                  {formatPrice(entry.old_price)}
                                </span>
                                <span>→</span>
                                <span className="font-bold">
                                  {formatPrice(entry.new_price)}
                                </span>
                              </div>
                              <span className={`text-sm font-medium ${
                                entry.change_percent > 0 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {entry.change_percent > 0 ? '+' : ''}{entry.change_percent.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Henüz fiyat geçmişi yok</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'alerts' && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-medium mb-3">Yeni Fiyat Uyarısı Oluştur</h3>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={targetPrice}
                        onChange={(e) => setTargetPrice(e.target.value)}
                        placeholder="Hedef fiyat (TL)"
                        className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleSetAlert}
                        disabled={!targetPrice}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                      >
                        Uyarı Oluştur
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Mevcut en düşük fiyat: {prices.length > 0 ? formatPrice(Math.min(...allPrices)) : '-'}
                    </p>
                  </div>
                  
                  <div className="text-center py-12 text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Aktif fiyat uyarınız bulunmuyor</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
