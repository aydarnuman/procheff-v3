import { NextRequest, NextResponse } from 'next/server';
import { PriceRequestSchema } from '@/lib/market/schema';
import { normalizeProductName } from '@/lib/market/normalize';
import { tuikQuote } from '@/lib/market/provider/tuik';
import { webQuote } from '@/lib/market/provider/web';
import { dbQuote, last12Months } from '@/lib/market/provider/db';
import { fuse } from '@/lib/market/fuse';
import { forecastNextMonth } from '@/lib/market/forecast';
import { cacheGet, cacheSet } from '@/lib/market/cache';

/**
 * Tek ürün fiyat sorgulama
 * POST /api/market/price
 * Body: { product: string, unit?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const validation = PriceRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'validation_error',
          message: validation.error.errors[0].message,
        },
        { status: 400 }
      );
    }

    const { product } = validation.data;

    // Normalize product name
    const { product_key, base } = normalizeProductName(product);

    if (!product_key) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_product',
          message: 'Geçersiz ürün adı',
        },
        { status: 400 }
      );
    }

    // Check cache
    const cacheKey = product_key;
    const cached = await cacheGet(cacheKey);

    if (cached) {
      return NextResponse.json({
        ok: true,
        data: cached,
        cached: true,
        normalized: { product_key, base },
      });
    }

    // Fetch from all providers (parallel)
    const [qTuik, qWeb, qDb] = await Promise.all([
      tuikQuote(product_key),
      webQuote(product_key),
      dbQuote(product_key),
    ]);

    // Fuse quotes
    const quotes = [qTuik, qWeb, qDb].filter(Boolean);

    if (quotes.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'no_data',
          message: 'Bu ürün için fiyat bilgisi bulunamadı',
          product_key,
        },
        { status: 404 }
      );
    }

    const fusion = fuse(quotes);

    if (!fusion) {
      return NextResponse.json(
        {
          ok: false,
          error: 'fusion_failed',
          message: 'Fiyat füzyonu başarısız',
        },
        { status: 500 }
      );
    }

    // Add forecast
    const history = await last12Months(product_key);
    if (history && history.length >= 3) {
      const forecast = forecastNextMonth(history);
      if (forecast) {
        fusion.forecast = forecast;
      }
    }

    // Cache the result
    await cacheSet(cacheKey, fusion);

    return NextResponse.json({
      ok: true,
      data: fusion,
      cached: false,
      normalized: { product_key, base },
    });
  } catch (error: unknown) {
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
