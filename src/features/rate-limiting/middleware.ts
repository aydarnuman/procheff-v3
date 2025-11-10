import { Ratelimit } from "@upstash/ratelimit";
import { getRedisClient } from "./redis-client";
import { FEATURE_FLAGS, RATE_LIMIT_CONFIG } from "../config";
import { NextResponse } from "next/server";

/**
 * Rate Limiter using Upstash Redis
 *
 * Features:
 * - Sliding window algorithm
 * - Per-user and per-IP limiting
 * - Graceful degradation (works without Redis)
 * - Custom limits per endpoint
 */

// Cache rate limiters per endpoint
const rateLimiters = new Map<string, Ratelimit>();

/**
 * Get or create rate limiter for an endpoint
 */
function getRateLimiter(endpoint: string): Ratelimit | null {
  // Feature flag check
  if (!FEATURE_FLAGS.RATE_LIMITING_ENABLED) {
    return null;
  }

  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  // Return cached limiter
  if (rateLimiters.has(endpoint)) {
    return rateLimiters.get(endpoint)!;
  }

  // Get config for this endpoint
  const config =
    RATE_LIMIT_CONFIG.ENDPOINTS[
      endpoint as keyof typeof RATE_LIMIT_CONFIG.ENDPOINTS
    ] || RATE_LIMIT_CONFIG.GLOBAL;

  // Create new limiter
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    analytics: true,
    prefix: `ratelimit:${endpoint}`,
  });

  rateLimiters.set(endpoint, limiter);
  return limiter;
}

/**
 * Rate limit check middleware
 *
 * Usage in API route:
 * ```ts
 * const limitResult = await checkRateLimit(req, "/api/ai/deep-analysis");
 * if (!limitResult.success) {
 *   return limitResult.response;
 * }
 * ```
 */
export async function checkRateLimit(
  req: Request,
  endpoint: string
): Promise<{
  success: boolean;
  response?: NextResponse;
  remaining?: number;
  limit?: number;
  reset?: number;
}> {
  const limiter = getRateLimiter(endpoint);

  // If rate limiting is disabled or not configured, allow all requests
  if (!limiter) {
    return { success: true };
  }

  try {
    // Get identifier (user ID from auth, or IP address)
    const identifier = await getIdentifier(req);

    // Check rate limit
    const { success, limit, remaining, reset } = await limiter.limit(
      identifier
    );

    if (!success) {
      // Rate limit exceeded
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: "Rate limit exceeded",
            message: `Too many requests. Please try again in ${Math.ceil((reset - Date.now()) / 1000)} seconds.`,
            limit,
            remaining: 0,
            reset,
          },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": limit.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": reset.toString(),
              "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
            },
          }
        ),
      };
    }

    // Success - request allowed
    return {
      success: true,
      remaining,
      limit,
      reset,
    };
  } catch (error) {
    // On error, allow request (fail open)
    console.error("[Rate Limit] Error checking limit:", error);
    return { success: true };
  }
}

/**
 * Get identifier for rate limiting
 * Priority: user_id > IP address
 */
async function getIdentifier(req: Request): Promise<string> {
  // TODO: Extract user_id from JWT token when auth is implemented
  // For now, use IP address

  // Get IP from various headers (Vercel/Cloudflare)
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip =
    forwarded?.split(",")[0].trim() ||
    realIp ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  return `ip:${ip}`;
}

/**
 * Add rate limit headers to successful response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  rateLimit?: {
    remaining?: number;
    limit?: number;
    reset?: number;
  }
): NextResponse {
  if (!rateLimit) return response;

  if (rateLimit.limit !== undefined) {
    response.headers.set("X-RateLimit-Limit", rateLimit.limit.toString());
  }
  if (rateLimit.remaining !== undefined) {
    response.headers.set(
      "X-RateLimit-Remaining",
      rateLimit.remaining.toString()
    );
  }
  if (rateLimit.reset !== undefined) {
    response.headers.set("X-RateLimit-Reset", rateLimit.reset.toString());
  }

  return response;
}

/**
 * Get rate limit status for a user (for monitoring/debugging)
 */
export async function getRateLimitStatus(
  identifier: string,
  endpoint: string
): Promise<{
  limit: number;
  remaining: number;
  reset: number;
} | null> {
  const limiter = getRateLimiter(endpoint);
  if (!limiter) return null;

  try {
    const result = await limiter.limit(identifier);
    return {
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error("[Rate Limit] Error getting status:", error);
    return null;
  }
}
