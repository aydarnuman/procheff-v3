import { MarketQuote, MarketFusion, Source, BrandPriceOption } from './schema';
import { calculateMarketPriceConfidence, calculateConfidenceBreakdown } from './confidence';
import { BASE_SOURCE_WEIGHTS, getDynamicWeights } from './trust-score';
import { validatePrice } from './price-guard';
import { AILogger } from '@/lib/ai/logger';

/**
 * Füzyon + Güven Skoru Hesaplama (Geliştirilmiş)
 * Çoklu kaynaktan gelen fiyatları birleştir ve detaylı güven skoru hesapla
 */

// Kaynak ağırlıkları (varsayılan - dinamik olarak güncellenebilir)
let SOURCE_WEIGHTS: Record<Source, number> = { ...BASE_SOURCE_WEIGHTS };

/**
 * IQR (Interquartile Range) ile outlier filtresi
 * @returns {quotes, removedCount} - Filtrelenmiş quotes ve kaldırılan sayısı
 */
function filterOutliers(quotes: MarketQuote[]): { quotes: MarketQuote[], removedCount: number } {
  if (quotes.length < 3) return { quotes, removedCount: 0 }; // Çok az veri varsa filtre yapma

  const originalCount = quotes.length;
  const prices = quotes.map(q => q.unit_price).sort((a, b) => a - b);

  const q1Index = Math.floor(prices.length * 0.25);
  const q3Index = Math.floor(prices.length * 0.75);

  const q1 = prices[q1Index];
  const q3 = prices[q3Index];
  const iqr = q3 - q1;

  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const filtered = quotes.filter(q =>
    q.unit_price >= lowerBound && q.unit_price <= upperBound
  );
  
  return {
    quotes: filtered,
    removedCount: originalCount - filtered.length
  };
}

/**
 * Ağırlıklı ortalama fiyat hesapla (dynamic trust scores ile)
 */
function calculateWeightedPrice(
  quotes: MarketQuote[],
  weights?: Record<Source, number>
): number {
  let weightSum = 0;
  let priceSum = 0;
  
  const activeWeights = weights || SOURCE_WEIGHTS;

  for (const quote of quotes) {
    // Kaynak ağırlığı + sourceTrust'ı birleştir
    let weight = activeWeights[quote.source] ?? 0.1;
    if (quote.sourceTrust !== undefined) {
      weight = (weight + quote.sourceTrust) / 2; // Ortalama
    }
    
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
 * Ana füzyon fonksiyonu (Geliştirilmiş)
 */
export async function fuse(
  quotes: MarketQuote[],
  options?: {
    enableValidation?: boolean;
    enableBrandPrices?: boolean;
    useDynamicTrust?: boolean;
    priceHistory?: number[];
  }
): Promise<MarketFusion | null> {
  const {
    enableValidation = true,
    enableBrandPrices = true,
    useDynamicTrust = false,
    priceHistory
  } = options || {};
  
  // Boş/null değerleri filtrele
  let validQuotes = quotes.filter(q =>
    q &&
    typeof q.unit_price === 'number' &&
    !isNaN(q.unit_price) &&
    q.unit_price > 0
  );

  if (validQuotes.length === 0) {
    return null;
  }
  
  // YENİ: PriceGuard validation
  if (enableValidation) {
    const validated = validQuotes.filter(q => {
      const validation = validatePrice(q, priceHistory);
      if (!validation.isValid) {
        AILogger.warn('[Fuse] Quote rejected by PriceGuard', {
          product: q.product_key,
          price: q.unit_price,
          source: q.source
        });
        return false;
      }
      return true;
    });
    
    if (validated.length === 0) {
      AILogger.warn('[Fuse] All quotes failed validation', {
        product_key: validQuotes[0]?.product_key
      });
      return null;
    }
    
    validQuotes = validated;
  }

  // Outlier filtresi
  const { quotes: filtered, removedCount: outliersRemoved } = filterOutliers(validQuotes);

  if (filtered.length === 0) {
    return null;
  }
  
  // YENİ: Dinamik trust scores kullan
  let weights: Record<Source, number> | undefined;
  if (useDynamicTrust) {
    try {
      weights = await getDynamicWeights();
    } catch (error) {
      AILogger.warn('[Fuse] Dynamic weights alınamadı, static kullanılıyor');
    }
  }

  // Ağırlıklı ortalama hesapla
  const price = calculateWeightedPrice(filtered, weights);

  // İlk geçerli birimi al
  const unit = filtered[0].unit;

  // Güven skoru hesapla (eski method - backward compatible)
  const conf = calculateConfidence(filtered, price);
  
  // YENİ: Detaylı confidence breakdown
  const marketPriceConf = calculateMarketPriceConfidence(filtered);
  const confidenceBreakdown = calculateConfidenceBreakdown(
    { score: 0.8, category: '', alternatives: [], method: 'exact' }, // Placeholder
    { score: 0.7, variant: '', alternatives: [], matchType: 'partial' }, // Placeholder
    marketPriceConf
  );
  
  // YENİ: Brand-based pricing
  let priceByBrand: BrandPriceOption[] | undefined;
  if (enableBrandPrices) {
    priceByBrand = extractBrandPrices(filtered);
    
    // Eğer web kaynağından market fiyatları varsa onları ekle
    const webSource = filtered.find(q => q.source === 'WEB' && q.meta?.isRealPrice);
    if (webSource && webSource.meta?.markets) {
      // Gerçek market fiyatlarını al
      try {
        const { getAllMarketPrices } = await import('./provider/real-price-api');
        const marketPrices = await getAllMarketPrices(filtered[0].product_key);
        
        if (marketPrices.length > 0) {
          priceByBrand = marketPrices.map(q => ({
            brand: q.brand || 'Unknown',
            price: q.unit_price,
            availability: 'in_stock' as const,
            source: 'api' as Source,
            lastUpdated: q.asOf
          })).sort((a, b) => a.price - b.price); // Ucuzdan pahalıya sırala
        }
      } catch (error) {
        console.warn('[Fuse] Could not get market prices:', error);
      }
    }
  }

  // Ek hesaplamalar
  const prices = filtered.map(q => q.unit_price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  
  // Dominant packaging ve tier tespiti
  const packagingTypes = filtered.map(q => 
    typeof q.packaging === 'object' ? q.packaging?.type : undefined
  ).filter(Boolean);
  const dominantPackaging = packagingTypes.length > 0 ? 
    packagingTypes.sort((a,b) => 
      packagingTypes.filter(v => v===a).length - packagingTypes.filter(v => v===b).length
    )[0] : 'retail';
    
  const brandTiers = filtered.map(q => q.brandTier).filter(Boolean);
  const dominantTier = brandTiers.length > 0 ?
    brandTiers.sort((a,b) => 
      brandTiers.filter(v => v===a).length - brandTiers.filter(v => v===b).length  
    )[0] : 'standard';

  return {
    product_key: filtered[0].product_key,
    unit,
    price: Number(price.toFixed(2)),
    conf,
    sources: filtered,
    confidenceBreakdown,
    priceByBrand,
    
    // UI için ekstra alanlar
    timestamp: new Date().toISOString(),
    averagePrice: price,
    minPrice,
    maxPrice,
    priceRange,
    currency: 'TRY',
    
    // Meta bilgiler
    meta: {
      outliers_removed: outliersRemoved,
      packaging: dominantPackaging as any,
      brand_tier: dominantTier as any,
      provider_health: filtered.map(q => q.source),
      cache_hit: false // Cache'ten gelmediyse false
    }
  };
}

/**
 * Backward compatible sync version
 */
export function fuseSync(quotes: MarketQuote[]): MarketFusion | null {
  // Sync wrapper - validation ve dynamic trust olmadan
  const validQuotes = quotes.filter(q =>
    q &&
    typeof q.unit_price === 'number' &&
    !isNaN(q.unit_price) &&
    q.unit_price > 0
  );

  if (validQuotes.length === 0) return null;

  const { quotes: filtered, removedCount: outliersRemoved } = filterOutliers(validQuotes);
  if (filtered.length === 0) return null;

  const price = calculateWeightedPrice(filtered);
  const unit = filtered[0].unit;
  const conf = calculateConfidence(filtered, price);

  // Ek hesaplamalar
  const prices = filtered.map(q => q.unit_price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  return {
    product_key: filtered[0].product_key,
    unit,
    price: Number(price.toFixed(2)),
    conf,
    sources: filtered,
    timestamp: new Date().toISOString(),
    averagePrice: price,
    minPrice,
    maxPrice,
    priceRange,
    currency: 'TRY',
    meta: {
      outliers_removed: outliersRemoved
    }
  };
}

/**
 * YENİ: Brand bazlı fiyatları çıkar
 */
function extractBrandPrices(quotes: MarketQuote[]): BrandPriceOption[] {
  const brandMap = new Map<string, MarketQuote>();
  
  for (const quote of quotes) {
    if (quote.brand) {
      // Aynı marka için en iyi fiyatı tut
      const existing = brandMap.get(quote.brand);
      if (!existing || quote.unit_price < existing.unit_price) {
        brandMap.set(quote.brand, quote);
      }
    }
  }
  
  return Array.from(brandMap.values()).map(quote => ({
    brand: quote.brand!,
    price: quote.unit_price,
    availability: 'in_stock' as const,
    source: quote.source,
    packaging: typeof quote.packaging === 'object' ? quote.packaging : undefined,
    lastUpdated: quote.asOf
  }));
}

/**
 * Füzyon sonucunu debug et
 */
export async function debugFusion(quotes: MarketQuote[]): Promise<string> {
  const fusion = await fuse(quotes);

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
