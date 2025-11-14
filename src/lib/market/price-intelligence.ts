/**
 * Price Intelligence System
 *
 * Provides transparent breakdown of:
 * 1. Source Contribution - Hangi % market, hangi % AI, vb.
 * 2. Data Freshness - En yeni/eski kaynak, ortalama yaş
 * 3. Price Consistency - Tutarlılık skoru, outlier sayısı
 *
 * Fixes: Fiyat güvenilirlik kaynağı belirsizliği
 */

import type {
  MarketQuote,
  PriceIntelligence,
  SourceContribution,
  DataFreshness,
  PriceConsistency,
  Source
} from './schema';
import { BASE_SOURCE_WEIGHTS } from './trust-score';
import { AILogger } from '@/lib/ai/logger';

// ========================================
// SOURCE CONTRIBUTION
// ========================================

/**
 * Calculate source contribution breakdown
 *
 * Shows what % of final price comes from:
 * - Real market data (migros, a101, etc.)
 * - AI estimation
 * - Historical trend (DB)
 * - TÜİK data (official)
 *
 * @param quotes - All market quotes
 * @param weights - Source weights used in fusion
 * @returns SourceContribution object
 */
export function calculateSourceContribution(
  quotes: MarketQuote[],
  weights?: Record<Source, number>
): SourceContribution {
  const sourceWeights = weights || BASE_SOURCE_WEIGHTS;

  // Categorize quotes
  const realMarket = quotes.filter(q =>
    ['migros', 'a101', 'bim', 'sok', 'carrefour', 'hepsiburada', 'trendyol'].includes(q.source)
  );
  const ai = quotes.filter(q => q.source === 'ai' || q.source === 'AI');
  const historical = quotes.filter(q => q.source === 'DB');
  const tuik = quotes.filter(q => q.source === 'TUIK');

  // Calculate total weight
  const totalWeight = quotes.reduce((sum, q) =>
    sum + (sourceWeights[q.source] || 0.1), 0
  );

  // Helper: calculate average price
  const avg = (arr: MarketQuote[]) =>
    arr.length > 0 ? arr.reduce((s, q) => s + q.unit_price, 0) / arr.length : 0;

  // Helper: calculate weight sum
  const weightSum = (arr: MarketQuote[]) =>
    arr.reduce((s, q) => s + (sourceWeights[q.source] || 0.1), 0);

  // Real market data contribution
  const realMarketWeight = weightSum(realMarket);
  const realMarketPercentage = totalWeight > 0 ? (realMarketWeight / totalWeight) * 100 : 0;

  // AI estimation contribution
  const aiWeight = weightSum(ai);
  const aiPercentage = totalWeight > 0 ? (aiWeight / totalWeight) * 100 : 0;

  // Historical trend contribution
  const historicalWeight = weightSum(historical);
  const historicalPercentage = totalWeight > 0 ? (historicalWeight / totalWeight) * 100 : 0;

  // TÜİK data contribution
  const tuikWeight = weightSum(tuik);
  const tuikPercentage = totalWeight > 0 ? (tuikWeight / totalWeight) * 100 : 0;

  // Trend direction (basit heuristic)
  let trendDirection: 'rising' | 'falling' | 'stable' = 'stable';
  if (historical.length >= 3) {
    const recentAvg = avg(historical.slice(-2));
    const oldAvg = avg(historical.slice(0, 2));
    if (recentAvg > oldAvg * 1.05) trendDirection = 'rising';
    else if (recentAvg < oldAvg * 0.95) trendDirection = 'falling';
  }

  const result: SourceContribution = {
    realMarketData: {
      percentage: Number(realMarketPercentage.toFixed(2)),
      sourceCount: new Set(realMarket.map(q => q.source)).size,
      avgPrice: Number(avg(realMarket).toFixed(2)),
      weight: Number(realMarketWeight.toFixed(2))
    },
    aiEstimation: {
      percentage: Number(aiPercentage.toFixed(2)),
      model: 'claude-sonnet-4', // Default model
      confidence: ai[0]?.sourceTrust || 0.75,
      avgPrice: Number(avg(ai).toFixed(2)),
      weight: Number(aiWeight.toFixed(2))
    },
    historicalTrend: {
      percentage: Number(historicalPercentage.toFixed(2)),
      dataPoints: historical.length,
      trendDirection,
      weight: Number(historicalWeight.toFixed(2))
    }
  };

  // TÜİK (optional)
  if (tuik.length > 0) {
    result.tuikData = {
      percentage: Number(tuikPercentage.toFixed(2)),
      lastUpdate: tuik[0].asOf,
      officialPrice: tuik[0].unit_price,
      weight: Number(tuikWeight.toFixed(2))
    };
  }

  AILogger.info('[Price Intelligence] Source contribution calculated', {
    realMarketPercentage,
    aiPercentage,
    historicalPercentage,
    tuikPercentage
  });

  return result;
}

// ========================================
// DATA FRESHNESS
// ========================================

/**
 * Calculate data freshness metrics
 *
 * @param quotes - All market quotes
 * @returns DataFreshness object
 */
export function calculateDataFreshness(
  quotes: MarketQuote[]
): DataFreshness {
  if (quotes.length === 0) {
    return {
      averageAge: 0,
      oldestSource: 'N/A',
      newestSource: 'N/A',
      staleDataCount: 0
    };
  }

  const now = new Date();

  // Calculate ages (in hours)
  const ages = quotes.map(q => {
    const quoteDate = new Date(q.asOf);
    const ageMs = now.getTime() - quoteDate.getTime();
    return {
      source: q.source,
      ageHours: ageMs / (1000 * 60 * 60),
      asOf: q.asOf
    };
  });

  // Average age
  const averageAge = ages.reduce((sum, a) => sum + a.ageHours, 0) / ages.length;

  // Oldest source
  const oldest = ages.reduce((old, curr) =>
    curr.ageHours > old.ageHours ? curr : old
  );

  // Newest source
  const newest = ages.reduce((neww, curr) =>
    curr.ageHours < neww.ageHours ? curr : neww
  );

  // Stale data count (> 7 days = 168 hours)
  const staleDataCount = ages.filter(a => a.ageHours > 168).length;

  // Format time ago
  const formatTimeAgo = (hours: number): string => {
    if (hours < 1) return `${Math.round(hours * 60)} dakika önce`;
    if (hours < 24) return `${Math.round(hours)} saat önce`;
    const days = Math.round(hours / 24);
    return `${days} gün önce`;
  };

  return {
    averageAge: Number(averageAge.toFixed(1)),
    oldestSource: `${oldest.source} (${formatTimeAgo(oldest.ageHours)})`,
    newestSource: `${newest.source} (${formatTimeAgo(newest.ageHours)})`,
    staleDataCount
  };
}

// ========================================
// PRICE CONSISTENCY
// ========================================

/**
 * Calculate price consistency score
 *
 * Uses coefficient of variation and outlier detection
 *
 * @param quotes - All market quotes
 * @param fusedPrice - Final fused price
 * @returns PriceConsistency object
 */
export function calculatePriceConsistency(
  quotes: MarketQuote[],
  fusedPrice: number
): PriceConsistency {
  if (quotes.length === 0) {
    return {
      score: 0,
      coefficientOfVariation: 0,
      outlierCount: 0,
      standardDeviation: 0,
      explanation: 'Veri yok'
    };
  }

  const prices = quotes.map(q => q.unit_price);

  // Mean and variance
  const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);

  // Coefficient of variation
  const cv = mean > 0 ? stdDev / mean : 0;

  // Outlier detection (IQR method)
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const q1 = sortedPrices[Math.floor(sortedPrices.length * 0.25)];
  const q3 = sortedPrices[Math.floor(sortedPrices.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const outliers = quotes.filter(q =>
    q.unit_price < lowerBound || q.unit_price > upperBound
  );

  // Consistency score (inverse of CV, scaled to 0-1)
  // CV < 0.1 => score ~0.9
  // CV = 0.3 => score ~0.7
  // CV > 0.5 => score <0.5
  const score = Math.max(0, Math.min(1, 1 - (cv / 0.5)));

  // Explanation
  let explanation = '';
  if (score >= 0.8) {
    explanation = `Yüksek tutarlılık: fiyatlar %${(cv * 100).toFixed(0)} varyans içinde`;
  } else if (score >= 0.6) {
    explanation = `Orta tutarlılık: fiyat varyansı %${(cv * 100).toFixed(0)}`;
  } else {
    explanation = `Düşük tutarlılık: fiyatlar dağınık (varyans %${(cv * 100).toFixed(0)})`;
  }

  if (outliers.length > 0) {
    explanation += `, ${outliers.length} outlier kaldırıldı`;
  }

  return {
    score: Number(score.toFixed(2)),
    coefficientOfVariation: Number(cv.toFixed(3)),
    outlierCount: outliers.length,
    standardDeviation: Number(stdDev.toFixed(2)),
    explanation
  };
}

// ========================================
// OVERALL PRICE INTELLIGENCE
// ========================================

/**
 * Calculate complete price intelligence
 *
 * Combines source contribution, freshness, and consistency
 *
 * @param quotes - All market quotes
 * @param fusedPrice - Final fused price
 * @param weights - Source weights (optional)
 * @returns PriceIntelligence object
 */
export function calculatePriceIntelligence(
  quotes: MarketQuote[],
  fusedPrice: number,
  weights?: Record<Source, number>
): PriceIntelligence {
  AILogger.info('[Price Intelligence] Calculating intelligence', {
    quotesCount: quotes.length,
    fusedPrice
  });

  const sourceContribution = calculateSourceContribution(quotes, weights);
  const dataFreshness = calculateDataFreshness(quotes);
  const priceConsistency = calculatePriceConsistency(quotes, fusedPrice);

  // Price range
  const prices = quotes.map(q => q.unit_price);
  const priceRange = {
    min: Math.min(...prices),
    max: Math.max(...prices),
    avg: prices.reduce((s, p) => s + p, 0) / prices.length
  };

  // Overall confidence (weighted average of consistency and freshness)
  const freshnessScore = dataFreshness.averageAge < 24 ? 0.9 :
                          dataFreshness.averageAge < 72 ? 0.7 :
                          dataFreshness.averageAge < 168 ? 0.5 : 0.3;

  const confidence = (priceConsistency.score * 0.7 + freshnessScore * 0.3);

  const result: PriceIntelligence = {
    finalPrice: fusedPrice,
    currency: 'TRY',
    confidence: Number(confidence.toFixed(2)),
    sourceContribution,
    dataFreshness,
    priceConsistency,
    priceRange: {
      min: Number(priceRange.min.toFixed(2)),
      max: Number(priceRange.max.toFixed(2)),
      avg: Number(priceRange.avg.toFixed(2))
    }
  };

  AILogger.success('[Price Intelligence] Intelligence calculated', {
    confidence,
    realMarketPercentage: sourceContribution.realMarketData.percentage,
    avgAge: dataFreshness.averageAge
  });

  return result;
}

/**
 * Debug: Print price intelligence
 */
export function debugPriceIntelligence(intel: PriceIntelligence): string {
  const { sourceContribution, dataFreshness, priceConsistency, priceRange } = intel;

  return [
    `💰 Price Intelligence Report`,
    ``,
    `Final Price: ₺${intel.finalPrice.toFixed(2)} (${(intel.confidence * 100).toFixed(0)}% confidence)`,
    ``,
    `📊 Source Contribution:`,
    `  • Real Market Data: ${sourceContribution.realMarketData.percentage.toFixed(0)}% (${sourceContribution.realMarketData.sourceCount} sources, avg ₺${sourceContribution.realMarketData.avgPrice.toFixed(2)})`,
    `  • AI Estimation: ${sourceContribution.aiEstimation.percentage.toFixed(0)}% (${sourceContribution.aiEstimation.model}, ${(sourceContribution.aiEstimation.confidence * 100).toFixed(0)}% confident)`,
    `  • Historical Trend: ${sourceContribution.historicalTrend.percentage.toFixed(0)}% (${sourceContribution.historicalTrend.dataPoints} points, ${sourceContribution.historicalTrend.trendDirection})`,
    sourceContribution.tuikData
      ? `  • TÜİK Official: ${sourceContribution.tuikData.percentage.toFixed(0)}% (₺${sourceContribution.tuikData.officialPrice.toFixed(2)})`
      : '',
    ``,
    `🕒 Data Freshness:`,
    `  • Average Age: ${dataFreshness.averageAge.toFixed(1)} hours`,
    `  • Newest: ${dataFreshness.newestSource}`,
    `  • Oldest: ${dataFreshness.oldestSource}`,
    `  • Stale Data: ${dataFreshness.staleDataCount} sources > 7 days`,
    ``,
    `📈 Price Consistency:`,
    `  • Score: ${(priceConsistency.score * 100).toFixed(0)}/100`,
    `  • Coefficient of Variation: ${(priceConsistency.coefficientOfVariation * 100).toFixed(1)}%`,
    `  • Standard Deviation: ₺${priceConsistency.standardDeviation.toFixed(2)}`,
    `  • Outliers Removed: ${priceConsistency.outlierCount}`,
    `  • ${priceConsistency.explanation}`,
    ``,
    `💵 Price Range:`,
    `  • Min: ₺${priceRange.min.toFixed(2)}`,
    `  • Avg: ₺${priceRange.avg.toFixed(2)}`,
    `  • Max: ₺${priceRange.max.toFixed(2)}`,
    `  • Spread: ₺${(priceRange.max - priceRange.min).toFixed(2)} (${((priceRange.max - priceRange.min) / priceRange.avg * 100).toFixed(1)}%)`
  ].filter(Boolean).join('\n');
}

// ========================================
// EXPORTS (already exported above individually)
// ========================================
