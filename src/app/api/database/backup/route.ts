import { getDatabase } from "@/lib/db/universal-client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/database/backup
 * PostgreSQL backup (simplified - returns schema dump info)
 * Note: Full PostgreSQL backups require pg_dump command line tool
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

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `procheff-backup-${timestamp}.sql`;

    // Log backup in database
    try {
      await db.execute(`
        INSERT INTO backup_history (file_name, file_size, backup_type, created_by)
        VALUES ($1, $2, 'manual', $3)
      `, [fileName, 0, session.user.email]);
    } catch (err) {
      // backup_history table may not exist
      console.warn("Could not log backup:", err);
    }

    // For PostgreSQL, suggest using pg_dump
    return NextResponse.json({
      success: true,
      message: "For PostgreSQL backups, please use 'pg_dump' command",
      command: `pg_dump -U postgres procheff > ${fileName}`,
      fileName
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
