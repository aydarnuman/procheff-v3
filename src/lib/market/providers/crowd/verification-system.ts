/**
 * Verification System
 * Cross-validation for crowdsourced price data
 */

import { UserPriceData } from './user-price-input';


export interface VerificationRule {
  name: string;
  description: string;
  validate: (price: UserPriceData, context: VerificationContext) => VerificationResult;
  weight: number; // How much this rule affects the final decision
}

export interface VerificationContext {
  similarPrices: UserPriceData[];
  userHistory: UserPriceData[];
  marketAverages: { [market: string]: number };
  categoryAverages: { [category: string]: number };
}

export interface VerificationResult {
  passed: boolean;
  confidence: number; // 0-1
  reason?: string;
}

export interface VerificationOutcome {
  isVerified: boolean;
  confidence: number;
  failedRules: string[];
  warnings: string[];
  requiredVerifications: number;
  currentVerifications: number;
}

export class VerificationSystem {
  private static readonly MIN_VERIFICATIONS_REQUIRED = 3;
  private static readonly VERIFICATION_TIME_WINDOW = 7 * 24 * 60 * 60 * 1000; // 7 days
  private static readonly PRICE_DEVIATION_THRESHOLD = 0.3; // 30%
  
  private rules: VerificationRule[] = [
    {
      name: 'price_range_check',
      description: 'Fiyat makul aralıkta mı?',
      weight: 0.3,
      validate: this.validatePriceRange.bind(this)
    },
    {
      name: 'location_consistency',
      description: 'Konum bazlı fiyat tutarlılığı',
      weight: 0.2,
      validate: this.validateLocationConsistency.bind(this)
    },
    {
      name: 'receipt_verification',
      description: 'Fiş doğrulaması',
      weight: 0.3,
      validate: this.validateReceipt.bind(this)
    },
    {
      name: 'user_reputation',
      description: 'Kullanıcı güvenilirliği',
      weight: 0.2,
      validate: this.validateUserReputation.bind(this)
    }
  ];
  
  async verifyPrice(
    price: UserPriceData, 
    context: VerificationContext
  ): Promise<VerificationOutcome> {
    const results: VerificationResult[] = [];
    const failedRules: string[] = [];
    const warnings: string[] = [];
    
    // Run all validation rules
    for (const rule of this.rules) {
      const result = await rule.validate(price, context);
      results.push(result);
      
      if (!result.passed) {
        failedRules.push(`${rule.name}: ${result.reason}`);
      } else if (result.confidence < 0.7) {
        warnings.push(`${rule.name}: Düşük güven (${Math.round(result.confidence * 100)}%)`);
      }
    }
    
    // Calculate weighted confidence
    const totalWeight = this.rules.reduce((sum, rule) => sum + rule.weight, 0);
    const weightedConfidence = results.reduce((sum, result, index) => {
      return sum + (result.confidence * this.rules[index].weight);
    }, 0) / totalWeight;
    
    // Check peer verifications
    const peerVerifications = this.countPeerVerifications(price, context.similarPrices);
    
    return {
      isVerified: weightedConfidence > 0.7 && failedRules.length === 0,
      confidence: weightedConfidence,
      failedRules,
      warnings,
      requiredVerifications: VerificationSystem.MIN_VERIFICATIONS_REQUIRED,
      currentVerifications: peerVerifications
    };
  }
  
  private validatePriceRange(
    price: UserPriceData, 
    context: VerificationContext
  ): VerificationResult {
    const marketAvg = context.marketAverages[price.marketName];
    const categoryAvg = context.categoryAverages[this.getProductCategory(price.productName)];
    
    if (!marketAvg && !categoryAvg) {
      return { passed: true, confidence: 0.5, reason: 'Karşılaştırma verisi yok' };
    }
    
    const avgPrice = marketAvg || categoryAvg;
    const deviation = Math.abs(price.price - avgPrice) / avgPrice;
    
    if (deviation > VerificationSystem.PRICE_DEVIATION_THRESHOLD) {
      return {
        passed: false,
        confidence: 1 - deviation,
        reason: `Fiyat ortalamadan %${Math.round(deviation * 100)} sapıyor`
      };
    }
    
    return {
      passed: true,
      confidence: 1 - deviation
    };
  }
  
  private validateLocationConsistency(
    price: UserPriceData,
    context: VerificationContext
  ): VerificationResult {
    const nearbyPrices = context.similarPrices.filter(p => {
      return p.location.city === price.location.city &&
             p.marketName === price.marketName &&
             Math.abs(p.submittedAt.getTime() - price.submittedAt.getTime()) < VerificationSystem.VERIFICATION_TIME_WINDOW;
    });
    
    if (nearbyPrices.length === 0) {
      return { passed: true, confidence: 0.6 };
    }
    
    const avgNearbyPrice = nearbyPrices.reduce((sum, p) => sum + p.price, 0) / nearbyPrices.length;
    const deviation = Math.abs(price.price - avgNearbyPrice) / avgNearbyPrice;
    
    return {
      passed: deviation < 0.2, // 20% deviation allowed for same city
      confidence: 1 - deviation,
      reason: deviation >= 0.2 ? 'Aynı şehirdeki fiyatlardan çok farklı' : undefined
    };
  }
  
  private validateReceipt(
    price: UserPriceData,
    context: VerificationContext
  ): VerificationResult {
    if (!price.receiptImageUrl) {
      return {
        passed: true,
        confidence: 0.5,
        reason: 'Fiş fotoğrafı yok'
      };
    }
    
    // TODO: Implement OCR or image verification
    // For now, just check if receipt exists
    return {
      passed: true,
      confidence: 0.9
    };
  }
  
  private validateUserReputation(
    price: UserPriceData,
    context: VerificationContext
  ): VerificationResult {
    const userTrustScore = price.trustScore;
    
    if (userTrustScore < 0.3) {
      return {
        passed: false,
        confidence: userTrustScore,
        reason: 'Kullanıcı güven skoru çok düşük'
      };
    }
    
    // Check user's history for consistency
    const userPrices = context.userHistory;
    const rejectedCount = userPrices.filter(p => p.verificationStatus === 'rejected').length;
    const rejectionRate = userPrices.length > 0 ? rejectedCount / userPrices.length : 0;
    
    if (rejectionRate > 0.5) {
      return {
        passed: false,
        confidence: 1 - rejectionRate,
        reason: 'Kullanıcının geçmiş kayıtları güvenilir değil'
      };
    }
    
    return {
      passed: true,
      confidence: userTrustScore
    };
  }
  
  private countPeerVerifications(
    price: UserPriceData,
    similarPrices: UserPriceData[]
  ): number {
    return similarPrices.filter(p => {
      const timeDiff = Math.abs(p.submittedAt.getTime() - price.submittedAt.getTime());
      const priceDiff = Math.abs(p.price - price.price) / price.price;
      
      return p.verifiedBy.includes(price.userId) &&
             timeDiff < VerificationSystem.VERIFICATION_TIME_WINDOW &&
             priceDiff < 0.1 && // 10% price difference
             p.marketName === price.marketName &&
             p.normalizedProductName === price.normalizedProductName;
    }).length;
  }
  
  private getProductCategory(productName: string): string {
    const categories: { [key: string]: string[] } = {
      'bakliyat': ['mercimek', 'nohut', 'fasulye', 'bulgur', 'pirinç'],
      'süt-ürünleri': ['süt', 'yoğurt', 'peynir', 'ayran', 'tereyağı'],
      'et-tavuk': ['et', 'kıyma', 'tavuk', 'hindi', 'balık'],
      'sebze': ['domates', 'patates', 'soğan', 'biber', 'salatalık'],
      'meyve': ['elma', 'portakal', 'muz', 'çilek', 'karpuz'],
      'temel-gıda': ['un', 'şeker', 'tuz', 'yağ', 'makarna']
    };
    
    const lowerName = productName.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerName.includes(keyword))) {
        return category;
      }
    }
    
    return 'diğer';
  }
  
  // Method to verify multiple prices against each other
  async crossValidatePrices(prices: UserPriceData[]): Promise<Map<string, boolean>> {
    const verificationMap = new Map<string, boolean>();
    
    // Group prices by product and market
    const groupedPrices = this.groupPricesByProductAndMarket(prices);
    
    for (const [key, group] of groupedPrices) {
      if (group.length >= VerificationSystem.MIN_VERIFICATIONS_REQUIRED) {
        // Calculate statistics for the group
        const priceValues = group.map(p => p.price);
        const mean = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
        const stdDev = Math.sqrt(
          priceValues.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / priceValues.length
        );
        
        // Mark prices as verified if they're within 2 standard deviations
        group.forEach(price => {
          const zScore = Math.abs(price.price - mean) / stdDev;
          verificationMap.set(price.id, zScore <= 2);
        });
      }
    }
    
    return verificationMap;
  }
  
  private groupPricesByProductAndMarket(
    prices: UserPriceData[]
  ): Map<string, UserPriceData[]> {
    const groups = new Map<string, UserPriceData[]>();
    
    prices.forEach(price => {
      const key = `${price.normalizedProductName}-${price.marketName}-${price.location.city}`;
      const group = groups.get(key) || [];
      group.push(price);
      groups.set(key, group);
    });
    
    return groups;
  }
}
