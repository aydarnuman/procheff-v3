/**
 * AnalysisRepository Unit Tests
 * Tests for database operations and FTS5 search
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalysisRepository } from '../analysis-repository';
import type {} from '@/lib/tender-analysis/types';
import type { DataPool, SourceLocation } from '@/lib/document-processor/types';

const createMockDataPool = (): DataPool => ({
  documents: [],
  textBlocks: [],
  tables: [],
  dates: [],
  amounts: [],
  entities: [],
  rawText: '',
  metadata: {
    total_pages: 0,
    total_words: 0,
    extraction_time_ms: 0,
    ocr_used: false,
    languages_detected: [],
    warnings: []
  },
  provenance: new Map<string, SourceLocation>()
});

// Mock database
vi.mock('../sqlite-client', () => {
  const mockDB = {
    prepare: vi.fn(),
    exec: vi.fn(),
  };

  return {
    getDB: () => mockDB,
  };
});

describe('AnalysisRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveAPIMetric', () => {
    it('should save API metric successfully', () => {
      const { getDB } = require('../sqlite-client');
      const db = getDB();
      const mockStmt = {
        run: vi.fn(),
      };
      db.prepare.mockReturnValue(mockStmt);

      AnalysisRepository.saveAPIMetric({
        endpoint: '/api/ai/cost-analysis',
        model: 'claude-sonnet-4-20250514',
        input_tokens: 1000,
        output_tokens: 500,
        total_tokens: 1500,
        cost_usd: 0.015,
        duration_ms: 1200,
        success: true,
      });

      expect(db.prepare).toHaveBeenCalled();
      expect(mockStmt.run).toHaveBeenCalled();
    });

    it('should handle errors gracefully', () => {
      const { getDB } = require('../sqlite-client');
      const db = getDB();
      db.prepare.mockImplementation(() => {
        throw new Error('DB error');
      });

      // Should not throw
      expect(() => {
        AnalysisRepository.saveAPIMetric({
          endpoint: '/api/test',
          success: true,
        });
      }).not.toThrow();
    });
  });

  describe('getCostStats', () => {
    it('should return cost statistics', async () => {
      const { getDB } = require('../sqlite-client');
      const db = getDB();
      
      const mockMetrics = [
        {
          endpoint: '/api/ai/cost-analysis',
          model: 'claude-sonnet-4-20250514',
          cost_usd: 0.01,
          success: 1,
        },
        {
          endpoint: '/api/ai/decision',
          model: 'claude-sonnet-4-20250514',
          cost_usd: 0.02,
          success: 1,
        },
      ];

      const mockStmt = {
        all: vi.fn().mockReturnValue(mockMetrics),
      };
      db.prepare.mockReturnValue(mockStmt);

      const stats = await AnalysisRepository.getCostStats(30);

      expect(stats.total_requests).toBe(2);
      expect(stats.total_cost).toBe(0.03);
      expect(stats.by_endpoint).toBeDefined();
    });
  });

  describe('FTS5 Search', () => {
    it('should perform full-text search', () => {
      const { getDB } = require('../sqlite-client');
      const db = getDB();
      
      const mockResults = [
        {
          id: 'analysis-1',
          institution: 'Test Kurum',
          status: 'completed',
        },
      ];

      const mockStmt = {
        all: vi.fn().mockReturnValue(mockResults),
      };
      db.prepare.mockReturnValue(mockStmt);

      const results = AnalysisRepository.search('test query', 20);

      expect(db.prepare).toHaveBeenCalled();
      expect(results).toBeDefined();
    });

    it('should handle search errors gracefully', () => {
      const { getDB } = require('../sqlite-client');
      const db = getDB();
      db.prepare.mockImplementation(() => {
        throw new Error('Search error');
      });

      const results = AnalysisRepository.search('test', 20);
      expect(results).toEqual([]);
    });
  });

  describe('DataPool Operations', () => {
    it('should save DataPool with expiration', () => {
      const { getDB } = require('../sqlite-client');
      const db = getDB();
      
      const mockStmt = {
        run: vi.fn(),
      };
      db.prepare.mockReturnValue(mockStmt);

      const dataPool = createMockDataPool();

      AnalysisRepository.saveDataPool('test-id', dataPool, 24);

      expect(db.prepare).toHaveBeenCalled();
      expect(mockStmt.run).toHaveBeenCalled();
    });

    it('should get DataPool by ID', async () => {
      const { getDB } = require('../sqlite-client');
      const db = getDB();

      const mockDataPool = createMockDataPool();

      const mockStmt = {
        get: vi.fn().mockReturnValue({
          data_pool_json: JSON.stringify(mockDataPool),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }),
      };
      db.prepare.mockReturnValue(mockStmt);

      const result = await AnalysisRepository.getDataPool('test-id');

      expect(result).toBeDefined();
      expect(result?.documents).toBeDefined();
    });

    it('should return null for expired DataPool', async () => {
      const { getDB } = require('../sqlite-client');
      const db = getDB();

      const mockStmt = {
        get: vi.fn().mockReturnValue(null),
      };
      db.prepare.mockReturnValue(mockStmt);

      const result = await AnalysisRepository.getDataPool('expired-id');

      expect(result).toBeNull();
    });
  });

  describe('cleanupExpiredDataPools', () => {
    it('should cleanup expired DataPools', () => {
      const { getDB } = require('../sqlite-client');
      const db = getDB();
      
      const mockStmt = {
        run: vi.fn().mockReturnValue({ changes: 5 }),
      };
      db.prepare.mockReturnValue(mockStmt);

      const deleted = AnalysisRepository.cleanupExpiredDataPools();

      expect(deleted).toBe(5);
      expect(db.prepare).toHaveBeenCalled();
    });
  });
});

