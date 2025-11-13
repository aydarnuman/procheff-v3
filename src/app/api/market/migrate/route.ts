import { NextResponse } from 'next/server';
import { runAllMigrations, getMigrationReport, checkMigrationStatus } from '@/lib/market/migration';
import { initTrustScoreTable } from '@/lib/market/trust-score';
import { AILogger } from '@/lib/ai/logger';

/**
 * Market Migration Endpoint
 * GET /api/market/migrate
 * Database migration'larini calistirir
 */
export async function GET() {
  try {
    AILogger.info('[Migration API] Baslat ildi');

    // Onceki durum
    const beforeStatus = checkMigrationStatus();

    // Migration'lari calistir
    runAllMigrations();

    // Trust score tablosu
    try {
      initTrustScoreTable();
    } catch (error) {
      AILogger.warn('[Migration API] Trust score tablosu zaten mevcut');
    }

    // Sonraki durum
    const afterStatus = checkMigrationStatus();
    const allComplete = Object.values(afterStatus).every(v => v);

    AILogger.info('[Migration API] Tamamlandi', { 
      success: allComplete,
      status: afterStatus
    });

    return NextResponse.json({
      ok: true,
      message: allComplete 
        ? 'Tum migration\'lar basarili!' 
        : 'Bazi migration\'lar tamamlanamadi',
      before: beforeStatus,
      after: afterStatus,
      report: getMigrationReport()
    });
  } catch (error) {
    AILogger.error('[Migration API] Hata', {
      error: error instanceof Error ? error.message : 'Unknown'
    });

    return NextResponse.json({
      ok: false,
      error: 'migration_failed',
      message: error instanceof Error ? error.message : 'Migration hatasi'
    }, { status: 500 });
  }
}

