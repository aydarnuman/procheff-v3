/**
 * Comprehensive Product Risk Analysis Module
 *
 * 5 Risk Categories:
 * 1. Price Volatility Risk - Fiyat oynaklığı
 * 2. Stock Availability Risk - Stok riski
 * 3. Supplier Concentration Risk - Tedarikçi konsantrasyonu (Herfindahl index)
 * 4. Seasonality Risk - Mevsimsellik
 * 5. Data Quality Risk - Veri kalitesi
 *
 * Output: Overall risk score + category breakdown + alerts + mitigation strategies
 */

import type {
  MarketQuote,
  MarketQuoteV2,
  ProductRiskAnalysis,
  PriceVolatilityRisk,
  StockAvailabilityRisk,
  SupplierConcentrationRisk,
  SeasonalityRisk,
  DataQualityRisk,
  RiskAlert
} from './schema';
import { BASE_SOURCE_WEIGHTS } from './trust-score';
import { AILogger } from '@/lib/ai/logger';

// ========================================
// CONFIGURATION
// ========================================

/**
 * Risk weights (toplam = 1.0)
 */
const RISK_WEIGHTS = {
  priceVolatility: 0.25,
  stockAvailability: 0.25,
  supplierConcentration: 0.20,
  seasonality: 0.15,
  dataQuality: 0.15
} as const;

/**
 * Month names (Turkish)
 */
const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

// ========================================
// 1. PRICE VOLATILITY RISK
// ========================================

/**
 * Calculate price volatility risk
 *
 * Uses coefficient of variation (CV) and max spike analysis
 *
 * @param priceHistory - Array of {date, price} records
 * @returns PriceVolatilityRisk object
 */
export function calculatePriceVolatilityRisk(
  priceHistory: Array<{ date: string; price: number }>
): PriceVolatilityRisk {
  if (priceHistory.length === 0) {
    return {
      score: 0,
      level: 'low',
      stdDev: 0,
      coefficientOfVariation: 0,
      trend: 'stable',
      maxSpike: 0,
      recommendation: 'Veri yok'
    };
  }

  const prices = priceHistory.map(h => h.price);
  const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? stdDev / mean : 0;

  // Max spike calculation (günlük değişim)
  const dailyChanges: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const change = Math.abs((prices[i] - prices[i - 1]) / prices[i - 1]) * 100;
    dailyChanges.push(change);
  }
  const maxSpike = dailyChanges.length > 0 ? Math.max(...dailyChanges) : 0;

  // Risk score (CV-based)
  let score = 0;
  if (cv < 0.1) score = 10;        // Düşük risk
  else if (cv < 0.2) score = 30;   // Orta-düşük risk
  else if (cv < 0.35) score = 60;  // Orta-yüksek risk
  else score = 90;                 // Yüksek risk

  // Trend determination (basit: son 30 gün ortalama vs önceki 30 gün)
  let trend: 'rising' | 'falling' | 'stable' = 'stable';
  if (prices.length >= 6) {
    const recentAvg = prices.slice(-3).reduce((s, p) => s + p, 0) / 3;
    const oldAvg = prices.slice(0, 3).reduce((s, p) => s + p, 0) / 3;
    if (recentAvg > oldAvg * 1.05) trend = 'rising';
    else if (recentAvg < oldAvg * 0.95) trend = 'falling';
  }

  // Recommendation
  let recommendation = '';
  if (score < 30) {
    recommendation = 'Fiyat istikrarlı. Şimdi alın veya sözleşme yapın.';
  } else if (score < 60) {
    recommendation = 'Orta seviye volatilite. Kısa vadeli alım önerilir.';
  } else {
    recommendation = 'Yüksek volatilite. Spot alım riskli, alternatif ürünler değerlendirin.';
  }

  const level = score < 35 ? 'low' : score < 65 ? 'medium' : 'high';

  return {
    score,
    level,
    stdDev: Number(stdDev.toFixed(2)),
    coefficientOfVariation: Number(cv.toFixed(3)),
    trend,
    maxSpike: Number(maxSpike.toFixed(2)),
    recommendation
  };
}

// ========================================
// 2. STOCK AVAILABILITY RISK
// ========================================

/**
 * Calculate stock availability risk
 *
 * @param stockHistory - Array of {date, status, market} records
 * @returns StockAvailabilityRisk object
 */
export function calculateStockAvailabilityRisk(
  stockHistory: Array<{ date: string; status: string; market: string }>
): StockAvailabilityRisk {
  if (stockHistory.length === 0) {
    return {
      score: 50, // Orta risk (veri yok)
      level: 'medium',
      availabilityRate: 0,
      avgStockDuration: 0,
      frequentOutages: false,
      affectedMarkets: [],
      recommendation: 'Veri yok. Stok durumunu takip edin.'
    };
  }

  const inStockCount = stockHistory.filter(h =>
    h.status === 'in_stock' || h.status === 'available'
  ).length;

  const availabilityRate = (inStockCount / stockHistory.length) * 100;

  // Frequent outages check (5+ kez tükenen)
  const outages = stockHistory.filter(h => h.status === 'out_of_stock');
  const frequentOutages = outages.length >= 5;

  // Affected markets
  const affectedMarkets = [...new Set(outages.map(h => h.market))];

  // Average stock duration (basit heuristic: in_stock oranına göre)
  const avgStockDuration = availabilityRate > 90 ? 168 : // 7 gün
                            availabilityRate > 70 ? 72 :  // 3 gün
                            availabilityRate > 50 ? 24 :  // 1 gün
                            12; // < 12 saat

  // Risk score
  let score = 0;
  if (availabilityRate >= 90) score = 10;
  else if (availabilityRate >= 70) score = 40;
  else if (availabilityRate >= 50) score = 70;
  else score = 95;

  if (frequentOutages) score = Math.min(score + 15, 100); // Penalty

  // Recommendation
  let recommendation = '';
  if (score < 30) {
    recommendation = 'Stok durumu iyi. Güvenle tedarik edilebilir.';
  } else if (score < 60) {
    recommendation = 'Ara sıra stok problemi yaşanıyor. Yedek tedarikçi bulundurun.';
  } else {
    recommendation = 'Kritik stok riski! Alternatif ürün veya tedarikçi bulun.';
  }

  const level = score < 35 ? 'low' : score < 65 ? 'medium' : 'high';

  return {
    score,
    level,
    availabilityRate: Number(availabilityRate.toFixed(2)),
    avgStockDuration,
    frequentOutages,
    affectedMarkets,
    recommendation
  };
}

// ========================================
// 3. SUPPLIER CONCENTRATION RISK
// ========================================

/**
 * Calculate supplier concentration risk (Herfindahl-Hirschman Index)
 *
 * HHI = Σ (market_share_i)^2
 * - < 1500: Competitive market (low risk)
 * - 1500-2500: Moderate concentration (medium risk)
 * - > 2500: High concentration (high risk)
 *
 * @param quotes - Market quotes
 * @returns SupplierConcentrationRisk object
 */
export function calculateSupplierConcentrationRisk(
  quotes: MarketQuote[]
): SupplierConcentrationRisk {
  if (quotes.length === 0) {
    return {
      score: 50,
      level: 'medium',
      marketShare: 0,
      diversificationIndex: 0,
      recommendation: 'Veri yok'
    };
  }

  // Market share hesapla
  const marketShares = new Map<string, number>();

  for (const quote of quotes) {
    const market = quote.source;
    marketShares.set(market, (marketShares.get(market) || 0) + 1);
  }

  // HHI (Herfindahl-Hirschman Index)
  let hhi = 0;
  const totalQuotes = quotes.length;

  for (const [market, count] of marketShares.entries()) {
    const share = (count / totalQuotes) * 100;
    hhi += Math.pow(share, 2);
  }

  // Dominant supplier
  let dominantSupplier: string | undefined;
  let maxShare = 0;

  for (const [market, count] of marketShares.entries()) {
    const share = (count / totalQuotes) * 100;
    if (share > maxShare) {
      maxShare = share;
      dominantSupplier = market;
    }
  }

  // Risk score
  let score = 0;
  if (hhi < 1500) score = 20;
  else if (hhi < 2500) score = 50;
  else score = 85;

  // Recommendation
  let recommendation = '';
  if (score < 35) {
    recommendation = 'Piyasa dengeli. Tedarik zinciri çeşitlendirilmiş.';
  } else if (score < 65) {
    recommendation = `${dominantSupplier} baskın (%${maxShare.toFixed(0)}). İkinci kaynak oluşturun.`;
  } else {
    recommendation = `Kritik bağımlılık (${dominantSupplier}, %${maxShare.toFixed(0)})! Acil çeşitlendirme gerekli.`;
  }

  const level = score < 35 ? 'low' : score < 65 ? 'medium' : 'high';

  return {
    score,
    level,
    dominantSupplier: maxShare > 40 ? dominantSupplier : undefined,
    marketShare: Number(maxShare.toFixed(2)),
    diversificationIndex: Number((10000 / hhi).toFixed(2)), // Normalized HHI
    recommendation
  };
}

// ========================================
// 4. SEASONALITY RISK
// ========================================

/**
 * Calculate seasonality risk
 *
 * Detects seasonal price patterns and current phase
 *
 * @param priceHistory - Array of {date, price} records
 * @returns SeasonalityRisk object
 */
export function calculateSeasonalityRisk(
  priceHistory: Array<{ date: string; price: number }>
): SeasonalityRisk {
  if (priceHistory.length < 12) {
    // Yeterli veri yok (en az 12 ay gerekli)
    return {
      score: 10,
      level: 'low',
      isSeasonal: false,
      priceVariation: 0,
      currentPhase: 'off-peak',
      recommendation: 'Yeterli veri yok. Mevsimsellik tespit edilemedi.'
    };
  }

  // Group by month
  const monthlyPrices = new Map<number, number[]>();

  for (const record of priceHistory) {
    const month = new Date(record.date).getMonth();
    if (!monthlyPrices.has(month)) {
      monthlyPrices.set(month, []);
    }
    monthlyPrices.get(month)!.push(record.price);
  }

  // Calculate monthly averages
  const monthlyAvgs = Array.from(monthlyPrices.entries()).map(([month, prices]) => ({
    month,
    avgPrice: prices.reduce((s, p) => s + p, 0) / prices.length
  }));

  // Overall average
  const overallAvg = monthlyAvgs.reduce((s, m) => s + m.avgPrice, 0) / monthlyAvgs.length;

  // Variance check
  const variance = monthlyAvgs.reduce((s, m) =>
    s + Math.pow(m.avgPrice - overallAvg, 2), 0
  ) / monthlyAvgs.length;
  const cv = Math.sqrt(variance) / overallAvg;

  // Seasonality detection
  const isSeasonal = cv > 0.15; // %15+ variation = seasonal

  // Peak months (top 3 most expensive months)
  const peakMonths = monthlyAvgs
    .sort((a, b) => b.avgPrice - a.avgPrice)
    .slice(0, 3)
    .map(m => MONTH_NAMES[m.month]);

  // Current phase
  const currentMonth = new Date().getMonth();
  const currentAvg = monthlyPrices.get(currentMonth)?.[0] || overallAvg;
  const isPeak = currentAvg > overallAvg * 1.1;

  // Risk score
  let score = 0;
  if (!isSeasonal) score = 10;
  else if (cv < 0.25) score = 40;
  else score = 75;

  // Recommendation
  let recommendation = '';
  if (!isSeasonal) {
    recommendation = 'Mevsimsel etki yok. Yıl boyunca stabil fiyat.';
  } else if (isPeak) {
    recommendation = `Şu an zirve dönem (${MONTH_NAMES[currentMonth]}). Mümkünse alımı erteleyin.`;
  } else {
    recommendation = `Mevsimsel ürün. Zirve aylar: ${peakMonths.join(', ')}. O dönemlerde stok yapın.`;
  }

  const level = score < 35 ? 'low' : score < 65 ? 'medium' : 'high';

  return {
    score,
    level,
    isSeasonal,
    peakMonths: isSeasonal ? peakMonths : undefined,
    priceVariation: Number((cv * 100).toFixed(2)),
    currentPhase: isPeak ? 'peak' : 'off-peak',
    recommendation
  };
}

// ========================================
// 5. DATA QUALITY RISK
// ========================================

/**
 * Calculate data quality risk
 *
 * Evaluates: completeness, freshness, consistency, source reliability
 *
 * @param quotes - Market quotes V2
 * @returns DataQualityRisk object
 */
export function calculateDataQualityRisk(
  quotes: (MarketQuote | MarketQuoteV2)[]
): DataQualityRisk {
  if (quotes.length === 0) {
    return {
      score: 100, // Maksimum risk (veri yok)
      level: 'high',
      completeness: 0,
      freshness: 0,
      consistency: 0,
      sourceReliability: 0,
      recommendation: 'Veri yok!'
    };
  }

  // 1. Completeness
  let totalCompleteness = 0;
  for (const quote of quotes) {
    if ('dataCompleteness' in quote) {
      totalCompleteness += (quote as MarketQuoteV2).dataCompleteness.completenessScore * 100;
    } else {
      // V1 quote - manual check
      let score = 0;
      if (quote.unit_price) score += 40;
      if (quote.brand) score += 20;
      if (quote.stock_status) score += 20;
      if (quote.meta?.image) score += 20;
      totalCompleteness += score;
    }
  }
  const completeness = totalCompleteness / quotes.length;

  // 2. Freshness
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentQuotes = quotes.filter(q => {
    const quoteDate = new Date(q.asOf);
    return quoteDate >= thirtyDaysAgo;
  });
  const freshness = (recentQuotes.length / quotes.length) * 100;

  // 3. Consistency (price variance)
  const prices = quotes.map(q => q.unit_price);
  const mean = prices.reduce((s, p) => s + p, 0) / prices.length;
  const variance = prices.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / prices.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;

  const consistency = cv < 0.15 ? 100 :
                       cv < 0.30 ? 75 :
                       cv < 0.50 ? 50 : 25;

  // 4. Source reliability
  const sourceReliability = quotes.reduce((sum, q) =>
    sum + (BASE_SOURCE_WEIGHTS[q.source] || 0.1), 0
  ) / quotes.length * 100;

  // Overall quality (average of 4 metrics)
  const avgQuality = (completeness + freshness + consistency + sourceReliability) / 4;

  // Risk score (invert: düşük kalite = yüksek risk)
  const score = 100 - avgQuality;

  // Recommendation
  let recommendation = '';
  if (score < 30) {
    recommendation = 'Veri kalitesi mükemmel. Güvenle kullanılabilir.';
  } else if (score < 60) {
    recommendation = 'Veri kalitesi orta. Ek doğrulama yapın.';
  } else {
    recommendation = 'Düşük veri kalitesi! Alternatif kaynaklardan doğrulayın.';
  }

  const level = score < 35 ? 'low' : score < 65 ? 'medium' : 'high';

  return {
    score,
    level,
    completeness: Number(completeness.toFixed(2)),
    freshness: Number(freshness.toFixed(2)),
    consistency: Number(consistency.toFixed(2)),
    sourceReliability: Number(sourceReliability.toFixed(2)),
    recommendation
  };
}

// ========================================
// OVERALL RISK ANALYSIS
// ========================================

/**
 * Analyze overall product risk (combines all 5 categories)
 *
 * @param quotes - Market quotes
 * @param priceHistory - Price history data
 * @param stockHistory - Stock history data
 * @returns ProductRiskAnalysis object
 */
export function analyzeProductRisk(
  quotes: (MarketQuote | MarketQuoteV2)[],
  priceHistory: Array<{ date: string; price: number }>,
  stockHistory: Array<{ date: string; status: string; market: string }>
): ProductRiskAnalysis {
  AILogger.info('[Risk Analysis] Starting comprehensive analysis', {
    quotesCount: quotes.length,
    priceHistoryCount: priceHistory.length,
    stockHistoryCount: stockHistory.length
  });

  // Calculate individual risks
  const priceVolatility = calculatePriceVolatilityRisk(priceHistory);
  const stockAvailability = calculateStockAvailabilityRisk(stockHistory);
  const supplierConcentration = calculateSupplierConcentrationRisk(quotes);
  const seasonality = calculateSeasonalityRisk(priceHistory);
  const dataQuality = calculateDataQualityRisk(quotes);

  // Weighted overall risk
  const overallRiskScore = Number((
    priceVolatility.score * RISK_WEIGHTS.priceVolatility +
    stockAvailability.score * RISK_WEIGHTS.stockAvailability +
    supplierConcentration.score * RISK_WEIGHTS.supplierConcentration +
    seasonality.score * RISK_WEIGHTS.seasonality +
    dataQuality.score * RISK_WEIGHTS.dataQuality
  ).toFixed(2));

  const riskLevel = overallRiskScore < 35 ? 'low' :
                     overallRiskScore < 60 ? 'medium' :
                     overallRiskScore < 80 ? 'high' : 'critical';

  // Generate alerts
  const alerts: RiskAlert[] = [];

  if (priceVolatility.level === 'high') {
    alerts.push({
      severity: 'warning',
      category: 'Fiyat Oynaklığı',
      message: `Yüksek fiyat oynaklığı tespit edildi (CV: ${priceVolatility.coefficientOfVariation})`,
      actionable: true,
      suggestedAction: priceVolatility.recommendation
    });
  }

  if (stockAvailability.level === 'high') {
    alerts.push({
      severity: 'critical',
      category: 'Stok Riski',
      message: `Stok bulunabilirliği düşük (%${stockAvailability.availabilityRate})`,
      actionable: true,
      suggestedAction: stockAvailability.recommendation
    });
  }

  if (supplierConcentration.level === 'high' && supplierConcentration.dominantSupplier) {
    alerts.push({
      severity: 'warning',
      category: 'Tedarikçi Riski',
      message: `Tek tedarikçiye yüksek bağımlılık (${supplierConcentration.dominantSupplier}, %${supplierConcentration.marketShare})`,
      actionable: true,
      suggestedAction: supplierConcentration.recommendation
    });
  }

  if (dataQuality.level === 'high') {
    alerts.push({
      severity: 'info',
      category: 'Veri Kalitesi',
      message: 'Veri kalitesi düşük. Sonuçlar güvenilir olmayabilir.',
      actionable: true,
      suggestedAction: dataQuality.recommendation
    });
  }

  // Mitigation strategies
  const mitigationStrategies: string[] = [];

  if (overallRiskScore >= 60) {
    mitigationStrategies.push('Alternatif ürün veya tedarikçi araştırın');
    mitigationStrategies.push('Stok politikasını gözden geçirin');
    mitigationStrategies.push('Spot alım yerine sözleşme yapmayı değerlendirin');
  }

  if (seasonality.isSeasonal && seasonality.currentPhase === 'peak') {
    mitigationStrategies.push(`Zirve dönem dışında (${seasonality.peakMonths?.join(', ')}) stok yapın`);
  }

  if (supplierConcentration.level === 'high') {
    mitigationStrategies.push('Tedarik zincirini çeşitlendirin (en az 2-3 kaynak)');
  }

  if (priceVolatility.level === 'high') {
    mitigationStrategies.push('Fiyat garantisi veya sabit fiyatlı sözleşme talep edin');
  }

  const result: ProductRiskAnalysis = {
    overallRiskScore,
    riskLevel,
    risks: {
      priceVolatility,
      stockAvailability,
      supplierConcentration,
      seasonality,
      dataQuality
    },
    alerts,
    mitigationStrategies,
    lastUpdated: new Date().toISOString()
  };

  AILogger.success('[Risk Analysis] Analysis completed', {
    overallRiskScore,
    riskLevel,
    alertsCount: alerts.length,
    strategiesCount: mitigationStrategies.length
  });

  return result;
}

/**
 * Debug: Print risk analysis
 */
export function debugRiskAnalysis(analysis: ProductRiskAnalysis): string {
  const { overallRiskScore, riskLevel, risks, alerts, mitigationStrategies } = analysis;

  const emoji = riskLevel === 'low' ? '🟢' :
                riskLevel === 'medium' ? '🟡' :
                riskLevel === 'high' ? '🟠' : '🔴';

  return [
    `${emoji} Overall Risk: ${overallRiskScore}/100 (${riskLevel.toUpperCase()})`,
    ``,
    `Risk Breakdown:`,
    `  💸 Price Volatility:     ${risks.priceVolatility.score}/100 (${risks.priceVolatility.level})`,
    `  📦 Stock Availability:   ${risks.stockAvailability.score}/100 (${risks.stockAvailability.level})`,
    `  🏢 Supplier Concentration: ${risks.supplierConcentration.score}/100 (${risks.supplierConcentration.level})`,
    `  🌱 Seasonality:          ${risks.seasonality.score}/100 (${risks.seasonality.level})`,
    `  📊 Data Quality:         ${risks.dataQuality.score}/100 (${risks.dataQuality.level})`,
    ``,
    alerts.length > 0 ? `⚠️  Alerts (${alerts.length}):` : '',
    ...alerts.map(a => `  ${a.severity === 'critical' ? '🔴' : a.severity === 'warning' ? '🟡' : 'ℹ️'} ${a.category}: ${a.message}`),
    ``,
    mitigationStrategies.length > 0 ? `✅ Mitigation Strategies (${mitigationStrategies.length}):` : '',
    ...mitigationStrategies.map((s, i) => `  ${i + 1}. ${s}`)
  ].filter(Boolean).join('\n');
}

// ========================================
// EXPORTS (already exported above individually)
// ========================================
