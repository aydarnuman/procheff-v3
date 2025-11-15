import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { reportService } from "@/lib/reports/service";
import { formatFileSize } from "@/lib/reports/generator";
import fs from "fs";

/**
 * GET /api/settings/reports/history
 * Get report generation history
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("templateId");
    const limit = searchParams.get("limit");

    const filters: any = {};

    if (templateId) {
      filters.templateId = parseInt(templateId);
    }

    if (limit) {
      filters.limit = parseInt(limit);
    } else {
      filters.limit = 50; // Default limit
    }

    // Get history
    const history = await reportService.getHistory(filters);

    // Format history with additional info
    const formattedHistory = history.map((item: any) => ({
      ...item,
      sizeFormatted: formatFileSize(item.file_size),
      fileExists: fs.existsSync(item.file_path),
      downloadUrl: fs.existsSync(item.file_path)
        ? `/api/settings/reports/download?id=${item.id}`
        : null,
    }));

    return NextResponse.json({
      success: true,
      history: formattedHistory,
      count: formattedHistory.length,
    });
  } catch (error) {
    console.error("Failed to fetch history:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}