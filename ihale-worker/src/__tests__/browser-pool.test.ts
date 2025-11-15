import { browserPool, createContext } from '../browser-pool';
import { config } from '../config';

describe('Browser Pool', () => {
  beforeAll(async () => {
    await browserPool.initialize();
  });

  afterAll(async () => {
    await browserPool.destroy();
  });

  describe('Initialization', () => {
    it('should initialize with minimum browsers', () => {
      const stats = browserPool.getStats();
      expect(stats.total).toBeGreaterThanOrEqual(config.MIN_BROWSERS_IN_POOL);
      expect(stats.total).toBeLessThanOrEqual(config.MAX_CONCURRENT_BROWSERS);
    });

    it('should have all browsers available initially', () => {
      const stats = browserPool.getStats();
      expect(stats.available).toBe(stats.total);
      expect(stats.inUse).toBe(0);
    });
  });

  describe('Browser Acquisition', () => {
    it('should acquire and release browser successfully', async () => {
      const { browser, context, release } = await createContext();

      expect(browser).toBeDefined();
      expect(browser.isConnected()).toBe(true);
      expect(context).toBeDefined();

      const stats = browserPool.getStats();
      expect(stats.inUse).toBe(1);

      await release();

      const statsAfter = browserPool.getStats();
      expect(statsAfter.inUse).toBe(0);
    });

    it('should support storage state in context', async () => {
      const storageState = {
        cookies: [{ name: 'test', value: 'cookie', domain: '.example.com', path: '/', expires: -1, httpOnly: false, secure: false, sameSite: 'Lax' }],
        origins: [],
      };

      const { context, release } = await createContext(storageState);
      expect(context).toBeDefined();

      await release();
    });
  });

  describe('Concurrency Management', () => {
    it('should respect max concurrent browsers', async () => {
      const browsers = [];

      // Acquire all available browsers
      for (let i = 0; i < config.MAX_CONCURRENT_BROWSERS; i++) {
        browsers.push(await createContext());
      }

      const stats = browserPool.getStats();
      expect(stats.total).toBeLessThanOrEqual(config.MAX_CONCURRENT_BROWSERS);
      expect(stats.inUse).toBeLessThanOrEqual(config.MAX_CONCURRENT_BROWSERS);

      // Release all
      for (const b of browsers) {
        await b.release();
      }
    });

    it('should queue requests when pool exhausted', async () => {
      const browsers = [];

      // Acquire all browsers
      for (let i = 0; i < config.MAX_CONCURRENT_BROWSERS; i++) {
        browsers.push(await createContext());
      }

      // This should queue
      const queuedPromise = createContext();

      const stats = browserPool.getStats();
      expect(stats.waitingInQueue).toBeGreaterThan(0);

      // Release one browser
      await browsers[0].release();

      // Queued request should now complete
      const queued = await queuedPromise;
      expect(queued).toBeDefined();
      expect(queued.browser.isConnected()).toBe(true);

      await queued.release();

      // Release remaining browsers
      for (let i = 1; i < browsers.length; i++) {
        await browsers[i].release();
      }
    });

    it('should handle multiple concurrent acquisitions', async () => {
      const promises = [];

      // Try to acquire 5 browsers concurrently (more than max)
      for (let i = 0; i < 5; i++) {
        promises.push(createContext());
      }

      const browsers = await Promise.all(promises);

      // All should succeed (some queued, then served)
      expect(browsers).toHaveLength(5);
      browsers.forEach(b => {
        expect(b.browser.isConnected()).toBe(true);
      });

      // Release all
      for (const b of browsers) {
        await b.release();
      }
    });
  });

  describe('Statistics', () => {
    it('should provide accurate stats', async () => {
      const { release } = await createContext();

      const stats = browserPool.getStats();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('inUse');
      expect(stats).toHaveProperty('available');
      expect(stats).toHaveProperty('disconnected');
      expect(stats).toHaveProperty('waitingInQueue');
      expect(stats).toHaveProperty('oldestBrowserAge');

      expect(typeof stats.total).toBe('number');
      expect(typeof stats.inUse).toBe('number');
      expect(typeof stats.available).toBe('number');

      await release();
    });

    it('should track browser age', async () => {
      const stats = browserPool.getStats();
      expect(stats.oldestBrowserAge).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle browser disconnection gracefully', async () => {
      const { browser, release } = await createContext();

      // Force disconnect
      await browser.close();

      // Release should not throw
      await expect(release()).resolves.not.toThrow();
    });

    it('should timeout acquisition after 30 seconds', async () => {
      const browsers = [];

      // Exhaust pool
      for (let i = 0; i < config.MAX_CONCURRENT_BROWSERS; i++) {
        browsers.push(await createContext());
      }

      // Try to acquire without releasing (should timeout)
      await expect(createContext()).rejects.toThrow('timeout');

      // Cleanup
      for (const b of browsers) {
        await b.release();
      }
    }, 35000); // Test timeout > acquisition timeout
  });
});
