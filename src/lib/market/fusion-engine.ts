/**
 * Enhanced Market Fusion Engine
 * Advanced multi-source price fusion with comprehensive scoring
 */

import type { MarketQuote, MarketFusion, Source } from './schema';
import { BASE_SOURCE_WEIGHTS } from './trust-score';
import { scraperHealthMonitor } from './providers/scraper/health-monitor';
import { AILogger } from '@/lib/ai/logger';

export interface FusionConfig {
  enableHealthAdjustment: boolean;
  enableStockScoring: boolean;
  enableCompletenessCheck: boolean;
  enableFreshnessWeight: boolean;
  outlierThreshold: number; // IQR multiplier
  minSourceCount: number;
  maxPriceAge: number; // days
}

export interface FusionScore {
  overall: number; // 0-100
  sourceReliability: number;
  priceConsistency: number;
  dataCompleteness: number;
  dataFreshness: number;
  stockAvailability: number;
  breakdown: {
    totalSources: number;
    healthySources: number;
    outliersRemoved: number;
    avgAge: number;
    priceStdDev: number;
  };
}

const DEFAULT_CONFIG: FusionConfig = {
  enableHealthAdjustment: true,
  enableStockScoring: true,
  enableCompletenessCheck: true,
  enableFreshnessWeight: true,
  outlierThreshold: 1.5, // IQR
  minSourceCount: 2,
  maxPriceAge: 30, // days
};

/**
 * Enhanced Market Fusion with comprehensive scoring
 */
export class MarketFusionEngine {
  private config: FusionConfig;

  constructor(config?: Partial<FusionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Main fusion method
   */
  fuseQuotes(quotes: MarketQuote[]): MarketFusion & { score: FusionScore } {
    if (quotes.length === 0) {
      throw new Error('No quotes provided for fusion');
    }

    // Step 1: Filter outliers
    const { filteredQuotes, outliersRemoved } = this.filterOutliers(quotes);

    // Step 2: Adjust weights based on scraper health
    const adjustedQuotes = this.config.enableHealthAdjustment
      ? this.adjustWeightsByHealth(filteredQuotes)
      : filteredQuotes;

    // Step 3: Calculate weighted price
    const weightedPrice = this.calculateWeightedPrice(adjustedQuotes);

    // Step 4: Calculate comprehensive scoring
    const score = this.calculateFusionScore(adjustedQuotes, weightedPrice, outliersRemoved);

    // Step 5: Find best brands
    const brandOptions = this.extractBrandOptions(adjustedQuotes);

    // Step 6: Determine stock status
    const stockStatus = this.determineStockStatus(adjustedQuotes);

    return {
      product_key: quotes[0]?.product_key || '',
      fusedPrice: Number(weightedPrice.toFixed(2)),
      confidence: score.overall / 100, // 0-1 scale
      sources: adjustedQuotes.map(q => q.source) as any,
      brandOptions,
      stockStatus,
      asOf: new Date().toISOString(),
      score, // Enhanced scoring
    } as any;
  }

  /**
   * Filter outliers using IQR method
   */
  private filterOutliers(quotes: MarketQuote[]): {
    filteredQuotes: MarketQuote[];
    outliersRemoved: number;
  } {
    if (quotes.length < 3) {
      return { filteredQuotes: quotes, outliersRemoved: 0 };
    }

    const prices = quotes.map(q => q.unit_price).sort((a, b) => a - b);
    const q1Index = Math.floor(prices.length * 0.25);
    const q3Index = Math.floor(prices.length * 0.75);

    const q1 = prices[q1Index];
    const q3 = prices[q3Index];
    const iqr = q3 - q1;

    const lowerBound = q1 - this.config.outlierThreshold * iqr;
    const upperBound = q3 + this.config.outlierThreshold * iqr;

    const filteredQuotes = quotes.filter(
      q => q.unit_price >= lowerBound && q.unit_price <= upperBound
    );

    const outliersRemoved = quotes.length - filteredQuotes.length;

    if (outliersRemoved > 0) {
      AILogger.info(`Removed ${outliersRemoved} outliers from ${quotes.length} quotes`);
    }

    return { filteredQuotes, outliersRemoved };
  }

  /**
   * Adjust quote weights based on scraper health
   */
  private adjustWeightsByHealth(quotes: MarketQuote[]): MarketQuote[] {
    return quotes.map(quote => {
      const scraperName = this.getScraperName(quote.source);

      if (!scraperName) {
        return quote; // No scraper for this source
      }

      const health = scraperHealthMonitor.getHealth(scraperName);

      if (!health) {
        return quote; // No health data
      }

      // Adjust sourceTrust based on health
      let healthMultiplier = 1.0;

      if (health.status === 'healthy') {
        healthMultiplier = 1.2; // Boost healthy scrapers
      } else if (health.status === 'degraded') {
        healthMultiplier = 0.8; // Penalize degraded
      } else if (health.status === 'down') {
        healthMultiplier = 0.5; // Heavy penalty for down
      }

      // Incorporate success rate
      const successRateMultiplier = health.successRate / 100;
      const finalMultiplier = (healthMultiplier + successRateMultiplier) / 2;

      return {
        ...quote,
        sourceTrust: (quote.sourceTrust || 0.5) * finalMultiplier,
      };
    });
  }

  /**
   * Map source to scraper name
   */
  private getScraperName(source: Source): string | null {
    const mapping: Record<string, string> = {
      a101: 'A101',
      bim: 'BİM',
      carrefour: 'CarrefourSA',
      migros: 'Migros',
      sok: 'ŞOK',
    };

    return mapping[source] || null;
  }

  /**
   * Calculate weighted price
   */
  private calculateWeightedPrice(quotes: MarketQuote[]): number {
    let weightSum = 0;
    let priceSum = 0;

    for (const quote of quotes) {
      const baseWeight = BASE_SOURCE_WEIGHTS[quote.source] || 0.1;
      const sourceTrust = quote.sourceTrust || 0.5;

      // Combined weight
      const weight = (baseWeight + sourceTrust) / 2;

      weightSum += weight;
      priceSum += weight * quote.unit_price;
    }

    return priceSum / Math.max(weightSum, 1e-6);
  }

  /**
   * Calculate comprehensive fusion score
   */
  private calculateFusionScore(
    quotes: MarketQuote[],
    weightedPrice: number,
    outliersRemoved: number
  ): FusionScore {
    // 1. Source Reliability (0-100)
    const sourceReliability = this.calculateSourceReliability(quotes);

    // 2. Price Consistency (0-100)
    const priceConsistency = this.calculatePriceConsistency(quotes, weightedPrice);

    // 3. Data Completeness (0-100)
    const dataCompleteness = this.config.enableCompletenessCheck
      ? this.calculateDataCompleteness(quotes)
      : 100;

    // 4. Data Freshness (0-100)
    const dataFreshness = this.config.enableFreshnessWeight
      ? this.calculateDataFreshness(quotes)
      : 100;

    // 5. Stock Availability (0-100)
    const stockAvailability = this.config.enableStockScoring
      ? this.calculateStockAvailability(quotes)
      : 100;

    // Overall score (weighted average)
    const overall =
      sourceReliability * 0.25 +
      priceConsistency * 0.25 +
      dataCompleteness * 0.2 +
      dataFreshness * 0.15 +
      stockAvailability * 0.15;

    // Breakdown stats
    const prices = quotes.map(q => q.unit_price);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
    const priceStdDev = Math.sqrt(variance);

    const now = new Date();
    const avgAge = quotes.reduce((sum, q) => {
      const age = (now.getTime() - new Date(q.asOf).getTime()) / (1000 * 60 * 60 * 24);
      return sum + age;
    }, 0) / quotes.length;

    const healthySources = quotes.filter(q => {
      const scraperName = this.getScraperName(q.source);
      if (!scraperName) return true;
      const health = scraperHealthMonitor.getHealth(scraperName);
      return health?.status === 'healthy';
    }).length;

    return {
      overall: Number(overall.toFixed(2)),
      sourceReliability: Number(sourceReliability.toFixed(2)),
      priceConsistency: Number(priceConsistency.toFixed(2)),
      dataCompleteness: Number(dataCompleteness.toFixed(2)),
      dataFreshness: Number(dataFreshness.toFixed(2)),
      stockAvailability: Number(stockAvailability.toFixed(2)),
      breakdown: {
        totalSources: quotes.length,
        healthySources,
        outliersRemoved,
        avgAge: Number(avgAge.toFixed(1)),
        priceStdDev: Number(priceStdDev.toFixed(2)),
      },
    };
  }

  /**
   * Calculate source reliability score
   */
  private calculateSourceReliability(quotes: MarketQuote[]): number {
    const uniqueSources = new Set(quotes.map(q => q.source)).size;
    const diversityScore = Math.min(uniqueSources / 5, 1) * 100; // Max 5 sources

    const avgTrust = quotes.reduce((sum, q) => {
      const base = BASE_SOURCE_WEIGHTS[q.source] || 0.1;
      const trust = (q.sourceTrust || 0.5);
      return sum + (base + trust) / 2;
    }, 0) / quotes.length;

    const trustScore = avgTrust * 100;

    return (diversityScore * 0.4 + trustScore * 0.6);
  }

  /**
   * Calculate price consistency score
   */
  private calculatePriceConsistency(quotes: MarketQuote[], weightedPrice: number): number {
    const variance = quotes.reduce((sum, q) =>
      sum + Math.pow(q.unit_price - weightedPrice, 2), 0
    ) / quotes.length;

    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / Math.max(weightedPrice, 1);

    // Lower CV = higher consistency
    // CV < 0.1 => 100, CV > 0.5 => 0
    const consistencyScore = Math.max(0, Math.min(100, 100 * (1 - coefficientOfVariation / 0.5)));

    return consistencyScore;
  }

  /**
   * Calculate data completeness score
   */
  private calculateDataCompleteness(quotes: MarketQuote[]): number {
    let totalFields = 0;
    let filledFields = 0;

    for (const quote of quotes) {
      // Check critical fields
      const fields = [
        quote.product_key,
        quote.unit_price,
        quote.source,
        quote.asOf,
        quote.brand,
        quote.quantity,
        quote.meta,
      ];

      totalFields += fields.length;
      filledFields += fields.filter(f => f !== null && f !== undefined).length;
    }

    return (filledFields / totalFields) * 100;
  }

  /**
   * Calculate data freshness score
   */
  private calculateDataFreshness(quotes: MarketQuote[]): number {
    const now = new Date();
    const maxAge = this.config.maxPriceAge * 24 * 60 * 60 * 1000; // ms

    let totalFreshness = 0;

    for (const quote of quotes) {
      const age = now.getTime() - new Date(quote.asOf).getTime();
      const freshness = Math.max(0, 1 - age / maxAge);
      totalFreshness += freshness;
    }

    return (totalFreshness / quotes.length) * 100;
  }

  /**
   * Calculate stock availability score
   */
  private calculateStockAvailability(quotes: MarketQuote[]): number {
    const inStockCount = quotes.filter(q => {
      const status = q.meta?.stock_status || 'in_stock';
      return status === 'in_stock' || status === 'available';
    }).length;

    return (inStockCount / quotes.length) * 100;
  }

  /**
   * Extract brand options
   */
  private extractBrandOptions(quotes: MarketQuote[]): Array<{
    brand: string;
    avgPrice: number;
    availability: string;
  }> {
    const brandMap = new Map<string, { prices: number[]; stocks: string[] }>();

    for (const quote of quotes) {
      const brand = quote.brand || 'Genel';

      if (!brandMap.has(brand)) {
        brandMap.set(brand, { prices: [], stocks: [] });
      }

      const data = brandMap.get(brand)!;
      data.prices.push(quote.unit_price);
      data.stocks.push((quote.meta?.stock_status as string) || 'in_stock');
    }

    return Array.from(brandMap.entries()).map(([brand, data]) => {
      const avgPrice = data.prices.reduce((s, p) => s + p, 0) / data.prices.length;
      const inStockCount = data.stocks.filter(s => s === 'in_stock' || s === 'available').length;
      const availability = inStockCount > 0 ? 'available' : 'limited';

      return {
        brand,
        avgPrice: Number(avgPrice.toFixed(2)),
        availability,
      };
    }).sort((a, b) => a.avgPrice - b.avgPrice);
  }

  /**
   * Determine overall stock status
   */
  private determineStockStatus(quotes: MarketQuote[]): 'in_stock' | 'limited' | 'out_of_stock' {
    const inStockCount = quotes.filter(q => {
      const status = q.meta?.stock_status || 'in_stock';
      return status === 'in_stock' || status === 'available';
    }).length;

    const inStockRatio = inStockCount / quotes.length;

    if (inStockRatio >= 0.7) {
      return 'in_stock';
    } else if (inStockRatio >= 0.3) {
      return 'limited';
    } else {
      return 'out_of_stock';
    }
  }
}

// Singleton instance
export const fusionEngine = new MarketFusionEngine();
