import { getDB } from "@/lib/db/sqlite-client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * GET /api/database/backup
 * Download database backup
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

    const db = getDB();

    // Create backup with checkpoint
    db.prepare("PRAGMA wal_checkpoint(TRUNCATE)").run();

    const dbPath = path.join(process.cwd(), "procheff.db");
    const dbBuffer = fs.readFileSync(dbPath);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `procheff-backup-${timestamp}.db`;

    // Log backup in database
    db.prepare(`
      INSERT INTO backup_history (file_name, file_size, backup_type, created_by)
      VALUES (?, ?, 'manual', ?)
    `).run(fileName, dbBuffer.length, session.user.email);

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
