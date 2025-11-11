interface TenderSection {
  category?: string;
  title?: string;
  items: Array<{
    label: string;
    value: string;
  }>;
}

interface TenderTable {
  title: string;
  headers: string[];
  rows: string[][];
}

interface ParsedTenderData {
  sections: TenderSection[];
  tables: TenderTable[];
  textContent: string[];
  summary?: string;
}

/**
 * Convert text content to TXT format
 */
export function convertToTXT(data: ParsedTenderData, tenderTitle: string = 'İhale'): string {
  const lines: string[] = [];

  // Header
  lines.push('='.repeat(80));
  lines.push(`İHALE DETAYLARI - ${tenderTitle}`);
  lines.push('='.repeat(80));
  lines.push('');

  // Summary
  if (data.summary) {
    lines.push('ÖZET:');
    lines.push(data.summary);
    lines.push('');
    lines.push('-'.repeat(80));
    lines.push('');
  }

  // Key-Value Sections
  if (data.sections && data.sections.length > 0) {
    lines.push('YAPILANDIRILMIŞ BİLGİLER:');
    lines.push('');

    data.sections.forEach((section) => {
      lines.push(`[${section.category || section.title || 'Genel'}]`);
      section.items.forEach((item) => {
        lines.push(`  ${item.label}: ${item.value}`);
      });
      lines.push('');
    });

    lines.push('-'.repeat(80));
    lines.push('');
  }

  // Text Content
  if (data.textContent && data.textContent.length > 0) {
    lines.push('METİN İÇERİK:');
    lines.push('');
    data.textContent.forEach((paragraph) => {
      lines.push(paragraph);
      lines.push('');
    });
  }

  return lines.join('\n');
}

/**
 * Convert tables to CSV format (all tables combined)
 */
export function convertTablesToCSV(data: ParsedTenderData, tenderTitle: string = 'İhale'): string {
  const lines: string[] = [];

  // Header
  lines.push(`"İhale Tabloları - ${tenderTitle}"`);
  lines.push('');

  if (!data.tables || data.tables.length === 0) {
    lines.push('"Tablo bulunamadı"');
    return lines.join('\n');
  }

  // Each table
  data.tables.forEach((table, index) => {
    // Table title
    lines.push(`"${escapeCSV(table.title || `Tablo ${index + 1}`)}"`);
    lines.push('');

    // Headers
    if (table.headers && table.headers.length > 0) {
      lines.push(table.headers.map(h => `"${escapeCSV(h)}"`).join(','));
    }

    // Rows
    if (table.rows && table.rows.length > 0) {
      table.rows.forEach((row) => {
        lines.push(row.map(cell => `"${escapeCSV(cell)}"`).join(','));
      });
    }

    lines.push('');
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Convert to JSON format (complete data)
 */
export function convertToJSON(data: ParsedTenderData, tenderTitle: string = 'İhale'): string {
  const jsonData = {
    title: tenderTitle,
    summary: data.summary,
    sections: data.sections,
    tables: data.tables,
    textContent: data.textContent,
    exportedAt: new Date().toISOString()
  };

  return JSON.stringify(jsonData, null, 2);
}

/**
 * Escape special characters for CSV
 */
function escapeCSV(text: string): string {
  if (!text) return '';
  // Replace double quotes with two double quotes
  return text.replace(/"/g, '""');
}

/**
 * Generate filename for export
 */
export function generateFilename(tenderId: string, format: 'txt' | 'csv' | 'json', tenderTitle?: string): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const sanitizedTitle = tenderTitle
    ? tenderTitle
        .substring(0, 50) // Max 50 chars
        .replace(/[^a-zA-Z0-9ğüşöçİĞÜŞÖÇ\s-]/g, '') // Remove special chars
        .replace(/\s+/g, '_') // Replace spaces with underscore
    : 'ihale';

  return `${sanitizedTitle}_${tenderId}_${date}.${format}`;
}

/**
 * Create a downloadable Blob from CSV string
 */
export function createCSVBlob(csvContent: string): Blob {
  // Add BOM for UTF-8 to ensure proper encoding in Excel
  const BOM = '\uFEFF';
  return new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
}
