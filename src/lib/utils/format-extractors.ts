import * as cheerio from 'cheerio';

/**
 * Extract İhale İlanı (Tender Announcement) - Only text content, no tables
 * For TXT format: Announcement text, descriptions, conditions
 */
export function extractTextFromHTML(html: string): string {
  const $ = cheerio.load(html);
  
  // Remove script, style, and other non-content tags
  $('script, style, nav, header, footer, aside, .ads, .advertisement, .social-share').remove();
  
  // Remove UI elements (buttons, links, navigation, etc.)
  $('button, .btn, a[href*="print"], a[href*="yazdır"], .print, .follow, .not-ekle, .takip-et, .notlarim, .viewers, .followers, .sidebar, .menu, .navigation').remove();
  
  // Remove elements with specific text patterns (UI labels) - more aggressive
  $('*').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    // Remove UI labels and navigation elements
    if (text.match(/^(Görüntüleyen|Takip eden|Not ekle|Takip et|Tümünü yazdır|Notlarım|Kaydet|Kapat|Yazdır|Tam ekran|Resmi kaynağa git|Muhtemel katılımcılar|Benzer ihale geçmişi|Sektör bilgileri|Güncel ihaleler|Geçmiş ihaleler|Analiz|İdare bilgileri)$/i)) {
      $el.remove();
    }
    // Remove elements that contain only numbers and UI text (like "Görüntüleyen: 2")
    if (text.match(/^(Görüntüleyen|Takip eden):\s*\d+$/i)) {
      $el.remove();
    }
  });
  
  // Remove modal/dialog elements
  $('.modal, .dialog, [role="dialog"], [class*="modal"], [class*="dialog"]').remove();
  
  // Remove action buttons and links
  $('a[href*="#"], a[onclick], button[onclick]').remove();
  
  // Get main content area
  const mainContent = $('main, #tender, .tender-content, .content, body').first();
  if (mainContent.length === 0) {
    return $('body').text().trim();
  }
  
  let text = '';
  
  // 1. Extract main title (h1)
  const mainTitle = mainContent.find('h1').first().text().trim();
  if (mainTitle) {
    text += `${mainTitle}\n${'='.repeat(mainTitle.length)}\n\n`;
  }
  
  // 2. Extract key-value pairs from tables (İhale Bilgileri) - but NOT data tables
  mainContent.find('table').each((_, table) => {
    const $table = $(table);
    const firstRow = $table.find('tr').first();
    const colCount = firstRow.find('td, th').length;
    const rowCount = $table.find('tr').length;
    
    // Only extract key-value tables (2 columns, not data tables)
    if (colCount === 2 && rowCount <= 20) {
      const rows: string[] = [];
      let hasKeyValue = false;
      
      $table.find('tr').each((_, row) => {
        const cells = $(row).find('td, th');
        if (cells.length === 2) {
          const label = cells.eq(0).text().trim();
          const value = cells.eq(1).text().trim();
          if (label && value && label.length < 100 && value.length < 500) {
            rows.push(`${label}: ${value}`);
            hasKeyValue = true;
          }
        }
      });
      
      if (hasKeyValue && rows.length > 0) {
        const caption = $table.find('caption').text().trim() || 
                       $table.prevAll('h2, h3, h4').first().text().trim() ||
                       'İhale Bilgileri';
        text += `${caption}\n${'-'.repeat(caption.length)}\n${rows.join('\n')}\n\n`;
      }
    }
  });
  
  // Remove pagination and table UI elements
  $('*').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    // Remove pagination text
    if (text.match(/\d+\s*kayıttan\s*\d+\s*-\s*\d+\s*arasındaki\s*kayıtlar\s*gösteriliyor/i)) {
      $el.remove();
    }
    // Remove search UI elements
    if (text.match(/^(Ara:|#KalemMiktarBirim)$/i)) {
      $el.remove();
    }
  });
  
  // Remove repeated disclaimer text
  $('*').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    if (text === 'Bu ilan bilgilendirme amaçlıdır. Resmi belge olarak kullanılamaz.' || 
        text.match(/^Bu ilan bilgilendirme amaçlıdır/i)) {
      // Keep only first occurrence, remove others
      const isFirst = $el.prevAll('*').filter((_, prev) => {
        return $(prev).text().trim() === text;
      }).length === 0;
      if (!isFirst) {
        $el.remove();
      }
    }
  });
  
  // 3. Extract headings and their text content (skip tables)
  mainContent.find('h2, h3').each((_, heading) => {
    const $heading = $(heading);
    const headingText = $heading.text().trim();
    
    // Skip headings that are for data tables or UI elements
    const lowerHeading = headingText.toLowerCase();
    if (lowerHeading.includes('mal/hizmet') || 
        lowerHeading.includes('mal ve hizmet') ||
        lowerHeading.includes('liste') ||
        lowerHeading.includes('fiyat') ||
        lowerHeading.includes('muhtemel katılımcılar') ||
        lowerHeading.includes('benzer ihale geçmişi') ||
        lowerHeading.includes('sektör bilgileri') ||
        lowerHeading.includes('güncel ihaleler') ||
        lowerHeading.includes('geçmiş ihaleler') ||
        lowerHeading.includes('idare bilgileri') ||
        lowerHeading === 'analiz' ||
        lowerHeading.includes('idari şartname') ||
        lowerHeading.includes('teknik şartname')) {
      return; // Skip data table headings and UI navigation
    }
    
    // Get content after heading (until next heading or table)
    let content = '';
    let next = $heading.next();
    while (next.length && !next.is('h1, h2, h3, h4, h5, h6, table')) {
      const tagName = next.prop('tagName')?.toLowerCase();
      if (tagName === 'p') {
        const para = next.text().trim();
        if (para && para.length > 10) {
          content += `${para}\n\n`;
        }
      } else if (tagName === 'ul' || tagName === 'ol') {
        next.find('li').each((_, li) => {
          const item = $(li).text().trim();
          if (item) {
            content += `• ${item}\n`;
          }
        });
        content += '\n';
      } else if (tagName === 'div') {
        // Check if div contains meaningful text (not empty or just whitespace)
        const divText = next.text().trim();
        if (divText && divText.length > 20 && !next.find('table').length) {
          content += `${divText}\n\n`;
        }
      }
      next = next.next();
    }
    
    if (content.trim()) {
      text += `${headingText}\n${'-'.repeat(headingText.length)}\n${content.trim()}\n\n`;
    }
  });
  
  // 4. Extract paragraphs (skip if they're in data table sections)
  const importantParagraphs: string[] = [];
  mainContent.find('p').each((_, el) => {
    const $para = $(el);
    // Skip paragraphs that are inside or near data tables
    const hasDataTableNearby = $para.siblings('table').length > 0 || 
                               $para.closest('div').find('table').length > 0;
    
    if (hasDataTableNearby) {
      return; // Skip paragraphs near data tables
    }
    
    const para = $para.text().trim();
    // Only include meaningful paragraphs - filter out UI text
    if (para.length > 30 && 
        !para.match(/^(©|Copyright|Tüm hakları|All rights)/i) &&
        !para.match(/^(Ana sayfa|Home|İletişim|Contact)/i) &&
        !para.match(/^(Görüntüleyen|Takip eden|Not ekle|Takip et|Tümünü yazdır|Notlarım)/i) &&
        !para.match(/^(Bu ilan bilgilendirme amaçlıdır)/i)) {
      importantParagraphs.push(para);
    }
  });
  
  if (importantParagraphs.length > 0) {
    text += `Açıklamalar\n${'-'.repeat('Açıklamalar'.length)}\n`;
    importantParagraphs.forEach(para => {
      text += `${para}\n\n`;
    });
  }
  
  // Clean up: remove excessive whitespace and format paragraphs
  text = text
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .replace(/[ \t]{2,}/g, ' ') // Multiple spaces to single space
    .replace(/\s+\n/g, '\n') // Remove trailing spaces before newlines
    .replace(/\n\s+/g, '\n') // Remove leading spaces after newlines
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0) // Remove empty lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n') // Final cleanup
    .trim();
  
  // If result is too short or mostly whitespace, try alternative extraction
  if (text.length < 100) {
    // Fallback: extract from body but more aggressively clean
    const bodyText = mainContent.text()
      .replace(/\s+/g, ' ')
      .replace(/Bu ilan bilgilendirme amaçlıdır[^.]*\./gi, '') // Remove disclaimer
      .replace(/\d+\s*kayıttan[^.]*\./gi, '') // Remove pagination
      .replace(/Ara:|#KalemMiktarBirim/gi, '') // Remove search UI
      .trim();
    
    return bodyText || text;
  }
  
  return text;
}

/**
 * Extract Mal/Hizmet Listesi (Goods/Services List) tables only
 * For CSV format: Only data tables with prices, quantities, etc.
 */
export function extractTablesFromHTML(html: string): Array<{
  title: string;
  headers: string[];
  rows: string[][];
}> {
  const $ = cheerio.load(html);
  const tables: Array<{
    title: string;
    headers: string[];
    rows: string[][];
  }> = [];
  
  // Get main content area
  const mainContent = $('main, #tender, .tender-content, .content, body').first();
  
  mainContent.find('table').each((index, table) => {
    const $table = $(table);
    const firstRow = $table.find('tr').first();
    const colCount = firstRow.find('td, th').length;
    const rowCount = $table.find('tr').length;
    
    // Only extract data tables (more than 2 columns OR many rows)
    // Skip key-value tables (2 columns, few rows)
    if (colCount <= 2 && rowCount <= 10) {
      return; // Skip key-value tables
    }
    
    const headers: string[] = [];
    const rows: string[][] = [];
    
    // Try to find caption or previous heading for title
    let title = $table.find('caption').text().trim();
    if (!title) {
      // Look for previous heading
      const prev = $table.prevAll('h1, h2, h3, h4, h5, h6').first();
      if (prev.length) {
        title = prev.text().trim();
      } else {
        title = `Mal/Hizmet Listesi ${tables.length + 1}`;
      }
    }
    
    // Extract headers from thead or first row
    const $thead = $table.find('thead');
    if ($thead.length > 0) {
      $thead.find('th, td').each((_, cell) => {
        headers.push($(cell).text().trim());
      });
    } else {
      // Try first row as headers
      const $firstRow = $table.find('tr').first();
      $firstRow.find('th, td').each((_, cell) => {
        headers.push($(cell).text().trim());
      });
    }
    
    // Extract rows (skip header row if no thead)
    const $tbody = $table.find('tbody');
    const $rows = $tbody.length > 0 ? $tbody.find('tr') : $table.find('tr').slice($thead.length > 0 ? 0 : 1);
    
    $rows.each((_, row) => {
      const rowData: string[] = [];
      $(row).find('td, th').each((_, cell) => {
        rowData.push($(cell).text().trim());
      });
      if (rowData.length > 0 && rowData.some(cell => cell.length > 0)) {
        rows.push(rowData);
      }
    });
    
    // Only add if it's a real data table
    if ((headers.length > 0 || rows.length > 0) && (colCount > 2 || rows.length > 5)) {
      tables.push({ title, headers, rows });
    }
  });
  
  return tables;
}

/**
 * Convert tables to CSV format
 */
export function tablesToCSV(tables: Array<{
  title: string;
  headers: string[];
  rows: string[][];
}>): string {
  const lines: string[] = [];
  
  tables.forEach((table, tableIndex) => {
    if (tableIndex > 0) {
      lines.push(''); // Empty line between tables
    }
    
    // Table title
    lines.push(`# ${table.title}`);
    lines.push('');
    
    // Headers
    if (table.headers.length > 0) {
      lines.push(table.headers.map(escapeCSV).join(','));
    }
    
    // Rows
    table.rows.forEach(row => {
      lines.push(row.map(escapeCSV).join(','));
    });
  });
  
  return lines.join('\n');
}

/**
 * Escape CSV special characters
 */
function escapeCSV(text: string): string {
  if (!text) return '';
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Extract structured data from HTML (for JSON)
 * Uses direct HTML parsing, not AI
 */
export function extractStructuredDataFromHTML(html: string): {
  sections: Array<{
    title: string;
    items: Array<{ label: string; value: string }>;
  }>;
  tables: Array<{
    title: string;
    headers: string[];
    rows: string[][];
  }>;
  textContent: string[];
} {
  const $ = cheerio.load(html);
  const sections: Array<{
    title: string;
    items: Array<{ label: string; value: string }>;
  }> = [];
  const textContent: string[] = [];
  
  // Get main content
  const mainContent = $('main, #tender, .tender-content, .content, body').first();
  
  // Extract sections from tables (key-value pairs)
  mainContent.find('table').each((_, table) => {
    const $table = $(table);
    const items: Array<{ label: string; value: string }> = [];
    
    // Find title
    let title = $table.find('caption').text().trim();
    if (!title) {
      const prev = $table.prevAll('h1, h2, h3, h4, h5, h6').first();
      if (prev.length) {
        title = prev.text().trim();
      } else {
        title = 'Bilgiler';
      }
    }
    
    // Extract key-value pairs from table rows
    $table.find('tr').each((_, row) => {
      const cells = $(row).find('td, th');
      if (cells.length >= 2) {
        const label = cells.eq(0).text().trim();
        const value = cells.eq(1).text().trim();
        if (label && value) {
          items.push({ label, value });
        }
      }
    });
    
    if (items.length > 0) {
      sections.push({ title, items });
    }
  });
  
  // Extract paragraphs as text content
  mainContent.find('p').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 20) { // Only meaningful paragraphs
      textContent.push(text);
    }
  });
  
  // Extract tables
  const tables = extractTablesFromHTML(html);
  
  return { sections, tables, textContent };
}

