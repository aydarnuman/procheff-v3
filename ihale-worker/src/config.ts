/**
 * İhale Worker Configuration
 * Environment-based configuration with sensible defaults
 */

export const config = {
  // Server
  PORT: parseInt(process.env.PORT || '8080', 10),
  HOST: process.env.HOST || '0.0.0.0',

  // Session Management
  SESSION_TTL_MS: parseInt(process.env.SESSION_TTL_MS || '28800000', 10), // 8 hours
  SESSION_CLEANUP_INTERVAL_MS: parseInt(process.env.SESSION_CLEANUP_INTERVAL_MS || '600000', 10), // 10 minutes

  // Browser Management
  MAX_CONCURRENT_BROWSERS: parseInt(process.env.MAX_CONCURRENT_BROWSERS || '3', 10),
  MIN_BROWSERS_IN_POOL: parseInt(process.env.MIN_BROWSERS_IN_POOL || '1', 10),
  BROWSER_TIMEOUT_MS: parseInt(process.env.BROWSER_TIMEOUT_MS || '60000', 10),
  BROWSER_IDLE_TIMEOUT_MS: parseInt(process.env.BROWSER_IDLE_TIMEOUT_MS || '300000', 10), // 5 minutes

  // AI Parsing
  AI_PARSING_TIMEOUT_MS: parseInt(process.env.AI_PARSING_TIMEOUT_MS || '120000', 10), // 120 seconds
  AI_PARSING_WARNING_MS: parseInt(process.env.AI_PARSING_WARNING_MS || '90000', 10), // 90 seconds

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '20', 10),

  // Circuit Breaker
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5', 10),
  CIRCUIT_BREAKER_SUCCESS_THRESHOLD: parseInt(process.env.CIRCUIT_BREAKER_SUCCESS_THRESHOLD || '2', 10),
  CIRCUIT_BREAKER_TIMEOUT_MS: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT_MS || '30000', 10),

  // ihalebul.com
  IHALEBUL_BASE_URL: process.env.IHALEBUL_BASE_URL || 'https://www.ihalebul.com',
  IHALEBUL_USERNAME: process.env.IHALEBUL_USERNAME || '',
  IHALEBUL_PASSWORD: process.env.IHALEBUL_PASSWORD || '',

  // Graceful Shutdown
  SHUTDOWN_TIMEOUT_MS: parseInt(process.env.SHUTDOWN_TIMEOUT_MS || '10000', 10),

  // Pagination
  DEFAULT_MAX_PAGES: parseInt(process.env.DEFAULT_MAX_PAGES || '9', 10),
  PAGE_RATE_LIMIT_MS: parseInt(process.env.PAGE_RATE_LIMIT_MS || '1000', 10),

  // Screenshot
  SCREENSHOT_ENABLED: process.env.SCREENSHOT_ENABLED !== 'false', // Default: true
  SCREENSHOT_FULL_PAGE: process.env.SCREENSHOT_FULL_PAGE !== 'false', // Default: true
} as const;

// Validation
if (config.MAX_CONCURRENT_BROWSERS < 1) {
  throw new Error('MAX_CONCURRENT_BROWSERS must be at least 1');
}

if (config.MIN_BROWSERS_IN_POOL < 1) {
  throw new Error('MIN_BROWSERS_IN_POOL must be at least 1');
}

if (config.MIN_BROWSERS_IN_POOL > config.MAX_CONCURRENT_BROWSERS) {
  throw new Error('MIN_BROWSERS_IN_POOL cannot exceed MAX_CONCURRENT_BROWSERS');
}

// Type exports
export type Config = typeof config;
