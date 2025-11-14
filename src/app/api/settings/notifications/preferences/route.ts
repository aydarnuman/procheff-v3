import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { notificationService } from "@/lib/notifications/service";
import { z } from "zod";

// Validation schema
const PreferencesSchema = z.record(z.string(), z.array(z.string()));

/**
 * GET /api/settings/notifications/preferences
 * Get notification preferences
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preferences = await notificationService.getPreferences(session.user.email);

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error) {
    console.error("Failed to fetch preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/notifications/preferences
 * Update notification preferences
 */
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = PreferencesSchema.parse(body);

    // Update preferences
    await notificationService.updatePreferences(session.user.email, validated);

    // Log to audit
    const db = (await import("@/lib/db/sqlite-client")).getDB();
    try {
      db.prepare(`
        INSERT INTO security_audit_logs (user_id, action, metadata)
        VALUES (?, 'notification_preferences_updated', ?)
      `).run(
        session.user.email,
        JSON.stringify({ events: Object.keys(validated) })
      );
    } catch (auditError) {
      console.warn("Failed to log audit:", auditError);
    }

    return NextResponse.json({
      success: true,
      message: "Preferences updated successfully",
    });
  } catch (error) {
    console.error("Failed to update preferences:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}