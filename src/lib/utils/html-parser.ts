/**
 * HTML Parser for Tender Details
 * Extracts structured data from ihalebul.com HTML content
 */

interface TenderSection {
  title: string;
  items: Array<{
    label: string;
    value: string;
  }>;
}

interface ParsedTenderDetail {
  sections: TenderSection[];
  rawText: string;
  tables?: Array<{
    title?: string;
    headers?: string[];
    rows?: string[][];
  }>;
}

/**
 * Parse HTML content from ihalebul.com and extract structured data
 */
export function parseTenderHTML(html: string): ParsedTenderDetail {
  // Remove script and style tags
  let cleanHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, ''); // Remove comments

  // Create a temporary div to parse HTML
  if (typeof window === 'undefined') {
    // Server-side fallback - just extract text
    cleanHtml = cleanHtml
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      sections: [{
        title: 'İhale Bilgileri',
        items: [{
          label: 'Detaylar',
          value: cleanHtml.substring(0, 1000) + (cleanHtml.length > 1000 ? '...' : '')
        }]
      }],
      rawText: cleanHtml
    };
  }

  // Client-side parsing
  const parser = new DOMParser();
  const doc = parser.parseFromString(cleanHtml, 'text/html');
  const sections: TenderSection[] = [];

  // Extract table data
  const tables = doc.querySelectorAll('table');
  tables.forEach((table, tableIndex) => {
    const section: TenderSection = {
      title: `Bölüm ${tableIndex + 1}`,
      items: []
    };

    // Check if table has headers
    const headers = table.querySelectorAll('th');
    if (headers.length > 0) {
      // Find section title from previous heading
      let previousSibling = table.previousElementSibling;
      while (previousSibling) {
        if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(previousSibling.tagName)) {
          section.title = previousSibling.textContent?.trim() || section.title;
          break;
        }
        previousSibling = previousSibling.previousElementSibling;
      }
    }

    // Extract rows
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');

      if (cells.length === 2) {
        // Key-value pair
        const label = cells[0].textContent?.trim() || '';
        const value = cells[1].textContent?.trim() || '';

        if (label && value && label !== value) {
          section.items.push({ label, value });
        }
      } else if (cells.length === 1) {
        // Single cell - might be a section header or value
        const text = cells[0].textContent?.trim() || '';
        if (text && text.length < 100) {
          // Likely a header
          if (section.items.length > 0) {
            sections.push(section);
            section.title = text;
            section.items = [];
          } else {
            section.title = text;
          }
        } else if (text) {
          // Long text - add as content
          section.items.push({
            label: 'İçerik',
            value: text
          });
        }
      } else if (cells.length > 2) {
        // Multi-column table
        const headers: string[] = [];
        const values: string[] = [];

        cells.forEach((cell, index) => {
          const text = cell.textContent?.trim() || '';
          if (index === 0 || cell.tagName === 'TH') {
            headers.push(text);
          } else {
            values.push(text);
          }
        });

        if (headers.length > 0 && values.length > 0) {
          headers.forEach((header, i) => {
            if (header && values[i]) {
              section.items.push({
                label: header,
                value: values[i]
              });
            }
          });
        }
      }
    });

    if (section.items.length > 0) {
      sections.push(section);
    }
  });

  // If no tables found, look for definition lists or structured divs
  if (sections.length === 0) {
    // Look for dl/dt/dd structure
    const dlElements = doc.querySelectorAll('dl');
    dlElements.forEach(dl => {
      const section: TenderSection = {
        title: 'İhale Detayları',
        items: []
      };

      const dtElements = dl.querySelectorAll('dt');
      const ddElements = dl.querySelectorAll('dd');

      dtElements.forEach((dt, index) => {
        const label = dt.textContent?.trim() || '';
        const value = ddElements[index]?.textContent?.trim() || '';

        if (label && value) {
          section.items.push({ label, value });
        }
      });

      if (section.items.length > 0) {
        sections.push(section);
      }
    });

    // Look for label-value pairs in divs
    const containerDivs = doc.querySelectorAll('div[class*="detail"], div[class*="info"], div[class*="content"]');
    containerDivs.forEach(container => {
      const section: TenderSection = {
        title: 'Genel Bilgiler',
        items: []
      };

      // Look for label-value patterns
      const labels = container.querySelectorAll('[class*="label"], [class*="key"], strong, b');
      labels.forEach(label => {
        const labelText = label.textContent?.trim().replace(/[:：]/g, '') || '';
        const nextSibling = label.nextSibling;
        let valueText = '';

        if (nextSibling) {
          if (nextSibling.nodeType === Node.TEXT_NODE) {
            valueText = nextSibling.textContent?.trim() || '';
          } else if (nextSibling.nodeType === Node.ELEMENT_NODE) {
            valueText = (nextSibling as Element).textContent?.trim() || '';
          }
        }

        // Also check next element sibling
        if (!valueText) {
          const nextElement = label.nextElementSibling;
          if (nextElement && !['STRONG', 'B'].includes(nextElement.tagName)) {
            valueText = nextElement.textContent?.trim() || '';
          }
        }

        if (labelText && valueText && labelText !== valueText) {
          section.items.push({
            label: labelText,
            value: valueText
          });
        }
      });

      if (section.items.length > 0) {
        sections.push(section);
      }
    });
  }

  // Extract raw text for fallback
  const rawText = doc.body.textContent?.trim() || '';

  // If still no structured data found, create basic sections from paragraphs
  if (sections.length === 0) {
    const paragraphs = doc.querySelectorAll('p');
    const basicSection: TenderSection = {
      title: 'İhale Açıklaması',
      items: []
    };

    paragraphs.forEach((p, index) => {
      const text = p.textContent?.trim() || '';
      if (text && text.length > 10) {
        basicSection.items.push({
          label: `Paragraf ${index + 1}`,
          value: text
        });
      }
    });

    if (basicSection.items.length > 0) {
      sections.push(basicSection);
    }
  }

  // Clean up sections - remove duplicates and empty values
  sections.forEach(section => {
    const seen = new Set<string>();
    section.items = section.items.filter(item => {
      const key = `${item.label}:${item.value}`;
      if (seen.has(key) || !item.value || item.value === '-' || item.value === 'null') {
        return false;
      }
      seen.add(key);
      return true;
    });
  });

  // Remove empty sections
  const nonEmptySections = sections.filter(s => s.items.length > 0);

  return {
    sections: nonEmptySections,
    rawText
  };
}

/**
 * Format parsed data for display
 */
export function formatParsedData(parsed: ParsedTenderDetail): string {
  if (parsed.sections.length === 0) {
    return parsed.rawText;
  }

  let formatted = '';

  parsed.sections.forEach(section => {
    formatted += `<div class="mb-6">`;
    formatted += `<h3 class="text-lg font-semibold text-white mb-3 pb-2 border-b border-slate-700/50">${section.title}</h3>`;
    formatted += `<div class="space-y-3">`;

    section.items.forEach(item => {
      formatted += `<div class="grid grid-cols-1 md:grid-cols-3 gap-2">`;
      formatted += `<div class="text-sm text-slate-400 font-medium">${item.label}:</div>`;
      formatted += `<div class="md:col-span-2 text-sm text-slate-200">${item.value}</div>`;
      formatted += `</div>`;
    });

    formatted += `</div>`;
    formatted += `</div>`;
  });

  return formatted;
}