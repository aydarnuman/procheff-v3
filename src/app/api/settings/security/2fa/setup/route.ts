import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { twoFactorAuthService } from "@/lib/auth/2fa-service";

/**
 * POST /api/settings/security/2fa/setup
 * Generate 2FA setup (QR code, secret, backup codes)
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const setup = await twoFactorAuthService.generateSetup(
      session.user.email,
      session.user.email
    );

    return NextResponse.json({
      success: true,
      qrCode: setup.qrCode,
      secret: setup.secret,
      backupCodes: setup.backupCodes,
    });
  } catch (error) {
    console.error("Failed to generate 2FA setup:", error);
    return NextResponse.json(
      { error: "Failed to generate 2FA setup" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/settings/security/2fa/setup
 * Get 2FA status
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await twoFactorAuthService.getStatus(session.user.email);

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error("Failed to get 2FA status:", error);
    return NextResponse.json(
      { error: "Failed to get 2FA status" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/security/2fa/setup
 * Disable 2FA
 */
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await twoFactorAuthService.disable(session.user.email);

    return NextResponse.json({
      success: true,
      message: "2FA disabled successfully",
    });
  } catch (error) {
    console.error("Failed to disable 2FA:", error);
    return NextResponse.json(
      { error: "Failed to disable 2FA" },
      { status: 500 }
    );
  }
}