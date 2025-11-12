/**
 * Feature Flags Configuration
 *
 * Enables/disables new features without code changes.
 * All features are opt-in via environment variables.
 */

export const FEATURE_FLAGS = {
  /**
   * Rate Limiting
   * Requires: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
   */
  RATE_LIMITING_ENABLED: process.env.ENABLE_RATE_LIMITING === "true",

  /**
   * Redis Caching
   * Requires: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
   */
  CACHING_ENABLED: process.env.ENABLE_CACHING === "true",
} as const;

/**
 * Rate Limiting Configuration
 */
export const RATE_LIMIT_CONFIG = {
  // Global limits
  GLOBAL: {
    requests: 100,
    window: "1 m" as const, // 100 requests per minute
  },

  // Per-endpoint limits
  ENDPOINTS: {
    "/api/ai/deep-analysis": {
      requests: 5,
      window: "1 m" as const,
    },
    "/api/ai/cost-analysis": {
      requests: 10,
      window: "1 m" as const,
    },
    "/api/ai/decision": {
      requests: 5,
      window: "1 m" as const,
    },
    "/api/parser/menu": {
      requests: 10,
      window: "1 m" as const,
    },
    "/api/ihale/upload": {
      requests: 10,
      window: "10 m" as const, // 10 uploads per 10 minutes
    },
    "/api/metrics": {
      requests: 60,
      window: "1 m" as const,
    },
  },
} as const;

/**
 * Cache Configuration
 */
export const CACHE_CONFIG = {
  // TTL (Time To Live) in seconds
  TTL: {
    ANALYSIS_RESULT: 3600, // 1 hour
    METRICS: 300, // 5 minutes
    NOTIFICATIONS: 60, // 1 minute
    USER_DATA: 1800, // 30 minutes
  },

  // Cache key prefixes
  KEYS: {
    ANALYSIS: "analysis",
    METRICS: "metrics",
    NOTIFICATIONS: "notifications",
    USER: "user",
  },
} as const;


/**
 * Check if Redis is configured
 */
export function isRedisConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/**
 * Get feature status for monitoring
 */
export function getFeatureStatus() {
  return {
    rateLimiting: {
      enabled: FEATURE_FLAGS.RATE_LIMITING_ENABLED,
      configured: isRedisConfigured(),
    },
    caching: {
      enabled: FEATURE_FLAGS.CACHING_ENABLED,
      configured: isRedisConfigured(),
    },
  };
}
