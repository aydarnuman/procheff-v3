/**
 * Multi-Dimensional Market Scoring System
 *
 * 5-boyutlu skorlama:
 * 1. Price Score (35%) - Fiyat rekabetçiliği
 * 2. Reliability Score (25%) - Kaynak güvenilirliği + scraper health
 * 3. Completeness Score (15%) - Veri tamlığı
 * 4. Stock Score (15%) - Stok durumu
 * 5. Recency Score (10%) - Veri güncelliği
 *
 * Fixes: Tek boyutlu market sıralaması (sadece fiyat)
 */

import type { MarketQuote, MarketQuoteV2, MarketScore, Source } from './schema';
import { BASE_SOURCE_WEIGHTS } from './trust-score';
import { scraperHealthMonitor } from './providers/scraper/health-monitor';


// ========================================
// SCORING CONFIGURATION
// ========================================

/**
 * Scoring weights (toplam = 1.0)
 */
export const SCORING_WEIGHTS = {
  price: 0.35,
  reliability: 0.25,
  completeness: 0.15,
  stock: 0.15,
  recency: 0.10
} as const;

/**
 * Data completeness weights
 */
const COMPLETENESS_WEIGHTS = {
  hasPrice: 0.4,    // En önemli
  hasBrand: 0.2,
  hasStock: 0.2,
  hasImage: 0.2
} as const;

// ========================================
// INDIVIDUAL SCORE CALCULATORS
// ========================================

/**
 * 1. Price Score: En düşük fiyat 100, en yüksek 0
 *
 * @param price - Quote fiyatı
 * @param minPrice - En düşük fiyat (tüm quotes içinde)
 * @param maxPrice - En yüksek fiyat (tüm quotes içinde)
 * @returns 0-100 score
 */
export function calculatePriceScore(
  price: number,
  minPrice: number,
  maxPrice: number
): number {
  if (maxPrice === minPrice) return 100; // Tüm fiyatlar aynı

  // Normalize: en düşük fiyat = 100, en yüksek = 0
  const normalized = 1 - (price - minPrice) / (maxPrice - minPrice);
  return Math.round(normalized * 100);
}

/**
 * 2. Reliability Score: Kaynak güvenilirliği + scraper health
 *
 * Combines:
 * - Base source weight (örn: migros = 0.9, a101 = 0.8)
 * - Source trust (dynamic, 0-1)
 * - Scraper health status (healthy=1.2x, degraded=0.8x, down=0.5x)
 * - Scraper success rate (0-100%)
 *
 * @param quote - Market quote
 * @returns 0-100 score
 */
export function calculateReliabilityScore(quote: MarketQuote): number {
  const baseReliability = BASE_SOURCE_WEIGHTS[quote.source] || 0.1;
  const sourceTrust = quote.sourceTrust || 0.5;

  // Scraper health check
  const scraperName = getScraperName(quote.source);
  const health = scraperName ? scraperHealthMonitor.getHealth(scraperName) : null;

  let healthMultiplier = 1.0;
  if (health) {
    if (health.status === 'healthy') healthMultiplier = 1.2;
    else if (health.status === 'degraded') healthMultiplier = 0.8;
    else if (health.status === 'down') healthMultiplier = 0.5;
  }

  // Success rate contribution
  const successRateContribution = health ? (health.successRate / 100) * 0.2 : 0;

  // Final score (weighted average)
  const finalScore = (
    (baseReliability * 0.4) +
    (sourceTrust * 0.4) +
    successRateContribution
  ) * healthMultiplier;

  return Math.round(Math.min(finalScore * 100, 100));
}

/**
 * 3. Completeness Score: Veri tamlığı
 *
 * Checks:
 * - hasPrice (40%)
 * - hasBrand (20%)
 * - hasStock (20%)
 * - hasImage (20%)
 *
 * @param quote - Market quote V2 (with dataCompleteness)
 * @returns 0-100 score
 */
export function calculateCompletenessScore(quote: MarketQuoteV2): number {
  const { dataCompleteness } = quote;

  let score = 0;
  if (dataCompleteness.hasPrice) score += COMPLETENESS_WEIGHTS.hasPrice;
  if (dataCompleteness.hasBrand) score += COMPLETENESS_WEIGHTS.hasBrand;
  if (dataCompleteness.hasStock) score += COMPLETENESS_WEIGHTS.hasStock;
  if (dataCompleteness.hasImage) score += COMPLETENESS_WEIGHTS.hasImage;

  return Math.round(score * 100);
}

/**
 * Completeness score for MarketQuote (backward compatible)
 */
export function calculateCompletenessScoreV1(quote: MarketQuote): number {
  let score = 0;

  if (quote.unit_price) score += COMPLETENESS_WEIGHTS.hasPrice;
  if (quote.brand) score += COMPLETENESS_WEIGHTS.hasBrand;
  if (quote.stock_status) score += COMPLETENESS_WEIGHTS.hasStock;
  if (quote.meta?.image) score += COMPLETENESS_WEIGHTS.hasImage;

  return Math.round(score * 100);
}

/**
 * 4. Stock Score: Stok durumu
 *
 * - in_stock: 100
 * - limited: 50
 * - out_of_stock: 0
 *
 * @param quote - Market quote
 * @returns 0-100 score
 */
export function calculateStockScore(quote: MarketQuote): number {
  const status = quote.stock_status || 'in_stock'; // Default: in_stock

  if (status === 'in_stock') return 100;
  if (status === 'limited') return 50;
  return 0; // out_of_stock
}

/**
 * 5. Recency Score: Veri güncelliği
 *
 * - 0-24 hours: 100
 * - 24-72 hours: 75
 * - 72-168 hours (7 days): 50
 * - > 168 hours: 25
 *
 * @param quote - Market quote
 * @returns 0-100 score
 */
export function calculateRecencyScore(quote: MarketQuote): number {
  const now = new Date();
  const quoteDate = new Date(quote.asOf);
  const ageHours = (now.getTime() - quoteDate.getTime()) / (1000 * 60 * 60);

  if (ageHours <= 24) return 100;
  if (ageHours <= 72) return 75;
  if (ageHours <= 168) return 50;
  return 25;
}

// ========================================
// OVERALL MARKET SCORE
// ========================================

/**
 * Calculate overall market score (multi-dimensional)
 *
 * Formula:
 * Overall = (
 *   priceScore       × 0.35 +
 *   reliabilityScore × 0.25 +
 *   completenessScore × 0.15 +
 *   stockScore       × 0.15 +
 *   recencyScore     × 0.10
 * )
 *
 * @param quote - Market quote (V1 or V2)
 * @param allQuotes - Tüm quotes (min/max fiyat hesabı için)
 * @returns MarketScore object
 */
export function calculateMarketScore(
  quote: MarketQuote | MarketQuoteV2,
  allQuotes: (MarketQuote | MarketQuoteV2)[]
): MarketScore {
  // Min/max fiyat hesapla
  const prices = allQuotes.map(q => q.unit_price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  // Individual scores
  const priceScore = calculatePriceScore(quote.unit_price, minPrice, maxPrice);
  const reliabilityScore = calculateReliabilityScore(quote);

  // Completeness score (V2 varsa optimized, yoksa fallback)
  const completenessScore = 'dataCompleteness' in quote
    ? calculateCompletenessScore(quote as MarketQuoteV2)
    : calculateCompletenessScoreV1(quote);

  const stockScore = calculateStockScore(quote);
  const recencyScore = calculateRecencyScore(quote);

  // Weighted overall score
  const overall = Math.round(
    priceScore * SCORING_WEIGHTS.price +
    reliabilityScore * SCORING_WEIGHTS.reliability +
    completenessScore * SCORING_WEIGHTS.completeness +
    stockScore * SCORING_WEIGHTS.stock +
    recencyScore * SCORING_WEIGHTS.recency
  );

  // Generate human-readable breakdown
  const breakdown = generateScoreBreakdown(overall, {
    priceScore,
    reliabilityScore,
    completenessScore,
    stockScore,
    recencyScore
  });

  return {
    overall,
    priceScore,
    reliabilityScore,
    completenessScore,
    stockScore,
    recencyScore,
    breakdown
  };
}

/**
 * Batch calculate market scores for all quotes
 *
 * @param quotes - Market quotes
 * @returns Array of quotes with marketScore field
 */
export function calculateAllMarketScores<T extends MarketQuote>(
  quotes: T[]
): Array<T & { marketScore: MarketScore }> {
  return quotes.map(quote => ({
    ...quote,
    marketScore: calculateMarketScore(quote, quotes)
  }));
}

/**
 * Sort quotes by market score (descending)
 *
 * @param quotes - Market quotes with scores
 * @returns Sorted quotes (highest score first)
 */
export function sortByMarketScore<T extends { marketScore?: MarketScore }>(
  quotes: T[]
): T[] {
  return [...quotes].sort((a, b) => {
    const scoreA = a.marketScore?.overall || 0;
    const scoreB = b.marketScore?.overall || 0;
    return scoreB - scoreA;
  });
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Map source to scraper name
 */
function getScraperName(source: Source): string | null {
  const mapping: Record<string, string> = {
    a101: 'A101',
    bim: 'BİM',
    carrefour: 'CarrefourSA',
    migros: 'Migros',
    sok: 'ŞOK'
  };

  return mapping[source] || null;
}

/**
 * Generate human-readable score breakdown
 *
 * Examples:
 * - "Mükemmel (85/100): rekabetçi fiyat, yüksek güvenilirlik, stokta mevcut, güncel veri"
 * - "İyi (72/100): en ucuz, sınırlı stok, eski veri"
 * - "Orta (58/100): yüksek fiyat, düşük güvenilirlik"
 */
function generateScoreBreakdown(
  overall: number,
  scores: {
    priceScore: number;
    reliabilityScore: number;
    completenessScore: number;
    stockScore: number;
    recencyScore: number;
  }
): string {
  const parts: string[] = [];

  // Price analysis
  if (scores.priceScore >= 80) {
    parts.push('rekabetçi fiyat');
  } else if (scores.priceScore >= 50) {
    parts.push('orta fiyat');
  } else {
    parts.push('yüksek fiyat');
  }

  // Reliability analysis
  if (scores.reliabilityScore >= 80) {
    parts.push('yüksek güvenilirlik');
  } else if (scores.reliabilityScore <= 50) {
    parts.push('düşük güvenilirlik');
  }

  // Stock analysis
  if (scores.stockScore === 100) {
    parts.push('stokta mevcut');
  } else if (scores.stockScore === 50) {
    parts.push('sınırlı stok');
  } else if (scores.stockScore === 0) {
    parts.push('stok yok');
  }

  // Recency analysis
  if (scores.recencyScore >= 90) {
    parts.push('güncel veri');
  } else if (scores.recencyScore <= 40) {
    parts.push('eski veri');
  }

  // Completeness analysis (only if very low)
  if (scores.completenessScore <= 40) {
    parts.push('eksik veri');
  }

  // Tier label
  const tier = overall >= 80 ? 'Mükemmel' :
               overall >= 65 ? 'İyi' :
               overall >= 50 ? 'Orta' : 'Zayıf';

  return `${tier} (${overall}/100): ${parts.join(', ')}`;
}

/**
 * Get score tier color (for UI)
 */
export function getScoreTierColor(score: number): {
  color: string;
  label: string;
  emoji: string;
} {
  if (score >= 80) {
    return { color: 'green', label: 'Mükemmel', emoji: '🟢' };
  }
  if (score >= 65) {
    return { color: 'blue', label: 'İyi', emoji: '🔵' };
  }
  if (score >= 50) {
    return { color: 'yellow', label: 'Orta', emoji: '🟡' };
  }
  if (score >= 35) {
    return { color: 'orange', label: 'Zayıf', emoji: '🟠' };
  }
  return { color: 'red', label: 'Çok Zayıf', emoji: '🔴' };
}

/**
 * Filter quotes by minimum score threshold
 */
export function filterByMinScore<T extends { marketScore?: MarketScore }>(
  quotes: T[],
  minScore: number
): T[] {
  return quotes.filter(q => (q.marketScore?.overall || 0) >= minScore);
}

/**
 * Get best quote (highest overall score)
 */
export function getBestQuote<T extends { marketScore?: MarketScore }>(
  quotes: T[]
): T | null {
  if (quotes.length === 0) return null;

  return quotes.reduce((best, current) => {
    const bestScore = best.marketScore?.overall || 0;
    const currentScore = current.marketScore?.overall || 0;
    return currentScore > bestScore ? current : best;
  });
}

/**
 * Debug: Print score breakdown
 */
export function debugMarketScore(score: MarketScore): string {
  const tier = getScoreTierColor(score.overall);

  return [
    `${tier.emoji} Market Score: ${score.overall}/100 (${tier.label})`,
    ``,
    `Breakdown:`,
    `  💰 Price:        ${score.priceScore}/100 (${SCORING_WEIGHTS.price * 100}% weight)`,
    `  🔒 Reliability:  ${score.reliabilityScore}/100 (${SCORING_WEIGHTS.reliability * 100}% weight)`,
    `  📊 Completeness: ${score.completenessScore}/100 (${SCORING_WEIGHTS.completeness * 100}% weight)`,
    `  📦 Stock:        ${score.stockScore}/100 (${SCORING_WEIGHTS.stock * 100}% weight)`,
    `  🕒 Recency:      ${score.recencyScore}/100 (${SCORING_WEIGHTS.recency * 100}% weight)`,
    ``,
    `Summary: ${score.breakdown}`
  ].join('\n');
}

/**
 * Aggregate scores for multiple quotes (for summary stats)
 */
export function aggregateScores(
  quotes: Array<{ marketScore?: MarketScore }>
): {
  avgOverall: number;
  minOverall: number;
  maxOverall: number;
  excellentCount: number;  // >= 80
  goodCount: number;       // 65-79
  poorCount: number;       // < 50
} {
  if (quotes.length === 0) {
    return {
      avgOverall: 0,
      minOverall: 0,
      maxOverall: 0,
      excellentCount: 0,
      goodCount: 0,
      poorCount: 0
    };
  }

  const scores = quotes.map(q => q.marketScore?.overall || 0);

  return {
    avgOverall: Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length),
    minOverall: Math.min(...scores),
    maxOverall: Math.max(...scores),
    excellentCount: scores.filter(s => s >= 80).length,
    goodCount: scores.filter(s => s >= 65 && s < 80).length,
    poorCount: scores.filter(s => s < 50).length
  };
}

// ========================================
// EXPORTS (already exported above individually)
// ========================================
