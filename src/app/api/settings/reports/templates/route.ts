import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { reportService } from "@/lib/reports/service";
import { validateTemplate } from "@/lib/reports/templates";
import { z } from "zod";

// Validation schema
const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  type: z.enum(["analysis", "summary", "detailed", "custom"]),
  sections: z.array(z.string()).min(1),
  filters: z.record(z.string(), z.any()).optional(),
  format: z.enum(["pdf", "excel", "csv", "html"]),
  schedule: z.string().optional(),
  recipients: z.array(z.string().email()).optional(),
});

/**
 * GET /api/settings/reports/templates
 * Get all report templates
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userOnly = searchParams.get("userOnly") === "true";

    const templates = await reportService.getTemplates(
      userOnly ? session.user.email : undefined
    );

    return NextResponse.json({
      success: true,
      templates,
      count: templates.length,
    });
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/reports/templates
 * Create a new report template
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const validated = CreateTemplateSchema.parse(body);

    // Additional validation
    const errors = validateTemplate(validated);
    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    // Create template
    const templateId = await reportService.createTemplate(
      validated,
      session.user.email
    );

    // Log to audit
    const db = (await import("@/lib/db/sqlite-client")).getDB();
    try {
      db.prepare(`
        INSERT INTO security_audit_logs (user_id, action, metadata)
        VALUES (?, 'report_template_created', ?)
      `).run(
        session.user.email,
        JSON.stringify({ templateId, name: validated.name })
      );
    } catch (auditError) {
      console.warn("Failed to log audit:", auditError);
    }

    return NextResponse.json({
      success: true,
      message: "Template created successfully",
      templateId,
    });
  } catch (error) {
    console.error("Failed to create template:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}