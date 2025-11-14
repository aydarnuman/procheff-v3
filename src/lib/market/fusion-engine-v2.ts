/**
 * Market Fusion Engine V2
 *
 * Backward compatible wrapper around existing fusion engine
 * Adds V2 features:
 * - Multi-dimensional scoring
 * - Price intelligence
 * - Risk analysis (optional)
 * - Scan summary with failure tracking
 * - Enhanced brand options with scores
 *
 * @see fusion-engine.ts (base engine)
 */

import type {
  MarketQuote,
  MarketQuoteV2,
  MarketFusion,
  MarketFusionV2,
  ScanSummary,
  Source
} from './schema';
import { fusionEngine } from './fusion-engine';
import { calculateAllMarketScores, sortByMarketScore } from './scoring';
import { calculatePriceIntelligence } from './price-intelligence';
import { analyzeProductRisk } from './risk-analysis';
import { upgradeToMarketQuoteV2 } from './schema';
import { AILogger } from '@/lib/ai/logger';

// ========================================
// FUSION ENGINE V2 CONFIGURATION
// ========================================

export interface FusionConfigV2 {
  // Existing config (inherited)
  enableHealthAdjustment?: boolean;
  enableStockScoring?: boolean;
  enableCompletenessCheck?: boolean;
  enableFreshnessWeight?: boolean;
  outlierThreshold?: number;
  minSourceCount?: number;
  maxPriceAge?: number;

  // V2 new features
  enableMultiDimensionalScoring?: boolean;  // Default: true
  enablePriceIntelligence?: boolean;        // Default: true
  enableRiskAnalysis?: boolean;             // Default: false (expensive)
  enableScanSummary?: boolean;              // Default: true
  enableEnhancedBrandScores?: boolean;      // Default: true
}

const DEFAULT_CONFIG_V2: Required<FusionConfigV2> = {
  // Base config
  enableHealthAdjustment: true,
  enableStockScoring: true,
  enableCompletenessCheck: true,
  enableFreshnessWeight: true,
  outlierThreshold: 1.5,
  minSourceCount: 2,
  maxPriceAge: 30,

  // V2 features
  enableMultiDimensionalScoring: true,
  enablePriceIntelligence: true,
  enableRiskAnalysis: false, // Expensive, opt-in
  enableScanSummary: true,
  enableEnhancedBrandScores: true
};

// ========================================
// MARKET FUSION ENGINE V2
// ========================================

export class MarketFusionEngineV2 {
  private config: Required<FusionConfigV2>;

  constructor(config?: Partial<FusionConfigV2>) {
    this.config = { ...DEFAULT_CONFIG_V2, ...config };
  }

  /**
   * Main fusion method (V2)
   *
   * Produces MarketFusionV2 with all enhanced features
   *
   * @param quotes - Market quotes (V1 or V2)
   * @param priceHistory - Optional price history for risk analysis
   * @param stockHistory - Optional stock history for risk analysis
   * @returns MarketFusionV2 object
   */
  async fuseQuotesV2(
    quotes: (MarketQuote | MarketQuoteV2)[],
    priceHistory?: Array<{ date: string; price: number }>,
    stockHistory?: Array<{ date: string; status: string; market: string }>
  ): Promise<MarketFusionV2> {
    AILogger.info('[Fusion V2] Starting enhanced fusion', {
      quotesCount: quotes.length,
      hasPriceHistory: !!priceHistory,
      hasStockHistory: !!stockHistory
    });

    // ===== STEP 1: BASE FUSION =====
    // Use existing fusion engine for core price calculation
    const baseFusion = fusionEngine.fuseQuotes(quotes as MarketQuote[]);

    // ===== STEP 2: UPGRADE QUOTES TO V2 =====
    const quotesV2 = quotes.map(q =>
      'dataCompleteness' in q ? (q as MarketQuoteV2) : upgradeToMarketQuoteV2(q)
    );

    // ===== STEP 3: MULTI-DIMENSIONAL SCORING =====
    let scoredQuotes: Array<MarketQuoteV2 & { marketScore?: any }> = quotesV2;

    if (this.config.enableMultiDimensionalScoring) {
      scoredQuotes = calculateAllMarketScores(quotesV2);
      scoredQuotes = sortByMarketScore(scoredQuotes);

      AILogger.info('[Fusion V2] Multi-dimensional scoring completed', {
        scoredCount: scoredQuotes.length,
        topScore: scoredQuotes[0]?.marketScore?.overall
      });
    }

    // ===== STEP 4: PRICE INTELLIGENCE =====
    let priceIntelligence;

    if (this.config.enablePriceIntelligence) {
      priceIntelligence = calculatePriceIntelligence(
        quotesV2,
        baseFusion.price || 0
      );

      AILogger.info('[Fusion V2] Price intelligence calculated', {
        realMarketPercentage: priceIntelligence.sourceContribution.realMarketData.percentage,
        confidence: priceIntelligence.confidence
      });
    }

    // ===== STEP 5: RISK ANALYSIS (OPTIONAL) =====
    let riskAnalysis;

    if (this.config.enableRiskAnalysis && priceHistory && stockHistory) {
      riskAnalysis = analyzeProductRisk(quotesV2, priceHistory, stockHistory);

      AILogger.info('[Fusion V2] Risk analysis completed', {
        overallRiskScore: riskAnalysis.overallRiskScore,
        riskLevel: riskAnalysis.riskLevel
      });
    }

    // ===== STEP 6: ENHANCED BRAND OPTIONS =====
    let priceByBrandV2;

    if (this.config.enableEnhancedBrandScores && scoredQuotes.length > 0) {
      // Group by brand and calculate average scores
      const brandMap = new Map<string, Array<typeof scoredQuotes[0]>>();

      for (const quote of scoredQuotes) {
        const brand = quote.brand || 'Genel';
        if (!brandMap.has(brand)) {
          brandMap.set(brand, []);
        }
        brandMap.get(brand)!.push(quote);
      }

      priceByBrandV2 = Array.from(brandMap.entries()).map(([brand, brandQuotes]) => {
        const avgPrice = brandQuotes.reduce((s, q) => s + q.unit_price, 0) / brandQuotes.length;
        const avgScore = brandQuotes.reduce((s, q) => s + (q.marketScore?.overall || 0), 0) / brandQuotes.length;
        const bestQuote = brandQuotes[0]; // Already sorted by score

        return {
          brand,
          avgPrice: Number(avgPrice.toFixed(2)),
          marketScore: Number(avgScore.toFixed(2)),
          availability: bestQuote.stock_status || 'in_stock',
          source: bestQuote.source,
          lastUpdated: bestQuote.asOf
        };
      }).sort((a, b) => b.marketScore - a.marketScore); // Sort by score (not price!)

      AILogger.info('[Fusion V2] Enhanced brand options calculated', {
        brandCount: priceByBrandV2.length
      });
    }

    // ===== STEP 7: SCAN SUMMARY =====
    let scanSummary: ScanSummary | undefined;

    if (this.config.enableScanSummary) {
      const successful = quotesV2.filter(q => q.fetchStatus === 'success').length;
      const failed = quotesV2.filter(q => q.fetchStatus === 'failed').length;

      const failureReasons = quotesV2
        .filter(q => q.fetchStatus === 'failed' && q.failureReason)
        .map(q => ({
          source: q.source,
          reason: q.failureReason || 'unknown',
          details: q.failureDetails
        }));

      scanSummary = {
        totalScanned: quotesV2.length,
        successful,
        failed,
        failureReasons
      };

      AILogger.info('[Fusion V2] Scan summary created', {
        successful,
        failed
      });
    }

    // ===== STEP 8: BUILD FINAL RESULT =====
    const result: MarketFusionV2 = {
      // Base MarketFusion fields
      product_key: baseFusion.product_key,
      unit: baseFusion.unit || 'kg',
      price: baseFusion.price || 0,
      conf: baseFusion.conf || 0,
      sources: baseFusion.sources || quotesV2,

      // Optional base fields
      confidenceBreakdown: baseFusion.confidenceBreakdown,
      priceByBrand: baseFusion.priceByBrand,
      volatility: baseFusion.volatility,
      forecast: baseFusion.forecast,
      timestamp: baseFusion.timestamp,
      aiInsights: baseFusion.aiInsights,
      averagePrice: baseFusion.averagePrice,
      minPrice: baseFusion.minPrice,
      maxPrice: baseFusion.maxPrice,
      priceRange: baseFusion.priceRange,
      currency: 'TRY',
      meta: baseFusion.meta,

      // V2 enhanced fields
      priceIntelligence,
      riskAnalysis,
      priceByBrandV2,
      scanSummary
    };

    AILogger.success('[Fusion V2] Enhanced fusion completed', {
      price: result.price,
      confidence: result.conf,
      hasIntelligence: !!priceIntelligence,
      hasRiskAnalysis: !!riskAnalysis,
      hasScanSummary: !!scanSummary
    });

    return result;
  }

  /**
   * Backward compatible fusion method
   *
   * Returns base MarketFusion (V1) for compatibility
   *
   * @param quotes - Market quotes
   * @returns MarketFusion object (V1)
   */
  fuseQuotes(quotes: MarketQuote[]): MarketFusion {
    return fusionEngine.fuseQuotes(quotes);
  }

  /**
   * Quick fusion without expensive operations
   *
   * Disables risk analysis, keeps other features
   *
   * @param quotes - Market quotes
   * @returns MarketFusionV2 (without risk analysis)
   */
  async quickFuseV2(
    quotes: (MarketQuote | MarketQuoteV2)[]
  ): Promise<MarketFusionV2> {
    return this.fuseQuotesV2(quotes);
  }

  /**
   * Full fusion with risk analysis
   *
   * Requires price and stock history
   *
   * @param quotes - Market quotes
   * @param priceHistory - Price history data
   * @param stockHistory - Stock history data
   * @returns MarketFusionV2 (with risk analysis)
   */
  async fullFuseV2(
    quotes: (MarketQuote | MarketQuoteV2)[],
    priceHistory: Array<{ date: string; price: number }>,
    stockHistory: Array<{ date: string; status: string; market: string }>
  ): Promise<MarketFusionV2> {
    // Temporarily enable risk analysis
    const originalConfig = this.config.enableRiskAnalysis;
    this.config.enableRiskAnalysis = true;

    const result = await this.fuseQuotesV2(quotes, priceHistory, stockHistory);

    // Restore original config
    this.config.enableRiskAnalysis = originalConfig;

    return result;
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

/**
 * Default fusion engine V2 instance
 */
export const fusionEngineV2 = new MarketFusionEngineV2();

/**
 * Create custom fusion engine V2 with specific config
 */
export function createFusionEngineV2(config: Partial<FusionConfigV2>): MarketFusionEngineV2 {
  return new MarketFusionEngineV2(config);
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Quick helper: Fuse quotes with default V2 config
 */
export async function fuseQuotesV2(
  quotes: (MarketQuote | MarketQuoteV2)[]
): Promise<MarketFusionV2> {
  return fusionEngineV2.fuseQuotesV2(quotes);
}

/**
 * Quick helper: Fuse with risk analysis
 */
export async function fuseQuotesWithRisk(
  quotes: (MarketQuote | MarketQuoteV2)[],
  priceHistory: Array<{ date: string; price: number }>,
  stockHistory: Array<{ date: string; status: string; market: string }>
): Promise<MarketFusionV2> {
  return fusionEngineV2.fullFuseV2(quotes, priceHistory, stockHistory);
}

// ========================================
// EXPORTS (already exported above individually)
// ========================================
