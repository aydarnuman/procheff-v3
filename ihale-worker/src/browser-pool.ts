import { chromium, Browser, BrowserContext } from 'playwright';
import { config } from './config';

/**
 * Browser Pool Manager
 * Manages a pool of reusable Playwright browsers to prevent memory leaks
 */

// Türkçe logger
const Log = {
  basla: (msg: string, detay?: any) => {
    console.log(`\x1b[36m🔄 [${new Date().toLocaleTimeString('tr-TR')}] ${msg} başlatılıyor...\x1b[0m`);
    if (detay) console.log(`\x1b[2m   📋 Detay:`, detay, '\x1b[0m');
  },
  basarili: (msg: string, detay?: any) => {
    console.log(`\x1b[32m✅ [${new Date().toLocaleTimeString('tr-TR')}] ${msg} tamamlandı\x1b[0m`);
    if (detay) console.log(`\x1b[2m   📊 Sonuç:`, detay, '\x1b[0m');
  },
  hata: (msg: string, err?: any) => {
    console.error(`\x1b[31m❌ [${new Date().toLocaleTimeString('tr-TR')}] ${msg} başarısız\x1b[0m`);
    if (err) console.error(`\x1b[2m   🐛 Hata:`, err, '\x1b[0m');
  },
  bilgi: (msg: string, detay?: any) => {
    console.log(`\x1b[34mℹ️  [${new Date().toLocaleTimeString('tr-TR')}] ${msg}\x1b[0m`);
    if (detay) console.log(`\x1b[2m   📋 Detay:`, detay, '\x1b[0m');
  },
  uyari: (msg: string, detay?: any) => {
    console.log(`\x1b[33m⚠️  [${new Date().toLocaleTimeString('tr-TR')}] ${msg}\x1b[0m`);
    if (detay) console.log(`\x1b[2m   📋 Detay:`, detay, '\x1b[0m');
  },
};

interface PooledBrowser {
  browser: Browser;
  inUse: boolean;
  lastUsed: number;
  createdAt: number;
}

class BrowserPool {
  private pool: PooledBrowser[] = [];
  private waitQueue: Array<{
    resolve: (browser: PooledBrowser) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupInterval();
  }

  /**
   * Initialize pool with minimum browsers
   */
  async initialize(): Promise<void> {
    Log.basla('Browser pool başlatılıyor', {
      min: config.MIN_BROWSERS_IN_POOL,
      max: config.MAX_CONCURRENT_BROWSERS
    });

    for (let i = 0; i < config.MIN_BROWSERS_IN_POOL; i++) {
      await this.createBrowser();
    }

    Log.basarili('Browser pool hazır', {
      havuzBoyutu: this.pool.length
    });
  }

  /**
   * Create a new browser instance
   */
  private async createBrowser(): Promise<PooledBrowser> {
    try {
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        timeout: config.BROWSER_TIMEOUT_MS,
      });

      const pooledBrowser: PooledBrowser = {
        browser,
        inUse: false,
        lastUsed: Date.now(),
        createdAt: Date.now(),
      };

      this.pool.push(pooledBrowser);
      Log.bilgi('Yeni browser oluşturuldu', {
        toplamBrowser: this.pool.length
      });

      return pooledBrowser;
    } catch (error) {
      Log.hata('Browser oluşturulamadı', error);
      throw error;
    }
  }

  /**
   * Acquire a browser from the pool
   */
  async acquire(): Promise<{ browser: Browser; release: () => void }> {
    // Find available browser
    const availableBrowser = this.pool.find(pb => !pb.inUse && pb.browser.isConnected());

    if (availableBrowser) {
      availableBrowser.inUse = true;
      availableBrowser.lastUsed = Date.now();

      return {
        browser: availableBrowser.browser,
        release: () => this.release(availableBrowser),
      };
    }

    // Can we create a new browser?
    if (this.pool.length < config.MAX_CONCURRENT_BROWSERS) {
      const newBrowser = await this.createBrowser();
      newBrowser.inUse = true;

      return {
        browser: newBrowser.browser,
        release: () => this.release(newBrowser),
      };
    }

    // Wait for available browser
    Log.uyari('Tüm browserlar kullanımda, sırada bekleniyor', {
      havuzBoyutu: this.pool.length,
      kullanimdakiler: this.pool.filter(pb => pb.inUse).length,
      sıradakiler: this.waitQueue.length + 1
    });

    return new Promise((resolve, reject) => {
      this.waitQueue.push({
        resolve: (pooledBrowser: PooledBrowser) => {
          resolve({
            browser: pooledBrowser.browser,
            release: () => this.release(pooledBrowser),
          });
        },
        reject,
        timestamp: Date.now(),
      });

      // Timeout waiting in queue (30 seconds)
      setTimeout(() => {
        const index = this.waitQueue.findIndex(item => item.reject === reject);
        if (index !== -1) {
          this.waitQueue.splice(index, 1);
          reject(new Error('Browser acquisition timeout - queue wait exceeded 30s'));
        }
      }, 30000);
    });
  }

  /**
   * Release a browser back to the pool
   */
  private release(pooledBrowser: PooledBrowser): void {
    pooledBrowser.inUse = false;
    pooledBrowser.lastUsed = Date.now();

    // Process wait queue
    if (this.waitQueue.length > 0) {
      const waiting = this.waitQueue.shift();
      if (waiting) {
        pooledBrowser.inUse = true;
        waiting.resolve(pooledBrowser);
      }
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    const now = Date.now();
    return {
      total: this.pool.length,
      inUse: this.pool.filter(pb => pb.inUse).length,
      available: this.pool.filter(pb => !pb.inUse && pb.browser.isConnected()).length,
      disconnected: this.pool.filter(pb => !pb.browser.isConnected()).length,
      waitingInQueue: this.waitQueue.length,
      oldestBrowserAge: this.pool.length > 0 ? Math.max(...this.pool.map(pb => now - pb.createdAt)) : 0,
    };
  }

  /**
   * Cleanup idle and disconnected browsers
   */
  private async cleanup(): Promise<void> {
    const now = Date.now();
    const toRemove: PooledBrowser[] = [];

    for (const pooledBrowser of this.pool) {
      // Remove disconnected browsers
      if (!pooledBrowser.browser.isConnected()) {
        toRemove.push(pooledBrowser);
        continue;
      }

      // Remove idle browsers (only if above minimum)
      const idleTime = now - pooledBrowser.lastUsed;
      if (
        !pooledBrowser.inUse &&
        idleTime > config.BROWSER_IDLE_TIMEOUT_MS &&
        this.pool.length > config.MIN_BROWSERS_IN_POOL
      ) {
        toRemove.push(pooledBrowser);
      }
    }

    for (const pooledBrowser of toRemove) {
      try {
        if (!pooledBrowser.inUse) {
          await pooledBrowser.browser.close();
          this.pool = this.pool.filter(pb => pb !== pooledBrowser);
          Log.bilgi('Boşta kalan browser temizlendi', {
            kalanBrowserlar: this.pool.length
          });
        }
      } catch (error) {
        Log.hata('Browser kapatılamadı', error);
      }
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, config.SESSION_CLEANUP_INTERVAL_MS);
  }

  /**
   * Destroy all browsers and shutdown pool
   */
  async destroy(): Promise<void> {
    Log.basla('Browser pool kapatılıyor', {
      toplamBrowser: this.pool.length
    });

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Reject all waiting in queue
    for (const waiting of this.waitQueue) {
      waiting.reject(new Error('Browser pool is shutting down'));
    }
    this.waitQueue = [];

    // Close all browsers
    const closePromises = this.pool.map(async (pooledBrowser) => {
      try {
        if (pooledBrowser.browser.isConnected()) {
          await pooledBrowser.browser.close();
        }
      } catch (error) {
        Log.hata('Browser kapatılamadı', error);
      }
    });

    await Promise.all(closePromises);
    this.pool = [];

    Log.basarili('Browser pool kapatıldı');
  }
}

// Singleton instance
export const browserPool = new BrowserPool();

/**
 * Create a browser context with session storage state
 */
export async function createContext(storageState?: any): Promise<{ browser: Browser; context: BrowserContext; release: () => void }> {
  const { browser, release } = await browserPool.acquire();

  const context = await browser.newContext({
    storageState: storageState ?? undefined,
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  });

  return {
    browser,
    context,
    release: async () => {
      try {
        await context.close();
      } catch (error) {
        Log.hata('Context kapatılamadı', error);
      }
      release();
    },
  };
}
