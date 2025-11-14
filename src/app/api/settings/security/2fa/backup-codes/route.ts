import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { twoFactorAuthService } from "@/lib/auth/2fa-service";

/**
 * POST /api/settings/security/2fa/backup-codes
 * Regenerate backup codes
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const backupCodes = await twoFactorAuthService.regenerateBackupCodes(
      session.user.email
    );

    return NextResponse.json({
      success: true,
      backupCodes,
      message: "Backup codes regenerated successfully",
    });
  } catch (error) {
    console.error("Failed to regenerate backup codes:", error);

    const message = error instanceof Error ? error.message : "Failed to regenerate backup codes";

    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}