import { getDB } from "@/lib/db/sqlite-client";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const db = getDB();

    // Toplam log sayısı
    const totalResult = db.prepare("SELECT COUNT(*) AS count FROM logs").get() as { count: number };
    const total = totalResult?.count || 0;

    // Hata sayısı
    const errorsResult = db.prepare("SELECT COUNT(*) AS count FROM logs WHERE level='error'").get() as { count: number };
    const errors = errorsResult?.count || 0;

    // Son 24 saatteki log sayısı
    const last24hResult = db.prepare(`
      SELECT COUNT(*) AS count 
      FROM logs 
      WHERE created_at >= datetime('now','-1 day')
    `).get() as { count: number };
    const last24h = last24hResult?.count || 0;

    // Ortalama süre (sadece success loglarından)
    const avgDurationResult = db.prepare(`
      SELECT AVG(json_extract(data, '$.duration_ms')) AS avg_ms 
      FROM logs 
      WHERE level='success' AND json_extract(data, '$.duration_ms') IS NOT NULL
    `).get() as { avg_ms: number | null };
    const avgDuration = avgDurationResult?.avg_ms || 0;

    // Ortalama token kullanımı (sadece success loglarından)
    const avgTokensResult = db.prepare(`
      SELECT AVG(json_extract(data, '$.total_estimated_tokens')) AS avg_tokens 
      FROM logs 
      WHERE level='success' AND json_extract(data, '$.total_estimated_tokens') IS NOT NULL
    `).get() as { avg_tokens: number | null };
    const avgTokens = avgTokensResult?.avg_tokens || 0;

    // Log seviye dağılımı
    const levelDistribution = db.prepare(`
      SELECT level, COUNT(*) AS count 
      FROM logs 
      GROUP BY level
    `).all() as Array<{ level: string; count: number }>;

    // Son 10 log
    const recentLogs = db.prepare(`
      SELECT id, level, message, created_at 
      FROM logs 
      ORDER BY id DESC 
      LIMIT 10
    `).all();

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
