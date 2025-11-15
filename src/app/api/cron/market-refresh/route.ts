import { NextRequest, NextResponse } from 'next/server';
import { normalizeProductPipeline } from '@/lib/market/product-normalizer';
import { tuikQuote } from '@/lib/market/provider/tuik';
import { webQuote } from '@/lib/market/provider/web';
import { dbQuote } from '@/lib/market/provider/db';
import { aiQuote, shouldUseAI } from '@/lib/market/provider/ai';
import { fuse } from '@/lib/market/fuse';
import { cacheSet} from '@/lib/market/cache';
import type { MarketQuote } from '@/lib/market/schema';


/**
 * Market cache refresh cron job
 * Popüler ürünlerin fiyatlarını yeniden sorgular ve cache'i günceller
 *
 * GET /api/cron/market-refresh?secret=xxx
 *
 * Usage:
 * - Vercel Cron: vercel.json içinde tanımlayın
 * - GitHub Actions: Saatlik workflow ile çağırın
 * - External: cURL ile manuel tetikleyin
 */
export async function GET(req: NextRequest) {
  try {
    // Security: Check secret
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        {
          ok: false,
          error: 'unauthorized',
          message: 'Invalid secret',
        },
        { status: 401 }
      );
    }

    // Popüler ürünler listesi (en çok sorulan 30 ürün)
    const popularProducts = [
      'tavuk eti',
      'zeytinyağı',
      'makarna',
      'süt',
      'yoğurt',
      'beyaz peynir',
      'domates',
      'sivri biber',
      'soğan',
      'sarımsak',
      'patates',
      'pirinç',
      'mercimek',
      'nohut',
      'fasulye',
      'un',
      'şeker',
      'tuz',
      'karabiber',
      'kırmızı biber',
      'limon',
      'salata',
      'havuç',
      'pırasa',
      'kabak',
      'patlıcan',
      'biber',
      'maydanoz',
      'dereotu',
      'nane',
    ];

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const product of popularProducts) {
      try {
        const normalized = await normalizeProductPipeline(product);
        const product_key = normalized.productKey;

        // Fetch from all providers
        const [qTuik, qWeb, qDb] = await Promise.all([
          tuikQuote(product_key),
          webQuote(product_key),
          dbQuote(product_key),
        ]);

        const quotes = [qTuik, qWeb, qDb].filter(Boolean) as MarketQuote[];
        
        // Try AI fallback if needed
        if (shouldUseAI(quotes)) {
          const qAi = await aiQuote(product_key, 'kg');
          if (qAi) {
            quotes.push(qAi);
          }
        }

        if (quotes.length > 0) {
          const fusion = await fuse(quotes);

          if (fusion) {
            // Update cache
            await cacheSet(product_key, fusion, 3600); // 1 hour
            successCount++;
            results.push({
              product,
              product_key,
              price: fusion.price,
              conf: fusion.conf,
              status: 'success',
            });
          } else {
            failCount++;
            results.push({
              product,
              product_key,
              status: 'fusion_failed',
            });
          }
        } else {
          failCount++;
          results.push({
            product,
            product_key,
            status: 'no_data',
          });
        }
      } catch (error) {
        failCount++;
        results.push({
          product,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }

      // Rate limiting - 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return NextResponse.json({
      ok: true,
      message: 'Market cache refreshed',
      total: popularProducts.length,
      success: successCount,
      failed: failCount,
      results: results.slice(0, 10), // Return first 10 for brevity
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('[Cron] Market refresh error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        ok: false,
        error: 'cron_failed',
        message,
      },
      { status: 500 }
    );
  }
}
