import { NextRequest, NextResponse } from 'next/server';
import { initMarketSchema, seedMarketPrices, getMarketStats } from '@/lib/db/init-market';

/**
 * Market veritabanı initialization endpoint
 * POST /api/market/admin/init
 * Body: { seed?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { seed = false } = body;

    // Initialize schema
    initMarketSchema();

    let seeded = false;
    if (seed) {
      // Check if already seeded
      const stats = getMarketStats();
      if (stats.totalRecords === 0) {
        seedMarketPrices();
        seeded = true;
      } else {
        return NextResponse.json({
          ok: false,
          error: 'already_seeded',
          message: `Veritabanında zaten ${stats.totalRecords} kayıt var`,
          stats,
        }, { status: 400 });
      }
    }

    // Get final stats
    const finalStats = getMarketStats();

    return NextResponse.json({
      ok: true,
      message: 'Market veritabanı başarıyla oluşturuldu',
      seeded,
      stats: finalStats,
    });
  } catch (error: unknown) {
    console.error('[Market Admin] Init error:', error);

    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';

    return NextResponse.json({
      ok: false,
      error: 'initialization_failed',
      message,
    }, { status: 500 });
  }
}

/**
 * Veritabanı istatistikleri
 * GET /api/market/admin/init
 */
export async function GET() {
  try {
    const stats = getMarketStats();

    return NextResponse.json({
      ok: true,
      stats,
    });
  } catch (error: unknown) {
    console.error('[Market Admin] Stats error:', error);

    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';

    return NextResponse.json({
      ok: false,
      error: 'stats_failed',
      message,
    }, { status: 500 });
  }
}
