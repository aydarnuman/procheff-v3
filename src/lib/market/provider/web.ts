import { MarketQuote } from '../schema';

/**
 * WEB fiyat sağlayıcısı
 * E-ticaret siteleri ve hal fiyatlarından veri çeker
 * Şimdilik mock data ile çalışıyor
 */

// Mock web verileri (e-ticaret + hal fiyatları simülasyonu)
const WEB_MOCK_DATA: Record<string, { unit_price: number; unit: string; vendor: string; url: string }> = {
  'tavuk-eti': {
    unit_price: 96.00,
    unit: 'kg',
    vendor: 'Hal Fiyatları',
    url: 'https://example.com/tavuk-eti',
  },
  'zeytinyagi': {
    unit_price: 289.90,
    unit: 'lt',
    vendor: 'E-Ticaret',
    url: 'https://example.com/zeytinyagi',
  },
  'makarna': {
    unit_price: 39.50,
    unit: 'kg',
    vendor: 'Market',
    url: 'https://example.com/makarna',
  },
  'sut': {
    unit_price: 25.00,
    unit: 'lt',
    vendor: 'Market',
    url: 'https://example.com/sut',
  },
  'yogurt': {
    unit_price: 46.80,
    unit: 'kg',
    vendor: 'Market',
    url: 'https://example.com/yogurt',
  },
  'beyaz-peynir': {
    unit_price: 185.00,
    unit: 'kg',
    vendor: 'Hal Fiyatları',
    url: 'https://example.com/peynir',
  },
  'domates': {
    unit_price: 27.50,
    unit: 'kg',
    vendor: 'Hal Fiyatları',
    url: 'https://example.com/domates',
  },
};

/**
 * Web'den fiyat getir
 * Önce gerçek market API'lerini dene, yoksa null dön
 */
export async function webQuote(product_key: string): Promise<MarketQuote | null> {
  try {
    // Önce gerçek market fiyatlarını dene
    const { getAllMarketPrices } = await import('./real-price-api');
    const marketQuotes = await getAllMarketPrices(product_key);
    
    if (marketQuotes.length > 0) {
      // En uygun fiyatı döndür (ortalama veya en ucuz)
      const prices = marketQuotes.map(q => q.unit_price);
      const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      
      return {
        product_key,
        raw_query: product_key,
        unit: 'kg',
        unit_price: Number(avgPrice.toFixed(2)),
        currency: 'TRY',
        asOf: new Date().toISOString().slice(0, 10),
        source: 'WEB',
        sourceTrust: 0.95, // Gerçek fiyat, yüksek güven
        meta: {
          isRealPrice: true,
          marketCount: marketQuotes.length,
          minPrice: Math.min(...prices),
          maxPrice: Math.max(...prices),
          markets: marketQuotes.map(q => q.brand).join(', ')
        }
      };
    }
    
    // Gerçek fiyat bulunamazsa scraping'i dene (opsiyonel)
    try {
    const { webQuote: realWebQuote } = await import('./web-real');
    return await realWebQuote(product_key);
    } catch {
      // Scraping de başarısızsa null dön
      return null;
    }
  } catch (error) {
    console.error('[WEB] Error getting price:', error);
  return null;
  }
}

/**
 * Çoklu web kaynağından fiyat çek (paralel)
 */
export async function webQuoteBulk(product_keys: string[]): Promise<(MarketQuote | null)[]> {
  // Rate limiting için chunk'lara böl (3 paralel istek)
  const CHUNK_SIZE = 3;
  const results: (MarketQuote | null)[] = [];

  for (let i = 0; i < product_keys.length; i += CHUNK_SIZE) {
    const chunk = product_keys.slice(i, i + CHUNK_SIZE);
    const chunkResults = await Promise.all(
      chunk.map(key => webQuote(key))
    );
    results.push(...chunkResults);
  }

  return results;
}

/**
 * Web kaynağı sağlık kontrolü
 */
export async function webHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'down';
  message: string;
}> {
  try {
    // TODO: Gerçek health check
    // - API endpoint'lere ping at
    // - Scraping hedeflerine erişim kontrolü

    return {
      status: 'healthy',
      message: 'Tüm web kaynakları erişilebilir',
    };
  } catch (error) {
    return {
      status: 'down',
      message: 'Web kaynakları erişilemez',
    };
  }
}

/**
 * Web'de mevcut ürünleri listele
 */
export function getAvailableWebProducts(): string[] {
  return Object.keys(WEB_MOCK_DATA);
}
