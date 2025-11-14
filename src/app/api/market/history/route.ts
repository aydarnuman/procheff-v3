import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { normalizeProductName } from '@/lib/market/normalize';
import { seriesOf } from '@/lib/market/provider/db';
import { analyzeTrend } from '@/lib/market/forecast';
import { MarketHistoryQuerySchema } from '@/lib/validation/market-history';

/**
 * Ürün fiyat geçmişi
 * GET /api/market/history?product=tavuk%20eti&months=12
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const { product, months } = MarketHistoryQuerySchema.parse({
      product: searchParams.get('product'),
      months: searchParams.get('months'),
    });

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

    // Fetch historical data
    const series = await seriesOf(product_key, months);

    if (series.length === 0) {
      return NextResponse.json(
        {
          ok: true,
          product_key,
          base,
          series: [],
          message: 'Bu ürün için geçmiş veri bulunamadı',
        }
      );
    }

    // Analyze trend
    const prices = series.map(s => s.price);
    const trend = analyzeTrend(prices);

    // Calculate summary stats
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const latestPrice = prices[prices.length - 1];

    return NextResponse.json({
      ok: true,
      product_key,
      base,
      series,
      stats: {
        count: series.length,
        min: Number(minPrice.toFixed(2)),
        max: Number(maxPrice.toFixed(2)),
        avg: Number(avgPrice.toFixed(2)),
        latest: Number(latestPrice.toFixed(2)),
        trend,
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

    console.error('[Market API] History endpoint error:', error);

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
