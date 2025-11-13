import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../ai/deep-analysis/route';
import { NextRequest } from 'next/server';

// Mock AIProviderFactory
vi.mock('@/lib/ai/provider-factory', () => ({
  AIProviderFactory: {
    createStructuredMessage: vi.fn().mockResolvedValue({
      data: {
        kurum: 'Test Kurumu',
        ihale_turu: 'Test İhale',
        butce: '1000000',
        sure: '12 ay',
        analiz: 'Test analysis result',
        riskler: ['Risk 1', 'Risk 2'],
        oneriler: ['Öneri 1', 'Öneri 2'],
      },
      metadata: {
        duration_ms: 2000,
        input_tokens: 500,
        output_tokens: 1500,
        total_tokens: 2000,
        cost_usd: 0.025,
      }
    })
  }
}));

// Mock AILogger
vi.mock('@/lib/ai/logger', () => ({
  AILogger: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }
}));

// Mock AnalysisRepository
vi.mock('@/lib/db/analysis-repository', () => ({
  AnalysisRepository: {
    saveAPIMetric: vi.fn(),
  }
}));

// Mock rate limiting
vi.mock('@/features/rate-limiting/middleware', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  addRateLimitHeaders: vi.fn((response, _) => response),
}));

describe('Deep Analysis API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/ai/deep-analysis', () => {
    it('should return successful analysis result', async () => {
      const requestBody = {
        extracted_data: {
          kurum: 'Test Kurumu',
          ihale_turu: 'Yemek İhalesi',
          butce: '1000000 TL',
        }
      };

      const request = new NextRequest('http://localhost:3001/api/ai/deep-analysis', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('kurum');
      expect(data.data).toHaveProperty('analiz');
      expect(data.meta).toHaveProperty('duration_ms');
      expect(data.meta).toHaveProperty('total_tokens');
    });

    it('should include contextual analysis when provided', async () => {
      const requestBody = {
        extracted_data: {
          kurum: 'Test Kurumu',
          ihale_turu: 'Yemek İhalesi',
        },
        contextual_analysis: {
          risk_score: 75,
          recommendations: ['Test recommendation']
        }
      };

      const request = new NextRequest('http://localhost:3001/api/ai/deep-analysis', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 500 on invalid request body', async () => {
      const request = new NextRequest('http://localhost:3001/api/ai/deep-analysis', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
    });

    it('should save API metrics on success', async () => {
      const { AnalysisRepository } = await import('@/lib/db/analysis-repository');
      
      const requestBody = {
        extracted_data: {
          kurum: 'Test Kurumu',
        }
      };

      const request = new NextRequest('http://localhost:3001/api/ai/deep-analysis', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      await POST(request);

      expect(AnalysisRepository.saveAPIMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: '/api/ai/deep-analysis',
          success: true,
          total_tokens: expect.any(Number),
        })
      );
    });

    it('should include cache metadata when response is cached', async () => {
      const { AIProviderFactory } = await import('@/lib/ai/provider-factory');
      
      // Mock cached response
      vi.mocked(AIProviderFactory.createStructuredMessage).mockResolvedValueOnce({
        data: {
          kurum: 'Test',
          ihale_turu: 'Test',
          butce: '1000000',
          sure: '12',
          analiz: 'Cached analysis',
          riskler: [],
          oneriler: [],
        },
        metadata: {
          duration_ms: 5,
          input_tokens: 0,
          output_tokens: 0,
          total_tokens: 0,
          cost_usd: 0,
          cached: true,
          cache_hit_type: 'exact',
          tokens_saved: 2000,
        }
      });

      const requestBody = {
        extracted_data: { kurum: 'Test' }
      };

      const request = new NextRequest('http://localhost:3001/api/ai/deep-analysis', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.meta.cached).toBe(true);
      expect(data.meta.cost_usd).toBe(0);
    });
  });
});






