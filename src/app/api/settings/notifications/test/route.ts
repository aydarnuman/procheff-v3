import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { notificationService } from "@/lib/notifications/service";
import { z } from "zod";

// Validation schema
const TestNotificationSchema = z.object({
  channelId: z.number().positive(),
});

/**
 * POST /api/settings/notifications/test
 * Send test notification
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = TestNotificationSchema.parse(body);

    // Verify channel belongs to user and is verified
    const channels = await notificationService.getChannels(session.user.email);
    const channel = channels.find(ch => ch.id === validated.channelId);

    if (!channel) {
      return NextResponse.json(
        { error: "Channel not found" },
        { status: 404 }
      );
    }

    if (!channel.verified) {
      return NextResponse.json(
        { error: "Channel not verified. Please verify first." },
        { status: 400 }
      );
    }

    // Send test notification
    const result = await notificationService.sendTestNotification(
      session.user.email,
      validated.channelId
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send test notification" },
        { status: 500 }
      );
    }

    // Log to audit
    const db = (await import("@/lib/db/sqlite-client")).getDB();
    try {
      db.prepare(`
        INSERT INTO security_audit_logs (user_id, action, metadata)
        VALUES (?, 'test_notification_sent', ?)
      `).run(
        session.user.email,
        JSON.stringify({ channelId: validated.channelId, type: channel.type })
      );
    } catch (auditError) {
      console.warn("Failed to log audit:", auditError);
    }

    return NextResponse.json({
      success: true,
      message: "Test notification sent successfully",
      previewUrl: result.previewUrl, // For test emails (Ethereal)
    });
  } catch (error) {
    console.error("Failed to send test notification:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to send test notification" },
      { status: 500 }
    );
  }
}