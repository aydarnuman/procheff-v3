import { CACHE_CONFIG } from "../config";
import { withCache, invalidateCacheByTag } from "./cache-manager";
import { getAnalysisCacheKey, getMetricsCacheKey } from "./keys";

/**
 * Caching Strategies
 *
 * Pre-configured caching patterns for common operations.
 */

/**
 * Cache analysis result by file hash
 *
 * Strategy: Long TTL (1 hour) since analysis is expensive and deterministic
 */
export async function cacheAnalysisResult<T>(
  fileHash: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const key = getAnalysisCacheKey(fileHash);
  return withCache(key, fetcher, {
    ttl: CACHE_CONFIG.TTL.ANALYSIS_RESULT,
    tags: ["analysis"],
  });
}

/**
 * Cache metrics
 *
 * Strategy: Medium TTL (5 minutes) to balance freshness and performance
 */
export async function cacheMetrics<T>(
  timeWindow: "1h" | "24h" | "7d",
  fetcher: () => Promise<T>
): Promise<T> {
  const key = getMetricsCacheKey(timeWindow);
  return withCache(key, fetcher, {
    ttl: CACHE_CONFIG.TTL.METRICS,
    tags: ["metrics"],
  });
}

/**
 * Invalidate all analysis caches
 * Call this when a new analysis is completed
 */
export async function invalidateAnalysisCaches(): Promise<number> {
  return invalidateCacheByTag("analysis");
}

/**
 * Invalidate all metrics caches
 * Call this when metrics data changes
 */
export async function invalidateMetricsCaches(): Promise<number> {
  return invalidateCacheByTag("metrics");
}

/**
 * Stale-While-Revalidate pattern
 *
 * Returns cached data immediately while fetching fresh data in background
 */
export async function cacheWithSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttl?: number; staleTime?: number }
): Promise<T> {
  const { ttl = 300, staleTime = 60 } = options || {};

  // Try to get from cache
  const { getFromCache, setCache } = await import("./cache-manager");
  const cached = await getFromCache<{
    data: T;
    timestamp: number;
  }>(key);

  const now = Date.now();

  // If cached and not stale, return immediately
  if (cached && now - cached.timestamp < staleTime * 1000) {
    return cached.data;
  }

  // If cached but stale, return stale data and revalidate in background
  if (cached) {
    // Return stale data immediately
    const staleData = cached.data;

    // Revalidate in background (fire and forget)
    fetcher()
      .then((freshData) => {
        setCache(
          key,
          { data: freshData, timestamp: Date.now() },
          { ttl }
        ).catch((error) => console.error(`[SWR] Failed to update ${key}:`, error));
      })
      .catch((error) => console.error(`[SWR] Revalidation failed for ${key}:`, error));

    return staleData;
  }

  // No cached data, fetch fresh
  const data = await fetcher();
  await setCache(key, { data, timestamp: Date.now() }, { ttl });
  return data;
}
