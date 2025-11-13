import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AILogger } from '@/lib/ai/logger';
import { z } from 'zod';

/**
 * AI Product Classification Endpoint
 * Ürün adını normalize et ve kategorize et
 */

const RequestSchema = z.object({
  product: z.string().min(1, 'Ürün adı gerekli'),
  context: z.string().optional()
});

let claudeClient: Anthropic | null = null;

try {
  if (process.env.ANTHROPIC_API_KEY) {
    claudeClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
} catch (error) {
  AILogger.warn('[AI Classify] Claude client initialization failed');
}

export async function POST(req: NextRequest) {
  try {
    if (!claudeClient) {
      return NextResponse.json(
        {
          ok: false,
          error: 'ai_unavailable',
          message: 'AI servisi yapılandırılmamış'
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const validation = RequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'validation_error',
          message: validation.error.issues[0].message
        },
        { status: 400 }
      );
    }

    const { product, context } = validation.data;

    AILogger.info('[AI Classify] İstek alındı', { product });

    // Claude prompt
    const prompt = `Sen bir Türk mutfağı ve gıda ürünleri uzmanısın. Verilen ürün adını analiz edip aşağıdaki bilgileri JSON formatında ver:

Ürün: "${product}"
${context ? `Bağlam: ${context}` : ''}

Lütfen şu formatta yanıt ver:
{
  "canonical": "Standart ürün adı (örn: Tavuk Eti)",
  "category": "Kategori (et, sebze, tahıl, süt-ürünleri, yağ, baharat)",
  "variant": "Varyant varsa (göğüs, fileto, sızma, vb.) yoksa null",
  "confidence": 0.0-1.0 arası güven skoru,
  "alternatives": ["Alternatif 1", "Alternatif 2"],
  "suggestions": ["Varyant 1", "Varyant 2", "Varyant 3"]
}

SADECE JSON yanıt ver, başka açıklama ekleme.`;

    const response = await claudeClient.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 500,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Invalid response type from Claude');
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Claude response');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate result structure
    const resultValidation = z.object({
      canonical: z.string(),
      category: z.string(),
      variant: z.string().nullable(),
      confidence: z.number().min(0).max(1),
      alternatives: z.array(z.string()).optional(),
      suggestions: z.array(z.string()).optional()
    }).safeParse(result);

    if (!resultValidation.success) {
      throw new Error('Invalid response structure from Claude');
    }

    const classifiedProduct = resultValidation.data;

    AILogger.info('[AI Classify] Başarılı', {
      product,
      canonical: classifiedProduct.canonical,
      confidence: classifiedProduct.confidence
    });

    return NextResponse.json({
      ok: true,
      data: {
        ...classifiedProduct,
        method: 'ai',
        productKey: classifiedProduct.canonical
          .toLowerCase()
          .replace(/[ğ]/g, 'g')
          .replace(/[ü]/g, 'u')
          .replace(/[ş]/g, 's')
          .replace(/[ı]/g, 'i')
          .replace(/[ö]/g, 'o')
          .replace(/[ç]/g, 'c')
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
      }
    });
  } catch (error) {
    AILogger.error('[AI Classify] Hata', {
      error: error instanceof Error ? error.message : 'Unknown'
    });

    return NextResponse.json(
      {
        ok: false,
        error: 'classification_failed',
        message: error instanceof Error ? error.message : 'Sınıflandırma başarısız'
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint - health check
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    status: claudeClient ? 'available' : 'unavailable',
    message: claudeClient 
      ? 'AI classification servisi çalışıyor' 
      : 'AI servisi yapılandırılmamış'
  });
}

