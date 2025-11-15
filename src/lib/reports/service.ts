import { getDatabase } from "@/lib/db/universal-client";
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
  /**
   * Get all report templates
   */
  async getTemplates(userId?: string): Promise<ReportTemplate[]> {
    try {
      const db = await getDatabase();
      const query = userId
        ? "SELECT * FROM report_templates WHERE created_by = $1 ORDER BY created_at DESC"
        : "SELECT * FROM report_templates ORDER BY created_at DESC";

      const templates = userId
        ? await db.query(query, [userId])
        : await db.query(query);

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
      const db = await getDatabase();
      const template = await db.queryOne(
        "SELECT * FROM report_templates WHERE id = $1",
        [id]
      ) as any;

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
      const db = await getDatabase();
      const result = await db.queryOne(`
        INSERT INTO report_templates (
          name, description, type, sections, filters, format,
          schedule, recipients, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        template.name,
        template.description || "",
        template.type,
        JSON.stringify(template.sections),
        JSON.stringify(template.filters || {}),
        template.format,
        template.schedule || null,
        JSON.stringify(template.recipients || []),
        userId
      ]) as any;

      return result?.id || 0;
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
      const db = await getDatabase();
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (template.name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        values.push(template.name);
        paramIndex++;
      }
      if (template.description !== undefined) {
        updates.push(`description = $${paramIndex}`);
        values.push(template.description);
        paramIndex++;
      }
      if (template.type !== undefined) {
        updates.push(`type = $${paramIndex}`);
        values.push(template.type);
        paramIndex++;
      }
      if (template.sections !== undefined) {
        updates.push(`sections = $${paramIndex}`);
        values.push(JSON.stringify(template.sections));
        paramIndex++;
      }
      if (template.filters !== undefined) {
        updates.push(`filters = $${paramIndex}`);
        values.push(JSON.stringify(template.filters));
        paramIndex++;
      }
      if (template.format !== undefined) {
        updates.push(`format = $${paramIndex}`);
        values.push(template.format);
        paramIndex++;
      }
      if (template.schedule !== undefined) {
        updates.push(`schedule = $${paramIndex}`);
        values.push(template.schedule);
        paramIndex++;
      }
      if (template.recipients !== undefined) {
        updates.push(`recipients = $${paramIndex}`);
        values.push(JSON.stringify(template.recipients));
        paramIndex++;
      }

      updates.push("updated_at = CURRENT_TIMESTAMP");
      values.push(id);

      await db.execute(
        `UPDATE report_templates SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
        values
      );
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
      const db = await getDatabase();
      await db.execute("DELETE FROM report_templates WHERE id = $1", [id]);
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
      const db = await getDatabase();
      await db.execute(
        "UPDATE report_templates SET last_generated = CURRENT_TIMESTAMP WHERE id = $1",
        [templateId]
      );
    } catch (error) {
      status = "failed";
      errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to generate report:", error);
      throw error;
    } finally {
      // Log to history
      const generationTime = Date.now() - startTime;
      const db = await getDatabase();

      await db.execute(`
        INSERT INTO report_history (
          template_id, file_path, file_size, generation_time,
          status, error_message, generated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        templateId,
        filePath,
        fileSize,
        generationTime,
        status,
        errorMessage || null,
        userId
      ]);
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
      const db = await getDatabase();
      let query = `
        SELECT h.*, t.name as template_name
        FROM report_history h
        JOIN report_templates t ON h.template_id = t.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (filters?.templateId) {
        query += ` AND h.template_id = $${paramIndex}`;
        params.push(filters.templateId);
        paramIndex++;
      }
      if (filters?.userId) {
        query += ` AND h.generated_by = $${paramIndex}`;
        params.push(filters.userId);
        paramIndex++;
      }

      query += " ORDER BY h.generated_at DESC";

      if (filters?.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
      }

      return await db.query(query, params) as ReportHistory[];
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
