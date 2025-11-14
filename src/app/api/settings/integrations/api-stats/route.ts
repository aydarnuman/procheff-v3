import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiStatsService } from "@/lib/integrations/api-stats-service";

/**
 * GET /api/settings/integrations/api-stats
 * Get API usage statistics
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") as "hour" | "day" | "week" | "month" | null;
    const endpoint = searchParams.get("endpoint");

    // Get general stats
    const stats = await apiStatsService.getApiStats(timeRange || undefined);

    // Get timeline data for charts
    const timeline = await apiStatsService.getUsageTimeline(
      endpoint || undefined,
      timeRange === "hour" ? 1 : timeRange === "day" ? 24 : timeRange === "week" ? 168 : 720
    );

    // Get top errors
    const topErrors = await apiStatsService.getTopErrors(5);

    // Get available endpoints
    const endpoints = apiStatsService.getApiEndpoints();

    return NextResponse.json({
      success: true,
      stats,
      timeline,
      topErrors,
      endpoints,
    });
  } catch (error) {
    console.error("Failed to get API stats:", error);
    return NextResponse.json(
      { error: "Failed to get API statistics" },
      { status: 500 }
    );
  }
}