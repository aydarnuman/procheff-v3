/**
 * Accuracy Tracker
 * Monitors and tracks the accuracy of price data from different sources
 */

import Database from 'better-sqlite3';
import { join } from 'path';

export interface AccuracyMetric {
  date: Date;
  providerType: 'api' | 'scraper' | 'crowd' | 'ai';
  providerName: string;
  totalPrices: number;
  accuratePrices: number;
  accuracyRate: number;
  averageDeviation: number;
  outliersDetected: number;
  confidenceScore?: number;
}

export interface AccuracyReport {
  period: {
    start: Date;
    end: Date;
  };
  overall: {
    accuracyRate: number;
    totalSamples: number;
    averageConfidence: number;
  };
  byProvider: {
    [provider: string]: AccuracyMetric[];
  };
  byCategory: {
    [category: string]: {
      accuracyRate: number;
      sampleCount: number;
    };
  };
  trends: {
    improving: string[];
    declining: string[];
    stable: string[];
  };
  recommendations: string[];
}

export interface PriceComparison {
  provider: string;
  providerType: 'api' | 'scraper' | 'crowd' | 'ai';
  reportedPrice: number;
  verifiedPrice: number;
  deviation: number;
  deviationPercentage: number;
  isAccurate: boolean;
  timestamp: Date;
}

export class AccuracyTracker {
  private static instance: AccuracyTracker;
  private db: Database.Database | null = null;
  
  // Accuracy thresholds
  private readonly ACCURACY_THRESHOLD = 0.05; // 5% deviation allowed
  private readonly OUTLIER_THRESHOLD = 0.3; // 30% deviation is outlier
  private readonly MIN_SAMPLES_FOR_CONFIDENCE = 10;
  
  private constructor() {
    this.initializeDatabase();
  }
  
  static getInstance(): AccuracyTracker {
    if (!AccuracyTracker.instance) {
      AccuracyTracker.instance = new AccuracyTracker();
    }
    return AccuracyTracker.instance;
  }
  
  /**
   * Initialize database connection
   */
  private initializeDatabase(): void {
    try {
      const dbPath = join(process.cwd(), 'procheff.db');
      this.db = new Database(dbPath);
    } catch (error) {
      console.error('[AccuracyTracker] Database initialization failed:', error);
    }
  }
  
  /**
   * Track price accuracy
   */
  async trackPriceAccuracy(comparisons: PriceComparison[]): Promise<void> {
    if (!this.db || comparisons.length === 0) return;
    
    // Group by provider and calculate metrics
    const providerMetrics = new Map<string, {
      type: PriceComparison['providerType'];
      total: number;
      accurate: number;
      deviations: number[];
      outliers: number;
    }>();
    
    comparisons.forEach(comp => {
      const key = `${comp.providerType}:${comp.provider}`;
      const metrics = providerMetrics.get(key) || {
        type: comp.providerType,
        total: 0,
        accurate: 0,
        deviations: [],
        outliers: 0
      };
      
      metrics.total++;
      if (comp.isAccurate) {
        metrics.accurate++;
      }
      
      metrics.deviations.push(Math.abs(comp.deviation));
      
      if (Math.abs(comp.deviationPercentage) > this.OUTLIER_THRESHOLD) {
        metrics.outliers++;
      }
      
      providerMetrics.set(key, metrics);
    });
    
    // Save metrics to database
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO accuracy_metrics 
      (date, provider_type, provider_name, total_prices, accurate_prices, 
       accuracy_rate, average_deviation, outliers_detected, created_at)
      VALUES (date('now'), ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const transaction = this.db.transaction(() => {
      providerMetrics.forEach((metrics, key) => {
        const [type, name] = key.split(':');
        const accuracyRate = metrics.accurate / metrics.total;
        const avgDeviation = metrics.deviations.reduce((sum, d) => sum + d, 0) / metrics.deviations.length;
        
        stmt.run(
          type,
          name,
          metrics.total,
          metrics.accurate,
          accuracyRate,
          avgDeviation,
          metrics.outliers,
          Date.now()
        );
      });
    });
    
    try {
      transaction();
    } catch (error) {
      console.error('[AccuracyTracker] Failed to save metrics:', error);
    }
  }
  
  /**
   * Compare prices from different sources
   */
  async comparePrices(
    productId: string,
    prices: Array<{
      provider: string;
      providerType: PriceComparison['providerType'];
      price: number;
      timestamp: Date;
    }>
  ): Promise<PriceComparison[]> {
    if (prices.length < 2) {
      return [];
    }
    
    // Calculate median price as verified price
    const sortedPrices = prices.map(p => p.price).sort((a, b) => a - b);
    const medianIndex = Math.floor(sortedPrices.length / 2);
    const verifiedPrice = sortedPrices.length % 2 === 0
      ? (sortedPrices[medianIndex - 1] + sortedPrices[medianIndex]) / 2
      : sortedPrices[medianIndex];
    
    // Compare each price to verified price
    const comparisons: PriceComparison[] = prices.map(priceData => {
      const deviation = priceData.price - verifiedPrice;
      const deviationPercentage = verifiedPrice > 0 ? deviation / verifiedPrice : 0;
      
      return {
        provider: priceData.provider,
        providerType: priceData.providerType,
        reportedPrice: priceData.price,
        verifiedPrice,
        deviation,
        deviationPercentage,
        isAccurate: Math.abs(deviationPercentage) <= this.ACCURACY_THRESHOLD,
        timestamp: priceData.timestamp
      };
    });
    
    // Track accuracy
    await this.trackPriceAccuracy(comparisons);
    
    return comparisons;
  }
  
  /**
   * Generate accuracy report
   */
  async generateReport(days: number = 7): Promise<AccuracyReport> {
    if (!this.db) {
      return this.getEmptyReport(days);
    }
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    try {
      // Get overall metrics
      const overall = this.db.prepare(`
        SELECT 
          SUM(total_prices) as totalSamples,
          SUM(accurate_prices) as accurateSamples,
          AVG(accuracy_rate) as avgAccuracy
        FROM accuracy_metrics
        WHERE date >= date(?, '-${days} days')
      `).get(endDate.toISOString()) as any;
      
      // Get metrics by provider
      const byProviderRows = this.db.prepare(`
        SELECT * FROM accuracy_metrics
        WHERE date >= date(?, '-${days} days')
        ORDER BY provider_type, provider_name, date
      `).all(endDate.toISOString()) as any[];
      
      const byProvider: AccuracyReport['byProvider'] = {};
      byProviderRows.forEach(row => {
        const key = `${row.provider_type}:${row.provider_name}`;
        if (!byProvider[key]) {
          byProvider[key] = [];
        }
        
        byProvider[key].push({
          date: new Date(row.date),
          providerType: row.provider_type,
          providerName: row.provider_name,
          totalPrices: row.total_prices,
          accuratePrices: row.accurate_prices,
          accuracyRate: row.accuracy_rate,
          averageDeviation: row.average_deviation,
          outliersDetected: row.outliers_detected
        });
      });
      
      // Analyze trends
      const trends = this.analyzeTrends(byProvider);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(byProvider, overall);
      
      return {
        period: {
          start: startDate,
          end: endDate
        },
        overall: {
          accuracyRate: overall?.avgAccuracy || 0,
          totalSamples: overall?.totalSamples || 0,
          averageConfidence: this.calculateAverageConfidence(byProvider)
        },
        byProvider,
        byCategory: {}, // TODO: Implement category tracking
        trends,
        recommendations
      };
    } catch (error) {
      console.error('[AccuracyTracker] Failed to generate report:', error);
      return this.getEmptyReport(days);
    }
  }
  
  /**
   * Analyze provider trends
   */
  private analyzeTrends(
    byProvider: AccuracyReport['byProvider']
  ): AccuracyReport['trends'] {
    const trends: AccuracyReport['trends'] = {
      improving: [],
      declining: [],
      stable: []
    };
    
    Object.entries(byProvider).forEach(([provider, metrics]) => {
      if (metrics.length < 3) {
        trends.stable.push(provider);
        return;
      }
      
      // Calculate trend using linear regression
      const n = metrics.length;
      const sumX = metrics.reduce((sum, _, i) => sum + i, 0);
      const sumY = metrics.reduce((sum, m) => sum + m.accuracyRate, 0);
      const sumXY = metrics.reduce((sum, m, i) => sum + i * m.accuracyRate, 0);
      const sumX2 = metrics.reduce((sum, _, i) => sum + i * i, 0);
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      
      if (slope > 0.01) {
        trends.improving.push(provider);
      } else if (slope < -0.01) {
        trends.declining.push(provider);
      } else {
        trends.stable.push(provider);
      }
    });
    
    return trends;
  }
  
  /**
   * Generate recommendations
   */
  private generateRecommendations(
    byProvider: AccuracyReport['byProvider'],
    overall: any
  ): string[] {
    const recommendations: string[] = [];
    
    // Overall accuracy recommendation
    if (overall?.avgAccuracy < 0.8) {
      recommendations.push('Genel doğruluk oranı düşük. Veri kaynaklarını gözden geçirin.');
    }
    
    // Provider-specific recommendations
    Object.entries(byProvider).forEach(([provider, metrics]) => {
      const latestMetric = metrics[metrics.length - 1];
      if (!latestMetric) return;
      
      if (latestMetric.accuracyRate < 0.7) {
        recommendations.push(
          `${provider} sağlayıcısının doğruluk oranı düşük (%${(latestMetric.accuracyRate * 100).toFixed(0)}). Kontrol edilmeli.`
        );
      }
      
      if (latestMetric.outliersDetected > latestMetric.totalPrices * 0.2) {
        recommendations.push(
          `${provider} sağlayıcısında yüksek oranda aykırı değer tespit edildi.`
        );
      }
    });
    
    // Source type recommendations
    const apiProviders = Object.entries(byProvider)
      .filter(([_, metrics]) => metrics[0]?.providerType === 'api');
    const scraperProviders = Object.entries(byProvider)
      .filter(([_, metrics]) => metrics[0]?.providerType === 'scraper');
    
    if (apiProviders.length === 0 && scraperProviders.length > 3) {
      recommendations.push('API entegrasyonu ekleyerek veri kalitesini artırabilirsiniz.');
    }
    
    return recommendations.slice(0, 5); // Limit to 5 recommendations
  }
  
  /**
   * Calculate average confidence
   */
  private calculateAverageConfidence(
    byProvider: AccuracyReport['byProvider']
  ): number {
    let totalConfidence = 0;
    let totalSamples = 0;
    
    Object.values(byProvider).forEach(metrics => {
      metrics.forEach(metric => {
        const confidence = this.calculateConfidenceScore(metric);
        totalConfidence += confidence * metric.totalPrices;
        totalSamples += metric.totalPrices;
      });
    });
    
    return totalSamples > 0 ? totalConfidence / totalSamples : 0;
  }
  
  /**
   * Calculate confidence score for a metric
   */
  private calculateConfidenceScore(metric: AccuracyMetric): number {
    let confidence = metric.accuracyRate;
    
    // Adjust for sample size
    if (metric.totalPrices < this.MIN_SAMPLES_FOR_CONFIDENCE) {
      confidence *= metric.totalPrices / this.MIN_SAMPLES_FOR_CONFIDENCE;
    }
    
    // Adjust for outliers
    const outlierRate = metric.totalPrices > 0 
      ? metric.outliersDetected / metric.totalPrices 
      : 0;
    confidence *= (1 - outlierRate);
    
    // Adjust for provider type
    const typeMultipliers = {
      'api': 1.0,
      'scraper': 0.9,
      'crowd': 0.8,
      'ai': 0.7
    };
    confidence *= typeMultipliers[metric.providerType] || 0.5;
    
    return Math.max(0, Math.min(1, confidence));
  }
  
  /**
   * Get empty report
   */
  private getEmptyReport(days: number): AccuracyReport {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    return {
      period: { start: startDate, end: endDate },
      overall: { accuracyRate: 0, totalSamples: 0, averageConfidence: 0 },
      byProvider: {},
      byCategory: {},
      trends: { improving: [], declining: [], stable: [] },
      recommendations: []
    };
  }
  
  /**
   * Get real-time accuracy for a provider
   */
  async getProviderAccuracy(
    providerType: PriceComparison['providerType'],
    providerName: string
  ): Promise<number> {
    if (!this.db) return 0;
    
    try {
      const result = this.db.prepare(`
        SELECT accuracy_rate FROM accuracy_metrics
        WHERE provider_type = ? AND provider_name = ?
        ORDER BY date DESC
        LIMIT 1
      `).get(providerType, providerName) as any;
      
      return result?.accuracy_rate || 0;
    } catch (error) {
      console.error('[AccuracyTracker] Failed to get provider accuracy:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const accuracyTracker = AccuracyTracker.getInstance();
