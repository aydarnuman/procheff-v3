import { NextResponse } from "next/server";
import { getDB } from "@/lib/db/sqlite-client";

/**
 * GET /api/orchestrate/active-count
 * Returns count of active/running pipelines
 * Gracefully handles missing orchestrations table
 */
export async function GET() {
  try {
    const db = getDB();

    // Check if orchestrations table exists first (defensive programming)
    const tableExists = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='orchestrations'"
      )
      .get();

    if (!tableExists) {
      // Table doesn't exist yet, return 0 instead of error
      console.log("⚠️ Orchestrations table not found, returning 0");
      return NextResponse.json({
        success: true,
        count: 0,
        warning: "Orchestrations table not initialized",
      });
    }

    const result = db
      .prepare(
        "SELECT COUNT(*) as count FROM orchestrations WHERE status IN ('pending', 'running')"
      )
      .get() as { count: number };

    return NextResponse.json({
      success: true,
      count: result.count || 0,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error("❌ Active count API error:", errorMessage);

    // Return 0 instead of 500 error for better UX
    return NextResponse.json({
        success: false,
      count: 0,
        error: errorMessage,
    });
  }
}
