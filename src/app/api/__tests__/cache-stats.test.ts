import { describe, it, expect, beforeEach } from 'vitest';
import { GET, DELETE } from '../cache/stats/route';
import { setCachedResponse} from '@/lib/ai/semantic-cache';
import { getDatabase } from '@/lib/db/universal-client';

describe('Cache Stats API', () => {
  beforeEach(async () => {
    // Clean up cache before each test
    const db = await getDatabase();
    try {
      await db.execute('DELETE FROM semantic_cache');
    } catch (error) {
      // Ignore if table doesn't exist
    }
  });

  describe('GET /api/cache/stats', () => {
    it('should return cache statistics', async () => {
      // Add some cache entries
      setCachedResponse('test prompt 1', 'claude-sonnet-4-20250514', 0.4, { data: 'test' }, 100);
      setCachedResponse('test prompt 2', 'claude-sonnet-4-20250514', 0.4, { data: 'test' }, 200);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('totalEntries');
      expect(data.data).toHaveProperty('validEntries');
      expect(data.data).toHaveProperty('cacheEfficiency');
      expect(data.data.totalEntries).toBeGreaterThanOrEqual(2);
    });

    it('should return zero stats for empty cache', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalEntries).toBe(0);
      expect(data.data.totalHits).toBe(0);
    });

    it('should calculate estimated monthly savings', async () => {
      setCachedResponse('expensive prompt', 'claude-sonnet-4-20250514', 0.4, { data: 'test' }, 10000);

      const response = await GET();
      const data = await response.json();

      expect(data.data).toHaveProperty('estimatedMonthlySavings');
      expect(parseFloat(data.data.estimatedMonthlySavings)).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/cache/cleanup', () => {
    it('should cleanup expired cache entries', async () => {
      const db = await getDatabase();

      // Add an expired entry
      setCachedResponse('expired prompt', 'claude-sonnet-4-20250514', 0.4, { data: 'test' }, 100);

      // Manually set expiration to past
      await db.execute(`
        UPDATE semantic_cache
        SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 day'
      `);

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.deletedCount).toBe(1);
    });

    it('should not delete valid cache entries', async () => {
      // Add valid entries
      setCachedResponse('valid prompt 1', 'claude-sonnet-4-20250514', 0.4, { data: 'test' }, 100);
      setCachedResponse('valid prompt 2', 'claude-sonnet-4-20250514', 0.4, { data: 'test' }, 100);

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.deletedCount).toBe(0);
    });
  });
});






