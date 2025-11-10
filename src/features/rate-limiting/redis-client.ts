import { Redis } from "@upstash/redis";
import { isRedisConfigured } from "../config";

/**
 * Upstash Redis Client (Serverless)
 *
 * Singleton pattern to reuse connection across requests.
 * Gracefully handles missing configuration.
 */

let redisInstance: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!isRedisConfigured()) {
    console.warn(
      "[Redis] Not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN"
    );
    return null;
  }

  if (!redisInstance) {
    try {
      redisInstance = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
      console.log("[Redis] Client initialized successfully");
    } catch (error) {
      console.error("[Redis] Failed to initialize:", error);
      return null;
    }
  }

  return redisInstance;
}

/**
 * Check Redis connection health
 */
export async function checkRedisHealth(): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.ping();
    return true;
  } catch (error) {
    console.error("[Redis] Health check failed:", error);
    return false;
  }
}
