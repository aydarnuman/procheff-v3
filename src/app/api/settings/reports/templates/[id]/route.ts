import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { reportService, type ReportTemplate } from "@/lib/reports/service";
import { validateTemplate } from "@/lib/reports/templates";
import { z } from "zod";

// Update schema (all fields optional)
const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  type: z.enum(["analysis", "summary", "detailed", "custom"]).optional(),
  sections: z.array(z.string()).min(1).optional(),
  filters: z.record(z.string(), z.any()).optional(),
  format: z.enum(["pdf", "excel", "csv", "html"]).optional(),
  schedule: z.string().nullable().optional(),
  recipients: z.array(z.string().email()).optional(),
});

/**
 * GET /api/settings/reports/templates/[id]
 * Get a single template by ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const templateId = parseInt(id);
    if (isNaN(templateId)) {
      return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
    }

    const template = await reportService.getTemplate(templateId);

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error("Failed to fetch template:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/reports/templates/[id]
 * Update a template
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const templateId = parseInt(id);
    if (isNaN(templateId)) {
      return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
    }

    const body = await request.json();

    // Validate input
    const validated = UpdateTemplateSchema.parse(body);

    // Clean the data - remove null values
    const cleanedData: any = {};
    for (const [key, value] of Object.entries(validated)) {
      if (value !== null && value !== undefined) {
        cleanedData[key] = value;
      }
    }

    // Additional validation if needed
    if (Object.keys(cleanedData).length > 0) {
      const errors = validateTemplate(cleanedData as Partial<ReportTemplate>);
      if (errors.length > 0) {
        return NextResponse.json(
          { error: "Validation failed", details: errors },
          { status: 400 }
        );
      }
    }

    // Check if template exists
    const existing = await reportService.getTemplate(templateId);
    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Update template
    await reportService.updateTemplate(templateId, cleanedData);

    // Log to audit
    const db = (await import("@/lib/db/sqlite-client")).getDB();
    try {
      db.prepare(`
        INSERT INTO security_audit_logs (user_id, action, metadata)
        VALUES (?, 'report_template_updated', ?)
      `).run(
        session.user.email,
        JSON.stringify({ templateId, changes: Object.keys(cleanedData) })
      );
    } catch (auditError) {
      console.warn("Failed to log audit:", auditError);
    }

    return NextResponse.json({
      success: true,
      message: "Template updated successfully",
    });
  } catch (error) {
    console.error("Failed to update template:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/reports/templates/[id]
 * Delete a template
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const templateId = parseInt(id);
    if (isNaN(templateId)) {
      return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
    }

    // Check if template exists
    const existing = await reportService.getTemplate(templateId);
    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Delete template
    await reportService.deleteTemplate(templateId);

    // Log to audit
    const db = (await import("@/lib/db/sqlite-client")).getDB();
    try {
      db.prepare(`
        INSERT INTO security_audit_logs (user_id, action, metadata)
        VALUES (?, 'report_template_deleted', ?)
      `).run(
        session.user.email,
        JSON.stringify({ templateId, name: existing.name })
      );
    } catch (auditError) {
      console.warn("Failed to log audit:", auditError);
    }

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}