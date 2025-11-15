import { getDatabase } from "@/lib/db/universal-client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * GET /api/database/backup
 * Download database backup
 * NOTE: This endpoint is SQLite-specific and may need alternative implementation for PostgreSQL
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

    // PostgreSQL doesn't use WAL checkpoint like SQLite
    // This functionality needs to be implemented differently for PostgreSQL backup

    const dbPath = path.join(process.cwd(), "procheff.db");
    const dbBuffer = fs.readFileSync(dbPath);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `procheff-backup-${timestamp}.db`;

    // Log backup in database
    await db.execute(`
      INSERT INTO backup_history (file_name, file_size, backup_type, created_by)
      VALUES ($1, $2, 'manual', $3)
    `, [fileName, dbBuffer.length, session.user.email]);

    return new NextResponse(dbBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": dbBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Database backup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
