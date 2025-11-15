import { MarketQuote, Source } from '../schema';
import { chromium } from 'playwright';
import { getDatabase } from '@/lib/db/universal-client';
import { MarketWebRealRequestSchema } from '@/lib/validation/market-web-real';

/**
 * Gerçek web scraping provider
 * Migros, A101, Şok marketlerinden fiyat çeker
 */

interface ScrapingConfig {
  name: string;
  baseUrl: string;
  searchUrl: (query: string) => string;
  selectors: {
    productCard: string;
    productName: string;
    price: string;
    unit?: string;
    brand?: string;
    stock?: string;
  };
  priceParser: (priceText: string) => number;
}

// Market konfigürasyonları
const MARKET_CONFIGS: Record<string, ScrapingConfig> = {
  migros: {
    name: 'Migros',
    baseUrl: 'https://www.migros.com.tr',
    searchUrl: (query) => `https://www.migros.com.tr/arama?q=${encodeURIComponent(query)}`,
    selectors: {
      productCard: '[data-testid="product-card"]',
      productName: '[data-testid="product-name"]',
      price: '[data-testid="price-new"]',
      unit: '[data-testid="product-unit"]',
      brand: '[data-testid="product-brand"]',
      stock: '[data-testid="stock-status"]'
    },
    priceParser: (priceText: string) => {
      // "89,90 TL" -> 89.90
      const cleanPrice = priceText.replace(/[^\d,]/g, '').replace(',', '.');
      return parseFloat(cleanPrice);
    }
  },
  a101: {
    name: 'A101',
    baseUrl: 'https://www.a101.com.tr',
    searchUrl: (query) => `https://www.a101.com.tr/list/?search_text=${encodeURIComponent(query)}`,
    selectors: {
      productCard: '.product-item',
      productName: '.product-name',
      price: '.current-price',
      unit: '.product-unit',
      brand: '.product-brand'
    },
    priceParser: (priceText: string) => {
      const cleanPrice = priceText.replace(/[^\d,]/g, '').replace(',', '.');
      return parseFloat(cleanPrice);
    }
  },
  sok: {
    name: 'ŞOK',
    baseUrl: 'https://www.sokmarket.com.tr',
    searchUrl: (query) => `https://www.sokmarket.com.tr/arama/${encodeURIComponent(query)}`,
    selectors: {
      productCard: '.product-box',
      productName: '.product-box__title',
      price: '.product-box__price-new',
      unit: '.product-box__unit'
    },
    priceParser: (priceText: string) => {
      const cleanPrice = priceText.replace(/[^\d,]/g, '').replace(',', '.');
      return parseFloat(cleanPrice);
    }
  }
};

// Rate limiting
const rateLimiters = new Map<string, { lastRequest: number; requestCount: number }>();

async function checkRateLimit(marketKey: string): Promise<boolean> {
  const limiter = rateLimiters.get(marketKey) || { lastRequest: 0, requestCount: 0 };
  const now = Date.now();
  const timeSinceLastRequest = now - limiter.lastRequest;

  // Reset counter if more than 1 minute passed
  if (timeSinceLastRequest > 60000) {
    limiter.requestCount = 0;
  }

  // Check rate limit (10 requests per minute)
  if (limiter.requestCount >= 10) {
    console.warn(`[Web Scraper] Rate limit reached for ${marketKey}`);
    return false;
  }

  limiter.lastRequest = now;
  limiter.requestCount++;
  rateLimiters.set(marketKey, limiter);
  return true;
}

/**
 * Tek bir marketten fiyat çek
 */
async function scrapeMarket(
  marketKey: string,
  productName: string,
  config: ScrapingConfig
): Promise<MarketQuote | null> {
  // Rate limit kontrolü
  if (!(await checkRateLimit(marketKey))) {
    return null;
  }

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      locale: 'tr-TR'
    });

    const page = await context.newPage();

    // Sayfa yüklenene kadar bekle
    await page.goto(config.searchUrl(productName), { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Ürün kartlarını bekle
    await page.waitForSelector(config.selectors.productCard, { 
      timeout: 10000,
      state: 'visible' 
    });

    // İlk ürünü al (en alakalı)
    const product = await page.evaluate((selectors) => {
      const card = document.querySelector(selectors.productCard);
      if (!card) return null;

      const getName = () => {
        const el = card.querySelector(selectors.productName);
        return el?.textContent?.trim() || '';
      };

      const getPrice = () => {
        const el = card.querySelector(selectors.price);
        return el?.textContent?.trim() || '';
      };

      const getUnit = () => {
        const el = selectors.unit ? card.querySelector(selectors.unit) : null;
        return el?.textContent?.trim() || 'adet';
      };

      const getBrand = () => {
        const el = selectors.brand ? card.querySelector(selectors.brand) : null;
        return el?.textContent?.trim() || '';
      };

      const getStock = () => {
        const el = selectors.stock ? card.querySelector(selectors.stock) : null;
        const stockText = el?.textContent?.trim() || '';
        
        if (stockText.includes('tükendi') || stockText.includes('stok yok')) {
          return 'out_of_stock';
        } else if (stockText.includes('az kaldı')) {
          return 'limited';
        }
        return 'in_stock';
      };

      return {
        name: getName(),
        price: getPrice(),
        unit: getUnit(),
        brand: getBrand(),
        stock: getStock()
      };
    }, config.selectors);

    if (!product || !product.price) {
      console.warn(`[Web Scraper] No price found for ${productName} at ${marketKey}`);
      return null;
    }

    const unitPrice = config.priceParser(product.price);
    if (isNaN(unitPrice) || unitPrice <= 0) {
      console.warn(`[Web Scraper] Invalid price parsed: ${product.price}`);
      return null;
    }

    // Kaynak güvenilirlik güncelle
    await updateSourceReliability(marketKey, true);

    const quote: MarketQuote = {
      product_key: productName.toLowerCase().replace(/\s+/g, '-'),
      raw_query: productName,
      unit: extractUnit(product.unit),
      unit_price: unitPrice,
      currency: 'TRY',
      market_key: marketKey as Source,  // Market identifier
      stock_status: product.price ? 'in_stock' : 'out_of_stock',
      brand: product.brand || undefined,
      asOf: new Date().toISOString(),
      source: 'scraper' as Source,
      sourceTrust: 0.7,
      meta: {
        market_name: config.name,
        product_name: product.name,
        scraped_at: new Date().toISOString()
      }
    };
    
    return quote;
  } catch (error) {
    console.error(`[Web Scraper] Error scraping ${marketKey}:`, error);
    await updateSourceReliability(marketKey, false);
    return null;
  } finally {
    await browser.close();
  }
}

/**
 * Birim çıkarma yardımcı fonksiyonu
 */
function extractUnit(unitText: string): string {
  const text = unitText.toLowerCase();
  
  if (text.includes('kg') || text.includes('kilogram')) return 'kg';
  if (text.includes('gr') || text.includes('gram')) return 'gr';
  if (text.includes('lt') || text.includes('litre')) return 'lt';
  if (text.includes('ml') || text.includes('mililitre')) return 'ml';
  if (text.includes('adet')) return 'adet';
  
  return 'adet'; // default
}

/**
 * Kaynak güvenilirliğini güncelle
 */
async function updateSourceReliability(marketKey: string, success: boolean) {
  try {
    const db = await getDatabase();
    
    if (success) {
      db.prepare(`
        UPDATE market_sources 
        SET success_count = success_count + 1,
            last_scraped = datetime('now'),
            trust_score = MIN(1.0, trust_score + 0.01)
        WHERE source_key = ?
      `).run(marketKey);
    } else {
      db.prepare(`
        UPDATE market_sources 
        SET error_count = error_count + 1,
            trust_score = MAX(0.1, trust_score - 0.05)
        WHERE source_key = ?
      `).run(marketKey);
    }
  } catch (error) {
    console.error('[Web Scraper] Failed to update source reliability:', error);
  }
}

/**
 * Ana export: Tüm marketlerden paralel fiyat çekme
 */
export async function webQuoteRealData(productName: string): Promise<MarketQuote[]> {
  const { product } = MarketWebRealRequestSchema.parse({ product: productName });
  const normalizedProduct = product.trim();
  const results: MarketQuote[] = [];

  // Paralel olarak tüm marketlerden veri çek
  const promises = Object.entries(MARKET_CONFIGS).map(async ([marketKey, config]) => {
    try {
      const quote = await scrapeMarket(marketKey, normalizedProduct, config);
      if (quote) {
        results.push(quote);
      }
    } catch (error) {
      console.error(`[Web Scraper] Failed to scrape ${marketKey}:`, error);
    }
  });

  await Promise.all(promises);

  // Sonuçları veritabanına kaydet
  if (results.length > 0) {
    await saveToDatabase(results);
  }

  return results;
}

/**
 * Veritabanına kaydet
 */
async function saveToDatabase(quotes: MarketQuote[]) {
  try {
    const db = await getDatabase();
    const insertStmt = db.prepare(`
      INSERT INTO market_prices (
        product_key, unit, unit_price, currency, source, market_key, 
        brand, stock_status, source_trust, created_at, meta
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
    `);

    for (const quote of quotes) {
      insertStmt.run(
        quote.product_key,
        quote.unit,
        quote.unit_price,
        quote.currency,
        quote.source,
        quote.market_key || null,
        quote.brand || null,
        quote.stock_status || 'in_stock',
        quote.sourceTrust || 0.5,
        JSON.stringify(quote.meta || {})
      );
    }

    console.log(`[Web Scraper] Saved ${quotes.length} prices to database`);
  } catch (error) {
    console.error('[Web Scraper] Failed to save to database:', error);
  }
}

/**
 * Market sağlık kontrolü
 */
export async function marketHealthCheck(marketKey: string): Promise<boolean> {
  const config = MARKET_CONFIGS[marketKey];
  if (!config) return false;

  try {
    const response = await fetch(config.baseUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PriceBot/1.0)'
      },
      signal: AbortSignal.timeout(5000)
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * robots.txt kontrolü
 */
export async function checkRobotsTxt(marketKey: string): Promise<boolean> {
  const config = MARKET_CONFIGS[marketKey];
  if (!config) return false;

  try {
    const robotsUrl = `${config.baseUrl}/robots.txt`;
    const response = await fetch(robotsUrl);
    
    if (!response.ok) return true; // robots.txt yoksa izinli sayılır

    const text = await response.text();
    const lines = text.split('\n');
    
    let isAllowed = true;
    let inOurSection = false;

    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      
      if (trimmed.startsWith('user-agent:')) {
        inOurSection = trimmed.includes('*') || trimmed.includes('bot');
      } else if (inOurSection && trimmed.startsWith('disallow:')) {
        const path = trimmed.replace('disallow:', '').trim();
        if (path === '/' || path === '/*') {
          isAllowed = false;
          break;
        }
      }
    }

    return isAllowed;
  } catch (error) {
    return true; // Hata durumunda izinli sayılır
  }
}

/**
 * Mock web provider'ı override et
 */
export async function webQuote(product_key: string): Promise<MarketQuote | null> {
  // Gerçek scraping kullan
  const quotes = await webQuoteRealData(product_key.replace(/-/g, ' '));
  
  if (quotes.length === 0) {
    return null;
  }

  // En güvenilir kaynağı döndür
  return quotes.sort((a, b) => (b.sourceTrust || 0) - (a.sourceTrust || 0))[0];
}
