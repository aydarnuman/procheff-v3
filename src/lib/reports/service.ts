import { getDB } from "@/lib/db/sqlite-client";
import { generatePDFReport, generateExcelReport, generateCSVReport } from "./generator";
import { defaultTemplates } from "./templates";

export interface ReportTemplate {
  id?: number;
  name: string;
  description?: string;
  type: "analysis" | "summary" | "detailed" | "custom";
  sections: string[];
  filters?: Record<string, any>;
  format: "pdf" | "excel" | "csv" | "html";
  schedule?: string;
  recipients?: string[];
  last_generated?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ReportHistory {
  id: number;
  template_id: number;
  file_path: string;
  file_size: number;
  generation_time: number;
  status: "success" | "failed" | "partial";
  error_message?: string;
  generated_by: string;
  generated_at: string;
}

export class ReportService {
  private db: ReturnType<typeof getDB>;

  constructor() {
    this.db = getDB();
  }

  /**
   * Get all report templates
   */
  async getTemplates(userId?: string): Promise<ReportTemplate[]> {
    try {
      const query = userId
        ? "SELECT * FROM report_templates WHERE created_by = ? ORDER BY created_at DESC"
        : "SELECT * FROM report_templates ORDER BY created_at DESC";

      const templates = userId
        ? this.db.prepare(query).all(userId)
        : this.db.prepare(query).all();

      return templates.map((t: any) => ({
        ...t,
        sections: JSON.parse(t.sections || "[]"),
        filters: JSON.parse(t.filters || "{}"),
        recipients: JSON.parse(t.recipients || "[]"),
      }));
    } catch (error) {
      console.error("Failed to get templates:", error);
      throw error;
    }
  }

  /**
   * Get a single template by ID
   */
  async getTemplate(id: number): Promise<ReportTemplate | null> {
    try {
      const template = this.db
        .prepare("SELECT * FROM report_templates WHERE id = ?")
        .get(id) as any;

      if (!template) return null;

      return {
        ...template,
        sections: JSON.parse(template.sections || "[]"),
        filters: JSON.parse(template.filters || "{}"),
        recipients: JSON.parse(template.recipients || "[]"),
      };
    } catch (error) {
      console.error("Failed to get template:", error);
      throw error;
    }
  }

  /**
   * Create a new template
   */
  async createTemplate(template: ReportTemplate, userId: string): Promise<number> {
    try {
      const result = this.db
        .prepare(`
          INSERT INTO report_templates (
            name, description, type, sections, filters, format,
            schedule, recipients, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          template.name,
          template.description || "",
          template.type,
          JSON.stringify(template.sections),
          JSON.stringify(template.filters || {}),
          template.format,
          template.schedule || null,
          JSON.stringify(template.recipients || []),
          userId
        );

      return result.lastInsertRowid as number;
    } catch (error) {
      console.error("Failed to create template:", error);
      throw error;
    }
  }

  /**
   * Update an existing template
   */
  async updateTemplate(id: number, template: Partial<ReportTemplate>): Promise<void> {
    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (template.name !== undefined) {
        updates.push("name = ?");
        values.push(template.name);
      }
      if (template.description !== undefined) {
        updates.push("description = ?");
        values.push(template.description);
      }
      if (template.type !== undefined) {
        updates.push("type = ?");
        values.push(template.type);
      }
      if (template.sections !== undefined) {
        updates.push("sections = ?");
        values.push(JSON.stringify(template.sections));
      }
      if (template.filters !== undefined) {
        updates.push("filters = ?");
        values.push(JSON.stringify(template.filters));
      }
      if (template.format !== undefined) {
        updates.push("format = ?");
        values.push(template.format);
      }
      if (template.schedule !== undefined) {
        updates.push("schedule = ?");
        values.push(template.schedule);
      }
      if (template.recipients !== undefined) {
        updates.push("recipients = ?");
        values.push(JSON.stringify(template.recipients));
      }

      updates.push("updated_at = CURRENT_TIMESTAMP");
      values.push(id);

      this.db
        .prepare(`UPDATE report_templates SET ${updates.join(", ")} WHERE id = ?`)
        .run(...values);
    } catch (error) {
      console.error("Failed to update template:", error);
      throw error;
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: number): Promise<void> {
    try {
      this.db.prepare("DELETE FROM report_templates WHERE id = ?").run(id);
    } catch (error) {
      console.error("Failed to delete template:", error);
      throw error;
    }
  }

  /**
   * Generate a report from a template
   */
  async generateReport(
    templateId: number,
    params: Record<string, any>,
    userId: string
  ): Promise<{ path: string; size: number }> {
    const startTime = Date.now();
    let status: "success" | "failed" = "success";
    let errorMessage: string | undefined;
    let filePath: string = "";
    let fileSize: number = 0;

    try {
      // Get the template
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error("Template not found");
      }

      // Generate report based on format
      const reportData = this.prepareReportData(template, params);

      switch (template.format) {
        case "pdf":
          ({ path: filePath, size: fileSize } = await generatePDFReport(
            template.name,
            reportData
          ));
          break;
        case "excel":
          ({ path: filePath, size: fileSize } = await generateExcelReport(
            template.name,
            reportData
          ));
          break;
        case "csv":
          ({ path: filePath, size: fileSize } = await generateCSVReport(
            template.name,
            reportData
          ));
          break;
        default:
          throw new Error(`Unsupported format: ${template.format}`);
      }

      // Update last generated timestamp
      this.db
        .prepare("UPDATE report_templates SET last_generated = CURRENT_TIMESTAMP WHERE id = ?")
        .run(templateId);
    } catch (error) {
      status = "failed";
      errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to generate report:", error);
      throw error;
    } finally {
      // Log to history
      const generationTime = Date.now() - startTime;

      this.db
        .prepare(`
          INSERT INTO report_history (
            template_id, file_path, file_size, generation_time,
            status, error_message, generated_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          templateId,
          filePath,
          fileSize,
          generationTime,
          status,
          errorMessage || null,
          userId
        );
    }

    return { path: filePath, size: fileSize };
  }

  /**
   * Get report history
   */
  async getHistory(
    filters?: { templateId?: number; userId?: string; limit?: number }
  ): Promise<ReportHistory[]> {
    try {
      let query = `
        SELECT h.*, t.name as template_name
        FROM report_history h
        JOIN report_templates t ON h.template_id = t.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters?.templateId) {
        query += " AND h.template_id = ?";
        params.push(filters.templateId);
      }
      if (filters?.userId) {
        query += " AND h.generated_by = ?";
        params.push(filters.userId);
      }

      query += " ORDER BY h.generated_at DESC";

      if (filters?.limit) {
        query += " LIMIT ?";
        params.push(filters.limit);
      }

      return this.db.prepare(query).all(...params) as ReportHistory[];
    } catch (error) {
      console.error("Failed to get history:", error);
      throw error;
    }
  }

  /**
   * Prepare report data based on template and params
   */
  private prepareReportData(
    template: ReportTemplate,
    params: Record<string, any>
  ): Record<string, any> {
    // This would normally fetch data from various sources based on template sections
    // For now, returning mock data structure
    return {
      title: template.name,
      generatedAt: new Date().toISOString(),
      sections: template.sections.map(section => ({
        name: section,
        data: params[section] || [],
      })),
      filters: { ...template.filters, ...params },
    };
  }

  /**
   * Initialize default templates
   */
  async initializeDefaults(): Promise<void> {
    try {
      const existingTemplates = await this.getTemplates();

      if (existingTemplates.length === 0) {
        for (const template of defaultTemplates) {
          await this.createTemplate(template, "system");
        }
        console.log("✅ Default report templates initialized");
      }
    } catch (error) {
      console.error("Failed to initialize default templates:", error);
    }
  }
}

// Export singleton instance
export const reportService = new ReportService();