import { NextRequest, NextResponse } from 'next/server';
import { BulkRequestSchema } from '@/lib/market/schema';

/**
 * Toplu ürün fiyat sorgulama
 * POST /api/market/bulk
 * Body: { items: [{ product: string, unit?: string }] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const validation = BulkRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          ok: false,
          error: 'validation_error',
          message: validation.error.issues[0].message,
        },
        { status: 400 }
      );
    }

    const { items } = validation.data;

    // Rate limiting - max 50 items at once
    if (items.length > 50) {
      return NextResponse.json(
        {
          ok: false,
          error: 'too_many_items',
          message: 'Bir seferde maksimum 50 ürün sorgulanabilir',
        },
        { status: 400 }
      );
    }

    // Process items sequentially (to respect rate limits)
    const results = [];

    for (const item of items) {
      try {
        // Call the single price endpoint
        const response = await fetch(
          new URL('/api/market/price', req.url).toString(),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(item),
          }
        );

        const data = await response.json();

        results.push({
          product: item.product,
          unit: item.unit,
          ...data,
        });
      } catch (error) {
        results.push({
          product: item.product,
          unit: item.unit,
          ok: false,
          error: 'fetch_failed',
          message: 'Fiyat getirilemedi',
        });
      }
    }

    // Calculate summary stats
    const successful = results.filter(r => r.ok).length;
    const failed = results.length - successful;

    return NextResponse.json({
      ok: true,
      total: results.length,
      successful,
      failed,
      results,
    });
  } catch (error: unknown) {
    console.error('[Market API] Bulk endpoint error:', error);

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

/**
 * CSV formatında toplu export
 * GET /api/market/bulk?format=csv
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format');

    if (format === 'csv') {
      // Return CSV template
      const csvTemplate = `product,unit
tavuk eti,kg
zeytinyağı,lt
makarna,kg
süt,lt`;

      return new NextResponse(csvTemplate, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="piyasa-robotu-template.csv"',
        },
      });
    }

    return NextResponse.json({
      ok: false,
      error: 'invalid_format',
      message: 'Geçersiz format. Desteklenen: csv',
    }, { status: 400 });
  } catch (error: unknown) {
    console.error('[Market API] Bulk GET error:', error);

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
