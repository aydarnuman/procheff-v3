import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

interface GenerateResult {
  path: string;
  size: number;
}

/**
 * Generate PDF report
 */
export async function generatePDFReport(
  templateName: string,
  data: Record<string, any>
): Promise<GenerateResult> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `report-${templateName.toLowerCase().replace(/\s+/g, "-")}-${timestamp}.pdf`;
  const filePath = path.join(process.cwd(), "reports", fileName);

  // Ensure reports directory exists
  const reportsDir = path.join(process.cwd(), "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    try {
      // Create PDF document
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: templateName,
          Author: "ProCheff v3",
          Subject: "Report",
          CreationDate: new Date(),
        },
      });

      // Pipe to file
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Add header
      doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .text(data.title || templateName, { align: "center" });

      doc
        .fontSize(10)
        .font("Helvetica")
        .text(`Oluşturulma Tarihi: ${new Date().toLocaleDateString("tr-TR")}`, {
          align: "center",
        });

      doc.moveDown(2);

      // Add sections
      if (data.sections && Array.isArray(data.sections)) {
        data.sections.forEach((section: any) => {
          // Section title
          doc
            .fontSize(16)
            .font("Helvetica-Bold")
            .text(section.name, { underline: true });

          doc.moveDown(0.5);

          // Section content
          doc.fontSize(10).font("Helvetica");

          if (Array.isArray(section.data)) {
            // If data is array, create a list
            section.data.forEach((item: any) => {
              if (typeof item === "object") {
                doc.text(JSON.stringify(item, null, 2));
              } else {
                doc.text(`• ${item}`);
              }
            });
          } else if (typeof section.data === "object") {
            // If data is object, show key-value pairs
            Object.entries(section.data).forEach(([key, value]) => {
              doc.text(`${key}: ${value}`);
            });
          } else {
            // Plain text
            doc.text(String(section.data));
          }

          doc.moveDown();
        });
      }

      // Add footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc
          .fontSize(8)
          .text(
            `Sayfa ${i + 1} / ${pages.count}`,
            50,
            doc.page.height - 50,
            { align: "center" }
          );
      }

      // Finalize PDF
      doc.end();

      stream.on("finish", () => {
        const stats = fs.statSync(filePath);
        resolve({ path: filePath, size: stats.size });
      });

      stream.on("error", reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate Excel report
 */
export async function generateExcelReport(
  templateName: string,
  data: Record<string, any>
): Promise<GenerateResult> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `report-${templateName.toLowerCase().replace(/\s+/g, "-")}-${timestamp}.xlsx`;
  const filePath = path.join(process.cwd(), "reports", fileName);

  // Ensure reports directory exists
  const reportsDir = path.join(process.cwd(), "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ProCheff v3";
  workbook.created = new Date();

  // Add summary worksheet
  const summarySheet = workbook.addWorksheet("Özet");

  // Add title
  summarySheet.addRow([data.title || templateName]);
  summarySheet.addRow([`Oluşturulma: ${new Date().toLocaleDateString("tr-TR")}`]);
  summarySheet.addRow([]);

  // Style the title
  summarySheet.getCell("A1").font = { size: 16, bold: true };
  summarySheet.getCell("A2").font = { size: 10, italic: true };

  // Add sections as separate worksheets
  if (data.sections && Array.isArray(data.sections)) {
    data.sections.forEach((section: any) => {
      const worksheet = workbook.addWorksheet(section.name);

      if (Array.isArray(section.data) && section.data.length > 0) {
        // If data is array of objects, create table
        if (typeof section.data[0] === "object") {
          // Add headers
          const headers = Object.keys(section.data[0]);
          worksheet.addRow(headers);

          // Style headers
          worksheet.getRow(1).font = { bold: true };
          worksheet.getRow(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE0E0E0" },
          };

          // Add data rows
          section.data.forEach((item: any) => {
            const row = headers.map(header => item[header] || "");
            worksheet.addRow(row);
          });

          // Auto-fit columns
          worksheet.columns.forEach(column => {
            column.width = 15;
          });
        } else {
          // Simple list
          section.data.forEach((item: any) => {
            worksheet.addRow([String(item)]);
          });
        }
      } else if (typeof section.data === "object") {
        // Key-value pairs
        Object.entries(section.data).forEach(([key, value]) => {
          worksheet.addRow([key, value]);
        });
      }
    });
  }

  // Save file
  await workbook.xlsx.writeFile(filePath);

  const stats = fs.statSync(filePath);
  return { path: filePath, size: stats.size };
}

/**
 * Generate CSV report
 */
export async function generateCSVReport(
  templateName: string,
  data: Record<string, any>
): Promise<GenerateResult> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `report-${templateName.toLowerCase().replace(/\s+/g, "-")}-${timestamp}.csv`;
  const filePath = path.join(process.cwd(), "reports", fileName);

  // Ensure reports directory exists
  const reportsDir = path.join(process.cwd(), "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  let csvContent = "";

  // Add BOM for UTF-8 Excel compatibility
  csvContent = "\ufeff";

  // Add title
  csvContent += `"${data.title || templateName}"\n`;
  csvContent += `"Oluşturulma: ${new Date().toLocaleDateString("tr-TR")}"\n\n`;

  // Add sections
  if (data.sections && Array.isArray(data.sections)) {
    data.sections.forEach((section: any) => {
      csvContent += `"${section.name}"\n`;

      if (Array.isArray(section.data) && section.data.length > 0) {
        if (typeof section.data[0] === "object") {
          // Headers
          const headers = Object.keys(section.data[0]);
          csvContent += headers.map(h => `"${h}"`).join(",") + "\n";

          // Data rows
          section.data.forEach((item: any) => {
            const row = headers.map(h => {
              const value = item[h] || "";
              // Escape quotes and wrap in quotes
              return `"${String(value).replace(/"/g, '""')}"`;
            });
            csvContent += row.join(",") + "\n";
          });
        } else {
          // Simple list
          section.data.forEach((item: any) => {
            csvContent += `"${String(item).replace(/"/g, '""')}"\n`;
          });
        }
      }

      csvContent += "\n";
    });
  }

  // Write file
  fs.writeFileSync(filePath, csvContent, "utf-8");

  const stats = fs.statSync(filePath);
  return { path: filePath, size: stats.size };
}

/**
 * Replace variables in template
 */
export function replaceVariables(
  template: string,
  variables: Record<string, any>
): string {
  let result = template;

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    result = result.replace(regex, String(value));
  });

  return result;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}