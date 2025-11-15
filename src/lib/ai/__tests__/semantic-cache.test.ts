import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getCachedResponse,
  setCachedResponse,
  getCacheStats,
  cleanupExpiredCache,
  invalidateCacheByPattern
} from '../semantic-cache';
import { getDB } from '@/lib/db/sqlite-client';

describe('Semantic Cache', () => {
  beforeEach(() => {
    // Clean up test data before each test
    const db = getDB();
    try {
      db.prepare('DELETE FROM semantic_cache').run();
    } catch (error) {
      // Table might not exist yet, ignore
    }
  });

  afterEach(() => {
    // Clean up test data after each test
    const db = getDB();
    try {
      db.prepare('DELETE FROM semantic_cache').run();
    } catch (error) {
      // Ignore
    }
  });

  describe('setCachedResponse', () => {
    it('should cache a response successfully', async () => {
      const prompt = 'Test prompt';
      const model = 'claude-sonnet-4-20250514';
      const temperature = 0.4;
      const responseData = { result: 'test result' };
      const tokensUsed = 100;

      await setCachedResponse(prompt, model, temperature, responseData, tokensUsed);

      const cached = await getCachedResponse(prompt, model, temperature);
      expect(cached).not.toBeNull();
      expect(cached?.data).toEqual(responseData);
      expect(cached?.metadata.tokens_saved).toBe(tokensUsed);
    });

    it('should handle duplicate cache entries gracefully', async () => {
      const prompt = 'Duplicate test';
      const model = 'claude-sonnet-4-20250514';
      const temperature = 0.4;
      const responseData = { result: 'test' };

      // First insertion
      await setCachedResponse(prompt, model, temperature, responseData, 100);

      // Second insertion (should not throw)
      await expect(async () => {
        await setCachedResponse(prompt, model, temperature, responseData, 100);
      }).resolves.not.toThrow();
    });
  });

  describe('getCachedResponse', () => {
    it('should return null for cache miss', async () => {
      const result = await getCachedResponse(
        'Non-existent prompt',
        'claude-sonnet-4-20250514',
        0.4
      );
      expect(result).toBeNull();
    });

    it('should return exact match for identical prompts', async () => {
      const prompt = 'Exact match test';
      const model = 'claude-sonnet-4-20250514';
      const temperature = 0.4;
      const responseData = { answer: '42' };

      await setCachedResponse(prompt, model, temperature, responseData, 150);

      const cached = await getCachedResponse(prompt, model, temperature);

      expect(cached).not.toBeNull();
      expect(cached?.metadata.cache_hit_type).toBe('exact');
      expect(cached?.data).toEqual(responseData);
    });

    it('should find semantic match for similar prompts', async () => {
      const originalPrompt = 'What is the capital of France?';
      const similarPrompt = 'what is the capital of france';
      const model = 'claude-sonnet-4-20250514';
      const temperature = 0.4;
      const responseData = { answer: 'Paris' };

      await setCachedResponse(originalPrompt, model, temperature, responseData, 200);

      const cached = await getCachedResponse(similarPrompt, model, temperature, 0.9);

      expect(cached).not.toBeNull();
      expect(cached?.metadata.cache_hit_type).toBe('semantic');
      expect(cached?.metadata.similarity_score).toBeGreaterThan(0.9);
    });

    it('should not match when similarity is below threshold', async () => {
      const originalPrompt = 'Tell me about cats';
      const differentPrompt = 'Tell me about quantum physics';
      const model = 'claude-sonnet-4-20250514';
      const temperature = 0.4;

      await setCachedResponse(originalPrompt, model, temperature, { data: 'cats' }, 100);

      const cached = await getCachedResponse(differentPrompt, model, temperature, 0.95);

      expect(cached).toBeNull();
    });

    it('should respect model parameter', async () => {
      const prompt = 'Model test';
      const responseData = { test: true };

      await setCachedResponse(prompt, 'model-a', 0.4, responseData, 100);

      const cachedSameModel = await getCachedResponse(prompt, 'model-a', 0.4);
      const cachedDifferentModel = await getCachedResponse(prompt, 'model-b', 0.4);

      expect(cachedSameModel).not.toBeNull();
      expect(cachedDifferentModel).toBeNull();
    });

    it('should respect temperature parameter', async () => {
      const prompt = 'Temperature test';
      const responseData = { test: true };

      await setCachedResponse(prompt, 'claude-sonnet-4-20250514', 0.5, responseData, 100);

      const cachedSameTemp = await getCachedResponse(prompt, 'claude-sonnet-4-20250514', 0.5);
      const cachedDifferentTemp = await getCachedResponse(prompt, 'claude-sonnet-4-20250514', 0.4);

      expect(cachedSameTemp).not.toBeNull();
      expect(cachedDifferentTemp).toBeNull();
    });
  });

  describe('getCacheStats', () => {
    it('should return zero stats for empty cache', async () => {
      const stats = await getCacheStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.totalHits).toBe(0);
      expect(stats.totalTokensSaved).toBe(0);
    });

    it('should calculate stats correctly after caching', async () => {
      const prompt = 'Stats test';
      const model = 'claude-sonnet-4-20250514';
      const temperature = 0.4;

      await setCachedResponse(prompt, model, temperature, { data: 'test' }, 100);

      // Hit cache twice
      await getCachedResponse(prompt, model, temperature);
      await getCachedResponse(prompt, model, temperature);

      const stats = await getCacheStats();

      expect(stats.totalEntries).toBe(1);
      expect(stats.totalHits).toBe(2);
      expect(stats.totalTokensSaved).toBe(200); // 100 tokens * 2 hits
    });
  });

  describe('cleanupExpiredCache', () => {
    it('should remove expired entries', async () => {
      const db = getDB();
      const prompt = 'Expired test';
      const model = 'claude-sonnet-4-20250514';
      const temperature = 0.4;

      // Add an entry with past expiration
      await setCachedResponse(prompt, model, temperature, { data: 'test' }, 100, 24);

      // Manually set expiration to past
      db.prepare(`
        UPDATE semantic_cache
        SET expires_at = datetime('now', '-1 day')
      `).run();

      const deletedCount = cleanupExpiredCache();

      expect(deletedCount).toBe(1);

      const cached = await getCachedResponse(prompt, model, temperature);
      expect(cached).toBeNull();
    });

    it('should not remove valid entries', async () => {
      const prompt = 'Valid test';
      const model = 'claude-sonnet-4-20250514';
      const temperature = 0.4;

      await setCachedResponse(prompt, model, temperature, { data: 'test' }, 100, 24);

      const deletedCount = cleanupExpiredCache();

      expect(deletedCount).toBe(0);

      const cached = await getCachedResponse(prompt, model, temperature);
      expect(cached).not.toBeNull();
    });
  });

  describe('invalidateCacheByPattern', () => {
    it('should invalidate matching entries', async () => {
      const model = 'claude-sonnet-4-20250514';
      const temperature = 0.4;

      await setCachedResponse('Test about cats', model, temperature, { data: 'cats' }, 100);
      await setCachedResponse('Test about dogs', model, temperature, { data: 'dogs' }, 100);
      await setCachedResponse('Different topic', model, temperature, { data: 'other' }, 100);

      const deletedCount = invalidateCacheByPattern('about');

      expect(deletedCount).toBe(2);

      const cached1 = await getCachedResponse('Test about cats', model, temperature);
      const cached2 = await getCachedResponse('Different topic', model, temperature);

      expect(cached1).toBeNull();
      expect(cached2).not.toBeNull();
    });
  });
});






