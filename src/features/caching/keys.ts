import { CACHE_CONFIG } from "../config";
import crypto from "crypto";

/**
 * Cache Key Generation
 *
 * Generates consistent, namespaced cache keys.
 */

/**
 * Generate cache key for analysis result
 * Based on file hash for deduplication
 */
export function getAnalysisCacheKey(fileHash: string): string {
  return `${CACHE_CONFIG.KEYS.ANALYSIS}:${fileHash}`;
}

/**
 * Generate cache key for metrics
 * Time-bucketed for consistent invalidation
 */
export function getMetricsCacheKey(
  timeWindow: "1h" | "24h" | "7d" = "24h"
): string {
  const now = Date.now();
  const bucketSize = {
    "1h": 5 * 60 * 1000, // 5 minutes
    "24h": 30 * 60 * 1000, // 30 minutes
    "7d": 60 * 60 * 1000, // 1 hour
  }[timeWindow];

  const bucket = Math.floor(now / bucketSize);
  return `${CACHE_CONFIG.KEYS.METRICS}:${timeWindow}:${bucket}`;
}

/**
 * Generate cache key for notifications
 * Per-user with read/unread filter
 */
export function getNotificationsCacheKey(
  userId?: string,
  unreadOnly: boolean = false
): string {
  const userPart = userId || "global";
  const filter = unreadOnly ? "unread" : "all";
  return `${CACHE_CONFIG.KEYS.NOTIFICATIONS}:${userPart}:${filter}`;
}

/**
 * Generate cache key for user data
 */
export function getUserCacheKey(userId: string, dataType: string): string {
  return `${CACHE_CONFIG.KEYS.USER}:${userId}:${dataType}`;
}

/**
 * Generate hash for content-based caching
 * Useful for deduplication
 */
export function generateContentHash(content: string | Buffer): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Generate cache key with custom prefix
 */
export function getCustomCacheKey(
  prefix: string,
  ...parts: (string | number)[]
): string {
  return `${prefix}:${parts.join(":")}`;
}
