/**
 * Document Extractor
 * Handles text, table, and metadata extraction from various document formats
 * Enhanced with SmartDocumentProcessor capabilities
 */

import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import { TurkishNormalizer } from '@/lib/utils/turkish-normalizer';
import { ZipExtractor } from '@/lib/utils/zip-extractor';
import { XlsxProcessor } from '@/lib/utils/xlsx-processor';
import { AILogger } from '@/lib/ai/logger';
import type {
  DocumentInfo,
  TextBlock,
  ExtractedTable,
  ExtractedDate,
  ExtractedAmount,
  ExtractedEntity,
  ProcessingOptions,
  DocumentType,
  DocumentTypeGuess
} from './types';

export type ProgressCallback = (message: string, progress?: number) => void;

/**
 * 🆕 Format Support Check - SmartDocumentProcessor'dan
 * Desteklenen formatların listesi
 */
export const SUPPORTED_FORMATS = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'application/pdf', // .pdf
  'text/plain', // .txt
  'text/rtf', // .rtf
  'text/html', // .html
  'application/rtf', // .rtf alternate
  'text/csv', // .csv
  'application/vnd.ms-excel', // .csv (eski Excel format)
  'image/png', // .png (taranmış belgeler)
  'image/jpeg', // .jpg (taranmış belgeler)
  'application/json', // .json
  'text/json', // .json alternate
  'application/zip', // .zip
  'application/x-zip-compressed', // .zip alternate
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
] as const;

export const SUPPORTED_EXTENSIONS = [
  '.docx',
  '.doc',
  '.pdf',
  '.txt',
  '.rtf',
  '.html',
  '.csv',
  '.png',
  '.jpg',
  '.jpeg',
  '.json',
  '.zip',
  '.xlsx',
  '.xls',
] as const;

/**
 * 🆕 Dosya formatının desteklenip desteklenmediğini kontrol eder
 * Extension kontrolü öncelikli (MIME type bazen boş gelir)
 */
export function isFormatSupported(file: File): boolean {
  const mimeType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  const extension = fileName.substring(fileName.lastIndexOf('.'));

  // 1️⃣ Extension kontrolü (öncelikli - MIME type bazen boş gelir)
  if (SUPPORTED_EXTENSIONS.includes(extension as any)) {
    return true;
  }

  // 2️⃣ MIME type kontrolü (fallback)
  // Boş veya generic MIME type'ları ignore et
  if (!mimeType || mimeType === 'application/octet-stream') {
    return false; // Extension kontrolü zaten geçti, MIME type boşsa desteklenmiyor
  }

  return SUPPORTED_FORMATS.includes(mimeType as any);
}

/**
 * 🆕 Desteklenen formatların listesini döndürür
 */
export function getSupportedFormats(): string[] {
  return [...SUPPORTED_EXTENSIONS];
}

// Types for pdf2json (no official types available)
interface PDF2JSONTextRun {
  T?: string;
}

interface PDF2JSONTextItem {
  R?: PDF2JSONTextRun[];
}

interface PDF2JSONPage {
  Texts?: PDF2JSONTextItem[];
}

interface PDF2JSONData {
  Pages?: PDF2JSONPage[];
}

interface PDF2JSONParser {
  on(event: 'pdfParser_dataReady', callback: (data: PDF2JSONData) => void): void;
  on(event: 'pdfParser_dataError', callback: (error: Error) => void): void;
  parseBuffer(buffer: Buffer): void;
}

interface PDF2JSONConstructor {
  new (options: null, version: number): PDF2JSONParser;
}

// PDF.js will be loaded dynamically to avoid server-side issues

/**
 * Extract content from a file
 * Enhanced with SmartDocumentProcessor capabilities
 */
export async function extractFromFile(
  file: File | Buffer,
  docId: string,
  options: ProcessingOptions,
  onProgress?: ProgressCallback
): Promise<{
  info: DocumentInfo;
  textBlocks: TextBlock[];
  tables: ExtractedTable[];
  rawText: string;
}> {
  const startTime = Date.now(); // 🆕 Processing time tracking
  const buffer: ArrayBuffer = file instanceof File
    ? await file.arrayBuffer()
    : file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
  const hash = calculateHash(file instanceof File ? Buffer.from(buffer) : file);

  let info: DocumentInfo;
  let textBlocks: TextBlock[] = [];
  let tables: ExtractedTable[] = [];
  let rawText = '';
  const warnings: string[] = []; // 🆕 Warnings array - SmartDocumentProcessor'dan

  if (file instanceof File) {
    // 🆕 Format support check - SmartDocumentProcessor'dan
    if (!isFormatSupported(file)) {
      const supportedFormats = getSupportedFormats().join(', ');
      throw new Error(
        `Desteklenmeyen dosya formatı: ${file.name}. Desteklenen formatlar: ${supportedFormats}`
      );
    }

    const mimeType = file.type;
    const fileName = file.name;
    const fileSize = file.size;

    // Guess document type with confidence
    const typeGuess = guessDocumentType(fileName, '');
    
    info = {
      doc_id: docId,
      type_guess: typeGuess.type,
      type_confidence: typeGuess.confidence,
      hash,
      name: fileName,
      size: fileSize,
      mime_type: mimeType,
      created_at: new Date().toISOString()
    };

    // Route to appropriate extractor based on MIME type
    // 1. ZIP files - recursive extraction
    if (mimeType.includes('zip') || fileName.endsWith('.zip')) {
      onProgress?.('📦 ZIP dosyası işleniyor...');
      const result = await extractFromZIP(file, docId, options, onProgress);
      textBlocks = result.textBlocks;
      tables = result.tables;
      rawText = result.rawText;
    }
    // 2. DOCX files
    else if (
      mimeType.includes('wordprocessingml') ||
      fileName.endsWith('.docx')
    ) {
      onProgress?.('📄 DOCX dosyası işleniyor...');
      const result = await extractFromDOCX(buffer, docId);
      textBlocks = result.textBlocks;
      tables = result.tables || [];
      rawText = result.rawText;
      // Normalize with TurkishNormalizer
      if (options.clean_text) {
        rawText = TurkishNormalizer.normalize(rawText);
        textBlocks = textBlocks.map(block => ({
          ...block,
          text: TurkishNormalizer.normalize(block.text)
        }));
      }
    }
    // 3. DOC files (legacy Word)
    else if (mimeType.includes('msword') || fileName.endsWith('.doc')) {
      onProgress?.('📄 DOC dosyası işleniyor...');
      const result = await extractFromDOC(file, docId, options, onProgress);
      textBlocks = result.textBlocks;
      rawText = result.rawText;
    }
    // 4. XLSX/XLS files
    else if (
      mimeType.includes('spreadsheetml.sheet') ||
      (mimeType.includes('ms-excel') && !mimeType.includes('csv')) ||
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls')
    ) {
      onProgress?.('📊 Excel dosyası işleniyor...', 10);
      const result = await extractFromExcel(file, docId, onProgress);
      tables = result.tables;
      rawText = result.rawText;
      onProgress?.('✅ Excel işlendi', 90);
    }
    // 5. PDF files
    else if (mimeType.includes('pdf') || fileName.endsWith('.pdf')) {
      onProgress?.('📄 PDF dosyası işleniyor...', 10);
      const result = await extractFromPDF(buffer, docId, options, file instanceof File ? file : undefined, onProgress);
      textBlocks = result.textBlocks;
      tables = result.tables;
      rawText = result.rawText;
      onProgress?.('✅ PDF işlendi', 90);
    }
    // 6. JSON files
    else if (mimeType.includes('json') || fileName.endsWith('.json')) {
      onProgress?.('📄 JSON dosyası işleniyor...', 30);
      const result = await extractFromJSON(buffer, docId, onProgress);
      textBlocks = result.textBlocks;
      rawText = result.rawText;
      onProgress?.('✅ JSON işlendi', 90);
    }
    // 7. HTML files
    else if (mimeType.includes('html') || fileName.endsWith('.html') || fileName.endsWith('.htm')) {
      onProgress?.('📄 HTML dosyası işleniyor...', 30);
      const result = await extractFromHTML(buffer, docId, onProgress);
      textBlocks = result.textBlocks;
      tables = result.tables;
      rawText = result.rawText;
      onProgress?.('✅ HTML işlendi', 90);
    }
    // 7. CSV files - parse as tables
    else if (
      mimeType === 'text/csv' ||
      fileName.endsWith('.csv')
    ) {
      onProgress?.('📊 CSV dosyası işleniyor...', 30);
      const result = await extractFromCSV(buffer, docId, fileName, onProgress);
      textBlocks = result.textBlocks;
      tables = result.tables || [];
      rawText = result.rawText;
      onProgress?.('✅ CSV işlendi', 90);
    }
    // 8. Text files (TXT, RTF)
    else if (
      mimeType.startsWith('text/') ||
      fileName.endsWith('.txt') ||
      fileName.endsWith('.rtf')
    ) {
      onProgress?.('📄 Metin dosyası işleniyor...', 30);
      try {
        const result = await extractFromText(buffer, docId, fileName);
        textBlocks = result.textBlocks;
        rawText = result.rawText;
        onProgress?.('✅ Metin işlendi', 90);
      } catch (textError) {
        if (textError instanceof Error && textError.message.includes('boş')) {
          warnings.push(textError.message);
          throw textError; // Re-throw empty file error
        }
        throw textError;
      }
    }
    // 9. Unsupported format
    else {
      const supportedFormats = getSupportedFormats().join(', ');
      throw new Error(
        `Desteklenmeyen dosya formatı: ${fileName}. Desteklenen formatlar: ${supportedFormats}`
      );
    }

    // 🆕 Log processing time and warnings - SmartDocumentProcessor'dan
    const processingTime = Date.now() - startTime;
    if (warnings.length > 0) {
      AILogger.warn('File processing completed with warnings', {
        fileName,
        docId,
        processingTime,
        warnings
      });
    } else {
      AILogger.info('File processing completed', {
        fileName,
        docId,
        processingTime,
        textBlocks: textBlocks.length,
        tables: tables.length
      });
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

  // Clean and normalize text if requested (use TurkishNormalizer if not already applied)
  if (options.clean_text && rawText) {
    // Only apply if not already normalized (DOCX, DOC, etc. already normalized)
    if (!rawText.includes('normalized')) {
      rawText = TurkishNormalizer.normalize(rawText);
      textBlocks = textBlocks.map(block => ({
        ...block,
        text: TurkishNormalizer.normalize(block.text)
      }));
    }
  }

  return { info, textBlocks, tables, rawText };
}

/**
 * Extract from PDF
 * Enhanced with pdf2json fallback and OCR support
 */
async function extractFromPDF(
  buffer: ArrayBuffer,
  docId: string,
  options: ProcessingOptions,
  file?: File,
  onProgress?: ProgressCallback
): Promise<{
  textBlocks: TextBlock[];
  tables: ExtractedTable[];
  rawText: string;
}> {
  const textBlocks: TextBlock[] = [];
  const tables: ExtractedTable[] = [];
  let rawText = '';

  try {
    // ✅ Use pdf-parse (more stable for server-side)
    onProgress?.(`📄 PDF işleniyor...`, 10);

    AILogger.info('Starting PDF extraction', {
      docId,
      bufferSize: buffer.byteLength,
      fileName: file?.name,
      ocrEnabled: options.ocr_enabled
    });

    const pdfParse = (await import('pdf-parse') as any).default || (await import('pdf-parse'));
    const pdfData = await pdfParse(Buffer.from(buffer));

    rawText = pdfData.text;
    const numPages = pdfData.numpages;

    AILogger.info('PDF parsed successfully', {
      docId,
      numPages,
      textLength: rawText.length,
      hasText: rawText.trim().length > 0
    });

    onProgress?.(`📄 PDF: ${numPages} sayfa işlendi`, 30);

    // Split text into paragraphs (by double newlines or significant breaks)
    const paragraphs = rawText
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    // Create text blocks from paragraphs
    onProgress?.(`📝 Metin blokları oluşturuluyor...`, 40);
    paragraphs.forEach((paragraph, index) => {
      if (paragraph.length > 0) {
        textBlocks.push({
          block_id: `${docId}:p${index}`,
          text: paragraph,
          doc_id: docId,
          source: docId,
          page: undefined, // pdf-parse doesn't provide page numbers
        });
      }
    });
    onProgress?.(`✅ ${textBlocks.length} metin bloğu oluşturuldu`, 50);

    // Check if text extraction was successful
    if (rawText.trim().length < 100) {
      AILogger.warn('PDF metin katmanı bulunamadı, pdf2json fallback deneniyor');
      
      // Try pdf2json as fallback
      try {
        const { default: PDFParser } = await import('pdf2json');
        const PDFParserClass = PDFParser as unknown as PDF2JSONConstructor;
        const pdfParser = new PDFParserClass(null, 1);
        const pdfBuffer = Buffer.from(buffer);

        const fullText = await new Promise<string>((resolve, reject) => {
          pdfParser.on('pdfParser_dataReady', (pdfData: PDF2JSONData) => {
            try {
              let text = '';
              const pages = pdfData.Pages || [];

              pages.forEach((page: PDF2JSONPage) => {
                const texts = page.Texts || [];
                let pageText = '';
                
                texts.forEach((textItem: PDF2JSONTextItem) => {
                  if (textItem.R && Array.isArray(textItem.R)) {
                    textItem.R.forEach((r: PDF2JSONTextRun) => {
                      if (r.T) {
                        try {
                          pageText += decodeURIComponent(r.T) + ' ';
                        } catch (error) {
                          pageText += r.T + ' ';
                        }
                      }
                    });
                  }
                });

                text += pageText + '\n\n';
              });

              resolve(text);
            } catch (error) {
              reject(error instanceof Error ? error : new Error(String(error)));
            }
          });

          pdfParser.on('pdfParser_dataError', (error: Error) => reject(error));
          pdfParser.parseBuffer(pdfBuffer);
        });

        if (fullText.trim().length > 100) {
          rawText = TurkishNormalizer.normalize(fullText);
          // Rebuild text blocks
          const paragraphs = rawText.split(/\n\n+/);
          textBlocks.length = 0;
          paragraphs.forEach((para, index) => {
            if (para.trim()) {
              textBlocks.push({
                block_id: `${docId}:${index + 1}`,
                text: para,
                doc_id: docId,
                source: docId
              });
            }
          });
        } else if (options.ocr_enabled && file) {
          // Last resort: OCR
          onProgress?.('📄 OCR ile metin çıkarılıyor...', 40);
          const ocrText = await extractTextWithOCR(file, onProgress);
          if (ocrText.trim()) {
            rawText = TurkishNormalizer.normalize(ocrText);
            const paragraphs = rawText.split(/\n\n+/);
            textBlocks.length = 0;
            paragraphs.forEach((para, index) => {
              if (para.trim()) {
                textBlocks.push({
                  block_id: `${docId}:ocr:${index + 1}`,
                  text: para,
                  doc_id: docId,
                  source: docId,
                  confidence: 0.7 // OCR confidence
                });
              }
            });
          }
        }
      } catch (pdf2jsonError) {
        AILogger.warn('pdf2json fallback başarısız', { error: pdf2jsonError });
        
        // Try OCR if enabled
        if (options.ocr_enabled && file) {
          onProgress?.('📄 OCR ile metin çıkarılıyor...', 50);
          const ocrText = await extractTextWithOCR(file, onProgress);
          if (ocrText.trim()) {
            rawText = TurkishNormalizer.normalize(ocrText);
            const paragraphs = rawText.split(/\n\n+/);
            textBlocks.length = 0;
            paragraphs.forEach((para, index) => {
              if (para.trim()) {
                textBlocks.push({
                  block_id: `${docId}:ocr:${index + 1}`,
                  text: para,
                  doc_id: docId,
                  source: docId,
                  confidence: 0.7
                });
              }
            });
          }
        }
      }
    }
  } catch (error) {
    AILogger.error('PDF extraction error', { error });
    
    // Try OCR as last resort
    if (options.ocr_enabled && file) {
      onProgress?.('📄 OCR ile metin çıkarılıyor...');
      try {
        const ocrText = await extractTextWithOCR(file, onProgress);
        if (ocrText.trim()) {
          rawText = TurkishNormalizer.normalize(ocrText);
          const paragraphs = rawText.split(/\n\n+/);
          paragraphs.forEach((para, index) => {
            if (para.trim()) {
              textBlocks.push({
                block_id: `${docId}:ocr:${index + 1}`,
                text: para,
                doc_id: docId,
                source: docId,
                confidence: 0.7
              });
            }
          });
        }
      } catch (ocrError) {
        AILogger.error('OCR failed', { error: ocrError });
      }
    }
  }

  return { textBlocks, tables, rawText };
}

/**
 * Extract tables from PDF page (simplified)
 */
async function extractTablesFromPDFPage(
  page: { getTextContent: () => Promise<{ items: Array<{ str?: string; transform?: number[] }> }> },
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
 * Enhanced with table extraction
 */
async function extractFromDOCX(
  buffer: ArrayBuffer,
  docId: string
): Promise<{
  textBlocks: TextBlock[];
  tables: ExtractedTable[];
  rawText: string;
}> {
  const tables: ExtractedTable[] = [];
  const textBlocks: TextBlock[] = [];
  let rawText = '';

  try {
    // Convert ArrayBuffer to Buffer for mammoth
    const nodeBuffer = Buffer.from(buffer);
    
    // First, extract raw text
    const textResult = await mammoth.extractRawText({ buffer: nodeBuffer });
    const text = textResult.value;
    rawText = text;

    // Split into paragraphs as blocks
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
    paragraphs.forEach((para, index) => {
      textBlocks.push({
        block_id: `${docId}:${index + 1}`,
        text: para.trim(),
        doc_id: docId,
        source: docId
      });
    });

    // Then, convert to HTML to extract tables
    try {
      const htmlResult = await mammoth.convertToHtml({ buffer: nodeBuffer });
      const html = htmlResult.value;
      
      // Parse HTML to extract tables
      const $ = cheerio.load(html);
      
      $('table').each((tableIndex, table) => {
        const headers: string[] = [];
        const rows: string[][] = [];

        // Get headers from thead or first row
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
        $(table).find('tbody tr, tr').each((rowIndex, row) => {
          // Skip header row if we already have headers
          if (headers.length > 0 && rowIndex === 0 && $(row).parent().is('thead')) {
            return;
          }
          
          const rowData: string[] = [];
          $(row).find('td, th').each((i, cell) => {
            rowData.push($(cell).text().trim());
          });
          
          if (rowData.length > 0) {
            rows.push(rowData);
          }
        });

        // Only add table if it has data
        if (headers.length > 0 || rows.length > 0) {
          tables.push({
            table_id: `${docId}:table-${tableIndex + 1}`,
            doc_id: docId,
            source: docId,
            page: 1,
            title: `Tablo ${tableIndex + 1}`,
            headers: headers.length > 0 ? headers : rows[0] || [],
            rows: headers.length > 0 ? rows : rows.slice(1),
            metadata: {}
          } as any);

          // Add table data to rawText
          rawText += `\n\n--- Tablo ${tableIndex + 1} ---\n`;
          if (headers.length > 0) {
            rawText += headers.join('\t') + '\n';
          }
          rows.forEach(row => {
            rawText += row.join('\t') + '\n';
          });
        }
      });

      AILogger.info('DOCX extraction completed', {
        docId,
        textBlocks: textBlocks.length,
        tables: tables.length,
        textLength: rawText.length
      });
    } catch (htmlError) {
      AILogger.warn('DOCX HTML conversion failed, using text only', {
        docId,
        error: htmlError instanceof Error ? htmlError.message : String(htmlError)
      });
      // Continue with text only
    }

    return { textBlocks, tables, rawText };
  } catch (error) {
    AILogger.error('DOCX extraction failed', {
      docId,
      error: error instanceof Error ? error.message : String(error)
    });
    // Try with arrayBuffer as fallback
    try {
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      const text = result.value;
      const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
      const fallbackTextBlocks = paragraphs.map((para, index) => ({
        block_id: `${docId}:${index + 1}`,
        text: para.trim(),
        doc_id: docId,
        source: docId
      }));
      return { textBlocks: fallbackTextBlocks, tables: [], rawText: text };
    } catch (fallbackError) {
      AILogger.error('DOCX extraction fallback also failed', {
        docId,
        error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
      });
      throw fallbackError;
    }
  }
}

/**
 * Extract from Excel
 * Enhanced with XlsxProcessor
 */
async function extractFromExcel(
  file: File,
  docId: string,
  onProgress?: ProgressCallback
): Promise<{
  tables: ExtractedTable[];
  rawText: string;
}> {
  const tables: ExtractedTable[] = [];
  let rawText = '';

  try {
    // Use XlsxProcessor for better formatting
    const result = await XlsxProcessor.process(file, onProgress);
    
    if (result.success) {
      rawText = result.text;
      
      // Convert sheets to tables
      result.sheets.forEach((sheet, index) => {
        // Parse sheet text to extract headers and rows
        const lines = sheet.text.split('\n').filter(line => line.trim());
        if (lines.length > 2) {
          // Extract headers (line with "Sütunlar:")
          const headerLine = lines.find(line => line.includes('Sütunlar:'));
          if (headerLine) {
            const headers = headerLine
              .replace('📋 Sütunlar: ', '')
              .split(' | ')
              .map(h => h.trim());
            
            // Extract rows
            const rows: string[][] = [];
            lines.forEach(line => {
              if (line.match(/^\d+\./)) {
                // Parse row: "1. header1: value1 | header2: value2"
                const rowData = line
                  .replace(/^\d+\.\s*/, '')
                  .split(' | ')
                  .map(cell => {
                    const match = cell.match(/^[^:]+:\s*(.+)$/);
                    return match ? match[1].trim() : cell.trim();
                  });
                if (rowData.length > 0) {
                  rows.push(rowData);
                }
              }
            });

            if (headers.length > 0 || rows.length > 0) {
              tables.push({
                table_id: `T${index + 1}`,
                doc_id: docId,
                headers: headers.length > 0 ? headers : [],
                rows: rows,
                title: sheet.name
              });
            }
          }
        }
      });
    } else {
      // Fallback to basic XLSX reading
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      workbook.SheetNames.forEach((sheetName, sheetIndex) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

        if (jsonData.length > 0) {
          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1) as string[][];

          tables.push({
            table_id: `T${sheetIndex + 1}`,
            doc_id: docId,
            headers: headers,
            rows: rows,
            title: sheetName
          });

          rawText += `Table: ${sheetName}\n`;
          rawText += headers.join('\t') + '\n';
          rows.forEach(row => {
            rawText += row.join('\t') + '\n';
          });
          rawText += '\n';
        }
      });
    }
  } catch (error) {
    AILogger.error('Excel extraction error', { error });
  }

  return { tables, rawText };
}

/**
 * Extract from HTML
 */
async function extractFromHTML(
  buffer: ArrayBuffer,
  docId: string,
  onProgress?: ProgressCallback
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
/**
 * Guess document type with confidence score
 * Returns both type and confidence (0.0 - 1.0)
 */
export function guessDocumentType(filename: string, content: string): DocumentTypeGuess {
  const lower = filename.toLowerCase();
  const contentLower = content.toLowerCase();
  // const contentLength = content.length;  // Unused variable

  // Calculate confidence based on matches
  // Strong match in filename = high confidence
  // Weak match in content = lower confidence

  // Check filename matches (higher confidence)
  if (lower.includes('idari') || lower.includes('administrative')) {
    const filenameMatch = lower.includes('idari') || lower.includes('administrative');
    const contentMatch = contentLower.includes('idari şartname') || contentLower.includes('administrative');
    const confidence = filenameMatch ? 0.9 : (contentMatch ? 0.7 : 0.5);
    return { type: 'idari', confidence };
  }
  
  if (lower.includes('teknik') || lower.includes('technical')) {
    const filenameMatch = lower.includes('teknik') || lower.includes('technical');
    const contentMatch = contentLower.includes('teknik şartname') || contentLower.includes('technical specification');
    const confidence = filenameMatch ? 0.9 : (contentMatch ? 0.7 : 0.5);
    return { type: 'teknik', confidence };
  }
  
  if (lower.includes('ilan') || lower.includes('announcement')) {
    const filenameMatch = lower.includes('ilan') || lower.includes('announcement');
    const contentMatch = contentLower.includes('ihale ilanı') || contentLower.includes('tender announcement');
    const confidence = filenameMatch ? 0.9 : (contentMatch ? 0.7 : 0.5);
    return { type: 'ilan', confidence };
  }
  
  if (lower.includes('sözleşme') || lower.includes('sozlesme') || lower.includes('contract')) {
    const filenameMatch = lower.includes('sözleşme') || lower.includes('sozlesme') || lower.includes('contract');
    const contentMatch = contentLower.includes('sözleşme') || contentLower.includes('contract');
    const confidence = filenameMatch ? 0.9 : (contentMatch ? 0.7 : 0.5);
    return { type: 'sozlesme', confidence };
  }
  
  if (lower.includes('menü') || lower.includes('menu') || lower.includes('yemek')) {
    const filenameMatch = lower.includes('menü') || lower.includes('menu') || lower.includes('yemek');
    const contentMatch = contentLower.includes('menü') || contentLower.includes('menu') || contentLower.includes('yemek listesi');
    const confidence = filenameMatch ? 0.85 : (contentMatch ? 0.7 : 0.5);
    return { type: 'menu', confidence };
  }
  
  if (lower.includes('gramaj') || lower.includes('portion')) {
    const filenameMatch = lower.includes('gramaj') || lower.includes('portion');
    const contentMatch = contentLower.includes('gramaj') || contentLower.includes('portion');
    const confidence = filenameMatch ? 0.85 : (contentMatch ? 0.7 : 0.5);
    return { type: 'gramaj', confidence };
  }
  
  if (lower.includes('ek') || lower.includes('appendix')) {
    const filenameMatch = lower.includes('ek') || lower.includes('appendix');
    const confidence = filenameMatch ? 0.8 : 0.4;
    return { type: 'ek', confidence };
  }

  // No match found
  return { type: 'bilinmeyen', confidence: 0.0 };
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

/**
 * Extract from ZIP - recursive extraction
 */
async function extractFromZIP(
  file: File,
  docId: string,
  options: ProcessingOptions,
  onProgress?: ProgressCallback
): Promise<{
  textBlocks: TextBlock[];
  tables: ExtractedTable[];
  rawText: string;
}> {
  const textBlocks: TextBlock[] = [];
  const tables: ExtractedTable[] = [];
  let rawText = '';

  try {
    const zipResult = await ZipExtractor.extract(file, onProgress);

    if (!zipResult.success) {
      AILogger.error('ZIP extraction failed', { error: zipResult.error });
      return { textBlocks, tables, rawText };
    }

    // Process each extracted file recursively
    for (const extractedFile of zipResult.files) {
      try {
        const fileObj = ZipExtractor.arrayBufferToFile(
          extractedFile.content,
          extractedFile.name,
          extractedFile.type
        );

        // Generate sub-doc ID
        const subDocId = `${docId}:${extractedFile.name}`;

        // Recursively extract
        const result = await extractFromFile(
          fileObj,
          subDocId,
          options,
          (msg) => onProgress?.(`[${extractedFile.name}] ${msg}`)
        );

        // Add file separator
        rawText += `\n=== ${extractedFile.name} ===\n${result.rawText}\n`;
        textBlocks.push(...result.textBlocks);
        tables.push(...result.tables);
      } catch (fileError: unknown) {
        const errorMessage = fileError instanceof Error ? fileError.message : String(fileError);
        AILogger.warn(`ZIP içindeki dosya işlenemedi: ${extractedFile.name}`, {
          error: errorMessage,
        });
      }
    }
  } catch (error) {
    AILogger.error('ZIP extraction error', { error });
  }

  return { textBlocks, tables, rawText };
}

/**
 * Extract from DOC (legacy Word format)
 */
async function extractFromDOC(
  file: File,
  docId: string,
  options: ProcessingOptions,
  onProgress?: ProgressCallback
): Promise<{
  textBlocks: TextBlock[];
  rawText: string;
}> {
  const textBlocks: TextBlock[] = [];
  let rawText = '';

  try {
    // Try antiword first (if available)
    if (typeof process !== 'undefined' && (process as any).platform !== 'browser') {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      const fs = await import('fs');
      const path = await import('path');

      const tempDir = '/tmp';
      const sanitizedName = file.name.replace(/[\\/]/g, '_');
      const tempFilePath = path.join(tempDir, `doc_${Date.now()}_${sanitizedName}`);

      // Save file temporarily
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(tempFilePath, buffer);

      try {
        // Try antiword
        const { stdout } = await execAsync(
          `antiword "${tempFilePath}" 2>/dev/null || echo ""`,
          { timeout: 30000 }
        );

        // Clean up
        try {
          fs.unlinkSync(tempFilePath);
        } catch (error) {}

        if (stdout?.trim()) {
          rawText = TurkishNormalizer.normalize(stdout);
          const paragraphs = rawText.split(/\n\n+/);
          paragraphs.forEach((para, index) => {
            if (para.trim()) {
              textBlocks.push({
                block_id: `${docId}:${index + 1}`,
                text: para,
                doc_id: docId,
                source: docId
              });
            }
          });
          return { textBlocks, rawText };
        }
      } catch (antiwordError) {
        // Clean up on error
        try {
          fs.unlinkSync(tempFilePath);
        } catch (error) {}
        AILogger.warn('antiword failed, trying LibreOffice', { error: antiwordError });
      }

      // Try LibreOffice conversion
      try {
        const tempDocPath = path.join(tempDir, `doc_${Date.now()}_lo.doc`);
        const tempDocxPath = tempDocPath.replace(/\.doc$/i, '.docx');

        fs.writeFileSync(tempDocPath, buffer);

        try {
          await execAsync(
            `soffice --headless --convert-to docx --outdir "${tempDir}" "${tempDocPath}"`,
            { timeout: 120000 }
          );

          if (fs.existsSync(tempDocxPath)) {
            const docxBuffer = fs.readFileSync(tempDocxPath);
            const mammothResult = await mammoth.extractRawText({ buffer: docxBuffer });
            const mammothText = mammothResult.value?.trim() || '';

            // Clean up
            try {
              fs.unlinkSync(tempDocPath);
              fs.unlinkSync(tempDocxPath);
            } catch (error) {}

            if (mammothText.length > 50) {
              rawText = TurkishNormalizer.normalize(mammothText);
              const paragraphs = rawText.split(/\n\n+/);
              paragraphs.forEach((para, index) => {
                if (para.trim()) {
                  textBlocks.push({
                    block_id: `${docId}:${index + 1}`,
                    text: para,
                    doc_id: docId,
                    source: docId
                  });
                }
              });
              return { textBlocks, rawText };
            }
          }
        } finally {
          // Clean up
          try {
            if (fs.existsSync(tempDocPath)) fs.unlinkSync(tempDocPath);
            if (fs.existsSync(tempDocxPath)) fs.unlinkSync(tempDocxPath);
          } catch (error) {}
        }
      } catch (loError) {
        AILogger.warn('LibreOffice conversion failed', { error: loError });
      }
    }

    // Fallback: try to extract raw text from binary
    const buffer = Buffer.from(await file.arrayBuffer());
    const rawTextBinary = buffer.toString('utf8');
    const extractedText = rawTextBinary
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (extractedText.length > 50) {
      rawText = TurkishNormalizer.normalize(extractedText);
      textBlocks.push({
        block_id: `${docId}:1`,
        text: rawText,
        doc_id: docId,
        source: docId
      });
    }
  } catch (error) {
    AILogger.error('DOC extraction error', { error });
  }

  return { textBlocks, rawText };
}

/**
 * Extract from JSON
 */
async function extractFromJSON(
  buffer: ArrayBuffer,
  docId: string,
  onProgress?: ProgressCallback
): Promise<{
  textBlocks: TextBlock[];
  rawText: string;
}> {
  const textBlocks: TextBlock[] = [];
  let rawText = '';

  try {
    const text = new TextDecoder('utf-8').decode(buffer);

    // 🆕 JSON parse with better error handling - SmartDocumentProcessor'dan
    try {
      // JSON'u parse edip güzelce formatla
      const jsonData = JSON.parse(text);
      const prettyJson = JSON.stringify(jsonData, null, 2);
      rawText = TurkishNormalizer.normalize(prettyJson);
      AILogger.info(`JSON dosyası başarılı: ${rawText.length} karakter`, { docId });
    } catch (parseError) {
      // JSON parse edilemezse raw text olarak kullan
      AILogger.warn('JSON parse hatası, raw text kullanılıyor', { docId, error: parseError });
      rawText = TurkishNormalizer.normalize(text);
    }

    // Split into blocks
    const lines = rawText.split('\n');
    let currentBlock = '';
    let blockIndex = 0;

    lines.forEach((line) => {
      currentBlock += line + '\n';
      if (line.trim() === '' || currentBlock.length > 1000) {
        if (currentBlock.trim()) {
          textBlocks.push({
            block_id: `${docId}:${blockIndex + 1}`,
            text: currentBlock.trim(),
            doc_id: docId,
            source: docId
          });
          blockIndex++;
        }
        currentBlock = '';
      }
    });

    if (currentBlock.trim()) {
      textBlocks.push({
        block_id: `${docId}:${blockIndex + 1}`,
        text: currentBlock.trim(),
        doc_id: docId,
        source: docId
      });
    }
  } catch (error) {
    AILogger.error('JSON extraction error', { error });
  }

  return { textBlocks, rawText };
}

/**
 * Extract from CSV files
 * Parse CSV as tables
 */
async function extractFromCSV(
  buffer: ArrayBuffer,
  docId: string,
  fileName: string,
  onProgress?: ProgressCallback
): Promise<{
  textBlocks: TextBlock[];
  tables: ExtractedTable[];
  rawText: string;
}> {
  const tables: ExtractedTable[] = [];
  const textBlocks: TextBlock[] = [];
  let rawText = '';

  try {
    const text = new TextDecoder('utf-8').decode(buffer);
    
    if (!text || text.trim().length === 0) {
      AILogger.warn('CSV file is empty', { fileName });
      return { textBlocks, tables, rawText };
    }

    // Parse CSV - handle different delimiters (comma, semicolon, tab)
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    
    if (lines.length === 0) {
      return { textBlocks, tables, rawText };
    }

    // Detect delimiter
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes(';') && firstLine.split(';').length > firstLine.split(',').length) {
      delimiter = ';';
    } else if (firstLine.includes('\t') && firstLine.split('\t').length > firstLine.split(',').length) {
      delimiter = '\t';
    }

    // Parse CSV rows
    const rows: string[][] = [];
    lines.forEach((line, _index) => {
      // Simple CSV parsing (handle quoted fields)
      const parsedRow: string[] = [];
      let currentField = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            currentField += '"';
            i++; // Skip next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          // Field separator
          parsedRow.push(currentField.trim());
          currentField = '';
        } else {
          currentField += char;
        }
      }
      
      // Add last field
      parsedRow.push(currentField.trim());
      rows.push(parsedRow);
    });

    if (rows.length === 0) {
      return { textBlocks, tables, rawText };
    }

    // First row as headers (if more than 1 row)
    const headers = rows.length > 1 ? rows[0] : [];
    const dataRows = rows.length > 1 ? rows.slice(1) : rows;

    // Create table
    if (dataRows.length > 0) {
      tables.push({
        table_id: `${docId}:csv-table`,
        doc_id: docId,
        source: docId,
        page: 1,
        title: fileName.replace('.csv', ''),
        headers: headers.length > 0 ? headers : dataRows[0] || [],
        rows: headers.length > 0 ? dataRows : dataRows.slice(1),
        metadata: {
          delimiter,
          totalRows: dataRows.length
        }
      } as any);

      // Add to rawText
      rawText = text;
      
      // Create text blocks from rows
      dataRows.forEach((row, index) => {
        const rowText = row.join(' | ');
        if (rowText.trim()) {
          textBlocks.push({
            block_id: `${docId}:row-${index + 1}`,
            text: rowText,
            doc_id: docId,
            source: docId
          });
        }
      });

      AILogger.info('CSV extraction completed', {
        docId,
        fileName,
        rows: dataRows.length,
        columns: headers.length || (dataRows[0]?.length || 0),
        delimiter
      });
    }

  } catch (error) {
    AILogger.error('CSV extraction error', {
      docId,
      fileName,
      error: error instanceof Error ? error.message : String(error)
    });
    // Return empty result on error
  }

  return { textBlocks, tables, rawText };
}

/**
 * Extract from text files (TXT, RTF)
 */
async function extractFromText(
  buffer: ArrayBuffer,
  docId: string,
  fileName: string
): Promise<{
  textBlocks: TextBlock[];
  rawText: string;
}> {
  const textBlocks: TextBlock[] = [];
  let rawText = '';

  try {
    const text = new TextDecoder('utf-8').decode(buffer);

    // 🆕 Boş dosya kontrolü - SmartDocumentProcessor'dan
    if (!text || text.trim().length === 0) {
      AILogger.warn('Text file is empty', { fileName });
      throw new Error(`"${fileName}" dosyası boş. Lütfen içerik içeren bir dosya yükleyin.`);
    }

    // 🆕 HTML içerik kontrolü - SmartDocumentProcessor'dan
    const isHTMLContent = text.trim().startsWith('<!DOCTYPE') || 
                          text.trim().startsWith('<html') ||
                          text.includes('<head>') ||
                          text.includes('<body>');
    
    if (isHTMLContent) {
      AILogger.info('HTML içerik tespit edildi, HTML parser kullanılıyor...', { fileName });
      
      try {
        // HTML'den metin çıkar (basit regex ile)
        const cleanText = text
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Script'leri kaldır
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')   // Style'ları kaldır
          .replace(/<[^>]+>/g, ' ')                          // HTML tag'lerini kaldır
          .replace(/&nbsp;/g, ' ')                           // &nbsp; -> boşluk
          .replace(/&[a-z]+;/gi, ' ')                        // Diğer entities
          .replace(/\s+/g, ' ')                              // Çoklu boşlukları tek yap
          .trim();
        
        if (cleanText.length > 100) {
          rawText = TurkishNormalizer.normalize(cleanText);
          AILogger.info(`HTML dosyası başarılı: ${rawText.length} karakter (HTML cleaned)`, { fileName });
          
          // Create text block from cleaned HTML
          textBlocks.push({
            block_id: `${docId}_html_cleaned`,
            text: rawText,
            page: 1,
            source: fileName
          } as any);
          
          return { textBlocks, rawText };
        } else {
          AILogger.warn('HTML içerik çok kısa, orijinal metin kullanılıyor', { fileName });
        }
      } catch (htmlError) {
        AILogger.error('HTML parsing hatası', { fileName, error: htmlError });
        // Fall through to normal text processing
      }
    }

    // Normal metin işleme (HTML değilse)
    rawText = TurkishNormalizer.normalize(text);

    // Split into paragraphs as blocks
    const paragraphs = rawText.split(/\n\n+/);
    paragraphs.forEach((para, index) => {
      if (para.trim()) {
        textBlocks.push({
          block_id: `${docId}:${index + 1}`,
          text: para,
          doc_id: docId,
          source: docId
        });
      }
    });
  } catch (error) {
    AILogger.error('Text extraction error', { error });
  }

  return { textBlocks, rawText };
}

/**
 * Extract text with OCR (Multi-engine with fallback)
 * Supports Gemini Vision and Tesseract.js
 */
async function extractTextWithOCR(
  file: File,
  onProgress?: ProgressCallback
): Promise<string> {
  try {
    // Import OCR service
    const { OCRService } = await import('./ocr-service');

    onProgress?.('🔍 OCR başlatılıyor...');

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get OCR provider from environment
    const provider = (process.env.OCR_PROVIDER || 'auto') as 'auto' | 'gemini' | 'tesseract';
    const language = process.env.OCR_LANGUAGE || 'tur+eng';
    const timeout = parseInt(process.env.OCR_TIMEOUT || '120000', 10);

    AILogger.info('Starting OCR extraction', {
    filename: file.name,
      size: buffer.length,
      provider,
      language,
      timeout,
    });

    // Perform OCR with fallback support
    const result = await OCRService.performOCR(
      buffer,
      { provider, language, timeout },
      onProgress
    );

    if (result.error) {
      AILogger.error('❌ OCR failed, using original text', {
        filename: file.name,
        error: result.error,
      });
      return '';
    }

    AILogger.info('✅ OCR completed successfully', {
      filename: file.name,
      ocrTextLength: result.text.length,
      wordCount: result.text.split(/\s+/).length,
      provider: result.provider,
      confidence: result.confidence,
      processingTime: result.processingTime,
    });

    return result.text;
  } catch (error: any) {
    AILogger.error('OCR extraction failed', {
      filename: file.name,
      error: error.message,
    });
    onProgress?.('❌ OCR başarısız oldu');
  return '';
  }
}