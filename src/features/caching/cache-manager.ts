import { getRedisClient } from "../rate-limiting/redis-client";
import { FEATURE_FLAGS } from "../config";

/**
 * Cache Manager
 *
 * Redis-based caching with graceful degradation.
 * If caching is disabled or Redis is unavailable, operations pass through.
 */

export interface CacheOptions {
  /**
   * Time to live in seconds
   */
  ttl?: number;

  /**
   * Tags for cache invalidation
   */
  tags?: string[];
}

/**
 * Get value from cache
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  if (!FEATURE_FLAGS.CACHING_ENABLED) {
    return null;
  }

  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    const value = await redis.get(key);
    if (!value) {
      return null;
    }

    // Parse JSON if it's a string
    if (typeof value === "string") {
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    }

    return value as T;
  } catch (error) {
    console.error(`[Cache] Error getting key ${key}:`, error);
    return null;
  }
}

/**
 * Set value in cache
 */
export async function setCache<T>(
  key: string,
  value: T,
  options?: CacheOptions
): Promise<boolean> {
  if (!FEATURE_FLAGS.CACHING_ENABLED) {
    return false;
  }

  const redis = getRedisClient();
  if (!redis) {
    return false;
  }

  try {
    const serialized =
      typeof value === "string" ? value : JSON.stringify(value);

    if (options?.ttl) {
      await redis.set(key, serialized, { ex: options.ttl });
    } else {
      await redis.set(key, serialized);
    }

    // Store tags if provided (for invalidation)
    if (options?.tags && options.tags.length > 0) {
      const tagPromises = options.tags.map((tag) =>
        redis.sadd(`tag:${tag}`, key)
      );
      await Promise.all(tagPromises);
    }

    return true;
  } catch (error) {
    console.error(`[Cache] Error setting key ${key}:`, error);
    return false;
  }
}

/**
 * Delete value from cache
 */
export async function deleteFromCache(key: string): Promise<boolean> {
  if (!FEATURE_FLAGS.CACHING_ENABLED) {
    return false;
  }

  const redis = getRedisClient();
  if (!redis) {
    return false;
  }

  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error(`[Cache] Error deleting key ${key}:`, error);
    return false;
  }
}

/**
 * Invalidate cache by tag
 */
export async function invalidateCacheByTag(tag: string): Promise<number> {
  if (!FEATURE_FLAGS.CACHING_ENABLED) {
    return 0;
  }

  const redis = getRedisClient();
  if (!redis) {
    return 0;
  }

  try {
    // Get all keys with this tag
    const keys = await redis.smembers(`tag:${tag}`);
    if (!keys || keys.length === 0) {
      return 0;
    }

    // Delete all keys
    await redis.del(...keys);

    // Delete the tag set itself
    await redis.del(`tag:${tag}`);

    return keys.length;
  } catch (error) {
    console.error(`[Cache] Error invalidating tag ${tag}:`, error);
    return 0;
  }
}

/**
 * Clear all cache (use with caution!)
 */
export async function clearAllCache(): Promise<boolean> {
  if (!FEATURE_FLAGS.CACHING_ENABLED) {
    return false;
  }

  const redis = getRedisClient();
  if (!redis) {
    return false;
  }

  try {
    await redis.flushdb();
    return true;
  } catch (error) {
    console.error("[Cache] Error clearing all cache:", error);
    return false;
  }
}

/**
 * Wrapper function for cached operations
 *
 * Usage:
 * ```ts
 * const result = await withCache(
 *   "analysis:abc123",
 *   async () => await expensiveOperation(),
 *   { ttl: 3600 }
 * );
 * ```
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  // Try to get from cache
  const cached = await getFromCache<T>(key);
  if (cached !== null) {
    console.log(`[Cache] HIT: ${key}`);
    return cached;
  }

  console.log(`[Cache] MISS: ${key}`);

  // Execute fetcher
  const result = await fetcher();

  // Store in cache (fire and forget)
  setCache(key, result, options).catch((err) =>
    console.error(`[Cache] Failed to set ${key}:`, err)
  );

  return result;
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  enabled: boolean;
  connected: boolean;
  keys?: number;
} | null> {
  if (!FEATURE_FLAGS.CACHING_ENABLED) {
    return { enabled: false, connected: false };
  }

  const redis = getRedisClient();
  if (!redis) {
    return { enabled: true, connected: false };
  }

  try {
    const dbsize = await redis.dbsize();
    return {
      enabled: true,
      connected: true,
      keys: dbsize,
    };
  } catch (error) {
    console.error("[Cache] Error getting stats:", error);
    return { enabled: true, connected: false };
  }
}
