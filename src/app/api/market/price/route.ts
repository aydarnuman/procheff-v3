import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import type { MarketQuote } from '@/lib/market/schema';
import { normalizeProductPipeline } from '@/lib/market/product-normalizer';
import { tuikQuote } from '@/lib/market/provider/tuik';
import { webQuote } from '@/lib/market/provider/web';
import { dbQuote, last12Months, seriesOf } from '@/lib/market/provider/db';
import { aiQuote, shouldUseAI } from '@/lib/market/provider/ai';
import { fuse } from '@/lib/market/fuse';
import { forecastNextMonth } from '@/lib/market/forecast';
import { cacheGet, cacheSet } from '@/lib/market/cache';
import { analyzeVolatility } from '@/lib/market/volatility';
import { AILogger } from '@/lib/ai/logger';
import { MarketAIPriceSchema } from '@/lib/validation/market-ai-price';
import { validateRequest } from '@/lib/utils/validate';

/**
 * Tek ürün fiyat sorgulama
 * POST /api/market/price
 * Body: { product: string, unit?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { product } = await validateRequest(req, MarketAIPriceSchema);

    // YENİ: Advanced product normalization pipeline
    const normalized = await normalizeProductPipeline(product);

    if (!normalized.productKey || normalized.confidence < 0.3) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_product',
          message: 'Ürün tanımlanamadı',
          suggestions: normalized.suggestions
        },
        { status: 400 }
      );
    }
    
    const product_key = normalized.productKey;
    
    AILogger.info('[Market API] Product normalized', {
      input: product,
      canonical: normalized.canonical,
      confidence: normalized.confidence,
      method: normalized.method
    });

    // Check cache
    const cacheKey = product_key;
    const cached = await cacheGet(cacheKey);

    if (cached) {
      return NextResponse.json({
        ok: true,
        data: cached,
        cached: true,
        normalized: { product_key, canonical: normalized.canonical },
      });
    }

    // Fetch from all providers (parallel)
    const [qTuik, qWeb, qDb] = await Promise.all([
      tuikQuote(product_key),
      webQuote(product_key),
      dbQuote(product_key),
    ]);

    // Fuse quotes
    const quotes = [qTuik, qWeb, qDb].filter(Boolean) as MarketQuote[];

    // Try AI fallback if needed
    if (shouldUseAI(quotes)) {
      console.log('[Market API] Using AI fallback for', product_key);
      const qAi = await aiQuote(product_key, quotes[0]?.unit || 'kg');
      if (qAi) {
        quotes.push(qAi);
      }
    }

    if (quotes.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'no_data',
          message: 'Bu ürün için fiyat bilgisi bulunamadı',
          product_key,
          suggestions: normalized.suggestions
        },
        { status: 404 }
      );
    }

    // YENİ: Gelişmiş füzyon (validation, brand prices, dynamic trust)
    const history = await last12Months(product_key);
    const fusion = await fuse(quotes, {
      enableValidation: true,
      enableBrandPrices: true,
      useDynamicTrust: true,
      priceHistory: history
    });

    if (!fusion) {
      return NextResponse.json(
        {
          ok: false,
          error: 'fusion_failed',
          message: 'Fiyat füzyonu başarısız (validasyondan geçemedi)',
        },
        { status: 500 }
      );
    }

    // YENİ: Forecast ekle
    if (history && history.length >= 3) {
      const forecast = forecastNextMonth(history);
      if (forecast) {
        fusion.forecast = {
          ...forecast,
          trend: fusion.volatility?.trend
        };
      }
    }
    
    // YENİ: Volatility analizi ekle
    const priceHistory = await seriesOf(product_key, 90); // Son 90 gün
    if (priceHistory && priceHistory.length >= 7) {
      const volatility = analyzeVolatility(priceHistory);
      fusion.volatility = volatility;
    }

    // Cache the result
    await cacheSet(cacheKey, fusion);
    
    AILogger.info('[Market API] Fusion completed', {
      product_key,
      price: fusion.price,
      confidence: fusion.conf,
      sources: fusion.sources.length,
      brands: fusion.priceByBrand?.length || 0
    });

    return NextResponse.json({
      ok: true,
      data: fusion,
      cached: false,
      normalized: {
        product_key,
        canonical: normalized.canonical,
        confidence: normalized.confidence,
        method: normalized.method,
        category: normalized.category,
        variant: normalized.variant
      },
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'validation_error',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    console.error('[Market API] Price endpoint error:', error);

    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';

    return NextResponse.json(
      {
        ok: false,
        error: 'internal_error',
        message,
      },
      { status: 500 }
    );
  }
}
