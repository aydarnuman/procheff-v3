/**
 * Fiyat Tahmini - Exponential Smoothing
 */

/**
 * Basit Exponential Smoothing (α=0.35)
 * Zaman serisindeki trend devam ederse gelecek değeri tahmin et
 *
 * @param history - Geçmiş fiyat dizisi (kronolojik sıralı)
 * @param alpha - Yumuşatma katsayısı (0-1 arası, varsayılan: 0.35)
 * @returns Tahmin edilen fiyat
 */
export function expSmooth(history: number[], alpha = 0.35): number | null {
  if (!history || history.length === 0) {
    return null;
  }

  // Başlangıç değeri ilk gözlem
  let smoothed = history[0];

  // Her gözlem için yumuşatma uygula
  for (let i = 1; i < history.length; i++) {
    smoothed = alpha * history[i] + (1 - alpha) * smoothed;
  }

  return Number(smoothed.toFixed(2));
}

/**
 * Tahmin güven skoru hesapla
 * Veri uzunluğu ve varyans bazlı
 */
export function forecastConfidence(history: number[]): number {
  if (!history || history.length < 3) {
    return 0.3; // Çok az veri varsa düşük güven
  }

  // Veri uzunluğu faktörü
  const lengthScore = Math.min(history.length / 12, 1); // 12 ay için tam puan

  // Varyans faktörü (düşük varyans = yüksek güven)
  const mean = history.reduce((sum, val) => sum + val, 0) / history.length;
  const variance = history.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / history.length;
  const stdDev = Math.sqrt(variance);
  const varianceScore = 1 / (1 + stdDev / Math.max(mean, 1));

  // Trend tutarlılığı (son 3 aydaki değişim)
  let trendScore = 0.5;
  if (history.length >= 3) {
    const recent = history.slice(-3);
    const recentMean = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const recentVariance = recent.reduce((sum, val) =>
      sum + Math.pow(val - recentMean, 2), 0
    ) / recent.length;
    const recentStdDev = Math.sqrt(recentVariance);

    // Yakın geçmişte düşük varyans = yüksek tahmin güveni
    trendScore = 1 / (1 + recentStdDev / Math.max(recentMean, 1));
  }

  // Ağırlıklı toplam
  const confidence = (
    lengthScore * 0.4 +
    varianceScore * 0.4 +
    trendScore * 0.2
  );

  return Number(confidence.toFixed(2));
}

/**
 * Gelecek ay fiyat tahmini yap (forecast objesi döner)
 */
export function forecastNextMonth(history: number[]): {
  nextMonth: number;
  conf: number;
  method: 'exp_smoothing';
} | null {
  const predicted = expSmooth(history);

  if (predicted === null) {
    return null;
  }

  const conf = forecastConfidence(history);

  return {
    nextMonth: predicted,
    conf,
    method: 'exp_smoothing',
  };
}

/**
 * Trend yönünü belirle (yükseliş/düşüş/sabit)
 */
export function analyzeTrend(history: number[]): 'rising' | 'falling' | 'stable' | null {
  if (!history || history.length < 2) {
    return null;
  }

  // Son 3 aydaki ortalama değişimi hesapla
  const recent = history.slice(-Math.min(3, history.length));
  const firstVal = recent[0];
  const lastVal = recent[recent.length - 1];

  const changePercent = ((lastVal - firstVal) / firstVal) * 100;

  if (changePercent > 5) return 'rising';
  if (changePercent < -5) return 'falling';
  return 'stable';
}

/**
 * Trend debug bilgisi
 */
export function debugForecast(history: number[]): string {
  const forecast = forecastNextMonth(history);
  const trend = analyzeTrend(history);

  if (!forecast) {
    return 'Tahmin yapılamıyor - yetersiz veri';
  }

  const lines = [
    `Geçmiş Veri Sayısı: ${history.length} ay`,
    `Son 3 Ay: ${history.slice(-3).map(v => v.toFixed(2)).join(' → ')} TL`,
    `Tahmin (Gelecek Ay): ${forecast.nextMonth.toFixed(2)} TL`,
    `Güven Skoru: ${(forecast.conf * 100).toFixed(0)}%`,
    `Trend: ${trend === 'rising' ? '↑ Yükseliş' : trend === 'falling' ? '↓ Düşüş' : '→ Sabit'}`,
  ];

  return lines.join('\n');
}
