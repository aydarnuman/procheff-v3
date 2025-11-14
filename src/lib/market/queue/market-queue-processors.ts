/**
 * Market Queue Processors
 * Specific processors for different market data fetching tasks
 */

import { QueueJob, queueManager } from './queue-manager';
import { MigrosAPIProvider } from '../providers/api/migros-api';
import { GetirAPIProvider } from '../providers/api/getir-api';
import { TrendyolAPIProvider } from '../providers/api/trendyol-api';
import { A101Scraper } from '../providers/scraper/a101-scraper';
import { BimScraper } from '../providers/scraper/bim-scraper';
import { CarrefourScraper } from '../providers/scraper/carrefour-scraper';
import { apiVault } from '../providers/api/api-vault';
import { proxyManager } from '../providers/scraper/proxy-manager';
import { cacheManager, CacheManager } from '../cache/cache-manager';
import { join } from 'path';

// Job data types
export interface MarketSearchJob {
  query: string;
  markets: string[];
  options?: {
    limit?: number;
    includeOutOfStock?: boolean;
  };
}

export interface ScraperJob {
  url?: string;
  query?: string;
  market: 'a101' | 'bim' | 'carrefour';
  retryWithDifferentProxy?: boolean;
}

export interface PriceUpdateJob {
  productId: string;
  productName: string;
  barcode?: string;
  markets: string[];
}

// Initialize API providers
const apiProviders = new Map();

function initializeAPIProviders() {
  // Migros
  if (apiVault.hasValidCredentials('migros')) {
    const migrosConfig = apiVault.getCredentials('migros');
    apiProviders.set('migros', new MigrosAPIProvider({
      name: 'Migros',
      baseUrl: migrosConfig!.endpoint!,
      clientId: migrosConfig!.clientId,
      clientSecret: migrosConfig!.clientSecret
    }));
  }
  
  // Getir
  if (apiVault.hasValidCredentials('getir')) {
    const getirConfig = apiVault.getCredentials('getir');
    apiProviders.set('getir', new GetirAPIProvider({
      name: 'Getir',
      baseUrl: getirConfig!.endpoint!,
      apiKey: getirConfig!.apiKey
    }));
  }
  
  // Trendyol
  if (apiVault.hasValidCredentials('trendyol')) {
    const trendyolConfig = apiVault.getCredentials('trendyol');
    apiProviders.set('trendyol', new TrendyolAPIProvider({
      name: 'Trendyol',
      baseUrl: trendyolConfig!.endpoint!,
      apiKey: trendyolConfig!.apiKey
    }));
  }
}

// Initialize scrapers
const scrapers = {
  a101: A101Scraper,
  bim: BimScraper,
  carrefour: CarrefourScraper
};

/**
 * Process market search job
 */
export async function processMarketSearchJob(job: QueueJob<MarketSearchJob>) {
  const { query, markets, options = {} } = job.data;
  const results: any[] = [];
  const errors: any[] = [];
  
  // Process each market
  for (const market of markets) {
    try {
      // Check cache first
      const cacheKey = CacheManager.generateKey('market_search', market, query, options);
      const cached = await cacheManager.get(cacheKey);
      
      if (cached) {
        results.push({
          market,
          products: cached,
          source: 'cache'
        });
        continue;
      }
      
      // Check rate limit
      await proxyManager.waitForRateLimit(market);
      
      // Try API first
      const apiProvider = apiProviders.get(market.toLowerCase());
      if (apiProvider) {
        const products = await apiProvider.search({
          query,
          limit: options.limit || 20
        });
        
        results.push({
          market,
          products,
          source: 'api'
        });
        
        // Cache results
        await cacheManager.set(cacheKey, products, {
          category: 'api_response',
          ttl: 600 // 10 minutes
        });
      } else {
        // Fallback to scraping
        const scraperClass = scrapers[market.toLowerCase() as keyof typeof scrapers];
        if (scraperClass) {
          const scraper = new scraperClass();
          const products = await scraper.search(query);
          
          results.push({
            market,
            products: products.slice(0, options.limit || 20),
            source: 'scraper'
          });
          
          // Cache with shorter TTL
          await cacheManager.set(cacheKey, products, {
            category: 'scraper_data',
            ttl: 3600 // 1 hour
          });
        }
      }
    } catch (error) {
      console.error(`[MarketSearchJob] Error for ${market}:`, error);
      errors.push({
        market,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  // Update provider health
  await updateProviderHealth(results, errors);
  
  return {
    query,
    results,
    errors,
    timestamp: new Date()
  };
}

/**
 * Process scraper job
 */
export async function processScraperJob(job: QueueJob<ScraperJob>) {
  const { url, query, market, retryWithDifferentProxy } = job.data;
  
  // Get proxy
  const proxy = retryWithDifferentProxy 
    ? await proxyManager.getNextProxy()
    : null;
  
  // Check rate limit
  await proxyManager.waitForRateLimit(market);
  
  // Create scraper instance
  const ScraperClass = scrapers[market];
  if (!ScraperClass) {
    throw new Error(`Unknown market: ${market}`);
  }
  
  const scraper = new ScraperClass();
  
  try {
    let result;
    
    if (url) {
      // Scrape specific product
      result = await scraper.getProduct(url);
    } else if (query) {
      // Search products
      result = await scraper.search(query);
    } else {
      throw new Error('Either url or query is required');
    }
    
    // Report success if using proxy
    if (proxy) {
      proxyManager.reportProxyResult(proxy, true);
    }
    
    return {
      market,
      result,
      timestamp: new Date()
    };
  } catch (error) {
    // Report failure if using proxy
    if (proxy) {
      proxyManager.reportProxyResult(proxy, false);
    }
    
    throw error;
  }
}

/**
 * Process price update job
 */
export async function processPriceUpdateJob(job: QueueJob<PriceUpdateJob>) {
  const { productId, productName, barcode, markets } = job.data;
  
  // Create search jobs for each market
  const searchJobs = markets.map(market => ({
    data: {
      query: barcode || productName,
      markets: [market],
      options: {
        limit: 5
      }
    }
  }));
  
  // Add jobs to queue
  const jobs = await queueManager.addBulk('market_search', searchJobs);
  
  // Wait for all jobs to complete (with timeout)
  const results = await Promise.all(
    jobs.map(job => waitForJobCompletion(job.id, 30000))
  );
  
  // Process results
  const priceUpdates: any[] = [];
  
  results.forEach((result, index) => {
    if (result && result.results) {
      const marketResult = result.results[0];
      if (marketResult && marketResult.products.length > 0) {
        // Find best matching product
        const matchingProduct = marketResult.products.find(
          (p: any) => p.barcode === barcode || 
                      p.name.toLowerCase().includes(productName.toLowerCase())
        ) || marketResult.products[0];
        
        priceUpdates.push({
          market: markets[index],
          productId,
          price: matchingProduct.price,
          discountPrice: matchingProduct.discountPrice,
          inStock: matchingProduct.inStock,
          source: marketResult.source,
          updatedAt: new Date()
        });
      }
    }
  });
  
  return {
    productId,
    productName,
    priceUpdates,
    timestamp: new Date()
  };
}

/**
 * Wait for job completion with timeout
 */
async function waitForJobCompletion(jobId: string, timeout: number): Promise<any> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const job = await queueManager.getJob(jobId);
    
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    if (job.status === 'completed') {
      return job.result;
    }
    
    if (job.status === 'failed' || job.status === 'cancelled') {
      throw new Error(`Job ${jobId} ${job.status}: ${job.error}`);
    }
    
    // Wait before checking again
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  throw new Error(`Job ${jobId} timed out`);
}

/**
 * Update provider health metrics
 */
async function updateProviderHealth(results: any[], errors: any[]) {
  const db = require('better-sqlite3')(join(process.cwd(), 'procheff.db'));
  
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO api_provider_health 
      (provider_name, total_requests, successful_requests, failed_requests, 
       average_response_time, last_error, last_error_at, is_active, last_check_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Group by market
    const marketStats = new Map();
    
    results.forEach(result => {
      const stats = marketStats.get(result.market) || {
        total: 0,
        success: 0,
        failed: 0
      };
      stats.total++;
      stats.success++;
      marketStats.set(result.market, stats);
    });
    
    errors.forEach(error => {
      const stats = marketStats.get(error.market) || {
        total: 0,
        success: 0,
        failed: 0
      };
      stats.total++;
      stats.failed++;
      stats.lastError = error.error;
      marketStats.set(error.market, stats);
    });
    
    // Update database
    marketStats.forEach((stats, market) => {
      stmt.run(
        market,
        stats.total,
        stats.success,
        stats.failed,
        0, // TODO: Track response time
        stats.lastError || null,
        stats.lastError ? Date.now() : null,
        stats.success > 0,
        Date.now()
      );
    });
  } catch (error) {
    console.error('[UpdateProviderHealth] Error:', error);
  } finally {
    db.close();
  }
}

// Register processors
export function registerMarketQueueProcessors() {
  // Initialize providers
  initializeAPIProviders();
  
  // Register processors
  queueManager.process('market_search', processMarketSearchJob);
  queueManager.process('scraper', processScraperJob);
  queueManager.process('price_update', processPriceUpdateJob);
  
  // Listen to events
  queueManager.on('job:completed', (job, result) => {
    console.log(`[Queue] Job ${job.id} completed in queue ${job.queue}`);
  });
  
  queueManager.on('job:failed', (job, error) => {
    console.error(`[Queue] Job ${job.id} failed in queue ${job.queue}:`, error);
  });
  
  queueManager.on('job:retry', (job, error) => {
    console.warn(`[Queue] Job ${job.id} will retry (attempt ${job.attempts}/${job.maxAttempts}):`, error.message);
  });
  
  console.log('[MarketQueue] Processors registered');
}
