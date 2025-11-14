'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Calculator, TrendingUp } from 'lucide-react';
import { WeightNormalizer } from '@/lib/market/normalizers/weight-normalizer';

export interface WeightOption {
  value: number;
  unit: 'kg' | 'g' | 'lt' | 'ml' | 'adet';
  label: string;
  isDefault?: boolean;
}

interface WeightSelectorProps {
  options: WeightOption[];
  currentPrice: number;
  currentWeight: number;
  currentUnit: 'kg' | 'g' | 'lt' | 'ml' | 'adet';
  onWeightChange: (weight: number, unit: 'kg' | 'g' | 'lt' | 'ml' | 'adet', normalizedPrice: number) => void;
  productName?: string;
  showComparison?: boolean;
}

export function WeightSelector({
  options,
  currentPrice,
  currentWeight,
  currentUnit,
  onWeightChange,
  productName,
  showComparison = true
}: WeightSelectorProps) {
  const [selectedOption, setSelectedOption] = useState<WeightOption | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Initialize with current weight
  useEffect(() => {
    const current = options.find(
      opt => opt.value === currentWeight && opt.unit === currentUnit
    );
    setSelectedOption(current || options[0]);
  }, [currentWeight, currentUnit, options]);
  
  const handleOptionSelect = (option: WeightOption) => {
    setSelectedOption(option);
    
    // Calculate price for new weight
    const currentNormalized = WeightNormalizer.normalizePrice(
      currentPrice,
      currentWeight,
      currentUnit,
      productName
    );
    
    // Calculate new price based on normalized price per kg/lt
    let newPrice = currentPrice;
    
    if (currentNormalized.normalized_price_per_kg > 0) {
      const targetNormalized = WeightNormalizer.normalizePrice(
        1, // Dummy price
        option.value,
        option.unit,
        productName
      );
      
      // If both are weight-based (kg/g) or volume-based (lt/ml), we can convert
      const currentIsWeight = ['kg', 'g'].includes(currentUnit);
      const targetIsWeight = ['kg', 'g'].includes(option.unit);
      const currentIsVolume = ['lt', 'ml'].includes(currentUnit);
      const targetIsVolume = ['lt', 'ml'].includes(option.unit);
      
      if ((currentIsWeight && targetIsWeight) || (currentIsVolume && targetIsVolume)) {
        // Convert weight/volume
        const conversionFactor = option.unit === 'kg' || option.unit === 'lt' 
          ? option.value 
          : option.value / 1000;
        
        newPrice = currentNormalized.normalized_price_per_kg * conversionFactor;
      } else if (currentUnit === 'adet' || option.unit === 'adet') {
        // Can't convert between piece and weight/volume
        newPrice = currentPrice;
      }
    }
    
    onWeightChange(option.value, option.unit, newPrice);
    setIsExpanded(false);
  };
  
  const formatPrice = (price: number) => {
    return `₺${price.toFixed(2)}`;
  };
  
  const getUnitLabel = (unit: string) => {
    const labels: Record<string, string> = {
      'kg': 'Kilogram',
      'g': 'Gram',
      'lt': 'Litre',
      'ml': 'Mililitre',
      'adet': 'Adet'
    };
    return labels[unit] || unit;
  };
  
  if (!selectedOption) return null;
  
  const currentNormalized = WeightNormalizer.normalizePrice(
    currentPrice,
    currentWeight,
    currentUnit,
    productName
  );
  
  return (
    <div className="space-y-3">
      {/* Current Selection */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-full p-4 rounded-lg border-2 transition-all
          ${isExpanded 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
          }
          hover:border-blue-400 hover:shadow-md
        `}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-gray-500" />
            <div className="text-left">
              <p className="font-medium text-gray-900 dark:text-white">
                {selectedOption.label}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatPrice(currentPrice)} / {selectedOption.value} {selectedOption.unit}
              </p>
            </div>
          </div>
          
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </motion.div>
        </div>
      </motion.button>
      
      {/* Weight Options */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-2 overflow-hidden"
          >
            {options.map((option, index) => {
              const isSelected = option === selectedOption;
              
              // Calculate price for this option
              let optionPrice = currentPrice;
              if (!isSelected && currentNormalized.normalized_price_per_kg > 0) {
                const currentIsWeight = ['kg', 'g'].includes(currentUnit);
                const targetIsWeight = ['kg', 'g'].includes(option.unit);
                const currentIsVolume = ['lt', 'ml'].includes(currentUnit);
                const targetIsVolume = ['lt', 'ml'].includes(option.unit);
                
                if ((currentIsWeight && targetIsWeight) || (currentIsVolume && targetIsVolume)) {
                  const conversionFactor = option.unit === 'kg' || option.unit === 'lt' 
                    ? option.value 
                    : option.value / 1000;
                  
                  optionPrice = currentNormalized.normalized_price_per_kg * conversionFactor;
                }
              }
              
              return (
                <motion.button
                  key={`${option.value}-${option.unit}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleOptionSelect(option)}
                  disabled={isSelected}
                  className={`
                    w-full p-3 rounded-lg border transition-all text-left
                    ${isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 cursor-default'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                        {option.label}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {option.value} {getUnitLabel(option.unit)}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className={`font-semibold ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                        {formatPrice(optionPrice)}
                      </p>
                      {option.isDefault && (
                        <span className="text-xs text-green-600 dark:text-green-400">
                          En ekonomik
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Comparison Info */}
      {showComparison && currentNormalized.normalized_price_per_kg > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
        >
          <Calculator className="h-4 w-4 text-gray-500" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Birim fiyat:{' '}
            <span className="font-medium text-gray-900 dark:text-white">
              {WeightNormalizer.formatNormalizedPrice(currentNormalized)}
            </span>
          </p>
        </motion.div>
      )}
    </div>
  );
}

// Preset weight options for common product types
export const WEIGHT_PRESETS = {
  bakliyat: [
    { value: 500, unit: 'g' as const, label: '500 Gram' },
    { value: 1, unit: 'kg' as const, label: '1 Kilogram', isDefault: true },
    { value: 2, unit: 'kg' as const, label: '2 Kilogram' },
    { value: 5, unit: 'kg' as const, label: '5 Kilogram' }
  ],
  sut_urunleri: [
    { value: 500, unit: 'ml' as const, label: '500 ml' },
    { value: 1, unit: 'lt' as const, label: '1 Litre', isDefault: true },
    { value: 1.5, unit: 'lt' as const, label: '1.5 Litre' },
    { value: 3, unit: 'lt' as const, label: '3 Litre' }
  ],
  yag: [
    { value: 1, unit: 'lt' as const, label: '1 Litre' },
    { value: 2, unit: 'lt' as const, label: '2 Litre' },
    { value: 5, unit: 'lt' as const, label: '5 Litre', isDefault: true }
  ],
  et_tavuk: [
    { value: 500, unit: 'g' as const, label: '500 Gram' },
    { value: 1, unit: 'kg' as const, label: '1 Kilogram', isDefault: true },
    { value: 2, unit: 'kg' as const, label: '2 Kilogram' }
  ],
  default: [
    { value: 1, unit: 'adet' as const, label: '1 Adet', isDefault: true },
    { value: 3, unit: 'adet' as const, label: '3 Adet' },
    { value: 6, unit: 'adet' as const, label: '6 Adet' }
  ]
};
