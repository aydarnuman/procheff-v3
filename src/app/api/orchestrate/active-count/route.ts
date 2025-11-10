import { NextResponse } from "next/server";
import { getDB } from "@/lib/db/sqlite-client";

/**
 * GET /api/orchestrate/active-count
 * Returns count of active/running pipelines
 */
export async function GET() {
  try {
    const db = getDB();

    const result = db
      .prepare(
        "SELECT COUNT(*) as count FROM orchestrations WHERE status IN ('pending', 'running')"
      )
      .get() as { count: number };

    return NextResponse.json({
      success: true,
      count: result.count,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
