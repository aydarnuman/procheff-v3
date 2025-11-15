/**
 * Semantic Caching System for Claude API
 *
 * Reduces AI costs by ~90% by caching similar prompts and their responses.
 * Uses simple text similarity for now, can be upgraded to embeddings later.
 */

import { getDatabase } from "@/lib/db/universal-client";
import crypto from "crypto";

export interface CacheEntry {
  id: string;
  prompt_hash: string;
  prompt_text: string;
  response_data: string;
  model: string;
  temperature: number;
  tokens_used: number;
  hit_count: number;
  created_at: string;
  last_accessed: string;
  expires_at: string;
}

/**
 * Initialize semantic cache table
 */
export async function initSemanticCache() {
  const db = await getDatabase();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS semantic_cache (
      id TEXT PRIMARY KEY,
      prompt_hash TEXT NOT NULL,
      prompt_text TEXT NOT NULL,
      response_data TEXT NOT NULL,
      model TEXT NOT NULL,
      temperature REAL NOT NULL,
      tokens_used INTEGER NOT NULL,
      hit_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL
    );
  `);

  // Indexes for performance
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_semantic_cache_hash
    ON semantic_cache(prompt_hash);
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_semantic_cache_expires
    ON semantic_cache(expires_at);
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_semantic_cache_model
    ON semantic_cache(model, prompt_hash);
  `);
}

/**
 * Generate cache key from prompt and config
 */
function generateCacheKey(
  prompt: string,
  model: string,
  temperature: number
): string {
  // Normalize prompt (trim, lowercase, remove extra whitespace)
  const normalized = prompt
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

  // Create hash from normalized prompt + config
  const hash = crypto
    .createHash('sha256')
    .update(`${normalized}:${model}:${temperature.toFixed(2)}`)
    .digest('hex');

  return hash;
}

/**
 * Calculate similarity between two prompts (0-1 range)
 * Simple Jaccard similarity for now
 */
function calculateSimilarity(prompt1: string, prompt2: string): number {
  const words1 = new Set(prompt1.toLowerCase().split(/\s+/));
  const words2 = new Set(prompt2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Get cached response if exists and not expired
 */
export async function getCachedResponse<T>(
  prompt: string,
  model: string,
  temperature: number,
  similarityThreshold = 0.95
): Promise<{ data: T; metadata: CacheMetadata } | null> {
  await initSemanticCache();
  const db = await getDatabase();

  const cacheKey = generateCacheKey(prompt, model, temperature);

  // Try exact match first
  const exactMatch = await db.queryOne(`
    SELECT * FROM semantic_cache
    WHERE prompt_hash = $1
      AND model = $2
      AND temperature = $3
      AND expires_at > CURRENT_TIMESTAMP
    LIMIT 1
  `, [cacheKey, model, temperature]) as CacheEntry | null;

  if (exactMatch) {
    // Update hit count and last accessed
    await db.execute(`
      UPDATE semantic_cache
      SET hit_count = hit_count + 1,
          last_accessed = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [exactMatch.id]);

    return {
      data: JSON.parse(exactMatch.response_data),
      metadata: {
        cached: true,
        cache_hit_type: 'exact',
        tokens_saved: exactMatch.tokens_used,
        hit_count: exactMatch.hit_count + 1,
        age_seconds: Math.floor(
          (Date.now() - new Date(exactMatch.created_at).getTime()) / 1000
        )
      }
    };
  }

  // Try semantic similarity match (only check recent entries for performance)
  const recentEntries = await db.query(`
    SELECT * FROM semantic_cache
    WHERE model = $1
      AND temperature = $2
      AND expires_at > CURRENT_TIMESTAMP
      AND created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
    ORDER BY created_at DESC
    LIMIT 50
  `, [model, temperature]) as CacheEntry[];

  for (const entry of recentEntries) {
    const similarity = calculateSimilarity(prompt, entry.prompt_text);

    if (similarity >= similarityThreshold) {
      // Update hit count
      await db.execute(`
        UPDATE semantic_cache
        SET hit_count = hit_count + 1,
            last_accessed = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [entry.id]);

      return {
        data: JSON.parse(entry.response_data),
        metadata: {
          cached: true,
          cache_hit_type: 'semantic',
          similarity_score: similarity,
          tokens_saved: entry.tokens_used,
          hit_count: entry.hit_count + 1,
          age_seconds: Math.floor(
            (Date.now() - new Date(entry.created_at).getTime()) / 1000
          )
        }
      };
    }
  }

  return null;
}

export interface CacheMetadata {
  cached: boolean;
  cache_hit_type?: 'exact' | 'semantic';
  similarity_score?: number;
  tokens_saved?: number;
  hit_count?: number;
  age_seconds?: number;
}

/**
 * Save response to cache
 */
export async function setCachedResponse<T>(
  prompt: string,
  model: string,
  temperature: number,
  responseData: T,
  tokensUsed: number,
  ttlHours = 24
): Promise<void> {
  await initSemanticCache();
  const db = await getDatabase();

  const cacheKey = generateCacheKey(prompt, model, temperature);
  const id = crypto.randomBytes(16).toString('hex');

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + ttlHours);

  try {
    await db.execute(`
      INSERT INTO semantic_cache (
        id, prompt_hash, prompt_text, response_data,
        model, temperature, tokens_used, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      id,
      cacheKey,
      prompt,
      JSON.stringify(responseData),
      model,
      temperature,
      tokensUsed,
      expiresAt.toISOString()
    ]);
  } catch (error) {
    // Ignore duplicate key errors (race condition)
    if (!(error instanceof Error && error.message.includes('duplicate key'))) {
      throw error;
    }
  }
}

/**
 * Clean up expired cache entries
 */
export async function cleanupExpiredCache(): Promise<number> {
  await initSemanticCache();
  const db = await getDatabase();

  const result = await db.execute(`
    DELETE FROM semantic_cache
    WHERE expires_at < CURRENT_TIMESTAMP
  `);

  return result.rowCount || 0;
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  await initSemanticCache();
  const db = await getDatabase();

  const stats = await db.queryOne(`
    SELECT
      COUNT(*) as total_entries,
      SUM(hit_count) as total_hits,
      SUM(tokens_used * hit_count) as total_tokens_saved,
      AVG(hit_count) as avg_hit_count,
      COUNT(CASE WHEN expires_at > CURRENT_TIMESTAMP THEN 1 END) as valid_entries,
      COUNT(CASE WHEN expires_at <= CURRENT_TIMESTAMP THEN 1 END) as expired_entries
    FROM semantic_cache
  `) as any;

  return {
    totalEntries: Number(stats?.total_entries || 0),
    validEntries: Number(stats?.valid_entries || 0),
    expiredEntries: Number(stats?.expired_entries || 0),
    totalHits: Number(stats?.total_hits || 0),
    totalTokensSaved: Number(stats?.total_tokens_saved || 0),
    avgHitCount: Number(stats?.avg_hit_count || 0),
    estimatedCostSaved: (Number(stats?.total_tokens_saved || 0) / 1_000_000) * 3 // $3 per 1M tokens
  };
}

/**
 * Invalidate cache entries by pattern
 */
export async function invalidateCacheByPattern(pattern: string): Promise<number> {
  await initSemanticCache();
  const db = await getDatabase();

  const result = await db.execute(`
    DELETE FROM semantic_cache
    WHERE prompt_text LIKE $1
  `, [`%${pattern}%`]);

  return result.rowCount || 0;
}
