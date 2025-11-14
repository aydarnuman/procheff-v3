/**
 * Volatility Calculator
 * Calculates price volatility and stability metrics for products
 */

import Database from 'better-sqlite3';
import { join } from 'path';

export interface VolatilityScore {
  productId: string;
  productName: string;
  category: string;
  volatility: number; // 0-1 (0 = stable, 1 = highly volatile)
  trend: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
  priceRange: {
    min: number;
    max: number;
    current: number;
    average: number;
    median: number;
  };
  statistics: {
    standardDeviation: number;
    variance: number;
    coefficientOfVariation: number;
    percentileRange: {
      p10: number;
      p25: number;
      p75: number;
      p90: number;
    };
  };
  recommendation: {
    buySignal: 'strong_buy' | 'buy' | 'hold' | 'wait';
    reason: string;
    confidence: number;
  };
  historicalData: Array<{
    date: Date;
    price: number;
    source: string;
  }>;
  period: {
    days: number;
    dataPoints: number;
  };
}

export interface CategoryVolatility {
  category: string;
  averageVolatility: number;
  productCount: number;
  priceStability: 'high' | 'medium' | 'low';
  seasonalPattern?: string;
}

export class VolatilityCalculator {
  private static instance: VolatilityCalculator;
  private db: Database.Database | null = null;
  
  // Volatility thresholds
  private readonly THRESHOLDS = {
    stable: 0.1,      // < 10% volatility
    moderate: 0.3,    // 10-30% volatility
    high: 0.5,        // 30-50% volatility
    extreme: 0.7      // > 70% volatility
  };
  
  // Category-specific volatility expectations
  private readonly CATEGORY_VOLATILITY = {
    'Sebze': { expected: 0.4, seasonal: true },
    'Meyve': { expected: 0.5, seasonal: true },
    'Bakliyat': { expected: 0.15, seasonal: false },
    'Süt Ürünleri': { expected: 0.25, seasonal: false },
    'Et ve Tavuk': { expected: 0.3, seasonal: false },
    'Temel Gıda': { expected: 0.1, seasonal: false },
    'Yağ': { expected: 0.35, seasonal: false }
  };
  
  private constructor() {
    this.initializeDatabase();
  }
  
  static getInstance(): VolatilityCalculator {
    if (!VolatilityCalculator.instance) {
      VolatilityCalculator.instance = new VolatilityCalculator();
    }
    return VolatilityCalculator.instance;
  }
  
  /**
   * Initialize database connection
   */
  private initializeDatabase(): void {
    try {
      const dbPath = join(process.cwd(), 'procheff.db');
      this.db = new Database(dbPath);
    } catch (error) {
      console.error('[VolatilityCalculator] Database initialization failed:', error);
    }
  }
  
  /**
   * Calculate volatility score for a product
   */
  async calculateVolatility(
    productId: string,
    days: number = 30
  ): Promise<VolatilityScore | null> {
    if (!this.db) return null;
    
    try {
      // Get product info
      const product = this.db.prepare(`
        SELECT id, name, category FROM product_cards WHERE id = ?
      `).get(productId) as any;
      
      if (!product) return null;
      
      // Get price history
      const history = this.db.prepare(`
        SELECT 
          date(h.changed_at / 1000, 'unixepoch') as date,
          h.new_price as price,
          mp.source
        FROM price_history h
        JOIN market_prices_v2 mp ON h.price_entry_id = mp.id
        WHERE mp.product_id = ?
          AND h.changed_at > ?
        ORDER BY h.changed_at DESC
      `).all(productId, Date.now() - days * 24 * 60 * 60 * 1000) as any[];
      
      if (history.length < 3) {
        // Not enough data for volatility calculation
        return this.getInsufficientDataScore(product);
      }
      
      const prices = history.map(h => h.price);
      const dates = history.map(h => new Date(h.date));
      
      // Calculate statistics
      const stats = this.calculateStatistics(prices);
      const trend = this.detectTrend(prices, dates);
      const volatility = this.calculateVolatilityMetric(stats, product.category);
      const recommendation = this.generateRecommendation(
        volatility,
        trend,
        stats,
        product.category
      );
      
      return {
        productId: product.id,
        productName: product.name,
        category: product.category,
        volatility,
        trend,
        priceRange: {
          min: Math.min(...prices),
          max: Math.max(...prices),
          current: prices[0], // Most recent
          average: stats.mean,
          median: stats.median
        },
        statistics: {
          standardDeviation: stats.stdDev,
          variance: stats.variance,
          coefficientOfVariation: stats.cv,
          percentileRange: stats.percentiles
        },
        recommendation,
        historicalData: history.map(h => ({
          date: new Date(h.date),
          price: h.price,
          source: h.source
        })).slice(0, 50), // Limit to recent 50 points
        period: {
          days,
          dataPoints: history.length
        }
      };
    } catch (error) {
      console.error('[VolatilityCalculator] Calculation failed:', error);
      return null;
    }
  }
  
  /**
   * Calculate statistical metrics
   */
  private calculateStatistics(prices: number[]): {
    mean: number;
    median: number;
    variance: number;
    stdDev: number;
    cv: number;
    percentiles: {
      p10: number;
      p25: number;
      p75: number;
      p90: number;
    };
  } {
    const sorted = [...prices].sort((a, b) => a - b);
    const n = prices.length;
    
    // Mean
    const mean = prices.reduce((sum, p) => sum + p, 0) / n;
    
    // Median
    const median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];
    
    // Variance and standard deviation
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    // Coefficient of variation
    const cv = mean > 0 ? stdDev / mean : 0;
    
    // Percentiles
    const percentile = (p: number): number => {
      const index = p * (n - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index % 1;
      
      if (lower === upper) {
        return sorted[lower];
      }
      
      return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    };
    
    return {
      mean,
      median,
      variance,
      stdDev,
      cv,
      percentiles: {
        p10: percentile(0.1),
        p25: percentile(0.25),
        p75: percentile(0.75),
        p90: percentile(0.9)
      }
    };
  }
  
  /**
   * Detect price trend
   */
  private detectTrend(
    prices: number[],
    dates: Date[]
  ): VolatilityScore['trend'] {
    if (prices.length < 3) return 'stable';
    
    // Calculate linear regression
    const n = prices.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    
    const sumX = indices.reduce((sum, x) => sum + x, 0);
    const sumY = prices.reduce((sum, y) => sum + y, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * prices[i], 0);
    const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = prices.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const ssResidual = prices.reduce((sum, y, i) => {
      const predicted = slope * i + intercept;
      return sum + Math.pow(y - predicted, 2);
    }, 0);
    const r2 = 1 - (ssResidual / ssTotal);
    
    // Detect fluctuation
    let directionChanges = 0;
    for (let i = 1; i < prices.length - 1; i++) {
      const prev = prices[i] - prices[i - 1];
      const curr = prices[i + 1] - prices[i];
      if (prev * curr < 0) directionChanges++;
    }
    const fluctuationRate = directionChanges / (prices.length - 2);
    
    // Determine trend
    if (fluctuationRate > 0.6) {
      return 'fluctuating';
    }
    
    const slopePercentage = Math.abs(slope) / yMean;
    
    if (Math.abs(slopePercentage) < 0.01 || r2 < 0.3) {
      return 'stable';
    } else if (slope > 0) {
      return 'increasing';
    } else {
      return 'decreasing';
    }
  }
  
  /**
   * Calculate volatility metric
   */
  private calculateVolatilityMetric(
    stats: any,
    category: string
  ): number {
    // Base volatility on coefficient of variation
    let volatility = stats.cv;
    
    // Adjust for category expectations
    const categoryExpectation = this.CATEGORY_VOLATILITY[category as keyof typeof this.CATEGORY_VOLATILITY];
    if (categoryExpectation) {
      // Normalize against expected volatility
      volatility = volatility / categoryExpectation.expected;
    }
    
    // Additional factors
    const percentileRange = (stats.percentiles.p90 - stats.percentiles.p10) / stats.mean;
    volatility = (volatility + percentileRange) / 2;
    
    // Cap between 0 and 1
    return Math.max(0, Math.min(1, volatility));
  }
  
  /**
   * Generate buy/hold recommendation
   */
  private generateRecommendation(
    volatility: number,
    trend: VolatilityScore['trend'],
    stats: any,
    category: string
  ): VolatilityScore['recommendation'] {
    let signal: VolatilityScore['recommendation']['buySignal'] = 'hold';
    let reason = '';
    let confidence = 0.5;
    
    // Check if price is below average
    const pricePosition = (stats.mean - stats.median) / stats.mean;
    const isLowPrice = pricePosition > 0.1;
    
    // Category-specific logic
    const categoryInfo = this.CATEGORY_VOLATILITY[category as keyof typeof this.CATEGORY_VOLATILITY];
    const isStableCategory = categoryInfo && !categoryInfo.seasonal && categoryInfo.expected < 0.2;
    
    // Decision logic
    if (volatility < this.THRESHOLDS.stable) {
      // Very stable price
      if (trend === 'decreasing' && isLowPrice) {
        signal = 'strong_buy';
        reason = 'Fiyat stabil ve düşüş trendinde, alım için ideal';
        confidence = 0.9;
      } else if (trend === 'stable') {
        signal = 'buy';
        reason = 'Fiyat çok stabil, güvenle alınabilir';
        confidence = 0.8;
      } else {
        signal = 'hold';
        reason = 'Fiyat stabil ama yükseliş trendinde';
        confidence = 0.7;
      }
    } else if (volatility < this.THRESHOLDS.moderate) {
      // Moderate volatility
      if (trend === 'decreasing') {
        signal = 'buy';
        reason = 'Orta oynaklık, düşüş trendi fırsat olabilir';
        confidence = 0.7;
      } else if (trend === 'stable' && isLowPrice) {
        signal = 'buy';
        reason = 'Orta oynaklık, fiyat ortalamanın altında';
        confidence = 0.65;
      } else {
        signal = 'hold';
        reason = 'Normal oynaklık seviyesi';
        confidence = 0.6;
      }
    } else if (volatility < this.THRESHOLDS.high) {
      // High volatility
      if (isStableCategory) {
        signal = 'wait';
        reason = 'Bu kategori için yüksek oynaklık, beklenmeli';
        confidence = 0.6;
      } else if (trend === 'decreasing' && isLowPrice) {
        signal = 'hold';
        reason = 'Yüksek oynaklık var ama fiyat düşüşte';
        confidence = 0.5;
      } else {
        signal = 'wait';
        reason = 'Yüksek oynaklık, riskli dönem';
        confidence = 0.55;
      }
    } else {
      // Extreme volatility
      signal = 'wait';
      reason = 'Aşırı fiyat oynaklığı, kesinlikle beklenmeli';
      confidence = 0.8; // High confidence in waiting
    }
    
    return { buySignal: signal, reason, confidence };
  }
  
  /**
   * Get insufficient data score
   */
  private getInsufficientDataScore(product: any): VolatilityScore {
    return {
      productId: product.id,
      productName: product.name,
      category: product.category,
      volatility: 0,
      trend: 'stable',
      priceRange: {
        min: 0,
        max: 0,
        current: 0,
        average: 0,
        median: 0
      },
      statistics: {
        standardDeviation: 0,
        variance: 0,
        coefficientOfVariation: 0,
        percentileRange: { p10: 0, p25: 0, p75: 0, p90: 0 }
      },
      recommendation: {
        buySignal: 'hold',
        reason: 'Yeterli veri yok',
        confidence: 0
      },
      historicalData: [],
      period: {
        days: 0,
        dataPoints: 0
      }
    };
  }
  
  /**
   * Get category volatility summary
   */
  async getCategoryVolatility(): Promise<CategoryVolatility[]> {
    if (!this.db) return [];
    
    try {
      const categories = this.db.prepare(`
        SELECT DISTINCT category FROM product_cards
      `).all() as any[];
      
      const results: CategoryVolatility[] = [];
      
      for (const { category } of categories) {
        const products = this.db.prepare(`
          SELECT p.id
          FROM product_cards p
          WHERE p.category = ?
            AND EXISTS (
              SELECT 1 FROM price_history ph
              JOIN market_prices_v2 mp ON ph.price_entry_id = mp.id
              WHERE mp.product_id = p.id
            )
          LIMIT 100
        `).all(category) as any[];
        
        if (products.length === 0) continue;
        
        let totalVolatility = 0;
        let validCount = 0;
        
        for (const product of products) {
          const score = await this.calculateVolatility(product.id, 30);
          if (score && score.period.dataPoints >= 3) {
            totalVolatility += score.volatility;
            validCount++;
          }
        }
        
        if (validCount > 0) {
          const avgVolatility = totalVolatility / validCount;
          
          results.push({
            category,
            averageVolatility: avgVolatility,
            productCount: validCount,
            priceStability: avgVolatility < 0.2 ? 'high' :
                          avgVolatility < 0.4 ? 'medium' : 'low',
            seasonalPattern: this.CATEGORY_VOLATILITY[category as keyof typeof this.CATEGORY_VOLATILITY]?.seasonal
              ? 'Mevsimsel' : undefined
          });
        }
      }
      
      return results.sort((a, b) => a.averageVolatility - b.averageVolatility);
    } catch (error) {
      console.error('[VolatilityCalculator] Category analysis failed:', error);
      return [];
    }
  }
  
  /**
   * Get volatility alerts
   */
  async getVolatilityAlerts(threshold: number = 0.5): Promise<Array<{
    productId: string;
    productName: string;
    volatility: number;
    message: string;
  }>> {
    if (!this.db) return [];
    
    try {
      const products = this.db.prepare(`
        SELECT DISTINCT p.id, p.name
        FROM product_cards p
        JOIN market_prices_v2 mp ON p.id = mp.product_id
        JOIN price_history ph ON mp.id = ph.price_entry_id
        WHERE ph.changed_at > ?
        GROUP BY p.id
        HAVING COUNT(DISTINCT date(ph.changed_at / 1000, 'unixepoch')) > 5
        LIMIT 50
      `).all(Date.now() - 30 * 24 * 60 * 60 * 1000) as any[];
      
      const alerts: Array<{
        productId: string;
        productName: string;
        volatility: number;
        message: string;
      }> = [];
      
      for (const product of products) {
        const score = await this.calculateVolatility(product.id);
        
        if (score && score.volatility > threshold) {
          alerts.push({
            productId: product.id,
            productName: product.name,
            volatility: score.volatility,
            message: `Yüksek fiyat oynaklığı: %${(score.volatility * 100).toFixed(0)} - ${score.recommendation.reason}`
          });
        }
      }
      
      return alerts.sort((a, b) => b.volatility - a.volatility);
    } catch (error) {
      console.error('[VolatilityCalculator] Alert generation failed:', error);
      return [];
    }
  }
}

// Export singleton instance
export const volatilityCalculator = VolatilityCalculator.getInstance();
