import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead
} from "@/lib/alerts/notifier";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications
 * Get all notifications with optional filters
 * Query params:
 * - limit: number (default: 50)
 * - unread: boolean (default: false)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const unreadOnly = searchParams.get("unread") === "true";

    // Ensure database is accessible
    const notifications = getNotifications({ limit, unreadOnly });
    const unreadCount = getUnreadCount();

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
      total: notifications.length
    });
  } catch (error) {
    console.error("Notifications API Error:", error);
    
    // Return a safe fallback response
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Database connection failed",
        notifications: [],
        unreadCount: 0,
        total: 0
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * Mark notification(s) as read
 * Body:
 * - id: number (optional, if not provided marks all as read)
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();

    if (body.id) {
      markAsRead(body.id);
      return NextResponse.json({
        success: true,
        message: "Notification marked as read",
        id: body.id
      });
    } else {
      markAllAsRead();
      return NextResponse.json({
        success: true,
        message: "All notifications marked as read"
      });
    }
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
