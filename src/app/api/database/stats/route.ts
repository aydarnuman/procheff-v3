import { getDB } from "@/lib/db/sqlite-client";
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
    const db = getDB();

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
    const logCount = db
      .prepare("SELECT COUNT(*) as count FROM ai_logs")
      .get() as { count: number } | undefined;

    // Get total records across all tables
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      )
      .all() as { name: string }[];

    const tableCounts: Record<string, number> = {};
    for (const table of tables) {
      const result = db
        .prepare(`SELECT COUNT(*) as count FROM ${table.name}`)
        .get() as { count: number };
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
