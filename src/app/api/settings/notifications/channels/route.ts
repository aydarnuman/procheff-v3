import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { notificationService } from "@/lib/notifications/service";
import { z } from "zod";

// Validation schemas
const AddChannelSchema = z.object({
  type: z.enum(["email", "sms", "push", "in_app"]),
  destination: z.string().min(1),
  settings: z.record(z.string(), z.any()).optional(),
});

const UpdateChannelSchema = z.object({
  channelId: z.number().positive(),
  destination: z.string().min(1).optional(),
  settings: z.record(z.string(), z.any()).optional(),
});

/**
 * GET /api/settings/notifications/channels
 * Get user's notification channels
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const channels = await notificationService.getChannels(session.user.email);

    return NextResponse.json({
      success: true,
      channels,
      count: channels.length,
    });
  } catch (error) {
    console.error("Failed to fetch channels:", error);
    return NextResponse.json(
      { error: "Failed to fetch channels" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/notifications/channels
 * Add a new notification channel
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = AddChannelSchema.parse(body);

    // Validate email format if email channel
    if (validated.type === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(validated.destination)) {
        return NextResponse.json(
          { error: "Invalid email address" },
          { status: 400 }
        );
      }
    }

    // Check if channel already exists
    const existingChannels = await notificationService.getChannels(session.user.email);
    const duplicate = existingChannels.find(
      ch => ch.type === validated.type && ch.destination === validated.destination
    );

    if (duplicate) {
      return NextResponse.json(
        { error: "This channel already exists" },
        { status: 400 }
      );
    }

    // Add channel
    const channelId = await notificationService.addChannel({
      user_id: session.user.email,
      ...validated,
      verified: false,
    });

    // Log to audit
    const db = (await import("@/lib/db/sqlite-client")).getDB();
    try {
      db.prepare(`
        INSERT INTO security_audit_logs (user_id, action, metadata)
        VALUES (?, 'notification_channel_added', ?)
      `).run(
        session.user.email,
        JSON.stringify({ channelId, type: validated.type })
      );
    } catch (auditError) {
      console.warn("Failed to log audit:", auditError);
    }

    return NextResponse.json({
      success: true,
      message: validated.type === "email"
        ? "Channel added. Please check your email for verification code."
        : "Channel added successfully",
      channelId,
    });
  } catch (error) {
    console.error("Failed to add channel:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to add channel" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/notifications/channels
 * Update a notification channel
 */
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = UpdateChannelSchema.parse(body);

    // Verify channel belongs to user
    const channels = await notificationService.getChannels(session.user.email);
    const channel = channels.find(ch => ch.id === validated.channelId);

    if (!channel) {
      return NextResponse.json(
        { error: "Channel not found" },
        { status: 404 }
      );
    }

    // Update channel
    await notificationService.updateChannel(validated.channelId, {
      destination: validated.destination,
      settings: validated.settings,
    });

    return NextResponse.json({
      success: true,
      message: validated.destination && channel.type === "email"
        ? "Channel updated. Please verify the new email address."
        : "Channel updated successfully",
    });
  } catch (error) {
    console.error("Failed to update channel:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update channel" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/notifications/channels
 * Delete a notification channel
 */
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");

    if (!channelId || isNaN(parseInt(channelId))) {
      return NextResponse.json(
        { error: "Invalid channel ID" },
        { status: 400 }
      );
    }

    // Verify channel belongs to user
    const channels = await notificationService.getChannels(session.user.email);
    const channel = channels.find(ch => ch.id === parseInt(channelId));

    if (!channel) {
      return NextResponse.json(
        { error: "Channel not found" },
        { status: 404 }
      );
    }

    // Delete channel
    await notificationService.deleteChannel(parseInt(channelId));

    // Log to audit
    const db = (await import("@/lib/db/sqlite-client")).getDB();
    try {
      db.prepare(`
        INSERT INTO security_audit_logs (user_id, action, metadata)
        VALUES (?, 'notification_channel_deleted', ?)
      `).run(
        session.user.email,
        JSON.stringify({ channelId: parseInt(channelId), type: channel.type })
      );
    } catch (auditError) {
      console.warn("Failed to log audit:", auditError);
    }

    return NextResponse.json({
      success: true,
      message: "Channel deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete channel:", error);
    return NextResponse.json(
      { error: "Failed to delete channel" },
      { status: 500 }
    );
  }
}