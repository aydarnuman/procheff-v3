/**
 * Base Scraper Provider
 * Common functionality for all market scrapers
 */

import { Page, Browser, chromium } from 'playwright';
import { scraperHealthMonitor } from './health-monitor';

export interface ScraperProduct {
  name: string;
  brand?: string;
  price: number;
  discountPrice?: number;
  unit: string;
  weight: number;
  weightUnit: 'kg' | 'g' | 'lt' | 'ml' | 'adet';
  imageUrl?: string;
  productUrl: string;
  inStock: boolean;
  marketName: string;
  scrapedAt: Date;
}

export interface ScraperConfig {
  name: string;
  baseUrl: string;
  userAgent?: string;
  timeout?: number;
  retryAttempts?: number;
  proxyUrl?: string;
  maxRetryDelay?: number;
  enableHealthMonitor?: boolean;
}

export abstract class BaseScraper {
  protected config: ScraperConfig;
  protected browser: Browser | null = null;
  protected page: Page | null = null;

  constructor(config: ScraperConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      maxRetryDelay: 10000,
      enableHealthMonitor: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...config
    };

    // Initialize health monitor
    if (this.config.enableHealthMonitor) {
      scraperHealthMonitor.initScraper(this.config.name);
    }
  }
  
  protected async initBrowser(): Promise<void> {
    const launchOptions: any = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    };
    
    // Proxy desteği
    if (this.config.proxyUrl) {
      launchOptions.proxy = {
        server: this.config.proxyUrl
      };
    }
    
    this.browser = await chromium.launch(launchOptions);
    
    const context = await this.browser.newContext({
      userAgent: this.config.userAgent,
      viewport: { width: 1920, height: 1080 },
      locale: 'tr-TR'
    });
    
    this.page = await context.newPage();
    
    // Default timeout
    this.page.setDefaultTimeout(this.config.timeout!);
    
    // Block unnecessary resources for faster loading
    await this.page.route('**/*.{png,jpg,jpeg,gif,svg,mp4,mp3,css}', route => route.abort());
  }
  
  protected async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
  
  protected async navigateWithRetry(url: string): Promise<void> {
    // Check circuit breaker
    if (this.config.enableHealthMonitor && !scraperHealthMonitor.isAvailable(this.config.name)) {
      throw new Error(`[${this.config.name}] Circuit breaker is OPEN. Scraper is temporarily unavailable.`);
    }

    let lastError: Error | null = null;
    const startTime = Date.now();

    for (let i = 0; i < this.config.retryAttempts!; i++) {
      try {
        await this.page!.goto(url, { waitUntil: 'domcontentloaded' });
        await this.waitForPageLoad();

        // Record success
        if (this.config.enableHealthMonitor) {
          const responseTime = Date.now() - startTime;
          scraperHealthMonitor.recordSuccess(this.config.name, responseTime);
        }

        return;
      } catch (error) {
        lastError = error as Error;
        const errorMessage = error instanceof Error ? error.message : String(error);

        console.warn(
          `[${this.config.name}] Navigation attempt ${i + 1}/${this.config.retryAttempts} failed:`,
          errorMessage
        );

        // Don't retry on certain errors
        if (this.isNonRetriableError(errorMessage)) {
          console.error(`[${this.config.name}] Non-retriable error detected. Aborting retries.`);
          break;
        }

        if (i < this.config.retryAttempts! - 1) {
          // Exponential backoff with jitter
          const baseDelay = Math.min(1000 * Math.pow(2, i), this.config.maxRetryDelay!);
          const jitter = Math.random() * 1000;
          const delay = baseDelay + jitter;

          console.log(`[${this.config.name}] Retrying in ${delay.toFixed(0)}ms...`);
          await this.page!.waitForTimeout(delay);
        }
      }
    }

    // Record failure
    if (this.config.enableHealthMonitor && lastError) {
      const responseTime = Date.now() - startTime;
      scraperHealthMonitor.recordFailure(this.config.name, lastError.message, responseTime);
    }

    throw lastError || new Error('Navigation failed after all retries');
  }

  /**
   * Check if error should not be retried
   */
  private isNonRetriableError(errorMessage: string): boolean {
    const nonRetriablePatterns = [
      'net::ERR_NAME_NOT_RESOLVED', // DNS failure
      'net::ERR_CERT_', // Certificate errors
      'net::ERR_BLOCKED_BY_', // Blocked by firewall/antivirus
      '404', // Not found
      '403', // Forbidden
      '401', // Unauthorized
    ];

    return nonRetriablePatterns.some(pattern => errorMessage.includes(pattern));
  }
  
  protected extractPrice(priceText: string): number {
    // "1.234,56 TL", "₺1.234,56", "1234.56" gibi formatları temizle
    const cleanPrice = priceText
      .replace(/[^\d,.-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');

    return parseFloat(cleanPrice) || 0;
  }
  
  protected extractWeight(text: string): { weight: number; unit: 'kg' | 'g' | 'lt' | 'ml' | 'adet' } {
    const match = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|lt|ml|l)/i);
    
    if (match) {
      const weight = parseFloat(match[1].replace(',', '.'));
      let unit = match[2].toLowerCase();
      
      if (unit === 'l') unit = 'lt';
      
      return {
        weight,
        unit: unit as any
      };
    }
    
    return { weight: 1, unit: 'adet' };
  }
  
  protected abstract waitForPageLoad(): Promise<void>;
  abstract searchProduct(query: string): Promise<ScraperProduct[]>;
  abstract getProductByUrl(url: string): Promise<ScraperProduct | null>;
  
  async search(query: string): Promise<ScraperProduct[]> {
    // Circuit breaker check
    if (this.config.enableHealthMonitor && !scraperHealthMonitor.isAvailable(this.config.name)) {
      console.warn(`[${this.config.name}] Circuit breaker is OPEN. Skipping search request.`);
      return [];
    }

    const startTime = Date.now();

    try {
      await this.initBrowser();
      const results = await this.searchProduct(query);

      // Record success
      if (this.config.enableHealthMonitor) {
        const responseTime = Date.now() - startTime;
        scraperHealthMonitor.recordSuccess(this.config.name, responseTime);
      }

      return results;
    } catch (error) {
      // Record failure
      if (this.config.enableHealthMonitor) {
        const responseTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        scraperHealthMonitor.recordFailure(this.config.name, errorMessage, responseTime);
      }

      throw error;
    } finally {
      await this.closeBrowser();
    }
  }

  async getProduct(url: string): Promise<ScraperProduct | null> {
    // Circuit breaker check
    if (this.config.enableHealthMonitor && !scraperHealthMonitor.isAvailable(this.config.name)) {
      console.warn(`[${this.config.name}] Circuit breaker is OPEN. Skipping product request.`);
      return null;
    }

    const startTime = Date.now();

    try {
      await this.initBrowser();
      const result = await this.getProductByUrl(url);

      // Record success
      if (this.config.enableHealthMonitor) {
        const responseTime = Date.now() - startTime;
        scraperHealthMonitor.recordSuccess(this.config.name, responseTime);
      }

      return result;
    } catch (error) {
      // Record failure
      if (this.config.enableHealthMonitor) {
        const responseTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        scraperHealthMonitor.recordFailure(this.config.name, errorMessage, responseTime);
      }

      throw error;
    } finally {
      await this.closeBrowser();
    }
  }

  /**
   * Get scraper health status
   */
  getHealth() {
    if (this.config.enableHealthMonitor) {
      return scraperHealthMonitor.getHealth(this.config.name);
    }
    return undefined;
  }
}
