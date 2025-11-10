import { MarketQuote, MarketFusion, Source } from './schema';

/**
 * Füzyon + Güven Skoru Hesaplama
 * Çoklu kaynaktan gelen fiyatları birleştir ve güven skoru hesapla
 */

// Kaynak ağırlıkları (öncelik sırası)
const SOURCE_WEIGHTS: Record<Source, number> = {
  TUIK: 0.45,   // TÜİK en güvenilir
  DB: 0.35,     // Kendi geçmiş verilerimiz
  WEB: 0.20,    // Web scraping
  AI: 0.10,     // AI tahmini (fallback)
};

/**
 * IQR (Interquartile Range) ile outlier filtresi
 */
function filterOutliers(quotes: MarketQuote[]): MarketQuote[] {
  if (quotes.length < 3) return quotes; // Çok az veri varsa filtre yapma

  const prices = quotes.map(q => q.unit_price).sort((a, b) => a - b);

  const q1Index = Math.floor(prices.length * 0.25);
  const q3Index = Math.floor(prices.length * 0.75);

  const q1 = prices[q1Index];
  const q3 = prices[q3Index];
  const iqr = q3 - q1;

  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return quotes.filter(q =>
    q.unit_price >= lowerBound && q.unit_price <= upperBound
  );
}

/**
 * Ağırlıklı ortalama fiyat hesapla
 */
function calculateWeightedPrice(quotes: MarketQuote[]): number {
  let weightSum = 0;
  let priceSum = 0;

  for (const quote of quotes) {
    const weight = SOURCE_WEIGHTS[quote.source] ?? 0.1;
    weightSum += weight;
    priceSum += weight * quote.unit_price;
  }

  return priceSum / Math.max(weightSum, 1e-6);
}

/**
 * Güven skoru hesapla (0-1 arası)
 * Faktörler:
 * - Kaynak çeşitliliği (diversity)
 * - Fiyat varyansı (düşükse güven yüksek)
 * - Veri tazeliği (recency)
 */
function calculateConfidence(quotes: MarketQuote[], weightedPrice: number): number {
  // 1. Kaynak çeşitliliği
  const uniqueSources = new Set(quotes.map(q => q.source)).size;
  const diversityScore = Math.min(uniqueSources / 3, 1); // Max 3 farklı kaynak

  // 2. Varyans skoru (fiyatlar birbirine yakınsa güven yüksek)
  const variance = quotes.reduce((sum, q) =>
    sum + Math.pow(q.unit_price - weightedPrice, 2), 0
  ) / quotes.length;

  const stdDev = Math.sqrt(variance);
  const varianceScore = 1 / (1 + stdDev / Math.max(weightedPrice, 1));

  // 3. Veri tazeliği (30 gün içindeyse tam puan)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recentQuotes = quotes.filter(q => {
    const quoteDate = new Date(q.asOf);
    return quoteDate >= thirtyDaysAgo;
  });

  const recencyScore = recentQuotes.length / quotes.length;

  // Ağırlıklı toplam
  const confidence = (
    varianceScore * 0.5 +
    diversityScore * 0.3 +
    recencyScore * 0.2
  );

  return Number(confidence.toFixed(2));
}

/**
 * Ana füzyon fonksiyonu
 */
export function fuse(quotes: MarketQuote[]): MarketFusion | null {
  // Boş/null değerleri filtrele
  const validQuotes = quotes.filter(q =>
    q &&
    typeof q.unit_price === 'number' &&
    !isNaN(q.unit_price) &&
    q.unit_price > 0
  );

  if (validQuotes.length === 0) {
    return null;
  }

  // Outlier filtresi
  const filtered = filterOutliers(validQuotes);

  if (filtered.length === 0) {
    return null;
  }

  // Ağırlıklı ortalama hesapla
  const price = calculateWeightedPrice(filtered);

  // İlk geçerli birimi al
  const unit = filtered[0].unit;

  // Güven skoru hesapla
  const conf = calculateConfidence(filtered, price);

  return {
    product_key: filtered[0].product_key,
    unit,
    price: Number(price.toFixed(2)),
    conf,
    sources: filtered,
  };
}

/**
 * Füzyon sonucunu debug et
 */
export function debugFusion(quotes: MarketQuote[]): string {
  const fusion = fuse(quotes);

  if (!fusion) {
    return 'Füzyon başarısız - geçerli veri yok';
  }

  const lines = [
    `Ürün: ${fusion.product_key}`,
    `Birim: ${fusion.unit}`,
    `Füzyon Fiyatı: ${fusion.price.toFixed(2)} TL`,
    `Güven Skoru: ${(fusion.conf * 100).toFixed(0)}%`,
    `\nKaynak Detayları:`,
  ];

  for (const source of fusion.sources) {
    lines.push(
      `  • ${source.source}: ${source.unit_price.toFixed(2)} TL (${source.asOf})`
    );
  }

  return lines.join('\n');
}
