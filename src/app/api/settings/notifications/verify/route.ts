import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { notificationService } from "@/lib/notifications/service";
import { z } from "zod";

// Validation schemas
const SendVerificationSchema = z.object({
  channelId: z.number().positive(),
});

const VerifyCodeSchema = z.object({
  channelId: z.number().positive(),
  code: z.string().length(6),
});

/**
 * POST /api/settings/notifications/verify
 * Send verification code
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = SendVerificationSchema.parse(body);

    // Verify channel belongs to user
    const channels = await notificationService.getChannels(session.user.email);
    const channel = channels.find(ch => ch.id === validated.channelId);

    if (!channel) {
      return NextResponse.json(
        { error: "Channel not found" },
        { status: 404 }
      );
    }

    if (channel.verified) {
      return NextResponse.json(
        { error: "Channel already verified" },
        { status: 400 }
      );
    }

    // Send verification
    const result = await notificationService.sendVerification(validated.channelId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send verification" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent successfully",
    });
  } catch (error) {
    console.error("Failed to send verification:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to send verification" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/notifications/verify
 * Verify code
 */
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = VerifyCodeSchema.parse(body);

    // Verify channel belongs to user
    const channels = await notificationService.getChannels(session.user.email);
    const channel = channels.find(ch => ch.id === validated.channelId);

    if (!channel) {
      return NextResponse.json(
        { error: "Channel not found" },
        { status: 404 }
      );
    }

    // Verify code
    const result = await notificationService.verifyChannel(
      validated.channelId,
      validated.code
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Invalid verification code" },
        { status: 400 }
      );
    }

    // Log to audit
    const db = (await import("@/lib/db/sqlite-client")).getDB();
    try {
      db.prepare(`
        INSERT INTO security_audit_logs (user_id, action, metadata)
        VALUES (?, 'notification_channel_verified', ?)
      `).run(
        session.user.email,
        JSON.stringify({ channelId: validated.channelId, type: channel.type })
      );
    } catch (auditError) {
      console.warn("Failed to log audit:", auditError);
    }

    return NextResponse.json({
      success: true,
      message: "Channel verified successfully",
    });
  } catch (error) {
    console.error("Failed to verify channel:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to verify channel" },
      { status: 500 }
    );
  }
}