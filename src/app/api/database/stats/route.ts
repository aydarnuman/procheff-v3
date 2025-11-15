import { getDatabase } from "@/lib/db/universal-client";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * GET /api/database/stats
 * Get database statistics
 */
export async function GET() {
  try {
    const db = await getDatabase();

    // Get database file size
    const dbPath = path.join(process.cwd(), "procheff.db");
    let dbSize = "0 MB";
    try {
      const stats = fs.statSync(dbPath);
      dbSize = `${(stats.size / (1024 * 1024)).toFixed(2)} MB`;
    } catch (error) {
      dbSize = "N/A";
    }

    // Get log count
    const logCount = await db.queryOne("SELECT COUNT(*) as count FROM ai_logs") as { count: number } | undefined;

    // Get total records across all tables (PostgreSQL-specific query)
    const tables = await db.query(
      "SELECT tablename as name FROM pg_tables WHERE schemaname = 'public'"
    ) as { name: string }[];

    const tableCounts: Record<string, number> = {};
    for (const table of tables) {
      const result = await db.queryOne(`SELECT COUNT(*) as count FROM ${table.name}`) as { count: number };
      tableCounts[table.name] = result.count;
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
