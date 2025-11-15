import { getDatabase } from "@/lib/db/universal-client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/database/stats
 * Get database statistics
 */
export async function GET() {
  try {
    const db = await getDatabase();

    // Note: Database file size is not available with PostgreSQL (managed remotely)
    const dbSize = "N/A (PostgreSQL)";

    // Get log count
    const logCount = await db.queryOne(
      "SELECT COUNT(*) as count FROM ai_logs"
    ) as { count: number } | undefined;

    // Get total records across all tables
    const tables = await db.query(`
      SELECT table_name as name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `) as { name: string }[];

    const tableCounts: Record<string, number> = {};
    for (const table of tables) {
      const result = await db.queryOne(
        `SELECT COUNT(*) as count FROM ${table.name}`
      ) as { count: number } | undefined;
      tableCounts[table.name] = result?.count || 0;
    }

    return NextResponse.json({
      success: true,
      stats: {
        dbSize,
        logCount: logCount?.count || 0,
        tables: tableCounts,
        totalTables: tables.length
      }
    });
  } catch (error) {
    console.error("Database stats error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
