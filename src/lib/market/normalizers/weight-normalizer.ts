/**
 * Weight Normalizer
 * Tüm fiyatları 1kg/1lt standardına çevirir
 */

export interface NormalizedPrice {
  original_price: number;
  original_weight: number;
  original_unit: 'kg' | 'g' | 'lt' | 'ml' | 'adet';
  normalized_price_per_kg: number;
  confidence: number;
}

export interface WeightConversion {
  fromUnit: string;
  toUnit: string;
  factor: number;
}

export class WeightNormalizer {
  // Conversion factors to base units (kg for weight, lt for volume)
  private static readonly CONVERSIONS: WeightConversion[] = [
    // Weight conversions to kg
    { fromUnit: 'g', toUnit: 'kg', factor: 0.001 },
    { fromUnit: 'gr', toUnit: 'kg', factor: 0.001 },
    { fromUnit: 'gram', toUnit: 'kg', factor: 0.001 },
    { fromUnit: 'kg', toUnit: 'kg', factor: 1 },
    { fromUnit: 'kilogram', toUnit: 'kg', factor: 1 },
    { fromUnit: 'kilo', toUnit: 'kg', factor: 1 },
    
    // Volume conversions to lt
    { fromUnit: 'ml', toUnit: 'lt', factor: 0.001 },
    { fromUnit: 'mililitre', toUnit: 'lt', factor: 0.001 },
    { fromUnit: 'cl', toUnit: 'lt', factor: 0.01 },
    { fromUnit: 'dl', toUnit: 'lt', factor: 0.1 },
    { fromUnit: 'lt', toUnit: 'lt', factor: 1 },
    { fromUnit: 'l', toUnit: 'lt', factor: 1 },
    { fromUnit: 'litre', toUnit: 'lt', factor: 1 },
    
    // Special units
    { fromUnit: 'adet', toUnit: 'adet', factor: 1 },
    { fromUnit: 'paket', toUnit: 'adet', factor: 1 },
    { fromUnit: 'kutu', toUnit: 'adet', factor: 1 }
  ];
  
  // Product categories that should be normalized by weight
  private static readonly WEIGHT_BASED_PRODUCTS = [
    'mercimek', 'nohut', 'fasulye', 'bulgur', 'pirinç', 'makarna',
    'un', 'şeker', 'tuz', 'kahve', 'çay', 'baharat',
    'et', 'kıyma', 'tavuk', 'balık', 'peynir', 'zeytin'
  ];
  
  // Product categories that should be normalized by volume
  private static readonly VOLUME_BASED_PRODUCTS = [
    'süt', 'ayran', 'yoğurt', 'kefir', 'yağ', 'zeytinyağı',
    'su', 'meyve suyu', 'gazoz', 'kola', 'deterjan', 'şampuan'
  ];
  
  /**
   * Normalizes price to per kg or per liter basis
   */
  static normalizePrice(
    price: number, 
    weight: number, 
    unit: string, 
    productName?: string
  ): NormalizedPrice {
    const normalizedUnit = this.normalizeUnit(unit);
    const baseUnit = this.getBaseUnit(normalizedUnit, productName);
    
    // Handle special case for items sold by piece
    if (normalizedUnit === 'adet') {
      return {
        original_price: price,
        original_weight: weight,
        original_unit: 'adet',
        normalized_price_per_kg: price, // Price per item
        confidence: 0.9
      };
    }
    
    // Convert to base unit
    const conversionFactor = this.getConversionFactor(normalizedUnit, baseUnit);
    const weightInBaseUnit = weight * conversionFactor;
    
    // Calculate price per base unit (kg or lt)
    const normalizedPrice = weightInBaseUnit > 0 ? price / weightInBaseUnit : 0;
    
    return {
      original_price: price,
      original_weight: weight,
      original_unit: normalizedUnit as any,
      normalized_price_per_kg: normalizedPrice,
      confidence: this.calculateConfidence(normalizedUnit, productName)
    };
  }
  
  /**
   * Extracts weight information from product description
   */
  static extractWeightFromText(text: string): { weight: number; unit: string } | null {
    // Common patterns: "1 kg", "500g", "1.5 lt", "2x1lt", "6x200ml"
    const patterns = [
      // Multi-pack patterns
      /(\d+)\s*x\s*(\d+(?:[.,]\d+)?)\s*(kg|g|gr|gram|lt|l|ml|litre|kilo)/i,
      // Standard patterns
      /(\d+(?:[.,]\d+)?)\s*(kg|g|gr|gram|lt|l|ml|litre|kilo|adet)/i,
      // Patterns with spaces
      /(\d+(?:[.,]\d+)?)\s+(kilogram|gram|litre|mililitre)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        if (match.length === 4) {
          // Multi-pack: multiply count by unit weight
          const count = parseInt(match[1]);
          const unitWeight = parseFloat(match[2].replace(',', '.'));
          return {
            weight: count * unitWeight,
            unit: match[3].toLowerCase()
          };
        } else {
          // Single item
          return {
            weight: parseFloat(match[1].replace(',', '.')),
            unit: match[2].toLowerCase()
          };
        }
      }
    }
    
    return null;
  }
  
  /**
   * Normalizes unit variations to standard units
   */
  private static normalizeUnit(unit: string): string {
    const normalized = unit.toLowerCase().trim();
    
    // Map variations to standard units
    const unitMap: { [key: string]: string } = {
      'g': 'g',
      'gr': 'g',
      'gram': 'g',
      'kg': 'kg',
      'kilogram': 'kg',
      'kilo': 'kg',
      'ml': 'ml',
      'mililitre': 'ml',
      'lt': 'lt',
      'l': 'lt',
      'litre': 'lt',
      'adet': 'adet',
      'ad': 'adet',
      'piece': 'adet',
      'paket': 'adet',
      'kutu': 'adet'
    };
    
    return unitMap[normalized] || normalized;
  }
  
  /**
   * Determines the base unit (kg or lt) based on product type
   */
  private static getBaseUnit(currentUnit: string, productName?: string): string {
    // If already in base unit, return it
    if (currentUnit === 'kg' || currentUnit === 'lt' || currentUnit === 'adet') {
      return currentUnit;
    }
    
    // Determine by current unit type
    if (['g', 'gr', 'gram'].includes(currentUnit)) {
      return 'kg';
    }
    if (['ml', 'cl', 'dl'].includes(currentUnit)) {
      return 'lt';
    }
    
    // Try to determine by product name
    if (productName) {
      const lowerName = productName.toLowerCase();
      
      if (this.WEIGHT_BASED_PRODUCTS.some(p => lowerName.includes(p))) {
        return 'kg';
      }
      if (this.VOLUME_BASED_PRODUCTS.some(p => lowerName.includes(p))) {
        return 'lt';
      }
    }
    
    // Default to kg for solid products
    return 'kg';
  }
  
  /**
   * Gets conversion factor between units
   */
  private static getConversionFactor(fromUnit: string, toUnit: string): number {
    if (fromUnit === toUnit) return 1;
    
    const conversion = this.CONVERSIONS.find(
      c => c.fromUnit === fromUnit && c.toUnit === toUnit
    );
    
    return conversion?.factor || 1;
  }
  
  /**
   * Calculates confidence score for normalization
   */
  private static calculateConfidence(unit: string, productName?: string): number {
    let confidence = 0.8;
    
    // Higher confidence for standard units
    if (['kg', 'g', 'lt', 'ml'].includes(unit)) {
      confidence = 0.95;
    }
    
    // Lower confidence for piece-based items
    if (unit === 'adet') {
      confidence = 0.7;
    }
    
    // Boost confidence if product type matches unit type
    if (productName) {
      const lowerName = productName.toLowerCase();
      const isWeightProduct = this.WEIGHT_BASED_PRODUCTS.some(p => lowerName.includes(p));
      const isVolumeProduct = this.VOLUME_BASED_PRODUCTS.some(p => lowerName.includes(p));
      
      if ((isWeightProduct && ['kg', 'g'].includes(unit)) ||
          (isVolumeProduct && ['lt', 'ml'].includes(unit))) {
        confidence = Math.min(confidence + 0.1, 1.0);
      }
    }
    
    return confidence;
  }
  
  /**
   * Batch normalize multiple prices
   */
  static normalizePriceBatch(
    items: Array<{
      price: number;
      weight: number;
      unit: string;
      productName?: string;
    }>
  ): NormalizedPrice[] {
    return items.map(item => 
      this.normalizePrice(item.price, item.weight, item.unit, item.productName)
    );
  }
  
  /**
   * Formats normalized price for display
   */
  static formatNormalizedPrice(normalized: NormalizedPrice): string {
    const unit = normalized.original_unit === 'adet' ? 'adet' : 
                 ['kg', 'g'].includes(normalized.original_unit) ? 'kg' : 'lt';
    
    return `₺${normalized.normalized_price_per_kg.toFixed(2)}/${unit}`;
  }
}
