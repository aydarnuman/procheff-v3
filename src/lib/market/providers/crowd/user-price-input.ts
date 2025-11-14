/**
 * User Price Input Module
 * Handles crowdsourced price data from users
 */

export interface UserPriceData {
  id: string;
  userId: string;
  productName: string;
  normalizedProductName: string;
  barcode?: string;
  price: number;
  unit: string;
  weight: number;
  weightUnit: 'kg' | 'g' | 'lt' | 'ml' | 'adet';
  marketName: string;
  marketBranch?: string;
  location: {
    city: string;
    district?: string;
    latitude?: number;
    longitude?: number;
  };
  receiptImageUrl?: string;
  submittedAt: Date;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedBy: string[];
  trustScore: number;
}

export interface PriceInputValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class UserPriceInput {
  private static readonly MIN_PRICE = 1;
  private static readonly MAX_PRICE = 10000;
  private static readonly VALID_MARKETS = [
    'Migros', 'CarrefourSA', 'A101', 'BİM', 'Şok', 'File Market',
    'Getir', 'Trendyol', 'Metro', 'Makro', 'Yerel Market'
  ];
  
  static validatePriceInput(data: Partial<UserPriceData>): PriceInputValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Required fields
    if (!data.productName || data.productName.trim().length < 3) {
      errors.push('Ürün adı en az 3 karakter olmalıdır');
    }
    
    if (!data.price || data.price < this.MIN_PRICE || data.price > this.MAX_PRICE) {
      errors.push(`Fiyat ${this.MIN_PRICE} - ${this.MAX_PRICE} TL arasında olmalıdır`);
    }
    
    if (!data.marketName || !this.VALID_MARKETS.includes(data.marketName)) {
      errors.push('Geçerli bir market seçiniz');
    }
    
    if (!data.location?.city) {
      errors.push('Şehir bilgisi zorunludur');
    }
    
    if (!data.weight || data.weight <= 0) {
      errors.push('Geçerli bir miktar giriniz');
    }
    
    // Warnings for better data quality
    if (!data.barcode) {
      warnings.push('Barkod bilgisi eklerseniz doğrulama daha hızlı olur');
    }
    
    if (!data.receiptImageUrl) {
      warnings.push('Fiş fotoğrafı eklerseniz güvenilirlik artar');
    }
    
    if (!data.location?.district) {
      warnings.push('İlçe bilgisi eklemeniz önerilir');
    }
    
    // Check for suspicious patterns
    if (data.price && this.isSuspiciousPrice(data.price, data.productName || '')) {
      warnings.push('Fiyat ürün için beklenenden farklı görünüyor');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  static normalizeProductName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      // Remove brand variations
      .replace(/\s+(marka|markası|ürünü|ürünleri)\s*/g, ' ')
      // Remove package info temporarily
      .replace(/\s*\d+\s*(gr|gram|kg|lt|litre|ml|adet|paket)\s*/g, ' ')
      // Remove special characters
      .replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, ' ')
      // Remove extra spaces
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  private static isSuspiciousPrice(price: number, productName: string): boolean {
    const lowerName = productName.toLowerCase();
    
    // Basic heuristics for common products
    const priceRanges: { [key: string]: [number, number] } = {
      'ekmek': [3, 15],
      'süt': [15, 50],
      'yumurta': [25, 100],
      'pirinç': [30, 150],
      'makarna': [10, 50],
      'un': [15, 80],
      'şeker': [20, 80],
      'yağ': [50, 300],
      'et': [150, 600],
      'tavuk': [50, 200],
      'balık': [50, 500],
      'domates': [10, 50],
      'patates': [5, 30],
      'soğan': [5, 30],
      'mercimek': [30, 100],
      'bulgur': [20, 80]
    };
    
    for (const [product, [min, max]] of Object.entries(priceRanges)) {
      if (lowerName.includes(product)) {
        return price < min || price > max;
      }
    }
    
    return false;
  }
  
  static extractWeightInfo(input: string): { weight: number; unit: 'kg' | 'g' | 'lt' | 'ml' | 'adet' } {
    const match = input.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gram|lt|litre|ml|mililitre|adet)?/i);
    
    if (match) {
      const weight = parseFloat(match[1].replace(',', '.'));
      let unit = match[2]?.toLowerCase() || 'adet';
      
      // Normalize units
      if (unit === 'gram') unit = 'g';
      if (unit === 'litre') unit = 'lt';
      if (unit === 'mililitre') unit = 'ml';
      
      return {
        weight,
        unit: unit as any
      };
    }
    
    return { weight: 1, unit: 'adet' };
  }
  
  static formatLocationString(location: UserPriceData['location']): string {
    const parts = [location.city];
    if (location.district) parts.push(location.district);
    return parts.join(', ');
  }
  
  static calculateDistanceBetweenPrices(
    price1: UserPriceData, 
    price2: UserPriceData
  ): number | null {
    if (!price1.location.latitude || !price1.location.longitude ||
        !price2.location.latitude || !price2.location.longitude) {
      return null;
    }
    
    // Haversine formula for distance between two points
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(price2.location.latitude - price1.location.latitude);
    const dLon = this.toRad(price2.location.longitude - price1.location.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(price1.location.latitude)) * 
              Math.cos(this.toRad(price2.location.latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }
  
  private static toRad(degree: number): number {
    return degree * (Math.PI / 180);
  }
}
