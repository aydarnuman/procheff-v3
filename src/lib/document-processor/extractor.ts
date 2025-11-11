/**
 * Document Extractor
 * Handles text, table, and metadata extraction from various document formats
 */

import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import type {
  DocumentInfo,
  TextBlock,
  ExtractedTable,
  ExtractedDate,
  ExtractedAmount,
  ExtractedEntity,
  ProcessingOptions,
  DocumentType
} from './types';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

/**
 * Extract content from a file
 */
export async function extractFromFile(
  file: File | Buffer,
  docId: string,
  options: ProcessingOptions
): Promise<{
  info: DocumentInfo;
  textBlocks: TextBlock[];
  tables: ExtractedTable[];
  rawText: string;
}> {
  const buffer: ArrayBuffer = file instanceof File
    ? await file.arrayBuffer()
    : file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
  const hash = calculateHash(file instanceof File ? Buffer.from(buffer) : file);

  let info: DocumentInfo;
  let textBlocks: TextBlock[] = [];
  let tables: ExtractedTable[] = [];
  let rawText = '';

  if (file instanceof File) {
    const mimeType = file.type;
    const fileName = file.name;
    const fileSize = file.size;

    info = {
      doc_id: docId,
      type_guess: guessDocumentType(fileName, ''),
      hash,
      name: fileName,
      size: fileSize,
      mime_type: mimeType,
      created_at: new Date().toISOString()
    };

    // Route to appropriate extractor based on MIME type
    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      const result = await extractFromPDF(buffer, docId, options);
      textBlocks = result.textBlocks;
      tables = result.tables;
      rawText = result.rawText;
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')
    ) {
      const result = await extractFromDOCX(buffer, docId);
      textBlocks = result.textBlocks;
      rawText = result.rawText;
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls')
    ) {
      const result = await extractFromExcel(buffer, docId);
      tables = result.tables;
      rawText = result.rawText;
    } else if (mimeType === 'text/html' || fileName.endsWith('.html')) {
      const result = await extractFromHTML(buffer, docId);
      textBlocks = result.textBlocks;
      tables = result.tables;
      rawText = result.rawText;
    } else if (mimeType.startsWith('text/') || fileName.endsWith('.txt')) {
      const text = new TextDecoder('utf-8').decode(buffer);
      rawText = text;
      textBlocks = [
        {
          block_id: `${docId}:1`,
          text: text,
          doc_id: docId,
          source: docId
        }
      ];
    }
  } else {
    // Buffer input - need to detect type
    info = {
      doc_id: docId,
      type_guess: 'bilinmeyen',
      hash,
      name: 'buffer_input',
      size: buffer.byteLength,
      mime_type: 'application/octet-stream',
      created_at: new Date().toISOString()
    };
  }

  // Clean and normalize text if requested
  if (options.clean_text) {
    rawText = cleanText(rawText);
    textBlocks = textBlocks.map(block => ({
      ...block,
      text: cleanText(block.text)
    }));
  }

  return { info, textBlocks, tables, rawText };
}

/**
 * Extract from PDF
 */
async function extractFromPDF(
  buffer: ArrayBuffer,
  docId: string,
  options: ProcessingOptions
): Promise<{
  textBlocks: TextBlock[];
  tables: ExtractedTable[];
  rawText: string;
}> {
  const textBlocks: TextBlock[] = [];
  const tables: ExtractedTable[] = [];
  let rawText = '';

  try {
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    const numPages = pdf.numPages;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      let pageText = '';
      let blockIndex = 0;

      for (const item of textContent.items) {
        if ('str' in item && item.str) {
          const text = item.str;
          pageText += text + ' ';

          textBlocks.push({
            block_id: `${docId}:${pageNum}.${blockIndex}`,
            text: text,
            doc_id: docId,
            source: docId,
            page: pageNum,
            bbox: item.transform ? {
              x: item.transform[4],
              y: item.transform[5],
              width: item.width || 0,
              height: item.height || 0
            } : undefined
          });

          blockIndex++;
        }
      }

      rawText += pageText + '\n';

      // Extract tables if enabled
      if (options.extract_tables) {
        const pageTables = await extractTablesFromPDFPage(page, docId, pageNum);
        tables.push(...pageTables);
      }
    }
  } catch (error) {
    console.error('PDF extraction error:', error);
    // If PDF is corrupted or encrypted, might need OCR
    if (options.ocr_enabled) {
      // TODO: Implement OCR fallback
      console.log('OCR fallback needed but not yet implemented');
    }
  }

  return { textBlocks, tables, rawText };
}

/**
 * Extract tables from PDF page (simplified)
 */
async function extractTablesFromPDFPage(
  page: any,
  docId: string,
  pageNum: number
): Promise<ExtractedTable[]> {
  // Simplified table extraction - in production, use tabula-js or similar
  const tables: ExtractedTable[] = [];

  // This is a placeholder - real implementation would analyze text positions
  // to detect table structures based on alignment and spacing

  return tables;
}

/**
 * Extract from DOCX
 */
async function extractFromDOCX(
  buffer: ArrayBuffer,
  docId: string
): Promise<{
  textBlocks: TextBlock[];
  rawText: string;
}> {
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  const text = result.value;

  // Split into paragraphs as blocks
  const paragraphs = text.split(/\n\n+/);
  const textBlocks: TextBlock[] = paragraphs.map((para, index) => ({
    block_id: `${docId}:${index + 1}`,
    text: para,
    doc_id: docId,
    source: docId
  }));

  return { textBlocks, rawText: text };
}

/**
 * Extract from Excel
 */
async function extractFromExcel(
  buffer: ArrayBuffer,
  docId: string
): Promise<{
  tables: ExtractedTable[];
  rawText: string;
}> {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const tables: ExtractedTable[] = [];
  let rawText = '';

  workbook.SheetNames.forEach((sheetName, sheetIndex) => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

    if (jsonData.length > 0) {
      const headers = jsonData[0];
      const rows = jsonData.slice(1);

      tables.push({
        table_id: `T${sheetIndex + 1}`,
        doc_id: docId,
        headers: headers,
        rows: rows,
        title: sheetName
      });

      // Add to raw text
      rawText += `Table: ${sheetName}\n`;
      rawText += headers.join('\t') + '\n';
      rows.forEach(row => {
        rawText += row.join('\t') + '\n';
      });
      rawText += '\n';
    }
  });

  return { tables, rawText };
}

/**
 * Extract from HTML
 */
async function extractFromHTML(
  buffer: ArrayBuffer,
  docId: string
): Promise<{
  textBlocks: TextBlock[];
  tables: ExtractedTable[];
  rawText: string;
}> {
  const html = new TextDecoder('utf-8').decode(buffer);
  const $ = cheerio.load(html);

  const textBlocks: TextBlock[] = [];
  const tables: ExtractedTable[] = [];
  let rawText = '';

  // Extract text blocks from paragraphs and divs
  let blockIndex = 0;
  $('p, div, section, article').each((i, elem) => {
    const text = $(elem).text().trim();
    if (text) {
      textBlocks.push({
        block_id: `${docId}:${blockIndex}`,
        text: text,
        doc_id: docId,
        source: docId
      });
      rawText += text + '\n';
      blockIndex++;
    }
  });

  // Extract tables
  $('table').each((tableIndex, table) => {
    const headers: string[] = [];
    const rows: string[][] = [];

    // Get headers
    $(table).find('thead th, thead td').each((i, cell) => {
      headers.push($(cell).text().trim());
    });

    // If no thead, try first row
    if (headers.length === 0) {
      $(table).find('tr:first td, tr:first th').each((i, cell) => {
        headers.push($(cell).text().trim());
      });
    }

    // Get rows
    $(table).find('tbody tr, tr:not(:first)').each((i, row) => {
      const rowData: string[] = [];
      $(row).find('td, th').each((j, cell) => {
        rowData.push($(cell).text().trim());
      });
      if (rowData.length > 0) {
        rows.push(rowData);
      }
    });

    if (headers.length > 0 || rows.length > 0) {
      tables.push({
        table_id: `T${tableIndex + 1}`,
        doc_id: docId,
        headers: headers,
        rows: rows
      });
    }
  });

  return { textBlocks, tables, rawText };
}

/**
 * Calculate file hash
 */
function calculateHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Guess document type from filename and content
 */
export function guessDocumentType(filename: string, content: string): DocumentType {
  const lower = filename.toLowerCase();
  const contentLower = content.toLowerCase();

  if (lower.includes('idari') || lower.includes('administrative') ||
      contentLower.includes('idari şartname')) {
    return 'idari';
  }
  if (lower.includes('teknik') || lower.includes('technical') ||
      contentLower.includes('teknik şartname')) {
    return 'teknik';
  }
  if (lower.includes('ilan') || lower.includes('announcement') ||
      contentLower.includes('ihale ilanı')) {
    return 'ilan';
  }
  if (lower.includes('sözleşme') || lower.includes('sozlesme') ||
      lower.includes('contract')) {
    return 'sozlesme';
  }
  if (lower.includes('menü') || lower.includes('menu') ||
      lower.includes('yemek')) {
    return 'menu';
  }
  if (lower.includes('gramaj') || lower.includes('portion')) {
    return 'gramaj';
  }
  if (lower.includes('ek') || lower.includes('appendix')) {
    return 'ek';
  }

  return 'bilinmeyen';
}

/**
 * Clean and normalize text
 */
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')           // Collapse whitespace
    .replace(/\n{3,}/g, '\n\n')     // Max 2 newlines
    .replace(/\t/g, ' ')            // Replace tabs with spaces
    .trim();
}