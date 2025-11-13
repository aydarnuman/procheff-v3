/**
 * Web Scraping with Playwright
 * Hal fiyatları ve e-ticaret sitelerinden fiyat çekme
 */

import { MarketQuote } from '../schema';
import { AILogger } from '@/lib/ai/logger';

/**
 * Scraping Configuration
 */
const SCRAPER_CONFIG = {
  timeout: 15000,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  rateLimit: 5000, // 5 saniye bekleme (ban önleme)
  maxRetries: 3
};

/**
 * Scraping targets
 */
const SCRAPE_TARGETS = {
  hal_ankara: {
    url: 'https://halweb.ibb.gov.tr/HalFiyatlari.aspx',
    name: 'Ankara Hal Müdürlüğü',
    enabled: true
  },
  hal_istanbul: {
    url: 'https://haldenetim.istanbul',
    name: 'İstanbul Hal Fiyatları',
    enabled: true
  },
  // E-ticaret (dikkatli kullan - robots.txt kontrol et)
  migros: {
    url: 'https://www.migros.com.tr',
    name: 'Migros Sanal Market',
    enabled: false // Terms of service'e dikkat
  }
};

/**
 * Playwright ile web scraping
 * NOT: Bu fonksiyon sadece server-side çalışır
 */
export async function scrapePrices(
  product_key: string,
  target: keyof typeof SCRAPE_TARGETS = 'hal_ankara'
): Promise<MarketQuote | null> {
  const targetConfig = SCRAPE_TARGETS[target];

  if (!targetConfig.enabled) {
    AILogger.warn('[WebScraper] Target devre dışı', { target });
    return null;
  }

  try {
    // Playwright import (conditional - sadece server'da)
    if (typeof window !== 'undefined') {
      throw new Error('Web scraping sadece server-side çalışır');
    }

    const playwright = await import('playwright');
    const browser = await playwright.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      userAgent: SCRAPER_CONFIG.userAgent,
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    // Navigate with timeout
    await page.goto(targetConfig.url, {
      waitUntil: 'domcontentloaded',
      timeout: SCRAPER_CONFIG.timeout
    });

    // Target-specific scraping logic
    let price: number | null = null;
    let unit = 'kg';

    switch (target) {
      case 'hal_ankara':
        price = await scrapeHalAnkara(page, product_key);
        break;
      case 'hal_istanbul':
        price = await scrapeHalIstanbul(page, product_key);
        break;
      default:
        AILogger.warn('[WebScraper] Bilinmeyen target', { target });
    }

    await browser.close();

    if (price === null || price <= 0) {
      return null;
    }

    return {
      product_key,
      raw_query: product_key,
      unit,
      unit_price: price,
      currency: 'TRY',
      asOf: new Date().toISOString(),
      source: 'WEB',
      sourceTrust: 0.70, // Web scraping orta güvenilirlik
      meta: {
        provider: targetConfig.name,
        scrape_target: target,
        url: targetConfig.url,
        scraped_at: new Date().toISOString(),
        reliability: 'medium'
      }
    };
  } catch (error) {
    AILogger.error('[WebScraper] Scraping hatası', {
      target,
      product_key,
      error: error instanceof Error ? error.message : 'Unknown'
    });
    return null;
  }
}

/**
 * Ankara Hal scraping logic
 */
async function scrapeHalAnkara(page: any, product_key: string): Promise<number | null> {
  try {
    // Ürün adını Türkçe'ye çevir
    const turkishName = productKeyToTurkish(product_key);

    // Ürün arama (örnek selector - gerçek sitede değişiklik gösterebilir)
    await page.fill('#searchInput', turkishName);
    await page.click('#searchButton');

    // Sonuç bekleme
    await page.waitForSelector('.price-table', { timeout: 5000 });

    // Fiyat parse etme
    const priceText = await page.locator('.price-value').first().textContent();

    if (!priceText) return null;

    // "45,50 TL/kg" formatını parse et
    const match = priceText.match(/[\d,]+/);
    if (!match) return null;

    const price = parseFloat(match[0].replace(',', '.'));
    return isNaN(price) ? null : price;
  } catch (error) {
    AILogger.info('[WebScraper] Hal Ankara parse hatası', {
      product_key,
      error: error instanceof Error ? error.message : 'Unknown'
    });
    return null;
  }
}

/**
 * İstanbul Hal scraping logic
 */
async function scrapeHalIstanbul(page: any, product_key: string): Promise<number | null> {
  try {
    const turkishName = productKeyToTurkish(product_key);

    // Site-specific implementation
    // TODO: Gerçek selectors'ları ekle

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Product key'i Türkçe ürün adına çevir
 */
function productKeyToTurkish(product_key: string): string {
  const mapping: Record<string, string> = {
    'tavuk-eti': 'Tavuk Eti',
    'dana-eti': 'Dana Eti',
    'zeytinyagi': 'Zeytinyağı',
    'domates': 'Domates',
    'patates': 'Patates',
    'pirinc': 'Pirinç',
    'sogan': 'Soğan',
    // ... daha fazlası eklenecek
  };

  return mapping[product_key] || product_key.replace(/-/g, ' ');
}

/**
 * Rate limiting ile toplu scraping
 */
export async function scrapeBulk(
  product_keys: string[],
  target: keyof typeof SCRAPE_TARGETS = 'hal_ankara'
): Promise<Map<string, MarketQuote | null>> {
  const results = new Map<string, MarketQuote | null>();

  for (const product_key of product_keys) {
    const quote = await scrapePrices(product_key, target);
    results.set(product_key, quote);

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, SCRAPER_CONFIG.rateLimit));

    AILogger.info('[WebScraper Bulk] İşlendi', {
      product_key,
      success: quote !== null
    });
  }

  return results;
}

/**
 * Scraper health check
 */
export async function scraperHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'down';
  targets: Record<string, boolean>;
  message: string;
}> {
  const targetStatus: Record<string, boolean> = {};

  try {
    // Her target için basit HTTP check
    for (const [key, config] of Object.entries(SCRAPE_TARGETS)) {
      if (!config.enabled) {
        targetStatus[key] = false;
        continue;
      }

      try {
        const response = await fetch(config.url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        targetStatus[key] = response.ok;
      } catch {
        targetStatus[key] = false;
      }
    }

    const healthyCount = Object.values(targetStatus).filter(Boolean).length;
    const totalEnabled = Object.values(SCRAPE_TARGETS).filter(t => t.enabled).length;

    return {
      status: healthyCount === totalEnabled ? 'healthy' :
              healthyCount > 0 ? 'degraded' : 'down',
      targets: targetStatus,
      message: `${healthyCount}/${totalEnabled} target erişilebilir`
    };
  } catch (error) {
    return {
      status: 'down',
      targets: targetStatus,
      message: 'Health check başarısız'
    };
  }
}

/**
 * Proxy rotation helper (gelişmiş kullanım için)
 */
export class ProxyRotator {
  private proxies: string[] = [];
  private currentIndex = 0;

  constructor(proxyList: string[]) {
    this.proxies = proxyList;
  }

  getNext(): string | null {
    if (this.proxies.length === 0) return null;

    const proxy = this.proxies[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;

    return proxy;
  }
}

/**
 * robots.txt kontrolü
 */
export async function checkRobotsTxt(baseUrl: string): Promise<{
  allowed: boolean;
  crawlDelay?: number;
}> {
  try {
    const robotsUrl = new URL('/robots.txt', baseUrl).toString();
    const response = await fetch(robotsUrl, { signal: AbortSignal.timeout(3000) });

    if (!response.ok) {
      return { allowed: true }; // robots.txt yoksa varsayılan izin ver
    }

    const content = await response.text();

    // Basit parsing (gerçek uygulamada daha gelişmiş parser kullan)
    const disallowed = content.includes('Disallow: /');
    const crawlDelayMatch = content.match(/Crawl-delay:\s*(\d+)/i);
    const crawlDelay = crawlDelayMatch ? parseInt(crawlDelayMatch[1]) : undefined;

    return {
      allowed: !disallowed,
      crawlDelay
    };
  } catch {
    return { allowed: true };
  }
}

