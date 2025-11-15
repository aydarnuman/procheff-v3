/**
 * Price Volatility Tracking
 * Fiyat değişkenliği ve trend analizi
 */

import type { PriceVolatility } from './schema';
import { analyzeTrend } from './forecast';

export interface PricePoint {
  date: string;
  price: number;
}

export interface PriceChange {
  amount: number;              // Mutlak değişim (TL)
  percentage: number;          // Yüzde değişim
  direction: 'up' | 'down' | 'stable';
  period: string;              // '1d', '7d', '30d', vb.
}

export interface VolatilityMetrics {
  standardDeviation: number;   // Standart sapma
  coefficientOfVariation: number; // Varyasyon katsayısı (CV)
  volatilityScore: number;     // 0-1 arası volatilite skoru
  trend: 'rising' | 'falling' | 'stable';
  avgDailyChange: number;      // Ortalama günlük değişim (%)
  maxSpike: number;            // En büyük sıçrama (%)
  recommendation: string;      // Alım önerisi
}

/**
 * Fiyat volatilitesini analiz et
 */
export function analyzeVolatility(
  history: PricePoint[]
): PriceVolatility {
  if (history.length < 2) {
    return {
      score: 0,
      trend: 'stable',
      avgDailyChange: 0,
      maxSpike: 0,
      recommendation: 'Yetersiz veri'
    };
  }
  
  const prices = history.map(h => h.price);
  const metrics = calculateVolatilityMetrics(prices);
  
  // Trend analizi
  const trend = analyzeTrend(prices) || 'stable';
  
  // Öneri oluştur
  const recommendation = generateRecommendation(metrics, trend);
  
  return {
    score: metrics.volatilityScore,
    trend,
    avgDailyChange: Number((metrics.avgDailyChange * 100).toFixed(2)),
    maxSpike: Number((metrics.maxSpike * 100).toFixed(2)),
    recommendation
  };
}

/**
 * Volatilite metriklerini hesapla
 */
function calculateVolatilityMetrics(prices: number[]): VolatilityMetrics {
  // Ortalama
  const mean = prices.reduce((s, p) => s + p, 0) / prices.length;
  
  // Standart sapma
  const variance = prices.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  
  // Varyasyon katsayısı (CV)
  const cv = mean > 0 ? stdDev / mean : 0;
  
  // Volatilite skoru (0-1, yüksek CV = yüksek volatilite)
  const volatilityScore = Math.min(cv / 0.5, 1); // 0.5 CV'de maksimum
  
  // Günlük değişimler
  const dailyChanges = [];
  for (let i = 1; i < prices.length; i++) {
    const change = (prices[i] - prices[i - 1]) / prices[i - 1];
    dailyChanges.push(change);
  }
  
  const avgDailyChange = dailyChanges.length > 0
    ? dailyChanges.reduce((s, c) => s + Math.abs(c), 0) / dailyChanges.length
    : 0;
  
  // En büyük sıçrama
  const maxSpike = dailyChanges.length > 0
    ? Math.max(...dailyChanges.map(c => Math.abs(c)))
    : 0;
  
  // Trend
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const totalChange = (lastPrice - firstPrice) / firstPrice;
  
  let trend: 'rising' | 'falling' | 'stable' = 'stable';
  if (totalChange > 0.05) trend = 'rising';
  else if (totalChange < -0.05) trend = 'falling';
  
  const recommendation = generateRecommendation({
    standardDeviation: stdDev,
    coefficientOfVariation: cv,
    volatilityScore,
    trend,
    avgDailyChange,
    maxSpike,
    recommendation: ''
  }, trend);
  
  return {
    standardDeviation: Number(stdDev.toFixed(2)),
    coefficientOfVariation: Number(cv.toFixed(3)),
    volatilityScore: Number(volatilityScore.toFixed(2)),
    trend,
    avgDailyChange,
    maxSpike,
    recommendation
  };
}

/**
 * Öneri oluştur
 */
function generateRecommendation(
  metrics: VolatilityMetrics,
  trend: 'rising' | 'falling' | 'stable'
): string {
  const { volatilityScore} = metrics;
  
  // Yüksek volatilite
  if (volatilityScore > 0.7) {
    if (trend === 'falling') {
      return '⏳ Bekleyin: Fiyat düşüş trendinde ve çok değişken';
    }
    return '⚠️ Dikkat: Fiyat çok değişken, acil ihtiyaç yoksa bekleyin';
  }
  
  // Orta volatilite
  if (volatilityScore > 0.4) {
    if (trend === 'rising') {
      return '🔼 Dikkatli alın: Fiyat yükseliş trendinde';
    }
    if (trend === 'falling') {
      return '✅ Fırsat: Fiyat düşüş trendinde';
    }
    return '➡️ Normal: Fiyat dengeli';
  }
  
  // Düşük volatilite
  if (trend === 'rising') {
    return '🔼 Şimdi alın: Fiyat stabil yükselişte';
  }
  if (trend === 'falling') {
    return '⏳ Bekleyin: Fiyat stabil düşüşte';
  }
  
  return '✅ İyi fiyat: Stabil piyasa';
}

/**
 * Periyodik fiyat değişimini hesapla
 */
export function calculatePriceChange(
  history: PricePoint[],
  period: '1d' | '7d' | '30d' | '90d' = '7d'
): PriceChange | null {
  if (history.length < 2) return null;
  
  const days = {
    '1d': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90
  }[period];
  
  // Son fiyat
  const latest = history[history.length - 1];
  
  // Period önceki fiyat (yaklaşık)
  const targetIndex = Math.max(0, history.length - 1 - days);
  const previous = history[targetIndex];
  
  if (!previous || !latest) return null;
  
  const amount = latest.price - previous.price;
  const percentage = (amount / previous.price) * 100;
  
  let direction: 'up' | 'down' | 'stable' = 'stable';
  if (percentage > 1) direction = 'up';
  else if (percentage < -1) direction = 'down';
  
  return {
    amount: Number(amount.toFixed(2)),
    percentage: Number(percentage.toFixed(2)),
    direction,
    period
  };
}

/**
 * Çoklu periyot karşılaştırması
 */
export function comparePeriodicChanges(
  history: PricePoint[]
): {
  day: PriceChange | null;
  week: PriceChange | null;
  month: PriceChange | null;
  quarter: PriceChange | null;
} {
  return {
    day: calculatePriceChange(history, '1d'),
    week: calculatePriceChange(history, '7d'),
    month: calculatePriceChange(history, '30d'),
    quarter: calculatePriceChange(history, '90d')
  };
}

/**
 * Volatility badge (UI için)
 */
export function getVolatilityBadge(score: number): {
  color: string;
  label: string;
  emoji: string;
} {
  if (score < 0.3) {
    return { color: 'green', label: 'Stabil', emoji: '🟢' };
  }
  if (score < 0.5) {
    return { color: 'blue', label: 'Normal', emoji: '🔵' };
  }
  if (score < 0.7) {
    return { color: 'yellow', label: 'Değişken', emoji: '🟡' };
  }
  return { color: 'red', label: 'Çok Değişken', emoji: '🔴' };
}

/**
 * Fiyat spike tespiti (anormal sıçramalar)
 */
export function detectPriceSpikes(
  history: PricePoint[],
  threshold = 0.20 // %20 threshold
): Array<{
  date: string;
  oldPrice: number;
  newPrice: number;
  change: number;
  type: 'spike_up' | 'spike_down';
}> {
  const spikes: Array<{
    date: string;
    oldPrice: number;
    newPrice: number;
    change: number;
    type: 'spike_up' | 'spike_down';
  }> = [];

  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1];
    const curr = history[i];
    
    const change = (curr.price - prev.price) / prev.price;
    
    if (Math.abs(change) > threshold) {
      spikes.push({
        date: curr.date,
        oldPrice: prev.price,
        newPrice: curr.price,
        change: Number((change * 100).toFixed(2)),
        type: change > 0 ? 'spike_up' : 'spike_down'
      });
    }
  }
  
  return spikes;
}

/**
 * Moving average (hareketli ortalama)
 */
export function calculateMovingAverage(
  prices: number[],
  window = 7
): number[] {
  const ma = [];
  
  for (let i = 0; i < prices.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = prices.slice(start, i + 1);
    const avg = slice.reduce((s, p) => s + p, 0) / slice.length;
    ma.push(Number(avg.toFixed(2)));
  }
  
  return ma;
}

/**
 * Bollinger Bands (volatilite bandı)
 */
export function calculateBollingerBands(
  prices: number[],
  window = 20,
  stdDevMultiplier = 2
): Array<{
  middle: number;
  upper: number;
  lower: number;
}> {
  const bands = [];
  
  for (let i = 0; i < prices.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = prices.slice(start, i + 1);
    
    const mean = slice.reduce((s, p) => s + p, 0) / slice.length;
    const variance = slice.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / slice.length;
    const stdDev = Math.sqrt(variance);
    
    bands.push({
      middle: Number(mean.toFixed(2)),
      upper: Number((mean + stdDevMultiplier * stdDev).toFixed(2)),
      lower: Number((mean - stdDevMultiplier * stdDev).toFixed(2))
    });
  }
  
  return bands;
}

/**
 * Debug: Volatility raporunu yazdır
 */
export function debugVolatility(
  history: PricePoint[]
): string {
  const volatility = analyzeVolatility(history);
  const badge = getVolatilityBadge(volatility.score);
  const changes = comparePeriodicChanges(history);
  
  const lines = [
    `${badge.emoji} Volatilite: ${badge.label} (${(volatility.score * 100).toFixed(0)}%)`,
    ``,
    `Trend: ${volatility.trend === 'rising' ? '↑ Yükseliş' : volatility.trend === 'falling' ? '↓ Düşüş' : '→ Sabit'}`,
    `Ort. Günlük Değişim: ${volatility.avgDailyChange.toFixed(2)}%`,
    `Maks. Sıçrama: ${volatility.maxSpike.toFixed(2)}%`,
    ``,
    `Periyodik Değişimler:`,
    `  1 Gün: ${changes.day ? changes.day.percentage.toFixed(2) + '% ' + (changes.day.direction === 'up' ? '↑' : changes.day.direction === 'down' ? '↓' : '→') : 'N/A'}`,
    `  7 Gün: ${changes.week ? changes.week.percentage.toFixed(2) + '% ' + (changes.week.direction === 'up' ? '↑' : changes.week.direction === 'down' ? '↓' : '→') : 'N/A'}`,
    `  30 Gün: ${changes.month ? changes.month.percentage.toFixed(2) + '% ' + (changes.month.direction === 'up' ? '↑' : changes.month.direction === 'down' ? '↓' : '→') : 'N/A'}`,
    ``,
    `Öneri: ${volatility.recommendation}`
  ];
  
  return lines.join('\n');
}

/**
 * Volatility özet raporu (çoklu ürün için)
 */
export function generateVolatilityReport(
  products: Array<{ name: string; history: PricePoint[] }>
): {
  totalProducts: number;
  stable: number;
  volatile: number;
  mostVolatile: string | null;
  mostStable: string | null;
} {
  const volatilities = products.map(p => ({
    name: p.name,
    volatility: analyzeVolatility(p.history)
  }));
  
  const sorted = [...volatilities].sort((a, b) => 
    b.volatility.score - a.volatility.score
  );
  
  return {
    totalProducts: products.length,
    stable: volatilities.filter(v => v.volatility.score < 0.4).length,
    volatile: volatilities.filter(v => v.volatility.score >= 0.7).length,
    mostVolatile: sorted[0]?.name || null,
    mostStable: sorted[sorted.length - 1]?.name || null
  };
}

