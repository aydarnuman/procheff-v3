import { getDatabase } from "@/lib/db/universal-client";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/profile
 * Get current user profile
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const db = await getDatabase();
    const user = await db.queryOne("SELECT id, email, name, created_at FROM users WHERE email = $1", [session.user.email]) as {
      id: string;
      email: string;
      name: string | null;
      created_at: string;
    } | undefined;

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || "",
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/profile
 * Update user profile (name, email)
 * Body:
 * - name?: string
 * - email?: string
 */
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, email } = body;

    if (!name && !email) {
      return NextResponse.json(
        { success: false, error: "At least one field required (name or email)" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // If email is being changed, check if new email exists
    if (email && email !== session.user.email) {
      const existingUser = await db.queryOne("SELECT id FROM users WHERE email = $1", [email]);

      if (existingUser) {
        return NextResponse.json(
          { success: false, error: "Email already in use" },
          { status: 409 }
        );
      }
    }

    // Update user
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }

    if (email && email !== session.user.email) {
      updates.push(`email = $${paramIndex}`);
      values.push(email);
      paramIndex++;
    }

    if (updates.length > 0) {
      values.push(session.user.email);
      await db.execute(`
        UPDATE users
        SET ${updates.join(", ")}
        WHERE email = $${paramIndex}
      `, values);
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        name,
        email: email || session.user.email
      }
    });
  } catch (error) {
    console.error("Profile PATCH error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
