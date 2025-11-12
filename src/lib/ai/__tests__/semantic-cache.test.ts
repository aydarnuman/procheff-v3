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
    } catch {
      // Table might not exist yet, ignore
    }
  });

  afterEach(() => {
    // Clean up test data after each test
    const db = getDB();
    try {
      db.prepare('DELETE FROM semantic_cache').run();
    } catch {
      // Ignore
    }
  });

  describe('setCachedResponse', () => {
    it('should cache a response successfully', () => {
      const prompt = 'Test prompt';
      const model = 'claude-sonnet-4-20250514';
      const temperature = 0.4;
      const responseData = { result: 'test result' };
      const tokensUsed = 100;

      setCachedResponse(prompt, model, temperature, responseData, tokensUsed);

      const cached = getCachedResponse(prompt, model, temperature);
      expect(cached).not.toBeNull();
      expect(cached?.data).toEqual(responseData);
      expect(cached?.metadata.tokens_saved).toBe(tokensUsed);
    });

    it('should handle duplicate cache entries gracefully', () => {
      const prompt = 'Duplicate test';
      const model = 'claude-sonnet-4-20250514';
      const temperature = 0.4;
      const responseData = { result: 'test' };

      // First insertion
      setCachedResponse(prompt, model, temperature, responseData, 100);
      
      // Second insertion (should not throw)
      expect(() => {
        setCachedResponse(prompt, model, temperature, responseData, 100);
      }).not.toThrow();
    });
  });

  describe('getCachedResponse', () => {
    it('should return null for cache miss', () => {
      const result = getCachedResponse(
        'Non-existent prompt',
        'claude-sonnet-4-20250514',
        0.4
      );
      expect(result).toBeNull();
    });

    it('should return exact match for identical prompts', () => {
      const prompt = 'Exact match test';
      const model = 'claude-sonnet-4-20250514';
      const temperature = 0.4;
      const responseData = { answer: '42' };

      setCachedResponse(prompt, model, temperature, responseData, 150);

      const cached = getCachedResponse(prompt, model, temperature);
      
      expect(cached).not.toBeNull();
      expect(cached?.metadata.cache_hit_type).toBe('exact');
      expect(cached?.data).toEqual(responseData);
    });

    it('should find semantic match for similar prompts', () => {
      const originalPrompt = 'What is the capital of France?';
      const similarPrompt = 'what is the capital of france';
      const model = 'claude-sonnet-4-20250514';
      const temperature = 0.4;
      const responseData = { answer: 'Paris' };

      setCachedResponse(originalPrompt, model, temperature, responseData, 200);

      const cached = getCachedResponse(similarPrompt, model, temperature, 0.9);
      
      expect(cached).not.toBeNull();
      expect(cached?.metadata.cache_hit_type).toBe('semantic');
      expect(cached?.metadata.similarity_score).toBeGreaterThan(0.9);
    });

    it('should not match when similarity is below threshold', () => {
      const originalPrompt = 'Tell me about cats';
      const differentPrompt = 'Tell me about quantum physics';
      const model = 'claude-sonnet-4-20250514';
      const temperature = 0.4;

      setCachedResponse(originalPrompt, model, temperature, { data: 'cats' }, 100);

      const cached = getCachedResponse(differentPrompt, model, temperature, 0.95);
      
      expect(cached).toBeNull();
    });

    it('should respect model parameter', () => {
      const prompt = 'Model test';
      const responseData = { test: true };

      setCachedResponse(prompt, 'model-a', 0.4, responseData, 100);

      const cachedSameModel = getCachedResponse(prompt, 'model-a', 0.4);
      const cachedDifferentModel = getCachedResponse(prompt, 'model-b', 0.4);

      expect(cachedSameModel).not.toBeNull();
      expect(cachedDifferentModel).toBeNull();
    });

    it('should respect temperature parameter', () => {
      const prompt = 'Temperature test';
      const responseData = { test: true };

      setCachedResponse(prompt, 'claude-sonnet-4-20250514', 0.5, responseData, 100);

      const cachedSameTemp = getCachedResponse(prompt, 'claude-sonnet-4-20250514', 0.5);
      const cachedDifferentTemp = getCachedResponse(prompt, 'claude-sonnet-4-20250514', 0.4);

      expect(cachedSameTemp).not.toBeNull();
      expect(cachedDifferentTemp).toBeNull();
    });
  });

  describe('getCacheStats', () => {
    it('should return zero stats for empty cache', () => {
      const stats = getCacheStats();
      
      expect(stats.totalEntries).toBe(0);
      expect(stats.totalHits).toBe(0);
      expect(stats.totalTokensSaved).toBe(0);
    });

    it('should calculate stats correctly after caching', () => {
      const prompt = 'Stats test';
      const model = 'claude-sonnet-4-20250514';
      const temperature = 0.4;

      setCachedResponse(prompt, model, temperature, { data: 'test' }, 100);
      
      // Hit cache twice
      getCachedResponse(prompt, model, temperature);
      getCachedResponse(prompt, model, temperature);

      const stats = getCacheStats();
      
      expect(stats.totalEntries).toBe(1);
      expect(stats.totalHits).toBe(2);
      expect(stats.totalTokensSaved).toBe(200); // 100 tokens * 2 hits
    });
  });

  describe('cleanupExpiredCache', () => {
    it('should remove expired entries', () => {
      const db = getDB();
      const prompt = 'Expired test';
      const model = 'claude-sonnet-4-20250514';
      const temperature = 0.4;

      // Add an entry with past expiration
      setCachedResponse(prompt, model, temperature, { data: 'test' }, 100, 24);
      
      // Manually set expiration to past
      db.prepare(`
        UPDATE semantic_cache 
        SET expires_at = datetime('now', '-1 day')
      `).run();

      const deletedCount = cleanupExpiredCache();
      
      expect(deletedCount).toBe(1);
      
      const cached = getCachedResponse(prompt, model, temperature);
      expect(cached).toBeNull();
    });

    it('should not remove valid entries', () => {
      const prompt = 'Valid test';
      const model = 'claude-sonnet-4-20250514';
      const temperature = 0.4;

      setCachedResponse(prompt, model, temperature, { data: 'test' }, 100, 24);

      const deletedCount = cleanupExpiredCache();
      
      expect(deletedCount).toBe(0);
      
      const cached = getCachedResponse(prompt, model, temperature);
      expect(cached).not.toBeNull();
    });
  });

  describe('invalidateCacheByPattern', () => {
    it('should invalidate matching entries', () => {
      const model = 'claude-sonnet-4-20250514';
      const temperature = 0.4;

      setCachedResponse('Test about cats', model, temperature, { data: 'cats' }, 100);
      setCachedResponse('Test about dogs', model, temperature, { data: 'dogs' }, 100);
      setCachedResponse('Different topic', model, temperature, { data: 'other' }, 100);

      const deletedCount = invalidateCacheByPattern('about');
      
      expect(deletedCount).toBe(2);
      
      const cached1 = getCachedResponse('Test about cats', model, temperature);
      const cached2 = getCachedResponse('Different topic', model, temperature);
      
      expect(cached1).toBeNull();
      expect(cached2).not.toBeNull();
    });
  });
});



