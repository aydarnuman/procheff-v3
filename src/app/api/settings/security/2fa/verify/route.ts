import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { twoFactorAuthService } from "@/lib/auth/2fa-service";
import { z } from "zod";

const VerifySchema = z.object({
  token: z.string().min(6).max(8),
});

/**
 * POST /api/settings/security/2fa/verify
 * Verify and enable 2FA
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { token } = VerifySchema.parse(body);

    const verified = await twoFactorAuthService.verifyAndEnable(
      session.user.email,
      token
    );

    if (!verified) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "2FA enabled successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Failed to verify 2FA:", error);
    return NextResponse.json(
      { error: "Failed to verify 2FA" },
      { status: 500 }
    );
  }
}