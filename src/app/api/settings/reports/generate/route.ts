import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { reportService } from "@/lib/reports/service";
import { formatFileSize } from "@/lib/reports/generator";
import fs from "fs";
import path from "path";
import { z } from "zod";

// Validation schema
const GenerateReportSchema = z.object({
  templateId: z.number().positive(),
  params: z.record(z.string(), z.any()).optional().default({}),
  preview: z.boolean().optional().default(false),
});

/**
 * POST /api/settings/reports/generate
 * Generate a report from a template
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const validated = GenerateReportSchema.parse(body);

    // Check if template exists
    const template = await reportService.getTemplate(validated.templateId);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Generate report
    const result = await reportService.generateReport(
      validated.templateId,
      validated.params,
      session.user.email
    );

    // If preview mode, return file content
    if (validated.preview) {
      const fileContent = fs.readFileSync(result.path);
      const fileName = path.basename(result.path);

      // Clean up file after reading (for preview)
      fs.unlinkSync(result.path);

      return new NextResponse(fileContent, {
        headers: {
          "Content-Type": getContentType(template.format),
          "Content-Disposition": `inline; filename="${fileName}"`,
          "Content-Length": result.size.toString(),
        },
      });
    }

    // Log to audit
    const db = (await import("@/lib/db/sqlite-client")).getDB();
    try {
      db.prepare(`
        INSERT INTO security_audit_logs (user_id, action, metadata)
        VALUES (?, 'report_generated', ?)
      `).run(
        session.user.email,
        JSON.stringify({
          templateId: validated.templateId,
          templateName: template.name,
          format: template.format,
          size: result.size,
        })
      );
    } catch (auditError) {
      console.warn("Failed to log audit:", auditError);
    }

    // Return report info
    return NextResponse.json({
      success: true,
      message: "Report generated successfully",
      report: {
        path: result.path,
        size: result.size,
        sizeFormatted: formatFileSize(result.size),
        format: template.format,
        downloadUrl: `/api/settings/reports/download?path=${encodeURIComponent(
          result.path
        )}`,
      },
    });
  } catch (error) {
    console.error("Failed to generate report:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to generate report",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Get content type for format
 */
function getContentType(format: string): string {
  switch (format) {
    case "pdf":
      return "application/pdf";
    case "excel":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "csv":
      return "text/csv; charset=utf-8";
    case "html":
      return "text/html; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}