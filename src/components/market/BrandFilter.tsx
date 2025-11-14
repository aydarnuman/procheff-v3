'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Star, TrendingDown, ShoppingCart, X, Search } from 'lucide-react';
import { BrandClassifier, BrandInfo } from '@/lib/market/normalizers/brand-classifier';

export interface BrandFilterSelection {
  tiers: ('premium' | 'standard' | 'economy')[];
  specificBrands: string[];
  excludeMarketBrands: boolean;
}

interface BrandFilterProps {
  onFilterChange: (selection: BrandFilterSelection) => void;
  availableBrands?: BrandInfo[];
  productCount?: { [brand: string]: number };
  defaultSelection?: BrandFilterSelection;
}

export function BrandFilter({
  onFilterChange,
  availableBrands = [],
  productCount = {},
  defaultSelection = {
    tiers: ['premium', 'standard', 'economy'],
    specificBrands: [],
    excludeMarketBrands: false
  }
}: BrandFilterProps) {
  const [selection, setSelection] = useState<BrandFilterSelection>(defaultSelection);
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllBrands, setShowAllBrands] = useState(false);
  
  // Get tier configuration
  const tierConfig = {
    premium: {
      label: 'Premium',
      icon: Star,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      border: 'border-purple-300',
      description: 'Yüksek kalite markalar'
    },
    standard: {
      label: 'Standart',
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      border: 'border-blue-300',
      description: 'Orta segment markalar'
    },
    economy: {
      label: 'Ekonomik',
      icon: TrendingDown,
      color: 'text-green-600',
      bg: 'bg-green-100',
      border: 'border-green-300',
      description: 'Uygun fiyatlı markalar'
    }
  };
  
  // Handle tier toggle
  const handleTierToggle = (tier: 'premium' | 'standard' | 'economy') => {
    const newTiers = selection.tiers.includes(tier)
      ? selection.tiers.filter(t => t !== tier)
      : [...selection.tiers, tier];
    
    const newSelection = { ...selection, tiers: newTiers };
    setSelection(newSelection);
    onFilterChange(newSelection);
  };
  
  // Handle brand toggle
  const handleBrandToggle = (brandName: string) => {
    const newBrands = selection.specificBrands.includes(brandName)
      ? selection.specificBrands.filter(b => b !== brandName)
      : [...selection.specificBrands, brandName];
    
    const newSelection = { ...selection, specificBrands: newBrands };
    setSelection(newSelection);
    onFilterChange(newSelection);
  };
  
  // Handle market brand exclusion
  const handleMarketBrandToggle = () => {
    const newSelection = { 
      ...selection, 
      excludeMarketBrands: !selection.excludeMarketBrands 
    };
    setSelection(newSelection);
    onFilterChange(newSelection);
  };
  
  // Clear all filters
  const clearFilters = () => {
    const newSelection: BrandFilterSelection = {
      tiers: ['premium', 'standard', 'economy'],
      specificBrands: [],
      excludeMarketBrands: false
    };
    setSelection(newSelection);
    onFilterChange(newSelection);
    setSearchTerm('');
  };
  
  // Filter brands by search
  const filteredBrands = availableBrands.filter(brand =>
    brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    brand.category_focus?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Group brands by tier
  const brandsByTier = filteredBrands.reduce((acc, brand) => {
    if (!acc[brand.tier]) acc[brand.tier] = [];
    acc[brand.tier].push(brand);
    return acc;
  }, {} as { [tier: string]: BrandInfo[] });
  
  // Count active filters
  const activeFilterCount = 
    (selection.tiers.length < 3 ? selection.tiers.length : 0) +
    selection.specificBrands.length +
    (selection.excludeMarketBrands ? 1 : 0);
  
  return (
    <div className="relative">
      {/* Filter Button */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          relative flex items-center gap-2 px-4 py-2 rounded-lg border-2
          transition-all duration-200
          ${isExpanded
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
          }
          hover:border-blue-400 hover:shadow-md
        `}
        whileTap={{ scale: 0.95 }}
      >
        <Filter className="h-4 w-4" />
        <span className="font-medium">Marka Filtresi</span>
        
        {activeFilterCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center justify-center w-5 h-5 ml-1 text-xs font-bold text-white bg-blue-500 rounded-full"
          >
            {activeFilterCount}
          </motion.span>
        )}
      </motion.button>
      
      {/* Filter Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 z-50 mt-2 p-4 bg-white dark:bg-gray-800 
                       rounded-xl shadow-xl border border-gray-200 dark:border-gray-700"
            style={{ minWidth: '320px' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Marka Filtreleme
              </h3>
              
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 
                             dark:hover:text-gray-200 transition-colors"
                  >
                    Temizle
                  </button>
                )}
                
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 
                           transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {/* Tier Selection */}
            <div className="space-y-2 mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Marka Segmenti
              </p>
              
              <div className="grid grid-cols-3 gap-2">
                {(['premium', 'standard', 'economy'] as const).map(tier => {
                  const config = tierConfig[tier];
                  const Icon = config.icon;
                  const isActive = selection.tiers.includes(tier);
                  
                  return (
                    <motion.button
                      key={tier}
                      onClick={() => handleTierToggle(tier)}
                      whileTap={{ scale: 0.95 }}
                      className={`
                        flex flex-col items-center gap-1 p-3 rounded-lg border-2
                        transition-all duration-200
                        ${isActive
                          ? `${config.bg} ${config.border} ${config.color}`
                          : 'border-gray-200 dark:border-gray-700 text-gray-500'
                        }
                        hover:shadow-md
                      `}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{config.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
            
            {/* Market Brand Exclusion */}
            <div className="mb-4">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 
                               dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 
                               cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={selection.excludeMarketBrands}
                  onChange={handleMarketBrandToggle}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Market Markalarını Hariç Tut
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Migros, CarrefourSA, A101 gibi market markaları
                  </p>
                </div>
              </label>
            </div>
            
            {/* Brand Search */}
            {availableBrands.length > 0 && (
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 
                                   h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Marka ara..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 
                             rounded-lg bg-gray-50 dark:bg-gray-900/50 text-gray-900 
                             dark:text-white placeholder-gray-500 focus:ring-2 
                             focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
            
            {/* Specific Brand Selection */}
            {Object.keys(brandsByTier).length > 0 && (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {(['premium', 'standard', 'economy'] as const).map(tier => {
                  const brands = brandsByTier[tier];
                  if (!brands || brands.length === 0) return null;
                  
                  const displayBrands = showAllBrands ? brands : brands.slice(0, 5);
                  const config = tierConfig[tier];
                  
                  return (
                    <div key={tier} className="space-y-2">
                      <p className={`text-xs font-medium ${config.color}`}>
                        {config.label} Markalar
                      </p>
                      
                      <div className="space-y-1">
                        {displayBrands.map(brand => {
                          const isSelected = selection.specificBrands.includes(brand.name);
                          const count = productCount[brand.name] || 0;
                          
                          return (
                            <label
                              key={brand.name}
                              className={`
                                flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer
                                transition-all duration-200
                                ${isSelected
                                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-300'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                }
                              `}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleBrandToggle(brand.name)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {brand.name}
                                  </span>
                                  {brand.is_market_brand && (
                                    <span className="text-xs px-1.5 py-0.5 bg-gray-200 
                                                   dark:bg-gray-700 rounded">
                                      Market
                                    </span>
                                  )}
                                </div>
                                {brand.category_focus && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {brand.category_focus}
                                  </span>
                                )}
                              </div>
                              
                              {count > 0 && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {count}
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                      
                      {!showAllBrands && brands.length > 5 && (
                        <button
                          onClick={() => setShowAllBrands(true)}
                          className="text-xs text-blue-600 hover:text-blue-700 
                                   dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          +{brands.length - 5} daha fazla
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact brand badge for displaying selected tier
export function BrandTierBadge({ 
  tier 
}: { 
  tier: 'premium' | 'standard' | 'economy' 
}) {
  const config = {
    premium: { color: 'text-purple-700', bg: 'bg-purple-100', label: 'Premium' },
    standard: { color: 'text-blue-700', bg: 'bg-blue-100', label: 'Standart' },
    economy: { color: 'text-green-700', bg: 'bg-green-100', label: 'Ekonomik' }
  };
  
  const style = config[tier];
  
  return (
    <span className={`
      inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
      ${style.bg} ${style.color}
    `}>
      {style.label}
    </span>
  );
}
