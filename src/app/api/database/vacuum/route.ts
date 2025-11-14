import { getDB } from "@/lib/db/sqlite-client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/database/vacuum
 * Optimize database (VACUUM)
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

    const db = getDB();

    // Run VACUUM
    db.prepare("VACUUM").run();

    // Run ANALYZE for query optimization
    db.prepare("ANALYZE").run();

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
