import { NextResponse } from "next/server";
import { checkAlerts } from "@/lib/alerts/checker";
import { cleanupOldNotifications } from "@/lib/alerts/notifier";

export const dynamic = "force-dynamic";

/**
 * POST /api/alerts
 * Check all alert rules and create notifications if conditions are met
 * This endpoint should be called periodically (e.g., every 5 minutes via cron)
 */
export async function POST() {
  try {
    // Run alert checks
    const result = await checkAlerts();

    // Cleanup old notifications (30+ days)
    cleanupOldNotifications();

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Alert check failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/alerts
 * Get alert statistics
 */
export async function GET() {
  try {
    const { getAlertStats } = await import("@/lib/alerts/checker");
    const stats = getAlertStats();

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to get alert stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
