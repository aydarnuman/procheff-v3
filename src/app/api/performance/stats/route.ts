import { getCacheStats } from "@/features/caching/cache-manager";
import { FEATURE_FLAGS, RATE_LIMIT_CONFIG } from "@/features/config";
import { checkRedisHealth, getRedisClient } from "@/features/rate-limiting/redis-client";
import { NextResponse } from "next/server";

/**
 * GET /api/performance/stats
 * 
 * Returns rate limiting and caching statistics
 */
export async function GET() {
  try {
    const redis = getRedisClient();
    const isRedisHealthy = redis ? await checkRedisHealth() : false;

    // Rate Limit Stats
    let rateLimitStats = null;
    if (FEATURE_FLAGS.RATE_LIMITING_ENABLED && redis) {
      try {
        // Get rate limit keys from Redis
        const keys = await redis.keys("ratelimit:*");
        const totalRequests = keys.length;
        
        // Get per-endpoint stats
        const endpointStats: Record<string, { requests: number; limit: number }> = {};
        for (const [endpoint, config] of Object.entries(RATE_LIMIT_CONFIG.ENDPOINTS)) {
          const key = `ratelimit:${endpoint}`;
          const count = await redis.get(key) || 0;
          endpointStats[endpoint] = {
            requests: typeof count === 'number' ? count : 0,
            limit: config.requests,
          };
        }

        rateLimitStats = {
          enabled: true,
          totalRequests,
          endpointStats,
          globalLimit: RATE_LIMIT_CONFIG.GLOBAL.requests,
        };
      } catch (error) {
        console.error("[Performance Stats] Error fetching rate limit stats:", error);
        rateLimitStats = {
          enabled: true,
          error: "Failed to fetch rate limit stats",
        };
      }
    } else {
      rateLimitStats = {
        enabled: false,
        message: "Rate limiting is disabled or Redis not configured",
      };
    }

    // Cache Stats
    let cacheStats = null;
    if (FEATURE_FLAGS.CACHING_ENABLED && redis) {
      try {
        const stats = await getCacheStats();
        cacheStats = stats;
      } catch (error) {
        console.error("[Performance Stats] Error fetching cache stats:", error);
        cacheStats = {
          enabled: true,
          error: "Failed to fetch cache stats",
        };
      }
    } else {
      cacheStats = {
        enabled: false,
        message: "Caching is disabled or Redis not configured",
      };
    }

    // Redis Health
    const redisHealth = {
      connected: isRedisHealthy,
      configured: !!redis,
      latency: null as number | null,
    };

    if (redis && isRedisHealthy) {
      try {
        const start = Date.now();
        await redis.ping();
        redisHealth.latency = Date.now() - start;
      } catch (error) {
        console.error("[Performance Stats] Error checking Redis latency:", error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        rateLimit: rateLimitStats,
        cache: cacheStats,
        redis: redisHealth,
        featureFlags: {
          rateLimiting: FEATURE_FLAGS.RATE_LIMITING_ENABLED,
          caching: FEATURE_FLAGS.CACHING_ENABLED,
        },
      },
    });
  } catch (error) {
    console.error("[Performance Stats] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

