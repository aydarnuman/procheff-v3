import { MarketQuote } from '../schema';
import Anthropic from '@anthropic-ai/sdk';

/**
 * AI fallback provider (Claude)
 * Diğer kaynaklardan veri bulunamazsa veya güven skoru düşükse AI'dan tahmin al
 */

let claudeClient: Anthropic | null = null;

// Initialize Claude client
try {
  if (process.env.ANTHROPIC_API_KEY) {
    claudeClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
} catch (error) {
  console.warn('[AI Provider] Claude client initialization failed:', error);
}

/**
 * Claude'dan fiyat tahmini al
 */
export async function aiQuote(product_key: string, unit = 'kg'): Promise<MarketQuote | null> {
  if (!claudeClient) {
    console.warn('[AI Provider] Claude client not available');
    return null;
  }

  try {
    const prompt = `Sen bir Türkiye piyasa fiyat uzmanısın. Aşağıdaki gıda ürünü için güncel ortalama perakende fiyat tahmini yap.

Ürün: ${product_key.replace(/-/g, ' ')}
Birim: ${unit}

Sadece rakamsal fiyat tahmini yap. Türkiye'deki ortalama market/hal fiyatlarını baz al.

Format: Sadece sayı (örn: "45.80")`;

    const response = await claudeClient.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 100,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return null;
    }

    // Extract number from response
    const text = content.text.trim();
    const match = text.match(/[\d,.]+/);

    if (!match) {
      console.warn('[AI Provider] Could not extract price from response:', text);
      return null;
    }

    const priceStr = match[0].replace(',', '.');
    const price = parseFloat(priceStr);

    if (isNaN(price) || price <= 0 || price > 10000) {
      console.warn('[AI Provider] Invalid price:', price);
      return null;
    }

    return {
      product_key,
      raw_query: product_key,
      unit,
      unit_price: Number(price.toFixed(2)),
      currency: 'TRY',
      asOf: new Date().toISOString().slice(0, 10),
      source: 'AI',
      meta: {
        model: 'claude-sonnet-4',
        confidence: 'low',
        note: 'AI-generated estimate',
      },
    };
  } catch (error) {
    console.error('[AI Provider] Error:', error);
    return null;
  }
}

/**
 * AI provider kullanım koşulları
 * Sadece şu durumlarda AI'dan tahmin al:
 * 1. Hiç kaynak yoksa
 * 2. Tek kaynak varsa ve güven skoru < 0.5
 * 3. Kaynak varyansı çok yüksekse (stddev/mean > 0.3)
 */
export function shouldUseAI(
  quotes: MarketQuote[],
  fusionConf?: number
): boolean {
  // Hiç kaynak yoksa
  if (quotes.length === 0) {
    return true;
  }

  // Tek kaynak ve düşük güven
  if (quotes.length === 1) {
    return true;
  }

  // Füzyon güveni çok düşükse
  if (fusionConf !== undefined && fusionConf < 0.5) {
    return true;
  }

  // Varyans çok yüksekse
  if (quotes.length >= 2) {
    const prices = quotes.map(q => q.unit_price);
    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean; // Coefficient of variation

    if (cv > 0.3) {
      // %30'dan fazla varyasyon varsa
      return true;
    }
  }

  return false;
}

/**
 * AI sağlık kontrolü
 */
export async function aiHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'down';
  message: string;
}> {
  if (!claudeClient) {
    return {
      status: 'down',
      message: 'Claude client not configured',
    };
  }

  try {
    // Basit bir test
    const testQuote = await aiQuote('test-product', 'kg');

    if (testQuote) {
      return {
        status: 'healthy',
        message: 'AI provider working',
      };
    }

    return {
      status: 'degraded',
      message: 'AI provider responded but result invalid',
    };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
