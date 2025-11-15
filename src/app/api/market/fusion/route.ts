import { NextRequest, NextResponse } from 'next/server';
import { MarketFusionEngine } from '@/lib/market/fusion-engine';
import { getDatabase } from '@/lib/db/universal-client';
import type { MarketQuote } from '@/lib/market/schema';

/**
 * Enhanced Market Fusion API
 * GET /api/market/fusion?product=tavuk-eti&enhanced=true
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const product = searchParams.get('product');
    const enhanced = searchParams.get('enhanced') === 'true';
    const minSources = parseInt(searchParams.get('minSources') || '2');
    const maxAge = parseInt(searchParams.get('maxAge') || '30'); // days

    if (!product) {
      return NextResponse.json(
        { ok: false, error: 'Product parameter is required' },
        { status: 400 }
      );
    }

    // Fetch quotes from database
    const db = await getDatabase();
    const quotes = await db.query(`
      SELECT
        mp.product_key,
        mp.unit_price,
        mp.market_key as source,
        mp.brand,
        mp.weight,
        mp.created_at as asOf,
        mp.stock_status,
        ms.source_name as market_name,
        ms.reliability_score as source_trust
      FROM market_prices mp
      LEFT JOIN market_sources ms ON mp.market_key = ms.source_key
      WHERE mp.product_key = $1
        AND mp.created_at > CURRENT_TIMESTAMP - INTERVAL '${maxAge} days'
      ORDER BY mp.created_at DESC
    `, [product]) as any[];

    if (quotes.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No quotes found for this product' },
        { status: 404 }
      );
    }

    if (quotes.length < minSources) {
      return NextResponse.json(
        {
          ok: false,
          error: `Insufficient sources. Need at least ${minSources}, found ${quotes.length}`
        },
        { status: 400 }
      );
    }

    // Transform to MarketQuote format
    const marketQuotes: MarketQuote[] = quotes.map(q => ({
      product_key: q.product_key,
      raw_query: product,
      unit: 'kg',
      unit_price: q.unit_price,
      currency: 'TRY' as const,
      source: q.source,
      brand: q.brand,
      quantity: q.weight || 1,
      asOf: q.asOf,
      sourceTrust: q.source_trust || 0.5,
      meta: {
        stock_status: q.stock_status,
        market_name: q.market_name,
      },
    }));

    if (enhanced) {
      // Use enhanced fusion engine
      const engine = new MarketFusionEngine({
        minSourceCount: minSources,
        maxPriceAge: maxAge,
      });

      const fusion = engine.fuseQuotes(marketQuotes) as any;

      return NextResponse.json({
        ok: true,
        product,
        fusion: {
          fusedPrice: fusion.fusedPrice,
          confidence: fusion.confidence,
          sources: fusion.sources,
          brandOptions: fusion.brandOptions,
          stockStatus: fusion.stockStatus,
          asOf: fusion.asOf,
        },
        score: fusion.score, // Enhanced scoring
        mode: 'enhanced',
      });
    } else {
      // Use basic fusion (legacy)
      const { fuseSync } = await import('@/lib/market/fuse');
      const fusion = fuseSync(marketQuotes);

      return NextResponse.json({
        ok: true,
        product,
        fusion,
        mode: 'basic',
      });
    }

  } catch (error) {
    console.error('[Market Fusion API] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Fusion failed'
      },
      { status: 500 }
    );
  }
}

/**
 * Batch fusion for multiple products
 * POST /api/market/fusion
 * Body: { products: string[], enhanced: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { products= true, minSources = 2, maxAge = 30 } = body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Products array is required' },
        { status: 400 }
      );
    }

    if (products.length > 50) {
      return NextResponse.json(
        { ok: false, error: 'Maximum 50 products allowed per batch' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const engine = new MarketFusionEngine({
      minSourceCount: minSources,
      maxPriceAge: maxAge,
    });

    const results: any[] = [];

    for (const product of products) {
      try {
        const quotes = await db.query(`
          SELECT
            mp.product_key,
            mp.unit_price,
            mp.market_key as source,
            mp.brand,
            mp.weight,
            mp.created_at as asOf,
            mp.stock_status,
            ms.reliability_score as source_trust
          FROM market_prices mp
          LEFT JOIN market_sources ms ON mp.market_key = ms.source_key
          WHERE mp.product_key = $1
            AND mp.created_at > CURRENT_TIMESTAMP - INTERVAL '${maxAge} days'
          ORDER BY mp.created_at DESC
        `, [product]) as any[];

        if (quotes.length < minSources) {
          results.push({
            product,
            ok: false,
            error: 'Insufficient sources',
          });
          continue;
        }

        const marketQuotes: MarketQuote[] = quotes.map(q => ({
          product_key: q.product_key,
          raw_query: product,
          unit: 'kg',
          unit_price: q.unit_price,
          currency: 'TRY' as const,
          source: q.source,
          brand: q.brand,
          quantity: q.weight || 1,
          asOf: q.asOf,
          sourceTrust: q.source_trust || 0.5,
          meta: {
            stock_status: q.stock_status,
          },
        }));

        const fusion = engine.fuseQuotes(marketQuotes) as any;

        results.push({
          product,
          ok: true,
          fusion: {
            fusedPrice: fusion.fusedPrice,
            confidence: fusion.confidence,
            stockStatus: fusion.stockStatus,
          },
          score: fusion.score,
        });

      } catch (error) {
        results.push({
          product,
          ok: false,
          error: error instanceof Error ? error.message : 'Fusion failed',
        });
      }
    }

    return NextResponse.json({
      ok: true,
      count: results.length,
      successful: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length,
      results,
    });

  } catch (error) {
    console.error('[Market Fusion Batch API] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Batch fusion failed'
      },
      { status: 500 }
    );
  }
}
