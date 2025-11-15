'use client';

import { motion } from 'framer-motion';
import { ShoppingCart, CheckCircle, Clock, XCircle, TrendingDown, Award } from 'lucide-react';
import type { BrandPriceOption } from '@/lib/market';

interface BrandComparisonListProps {
  brands: BrandPriceOption[];
  onSelectBrand?: (brand: BrandPriceOption) => void;
  showAvailability?: boolean;
  highlightCheapest?: boolean;
}

export function BrandComparisonList({
  brands,
  onSelectBrand,
  showAvailability = true,
  highlightCheapest = true
}: BrandComparisonListProps) {
  if (brands.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <div className="text-4xl mb-2">🏷️</div>
        <p className="text-slate-400">Marka bazlı fiyat bilgisi bulunamadı</p>
      </div>
    );
  }

  // Sort by price (cheapest first)
  const sortedBrands = [...brands].sort((a, b) => a.price - b.price);
  const cheapest = sortedBrands[0];
  const mostExpensive = sortedBrands[sortedBrands.length - 1];
  const priceRange = mostExpensive.price - cheapest.price;

  // Availability icon
  const getAvailabilityIcon = (status: string) => {
    switch (status) {
      case 'in_stock':
        return { icon: CheckCircle, color: 'text-green-400', label: 'Stokta' };
      case 'limited':
        return { icon: Clock, color: 'text-yellow-400', label: 'Sınırlı' };
      case 'out_of_stock':
        return { icon: XCircle, color: 'text-red-400', label: 'Tükendi' };
      default:
        return { icon: Clock, color: 'text-slate-400', label: 'Bilinmiyor' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white">Marka Karşılaştırma</h3>
        </div>
        <div className="text-sm text-slate-400">
          {brands.length} marka
        </div>
      </div>

      {/* Price Range Summary */}
      <div className="glass-card p-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-green-400" />
            <span className="text-slate-400">En Ucuz:</span>
            <span className="font-medium text-green-300">{cheapest.price.toFixed(2)} TL</span>
          </div>
          <div className="text-slate-500">|</div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Fark:</span>
            <span className="font-medium text-orange-300">
              {priceRange.toFixed(2)} TL ({((priceRange / cheapest.price) * 100).toFixed(0)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Brand List */}
      <div className="space-y-2">
        {sortedBrands.map((brand, index) => {
          const isCheapest = highlightCheapest && brand === cheapest;
          const availability = getAvailabilityIcon(brand.availability);
          const AvailIcon = availability.icon;
          
          // Calculate price position (0-1)
          const pricePosition = priceRange > 0 
            ? (brand.price - cheapest.price) / priceRange 
            : 0;

          return (
            <motion.button
              key={brand.brand}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelectBrand?.(brand)}
              className={`w-full glass-card p-4 text-left transition-all hover:scale-[1.02]
                ${isCheapest 
                  ? 'border-2 border-green-500/50 shadow-lg shadow-green-500/20' 
                  : 'border border-slate-700/50 hover:border-purple-500/30'
                }`}
            >
              <div className="flex items-start justify-between mb-3">
                {/* Brand Name */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-white">{brand.brand}</h4>
                    {isCheapest && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full 
                                     bg-green-500/20 text-green-300 text-xs">
                        <Award className="w-3 h-3" />
                        En Ucuz
                      </span>
                    )}
                  </div>
                  
                  {/* Source & Date */}
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Kaynak: {brand.source}</span>
                    <span>•</span>
                    <span>{new Date(brand.lastUpdated).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>

                {/* Price */}
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    {brand.price.toFixed(2)} TL
                  </div>
                  {!isCheapest && (
                    <div className="text-xs text-orange-400">
                      +{(brand.price - cheapest.price).toFixed(2)} TL
                    </div>
                  )}
                </div>
              </div>

              {/* Price Bar */}
              <div className="mb-3">
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(pricePosition * 100)}%` }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    className={`h-full rounded-full ${
                      isCheapest ? 'bg-green-500' :
                      pricePosition < 0.5 ? 'bg-blue-500' :
                      pricePosition < 0.8 ? 'bg-yellow-500' :
                      'bg-orange-500'
                    }`}
                  />
                </div>
              </div>

              {/* Bottom Row */}
              <div className="flex items-center justify-between">
                {/* Availability */}
                {showAvailability && (
                  <div className="flex items-center gap-1.5">
                    <AvailIcon className={`w-4 h-4 ${availability.color}`} />
                    <span className={`text-xs ${availability.color}`}>
                      {availability.label}
                    </span>
                  </div>
                )}

                {/* Packaging */}
                {brand.packaging && (
                  <div className="text-xs text-slate-400">
                    {brand.packaging.description || 
                     `${brand.packaging.size} ${brand.packaging.unit}`}
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="glass-card p-3">
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div>
            <div className="text-slate-400 text-xs mb-1">Ortalama</div>
            <div className="font-medium text-white">
              {(sortedBrands.reduce((sum, b) => sum + b.price, 0) / sortedBrands.length).toFixed(2)} TL
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-xs mb-1">Stokta</div>
            <div className="font-medium text-green-300">
              {sortedBrands.filter(b => b.availability === 'in_stock').length}/{sortedBrands.length}
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-xs mb-1">Tasarruf</div>
            <div className="font-medium text-orange-300">
              {((priceRange / mostExpensive.price) * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact version for small spaces
export function BrandComparisonCompact({ brands }: { brands: BrandPriceOption[] }) {
  if (brands.length === 0) return null;

  const sorted = [...brands].sort((a, b) => a.price - b.price);
  // const cheapest = sorted[0];  // Unused variable

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {sorted.slice(0, 3).map((brand, idx) => (
        <div
          key={brand.brand}
          className={`px-2 py-1 rounded text-xs ${
            idx === 0 
              ? 'bg-green-500/20 text-green-300 font-medium' 
              : 'bg-slate-700/50 text-slate-400'
          }`}
        >
          {brand.brand}: {brand.price.toFixed(2)} TL
        </div>
      ))}
      {brands.length > 3 && (
        <div className="px-2 py-1 rounded text-xs bg-slate-700/50 text-slate-500">
          +{brands.length - 3} marka
        </div>
      )}
    </div>
  );
}

