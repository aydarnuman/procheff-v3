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
 */
export async function webQuote(product_key: string): Promise<MarketQuote | null> {
  try {
    // TODO: Gerçek web scraping veya API entegrasyonu
    // - Playwright/Puppeteer ile scraping
    // - Hal fiyatları API
    // - E-ticaret sitesi API'leri

    // Mock data
    const mockData = WEB_MOCK_DATA[product_key];

    if (!mockData) {
      return null;
    }

    // Rastgele varyasyon ekle (±5%) - gerçekçi simülasyon için
    const variance = (Math.random() - 0.5) * 0.1; // -5% ile +5% arası
    const adjustedPrice = mockData.unit_price * (1 + variance);

    return {
      product_key,
      raw_query: product_key,
      unit: mockData.unit,
      unit_price: Number(adjustedPrice.toFixed(2)),
      currency: 'TRY',
      asOf: new Date().toISOString().slice(0, 10),
      source: 'WEB',
      meta: {
        vendor: mockData.vendor,
        url: mockData.url,
        reliability: 'medium',
      },
    };
  } catch (error) {
    console.error('[WEB Provider] Hata:', error);
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
