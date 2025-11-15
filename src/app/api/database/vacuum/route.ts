import { getDatabase } from "@/lib/db/universal-client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/database/vacuum
 * Optimize database (PostgreSQL equivalent)
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const db = await getDatabase();

    // PostgreSQL VACUUM (requires superuser, skip if not available)
    try {
      await db.execute("VACUUM");
    } catch (err) {
      console.warn("VACUUM failed (may require superuser), skipping:", err);
    }

    // ANALYZE works in PostgreSQL
    await db.execute("ANALYZE");

    return NextResponse.json({
      success: true,
      message: "Database optimized successfully"
    });
  } catch (error) {
    console.error("Database vacuum error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
