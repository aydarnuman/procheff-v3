import { getDatabase } from "@/lib/db/universal-client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/database/cleanup
 * Clean old logs (30 days)
 * Body:
 * - days?: number (default: 30)
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const days = body.days || 30;

    const db = await getDatabase();

    // Delete old logs
    const result = await db.execute(
      `DELETE FROM ai_logs
       WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${days} days'`
    );

    // Delete old notifications
    const notifResult = await db.execute(
      `DELETE FROM notifications
       WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${days} days' AND is_read = true`
    );

    return NextResponse.json({
      success: true,
      message: `Cleaned ${result.changes + notifResult.changes} old records`,
      deleted: {
        logs: result.changes,
        notifications: notifResult.changes
      }
    });
  } catch (error) {
    console.error("Database cleanup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
