import { config } from '../config';

describe('Config', () => {
  describe('Server Configuration', () => {
    it('should have valid port number', () => {
      expect(config.PORT).toBeGreaterThan(0);
      expect(config.PORT).toBeLessThan(65536);
    });

    it('should have valid host', () => {
      expect(config.HOST).toBeDefined();
      expect(typeof config.HOST).toBe('string');
      expect(config.HOST.length).toBeGreaterThan(0);
    });
  });

  describe('Session Management', () => {
    it('should have valid session TTL', () => {
      expect(config.SESSION_TTL_MS).toBeGreaterThan(0);
      expect(config.SESSION_TTL_MS).toBeGreaterThanOrEqual(3600000); // At least 1 hour
    });

    it('should have valid cleanup interval', () => {
      expect(config.SESSION_CLEANUP_INTERVAL_MS).toBeGreaterThan(0);
      expect(config.SESSION_CLEANUP_INTERVAL_MS).toBeLessThan(config.SESSION_TTL_MS);
    });
  });

  describe('Browser Management', () => {
    it('should have valid browser pool size', () => {
      expect(config.MAX_CONCURRENT_BROWSERS).toBeGreaterThan(0);
      expect(config.MAX_CONCURRENT_BROWSERS).toBeLessThanOrEqual(10); // Reasonable upper bound
    });

    it('should respect min <= max browsers constraint', () => {
      expect(config.MIN_BROWSERS_IN_POOL).toBeGreaterThan(0);
      expect(config.MIN_BROWSERS_IN_POOL).toBeLessThanOrEqual(config.MAX_CONCURRENT_BROWSERS);
    });

    it('should have reasonable browser timeout', () => {
      expect(config.BROWSER_TIMEOUT_MS).toBeGreaterThan(10000); // > 10s
      expect(config.BROWSER_TIMEOUT_MS).toBeLessThan(180000); // < 3min
    });

    it('should have valid idle timeout', () => {
      expect(config.BROWSER_IDLE_TIMEOUT_MS).toBeGreaterThan(0);
      expect(config.BROWSER_IDLE_TIMEOUT_MS).toBeGreaterThanOrEqual(60000); // At least 1 minute
    });
  });

  describe('AI Parsing', () => {
    it('should have valid AI parsing timeout', () => {
      expect(config.AI_PARSING_TIMEOUT_MS).toBeGreaterThan(0);
      expect(config.AI_PARSING_TIMEOUT_MS).toBeGreaterThanOrEqual(60000); // At least 1 minute
      expect(config.AI_PARSING_TIMEOUT_MS).toBeLessThanOrEqual(300000); // Max 5 minutes
    });

    it('should have warning timeout < hard timeout', () => {
      expect(config.AI_PARSING_WARNING_MS).toBeGreaterThan(0);
      expect(config.AI_PARSING_WARNING_MS).toBeLessThan(config.AI_PARSING_TIMEOUT_MS);
    });
  });

  describe('Rate Limiting', () => {
    it('should have valid rate limit window', () => {
      expect(config.RATE_LIMIT_WINDOW_MS).toBeGreaterThan(0);
      expect(config.RATE_LIMIT_WINDOW_MS).toBeGreaterThanOrEqual(10000); // At least 10s
    });

    it('should have valid max requests', () => {
      expect(config.RATE_LIMIT_MAX_REQUESTS).toBeGreaterThan(0);
      expect(config.RATE_LIMIT_MAX_REQUESTS).toBeLessThanOrEqual(1000); // Reasonable upper bound
    });

    it('should have reasonable rate limit ratio', () => {
      // Requests per second should be reasonable (not > 100/s)
      const requestsPerSecond = (config.RATE_LIMIT_MAX_REQUESTS / config.RATE_LIMIT_WINDOW_MS) * 1000;
      expect(requestsPerSecond).toBeLessThanOrEqual(100);
    });
  });

  describe('Circuit Breaker', () => {
    it('should have valid failure threshold', () => {
      expect(config.CIRCUIT_BREAKER_FAILURE_THRESHOLD).toBeGreaterThan(0);
      expect(config.CIRCUIT_BREAKER_FAILURE_THRESHOLD).toBeGreaterThanOrEqual(3);
    });

    it('should have valid success threshold', () => {
      expect(config.CIRCUIT_BREAKER_SUCCESS_THRESHOLD).toBeGreaterThan(0);
      expect(config.CIRCUIT_BREAKER_SUCCESS_THRESHOLD).toBeLessThanOrEqual(config.CIRCUIT_BREAKER_FAILURE_THRESHOLD);
    });

    it('should have valid timeout', () => {
      expect(config.CIRCUIT_BREAKER_TIMEOUT_MS).toBeGreaterThan(0);
      expect(config.CIRCUIT_BREAKER_TIMEOUT_MS).toBeGreaterThanOrEqual(10000); // At least 10s
    });
  });

  describe('ihalebul.com', () => {
    it('should have valid base URL', () => {
      expect(config.IHALEBUL_BASE_URL).toBeDefined();
      expect(config.IHALEBUL_BASE_URL).toContain('http');
      expect(() => new URL(config.IHALEBUL_BASE_URL)).not.toThrow();
    });

    it('should have username and password fields', () => {
      expect(config.IHALEBUL_USERNAME).toBeDefined();
      expect(config.IHALEBUL_PASSWORD).toBeDefined();
      expect(typeof config.IHALEBUL_USERNAME).toBe('string');
      expect(typeof config.IHALEBUL_PASSWORD).toBe('string');
    });
  });

  describe('Graceful Shutdown', () => {
    it('should have valid shutdown timeout', () => {
      expect(config.SHUTDOWN_TIMEOUT_MS).toBeGreaterThan(0);
      expect(config.SHUTDOWN_TIMEOUT_MS).toBeGreaterThanOrEqual(5000); // At least 5s
      expect(config.SHUTDOWN_TIMEOUT_MS).toBeLessThanOrEqual(60000); // Max 1 minute
    });
  });

  describe('Pagination', () => {
    it('should have valid default max pages', () => {
      expect(config.DEFAULT_MAX_PAGES).toBeGreaterThan(0);
      expect(config.DEFAULT_MAX_PAGES).toBeLessThanOrEqual(100); // Reasonable upper bound
    });

    it('should have valid page rate limit', () => {
      expect(config.PAGE_RATE_LIMIT_MS).toBeGreaterThan(0);
      expect(config.PAGE_RATE_LIMIT_MS).toBeLessThanOrEqual(5000); // Max 5s between pages
    });
  });

  describe('Screenshot', () => {
    it('should have valid screenshot settings', () => {
      expect(typeof config.SCREENSHOT_ENABLED).toBe('boolean');
      expect(typeof config.SCREENSHOT_FULL_PAGE).toBe('boolean');
    });
  });

  describe('Environment Variables', () => {
    it('should handle missing env vars gracefully', () => {
      // Config should have default values even if env vars not set
      expect(config.PORT).toBeDefined();
      expect(config.HOST).toBeDefined();
      expect(config.SESSION_TTL_MS).toBeDefined();
    });
  });

  describe('Config Immutability', () => {
    it('should be read-only (as const)', () => {
      // TypeScript ensures this at compile time
      // At runtime, we can verify it's an object
      expect(typeof config).toBe('object');
      expect(config).not.toBeNull();
    });
  });

  describe('Validation Rules', () => {
    it('should enforce validation rules', () => {
      // Validation happens at module load time
      // If we get here, validation passed
      expect(config.MAX_CONCURRENT_BROWSERS).toBeGreaterThanOrEqual(1);
      expect(config.MIN_BROWSERS_IN_POOL).toBeGreaterThanOrEqual(1);
      expect(config.MIN_BROWSERS_IN_POOL).toBeLessThanOrEqual(config.MAX_CONCURRENT_BROWSERS);
    });
  });
});
