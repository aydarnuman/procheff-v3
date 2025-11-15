import { getDatabase } from "@/lib/db/universal-client";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const db = await getDatabase();

    // Toplam log sayısı
    const totalResult = await db.queryOne("SELECT COUNT(*) AS count FROM logs") as { count: number } | undefined;
    const total = totalResult?.count || 0;

    // Hata sayısı
    const errorsResult = await db.queryOne("SELECT COUNT(*) AS count FROM logs WHERE level='error'") as { count: number } | undefined;
    const errors = errorsResult?.count || 0;

    // Son 24 saatteki log sayısı
    const last24hResult = await db.queryOne(`
      SELECT COUNT(*) AS count
      FROM logs
      WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '1 day'
    `) as { count: number } | undefined;
    const last24h = last24hResult?.count || 0;

    // Ortalama süre (sadece success loglarından) - PostgreSQL JSON operators
    const avgDurationResult = await db.queryOne(`
      SELECT AVG((data->>'duration_ms')::numeric) AS avg_ms
      FROM logs
      WHERE level='success' AND data->>'duration_ms' IS NOT NULL
    `) as { avg_ms: number | null } | undefined;
    const avgDuration = avgDurationResult?.avg_ms || 0;

    // Ortalama token kullanımı (sadece success loglarından) - PostgreSQL JSON operators
    const avgTokensResult = await db.queryOne(`
      SELECT AVG((data->>'total_estimated_tokens')::numeric) AS avg_tokens
      FROM logs
      WHERE level='success' AND data->>'total_estimated_tokens' IS NOT NULL
    `) as { avg_tokens: number | null } | undefined;
    const avgTokens = avgTokensResult?.avg_tokens || 0;

    // Log seviye dağılımı
    const levelDistribution = await db.query(`
      SELECT level, COUNT(*) AS count
      FROM logs
      GROUP BY level
    `) as Array<{ level: string; count: number }>;

    // Son 10 log
    const recentLogs = await db.query(`
      SELECT id, level, message, created_at
      FROM logs
      ORDER BY id DESC
      LIMIT 10
    `);

    return NextResponse.json({
      success: true,
      metrics: {
        total_logs: total,
        errors,
        success_rate: total > 0 ? ((total - errors) / total * 100).toFixed(2) : 0,
        last_24h: last24h,
        avg_duration_ms: Math.round(avgDuration),
        avg_tokens: Math.round(avgTokens),
        level_distribution: levelDistribution,
        recent_logs: recentLogs,
      },
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch metrics";
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        status: "error" 
      }, 
      { status: 500 }
    );
  }
}
