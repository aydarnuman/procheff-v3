import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import fs from "fs";
import path from "path";
import { getDB } from "@/lib/db/sqlite-client";

/**
 * GET /api/settings/reports/download
 * Download a generated report
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const historyId = searchParams.get("id");
    const filePath = searchParams.get("path");

    let targetPath: string | null = null;
    let fileName: string = "report";

    if (historyId) {
      // Get file path from history
      const db = getDB();
      const record = db
        .prepare(`
          SELECT h.*, t.name as template_name, t.format
          FROM report_history h
          JOIN report_templates t ON h.template_id = t.id
          WHERE h.id = ?
        `)
        .get(parseInt(historyId)) as any;

      if (!record) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }

      targetPath = record.file_path;
      if (!targetPath) {
        return NextResponse.json({ error: "Report file path not found" }, { status: 404 });
      }
      fileName = path.basename(targetPath);
    } else if (filePath) {
      // Direct path (validate it's in reports directory)
      const reportsDir = path.join(process.cwd(), "reports");
      const resolved = path.resolve(filePath);

      if (!resolved.startsWith(reportsDir)) {
        return NextResponse.json({ error: "Invalid file path" }, { status: 403 });
      }

      targetPath = resolved;
      fileName = path.basename(targetPath);
    } else {
      return NextResponse.json(
        { error: "No report specified" },
        { status: 400 }
      );
    }

    // Check if file exists
    if (!fs.existsSync(targetPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Read file
    const fileContent = fs.readFileSync(targetPath);
    const stats = fs.statSync(targetPath);

    // Determine content type from extension
    const ext = path.extname(targetPath).toLowerCase();
    let contentType = "application/octet-stream";

    switch (ext) {
      case ".pdf":
        contentType = "application/pdf";
        break;
      case ".xlsx":
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        break;
      case ".csv":
        contentType = "text/csv; charset=utf-8";
        break;
      case ".html":
        contentType = "text/html; charset=utf-8";
        break;
    }

    // Return file
    return new NextResponse(fileContent, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": stats.size.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Failed to download report:", error);
    return NextResponse.json(
      { error: "Failed to download report" },
      { status: 500 }
    );
  }
}