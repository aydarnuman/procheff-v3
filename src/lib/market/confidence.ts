/**
 * Confidence Breakdown System
 * 3-seviye güven hesaplama: Category + Variant + MarketPrice
 */

import type { MarketQuote, ConfidenceBreakdown } from './schema';

export interface CategoryConfidence {
  score: number;              // 0-1
  category: string;           // Tespit edilen kategori
  alternatives: string[];     // Alternatif kategoriler
  method: 'exact' | 'fuzzy' | 'ai';
}

export interface VariantConfidence {
  score: number;              // 0-1
  variant: string;            // Tespit edilen varyant
  alternatives: string[];     // Alternatif varyantlar
  matchType: 'exact' | 'partial' | 'none';
}

export interface MarketPriceConfidence {
  score: number;              // 0-1
  sourceCount: number;        // Kaynak sayısı
  priceVariance: number;      // Fiyat varyansı
  outlierCount: number;       // Outlier sayısı
  dataFreshness: number;      // Veri tazeliği (0-1)
}

/**
 * Kategori güvenini hesapla
 */
export function calculateCategoryConfidence(
  detectedCategory: string,
  alternatives: string[],
  matchMethod: 'exact' | 'fuzzy' | 'ai'
): CategoryConfidence {
  let score = 0;
  
  // Method'a göre temel skor
  if (matchMethod === 'exact') {
    score = 0.95; // Exact match en yüksek
  } else if (matchMethod === 'fuzzy') {
    score = 0.75; // Fuzzy match orta
  } else {
    score = 0.60; // AI prediction düşük
  }
  
  // Alternatif sayısı arttıkça güven azalır
  if (alternatives.length > 3) {
    score *= 0.9;
  }
  if (alternatives.length > 5) {
    score *= 0.85;
  }
  
  return {
    score: Number(score.toFixed(2)),
    category: detectedCategory,
    alternatives: alternatives.slice(0, 5), // Max 5 alternatif
    method: matchMethod
  };
}

/**
 * Varyant güvenini hesapla
 */
export function calculateVariantConfidence(
  detectedVariant: string,
  alternatives: string[],
  matchType: 'exact' | 'partial' | 'none'
): VariantConfidence {
  let score = 0;
  
  if (matchType === 'exact') {
    score = 0.90;
  } else if (matchType === 'partial') {
    score = 0.65;
  } else {
    score = 0.40; // Varyant yok
  }
  
  // Alternatif sayısı faktörü
  if (alternatives.length === 0) {
    score *= 0.8; // Alternatif yoksa belirsizlik
  }
  
  return {
    score: Number(score.toFixed(2)),
    variant: detectedVariant,
    alternatives: alternatives.slice(0, 5),
    matchType
  };
}

/**
 * Market fiyat güvenini hesapla
 */
export function calculateMarketPriceConfidence(
  quotes: MarketQuote[]
): MarketPriceConfidence {
  if (quotes.length === 0) {
    return {
      score: 0,
      sourceCount: 0,
      priceVariance: 0,
      outlierCount: 0,
      dataFreshness: 0
    };
  }
  
  // 1. Kaynak çeşitliliği
  const uniqueSources = new Set(quotes.map(q => q.source)).size;
  const sourceScore = Math.min(uniqueSources / 3, 1); // Max 3 kaynak için tam puan
  
  // 2. Fiyat varyansı (düşük varyans = yüksek güven)
  const prices = quotes.map(q => q.unit_price);
  const mean = prices.reduce((s, p) => s + p, 0) / prices.length;
  const variance = prices.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;
  const varianceScore = 1 / (1 + coefficientOfVariation); // Düşük CV = yüksek skor
  
  // 3. Outlier tespiti (IQR method)
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const q1 = sortedPrices[Math.floor(sortedPrices.length * 0.25)];
  const q3 = sortedPrices[Math.floor(sortedPrices.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  const outliers = quotes.filter(q => 
    q.unit_price < lowerBound || q.unit_price > upperBound
  );
  const outlierScore = 1 - (outliers.length / quotes.length);
  
  // 4. Veri tazeliği
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentQuotes = quotes.filter(q => {
    const quoteDate = new Date(q.asOf);
    return quoteDate >= thirtyDaysAgo;
  });
  const freshnessScore = recentQuotes.length / quotes.length;
  
  // Toplam skor (ağırlıklı ortalama)
  const totalScore = (
    varianceScore * 0.35 +
    sourceScore * 0.30 +
    outlierScore * 0.20 +
    freshnessScore * 0.15
  );
  
  return {
    score: Number(totalScore.toFixed(2)),
    sourceCount: uniqueSources,
    priceVariance: Number(coefficientOfVariation.toFixed(2)),
    outlierCount: outliers.length,
    dataFreshness: Number(freshnessScore.toFixed(2))
  };
}

/**
 * Final confidence breakdown hesapla
 */
export function calculateConfidenceBreakdown(
  categoryConf: CategoryConfidence,
  variantConf: VariantConfidence,
  marketPriceConf: MarketPriceConfidence
): ConfidenceBreakdown {
  // Ağırlıklı toplam
  const weighted = (
    categoryConf.score * 0.4 +
    variantConf.score * 0.2 +
    marketPriceConf.score * 0.4
  );
  
  // Açıklama oluştur
  const explanation = generateExplanation(
    categoryConf,
    variantConf,
    marketPriceConf,
    weighted
  );
  
  return {
    category: categoryConf.score,
    variant: variantConf.score,
    marketPrice: marketPriceConf.score,
    weighted: Number(weighted.toFixed(2)),
    explanation
  };
}

/**
 * Açıklama metni oluştur
 */
function generateExplanation(
  cat: CategoryConfidence,
  variant: VariantConfidence,
  market: MarketPriceConfidence,
  weighted: number
): string {
  if (weighted >= 0.85) {
    return `Yüksek güven: ${market.sourceCount} kaynak uyumlu, ${cat.method} kategori tespiti`;
  }
  
  if (weighted >= 0.70) {
    return `Orta-yüksek güven: ${market.sourceCount} kaynak, fiyat varyansı ${(market.priceVariance * 100).toFixed(0)}%`;
  }
  
  if (weighted >= 0.50) {
    return `Orta güven: Varyant belirsizliği veya sınırlı kaynak (${market.sourceCount})`;
  }
  
  return `Düşük güven: Az kaynak (${market.sourceCount}), yüksek varyans, veya zayıf kategori tespiti`;
}

/**
 * Basitleştirilmiş confidence hesaplama (backward compatible)
 */
export function simpleConfidence(quotes: MarketQuote[]): number {
  const marketConf = calculateMarketPriceConfidence(quotes);
  return marketConf.score;
}

/**
 * Confidence badge rengi (UI için)
 */
export function getConfidenceBadge(score: number): {
  color: string;
  label: string;
  emoji: string;
} {
  if (score >= 0.85) {
    return { color: 'green', label: 'Çok Yüksek', emoji: '🟢' };
  }
  if (score >= 0.70) {
    return { color: 'blue', label: 'Yüksek', emoji: '🔵' };
  }
  if (score >= 0.50) {
    return { color: 'yellow', label: 'Orta', emoji: '🟡' };
  }
  if (score >= 0.30) {
    return { color: 'orange', label: 'Düşük', emoji: '🟠' };
  }
  return { color: 'red', label: 'Çok Düşük', emoji: '🔴' };
}

/**
 * Debug: Confidence breakdown'ı yazdır
 */
export function debugConfidence(breakdown: ConfidenceBreakdown): string {
  const badge = getConfidenceBadge(breakdown.weighted);
  
  return [
    `${badge.emoji} Güven Skoru: ${(breakdown.weighted * 100).toFixed(0)}% (${badge.label})`,
    ``,
    `Detaylar:`,
    `  📦 Kategori: ${(breakdown.category * 100).toFixed(0)}%`,
    `  🔁 Varyant: ${(breakdown.variant * 100).toFixed(0)}%`,
    `  💰 Fiyat: ${(breakdown.marketPrice * 100).toFixed(0)}%`,
    ``,
    `Açıklama: ${breakdown.explanation}`
  ].join('\n');
}

/**
 * Confidence threshold kontrolü
 */
export function meetsThreshold(
  confidence: number,
  threshold: 'strict' | 'normal' | 'relaxed' = 'normal'
): boolean {
  const thresholds = {
    strict: 0.80,
    normal: 0.60,
    relaxed: 0.40
  };
  
  return confidence >= thresholds[threshold];
}

/**
 * Multi-product confidence aggregate
 */
export function aggregateConfidence(
  breakdowns: ConfidenceBreakdown[]
): {
  avgWeighted: number;
  minWeighted: number;
  maxWeighted: number;
  reliable: number; // Güvenilir ürün sayısı (>0.7)
  unreliable: number; // Güvensiz ürün sayısı (<0.5)
} {
  if (breakdowns.length === 0) {
    return {
      avgWeighted: 0,
      minWeighted: 0,
      maxWeighted: 0,
      reliable: 0,
      unreliable: 0
    };
  }
  
  const weighted = breakdowns.map(b => b.weighted);
  
  return {
    avgWeighted: weighted.reduce((s, w) => s + w, 0) / weighted.length,
    minWeighted: Math.min(...weighted),
    maxWeighted: Math.max(...weighted),
    reliable: weighted.filter(w => w >= 0.7).length,
    unreliable: weighted.filter(w => w < 0.5).length
  };
}

