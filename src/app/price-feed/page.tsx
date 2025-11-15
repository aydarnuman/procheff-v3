'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Search, TrendingUp, ShoppingBag, 
  Zap, DollarSign, Package2, AlertTriangle,
  BarChart3, Clock, Store, ArrowUpRight, ArrowDownRight,
  Percent, Tag, Star, Filter, Layout, Activity
} from 'lucide-react';
import { usePriceStore } from '@/store/price-store';
import { AddPriceModalPro } from '@/components/modals/AddPriceModalPro';
import { ProductDetailModal } from '@/components/modals/ProductDetailModal';


export default function PriceFeedPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  
  const {
    searchQuery,
    setSearchQuery,
    getFilteredProducts,
    getCheapestPrice,
    marketPrices,
    fetchPrices
  } = usePriceStore();
  
  const filteredProducts = getFilteredProducts();

  useEffect(() => {
    // Initialize tables via API call
    const initTables = async () => {
      try {
        await fetch('/api/market/init', { method: 'POST' });
      } catch (error) {
        console.error('Failed to initialize tables:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    
    initTables();
  }, []);

  const handleProductClick = async (productId: string) => {
    if (!marketPrices[productId] || marketPrices[productId].length === 0) {
      await fetchPrices(productId);
    }
    setSelectedProductId(productId);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <motion.div 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-center"
        >
          <Activity className="w-16 h-16 mx-auto mb-4 text-blue-500 animate-pulse" />
          <p className="text-gray-400 text-xl font-medium">Fiyat Takip Sistemi Hazırlanıyor...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* MODERN HEADER - Tema Uyumlu */}
      <header className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-cyan-600/5 to-green-600/5 backdrop-blur-3xl" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-5" />
        
        <div className="relative z-10 pl-4 pr-4 py-6 sm:pl-6 sm:pr-6 md:pl-8 md:pr-8 lg:pl-10 lg:pr-16 xl:pr-24">
          <div className="w-full max-w-[1800px] mr-auto">
            {/* Main Header */}
            <div className="flex items-center justify-between mb-8">
              <motion.div 
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="flex items-center gap-4"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 blur-xl opacity-30 animate-pulse" />
                  <div className="relative p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl border border-blue-500/20">
                    <DollarSign className="w-10 h-10 text-blue-400" />
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-green-400">
                    🔥 GERÇEK FİYAT TAKİP SİSTEMİ
                  </h1>
                  <p className="text-gray-500 text-sm mt-1">Canlı market fiyatları • Anlık güncelleme • AI destekli</p>
                </div>
              </motion.div>

              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsAddModalOpen(true)}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center gap-2 text-white font-semibold shadow-xl">
                  <Sparkles className="w-5 h-5" />
                  <span>Yeni Ürün Ekle</span>
                </div>
              </motion.button>
            </div>

            {/* Search & Stats Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Search */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="lg:col-span-2"
              >
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-xl blur opacity-0 group-hover:opacity-50 transition-opacity" />
                  <div className="relative flex items-center bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden">
                    <Search className="w-6 h-6 text-gray-400 ml-6" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Ürün ara... (domates, süt, zeytinyağı)"
                      className="flex-1 px-4 py-4 bg-transparent text-gray-200 placeholder-gray-500 focus:outline-none"
                    />
                    <div className="px-6 py-3 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 text-gray-300 font-medium border-l border-slate-700/50">
                      {filteredProducts.length} ÜRÜN
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Quick Stats */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex items-center justify-around bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 px-6 py-4"
              >
                <div className="text-center">
                  <BarChart3 className="w-7 h-7 text-green-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-gray-200">{filteredProducts.length}</p>
                  <p className="text-xs text-gray-500">Ürün</p>
                </div>
                <div className="w-px h-10 bg-slate-700/50" />
                <div className="text-center">
                  <Store className="w-7 h-7 text-blue-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-gray-200">7+</p>
                  <p className="text-xs text-gray-500">Market</p>
                </div>
                <div className="w-px h-10 bg-slate-700/50" />
                <div className="text-center">
                  <Activity className="w-7 h-7 text-cyan-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-gray-200">Canlı</p>
                  <p className="text-xs text-gray-500">Veri</p>
                </div>
              </motion.div>
            </div>

            {/* Category Pills */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex gap-3 overflow-x-auto pb-2"
            >
              {['all', 'Sebze', 'Meyve', 'Et', 'Süt', 'Bakliyat', 'Temizlik'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-5 py-2.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                    activeCategory === cat
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-slate-800/50 text-gray-400 hover:bg-slate-700/50 border border-slate-700/50'
                  }`}
                >
                  {cat === 'all' ? '⚡ Tümü' : cat}
                </button>
              ))}
            </motion.div>
          </div>
        </div>
      </header>

      {/* PRODUCTS GRID - Tema Uyumlu Kartlar */}
      <div className="w-full max-w-[1800px] mr-auto pl-4 pr-4 py-6 sm:pl-6 sm:pr-6 md:pl-8 md:pr-8 lg:pl-10 lg:pr-16 xl:pr-24">
        {filteredProducts.length > 0 ? (
          <motion.div 
            layout
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product, index) => {
                const cheapestPrice = getCheapestPrice(product.id);
                const prices = marketPrices[product.id] || [];
                const avgPrice = prices.length > 0 
                  ? prices.reduce((sum, p) => sum + p.unit_price, 0) / prices.length
                  : 0;
                const priceChange = cheapestPrice && avgPrice 
                  ? ((cheapestPrice.unit_price - avgPrice) / avgPrice) * 100
                  : 0;
                
                return (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -5 }}
                    onClick={() => handleProductClick(product.id)}
                    className="group relative cursor-pointer"
                  >
                    {/* Subtle Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
                    
                    {/* Card */}
                    <div className="relative bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden hover:border-slate-600/50 transition-all">
                      {/* Top Badge */}
                      {cheapestPrice && (
                        <div className="absolute top-3 right-3 z-10">
                          <div className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 backdrop-blur-sm ${
                            priceChange < 0 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {priceChange < 0 ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {Math.abs(priceChange).toFixed(0)}%
                          </div>
                        </div>
                      )}

                      {/* Product Icon Section */}
                      <div className="relative h-20 sm:h-24 bg-gradient-to-br from-slate-700/30 to-slate-800/30 flex items-center justify-center border-b border-slate-700/50">
                        <span className="text-3xl sm:text-4xl filter drop-shadow-lg">{product.icon}</span>
                      </div>

                      {/* Product Info */}
                      <div className="p-3 sm:p-4 space-y-2 sm:space-y-2.5">
                        <div>
                          <h3 className="text-sm sm:text-base font-semibold text-gray-200 mb-0.5 truncate">{product.name}</h3>
                          <p className="text-xs text-gray-500">{product.category}</p>
                        </div>

                        {cheapestPrice ? (
                          <>
                            {/* Price Display */}
                            <div className="space-y-2">
                              <div className="flex items-end justify-between">
                                <div>
                                  <p className="text-xs text-gray-500">En Ucuz</p>
                                  <p className="text-lg sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                                    ₺{cheapestPrice.unit_price.toFixed(2)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">Market</p>
                                  <p className="text-xs font-medium text-gray-300 capitalize">
                                    {cheapestPrice.market_name.replace('_', ' ')}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Price Bar */}
                              <div className="relative h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(prices.length / 7) * 100}%` }}
                                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                                />
                              </div>
                            </div>

                            {/* Bottom Stats */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                              <div className="flex items-center gap-1">
                                <Store className="w-3.5 h-3.5 text-gray-500" />
                                <span className="text-xs text-gray-500">{prices.length} fiyat</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                                <span className="text-xs text-cyan-400">Canlı</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-3 sm:py-4">
                            <Package2 className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1.5 text-gray-600" />
                            <p className="text-gray-500 text-xs">Fiyat bekleniyor</p>
                            <button className="mt-1 text-blue-400 text-xs hover:text-blue-300">
                              Fiyat ekle →
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center min-h-[500px]"
          >
            <div className="text-center">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 blur-3xl opacity-20" />
                <ShoppingBag className="relative w-20 h-20 mx-auto mb-6 text-gray-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-300 mb-2">
                Henüz Ürün Eklenmemiş
              </h3>
              <p className="text-gray-500 mb-8 max-w-lg">
                Gerçek zamanlı fiyat takibi için ürün eklemeye başlayın.<br/>
                AI destekli sistem otomatik kategori ve fiyat bulacak.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsAddModalOpen(true)}
                className="relative group inline-block"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur-lg opacity-50 group-hover:opacity-75" />
                <div className="relative px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl text-white font-semibold">
                  <Sparkles className="inline w-4 h-4 mr-2" />
                  İlk Ürünü Ekle
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Floating Action Stats */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-6 left-6 md:left-24 lg:left-[320px] z-40 transition-all duration-300"
      >
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-full px-6 py-3 border border-slate-700/50 flex items-center gap-6 shadow-2xl">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-gray-300 text-sm">Sistem Aktif</span>
          </div>
          <div className="w-px h-5 bg-slate-700/50" />
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span className="text-gray-300 text-sm">Canlı Fiyatlar</span>
          </div>
          <div className="w-px h-5 bg-slate-700/50" />
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-cyan-400" />
            <span className="text-gray-300 text-sm">AI Destekli</span>
          </div>
        </div>
      </motion.div>

      {/* Modals */}
      <AddPriceModalPro
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
      
      {selectedProductId && (
        <ProductDetailModal
          isOpen={!!selectedProductId}
          productId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
        />
      )}
    </div>
  );
}