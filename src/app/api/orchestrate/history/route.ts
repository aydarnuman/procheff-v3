import { NextResponse } from "next/server";
import { getRecentOrchestrations } from "@/lib/db/init-auth";

/**
 * GET /api/orchestrate/history
 * Returns recent pipeline executions
 */
export async function GET() {
  try {
    const jobs = getRecentOrchestrations(100); // Last 100 jobs

    return NextResponse.json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
