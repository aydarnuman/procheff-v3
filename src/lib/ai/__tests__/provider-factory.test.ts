/**
 * AIProviderFactory Unit Tests
 * Tests for structured output functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIProviderFactory } from '../provider-factory';
import { COST_ANALYSIS_SCHEMA } from '../schemas';
import type { CostAnalysisResponse } from '../schemas';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn(),
      },
    })),
  };
});

describe('AIProviderFactory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton instance for each test
    (AIProviderFactory as any).claudeClient = null;
  });

  describe('getClaude', () => {
    it('should initialize Claude client with valid API key', () => {
      const client = AIProviderFactory.getClaude();
      expect(client).toBeDefined();
    });

    it('should throw error when API key is missing', () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      // Reset singleton
      (AIProviderFactory as any).claudeClient = null;
      delete process.env.ANTHROPIC_API_KEY;

      expect(() => {
        AIProviderFactory.getClaude();
      }).toThrow('ANTHROPIC_API_KEY environment variable is not set');

      process.env.ANTHROPIC_API_KEY = originalKey;
    });

    it('should throw error when API key format is invalid', () => {
      const originalKey = process.env.ANTHROPIC_API_KEY;
      // Reset singleton
      (AIProviderFactory as any).claudeClient = null;
      process.env.ANTHROPIC_API_KEY = 'invalid-key';

      expect(() => {
        AIProviderFactory.getClaude();
      }).toThrow('ANTHROPIC_API_KEY format is invalid');

      process.env.ANTHROPIC_API_KEY = originalKey;
    });
  });

  describe('createStructuredMessage', () => {
    beforeEach(() => {
      // Reset singleton for each test
      (AIProviderFactory as any).claudeClient = null;
    });

    it('should return structured response with valid data', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              gunluk_kisi_maliyeti: '45.50 TL',
              tahmini_toplam_gider: '125000 TL',
              onerilen_karlilik_orani: '%15.5',
              riskli_kalemler: ['Et', 'Sebze'],
              maliyet_dagilimi: {
                hammadde: '%45',
                iscilik: '%30',
                genel_giderler: '%20',
                kar: '%5',
              },
              optimizasyon_onerileri: ['Öneri 1', 'Öneri 2'],
            }),
          },
        ],
        usage: {
          input_tokens: 1000,
          output_tokens: 500,
        },
      };

      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const mockClient = new Anthropic();
      vi.mocked(mockClient.messages.create).mockResolvedValue(mockResponse as any);

      // Mock getClaude to return our mock client
      vi.spyOn(AIProviderFactory, 'getClaude').mockReturnValue(mockClient as any);

      const prompt = 'Test prompt';
      const result = await AIProviderFactory.createStructuredMessage<CostAnalysisResponse>(
        prompt,
        COST_ANALYSIS_SCHEMA,
        {
          temperature: 0.4,
          max_tokens: 8000,
        }
      );

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.gunluk_kisi_maliyeti).toBe('45.50 TL');
      expect(result.metadata).toBeDefined();
      expect(result.metadata.input_tokens).toBe(1000);
      expect(result.metadata.output_tokens).toBe(500);
      expect(result.metadata.total_tokens).toBe(1500);
      expect(result.metadata.cost_usd).toBeGreaterThan(0);
    });

    it('should calculate cost correctly', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              gunluk_kisi_maliyeti: '45.50 TL',
              tahmini_toplam_gider: '125000 TL',
              onerilen_karlilik_orani: '%15.5',
            }),
          },
        ],
        usage: {
          input_tokens: 1000000, // 1M tokens
          output_tokens: 1000000, // 1M tokens
        },
      };

      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const mockClient = new Anthropic();
      vi.mocked(mockClient.messages.create).mockResolvedValue(mockResponse as any);
      vi.spyOn(AIProviderFactory, 'getClaude').mockReturnValue(mockClient as any);

      const result = await AIProviderFactory.createStructuredMessage<CostAnalysisResponse>(
        'Test',
        COST_ANALYSIS_SCHEMA
      );

      // Pricing: $3 per 1M input tokens, $15 per 1M output tokens
      // Expected: (1 * 3) + (1 * 15) = $18
      expect(result.metadata.cost_usd).toBeCloseTo(18, 2);
    });

    it('should throw error on invalid JSON response', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: 'Invalid JSON response',
          },
        ],
        usage: {
          input_tokens: 100,
          output_tokens: 50,
        },
      };

      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const mockClient = new Anthropic();
      vi.mocked(mockClient.messages.create).mockResolvedValue(mockResponse as any);
      vi.spyOn(AIProviderFactory, 'getClaude').mockReturnValue(mockClient as any);

      await expect(
        AIProviderFactory.createStructuredMessage<CostAnalysisResponse>(
          'Test',
          COST_ANALYSIS_SCHEMA
        )
      ).rejects.toThrow();
    });

    it('should use default config when not provided', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              gunluk_kisi_maliyeti: '45.50 TL',
              tahmini_toplam_gider: '125000 TL',
              onerilen_karlilik_orani: '%15.5',
            }),
          },
        ],
        usage: {
          input_tokens: 100,
          output_tokens: 50,
        },
      };

      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const mockClient = new Anthropic();
      vi.mocked(mockClient.messages.create).mockResolvedValue(mockResponse as any);
      vi.spyOn(AIProviderFactory, 'getClaude').mockReturnValue(mockClient as any);

      await AIProviderFactory.createStructuredMessage<CostAnalysisResponse>(
        'Test',
        COST_ANALYSIS_SCHEMA
      );

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
          temperature: 0.4,
          max_tokens: 8000,
        })
      );
    });
  });
});

