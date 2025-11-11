/**
 * Data Pool Builder
 * Combines extracted data from multiple documents into a unified structure
 */

import { extractFromFile, guessDocumentType } from './extractor';
import { extractDates, extractAmounts, extractEntities, parseMenuFromTable } from './parser';
import type {
  DataPool,
  DocumentInfo,
  TextBlock,
  ExtractedTable,
  ProcessingOptions,
  ProcessingResult,
  ProcessingError,
  SourceLocation
} from './types';

/**
 * Process multiple files and build a data pool
 */
export async function buildDataPool(
  files: File[],
  options: ProcessingOptions = {
    ocr_enabled: false,
    extract_tables: true,
    extract_dates: true,
    extract_amounts: true,
    extract_entities: true,
    merge_blocks: true,
    clean_text: true,
    detect_language: false
  }
): Promise<ProcessingResult> {
  const startTime = Date.now();
  const errors: ProcessingError[] = [];

  // Initialize data pool
  const dataPool: DataPool = {
    documents: [],
    textBlocks: [],
    tables: [],
    dates: [],
    amounts: [],
    entities: [],
    rawText: '',
    metadata: {
      total_pages: 0,
      total_words: 0,
      extraction_time_ms: 0,
      ocr_used: false,
      languages_detected: ['tr'],
      warnings: []
    },
    provenance: new Map()
  };

  // Process each file
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const docId = generateDocId(i);

    try {
      // Handle ZIP files
      if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
        const extractedFiles = await extractZipFile(file);
        files.push(...extractedFiles);
        continue;
      }

      // Extract content from file
      const { info, textBlocks, tables, rawText } = await extractFromFile(
        file,
        docId,
        options
      );

      // Update document type based on content
      if (info.type_guess === 'bilinmeyen' && rawText) {
        info.type_guess = guessDocumentType(info.name, rawText);
      }

      // Add to data pool
      dataPool.documents.push(info);
      dataPool.textBlocks.push(...textBlocks);
      dataPool.tables.push(...tables);
      dataPool.rawText += `\n\n--- ${info.name} ---\n${rawText}`;

      // Extract dates if enabled
      if (options.extract_dates) {
        for (const block of textBlocks) {
          const dates = extractDates(block.text, block.block_id);
          dataPool.dates.push(...dates);
        }
      }

      // Extract amounts if enabled
      if (options.extract_amounts) {
        for (const block of textBlocks) {
          const amounts = extractAmounts(block.text, block.block_id);
          dataPool.amounts.push(...amounts);
        }
      }

      // Extract entities if enabled
      if (options.extract_entities) {
        for (const block of textBlocks) {
          const entities = extractEntities(block.text, block.block_id);
          dataPool.entities.push(...entities);
        }
      }

      // Build provenance map
      for (const block of textBlocks) {
        dataPool.provenance.set(block.block_id, {
          doc_id: docId,
          page: block.page,
          text_snippet: block.text.substring(0, 100)
        });
      }

      for (const table of tables) {
        dataPool.provenance.set(table.table_id, {
          doc_id: docId,
          page: table.page,
          text_snippet: `Table: ${table.title || table.table_id}`
        });
      }

    } catch (error) {
      errors.push({
        doc_id: docId,
        stage: 'extract',
        message: `Failed to process ${file.name}`,
        details: error
      });
    }
  }

  // Merge adjacent text blocks if requested
  if (options.merge_blocks) {
    dataPool.textBlocks = mergeAdjacentBlocks(dataPool.textBlocks);
  }

  // Deduplicate entities
  dataPool.entities = deduplicateEntities(dataPool.entities);
  dataPool.dates = deduplicateDates(dataPool.dates);

  // Sort dates chronologically
  dataPool.dates.sort((a, b) => a.value.localeCompare(b.value));

  // Calculate metadata
  dataPool.metadata.total_words = dataPool.rawText.split(/\s+/).length;
  dataPool.metadata.extraction_time_ms = Date.now() - startTime;
  dataPool.metadata.total_pages = dataPool.textBlocks
    .map(b => b.page || 0)
    .reduce((max, page) => Math.max(max, page), 0);

  // Add warnings for missing critical data
  const warnings = validateDataPool(dataPool);
  dataPool.metadata.warnings = warnings;

  return {
    success: errors.length === 0,
    dataPool,
    errors,
    duration_ms: Date.now() - startTime
  };
}

/**
 * Generate document ID (A, B, C, ..., AA, AB, ...)
 */
function generateDocId(index: number): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let id = '';
  let num = index;

  do {
    id = alphabet[num % 26] + id;
    num = Math.floor(num / 26) - 1;
  } while (num >= 0);

  return id;
}

/**
 * Extract files from ZIP
 */
async function extractZipFile(zipFile: File): Promise<File[]> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const extracted: File[] = [];

  try {
    const zipContent = await zip.loadAsync(zipFile);

    for (const [path, file] of Object.entries(zipContent.files)) {
      if (!file.dir) {
        const blob = await file.async('blob');
        const extractedFile = new File([blob], path, {
          type: getMimeType(path)
        });
        extracted.push(extractedFile);
      }
    }
  } catch (error) {
    console.error('Failed to extract ZIP:', error);
  }

  return extracted;
}

/**
 * Get MIME type from filename
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'txt':
      return 'text/plain';
    case 'html':
      return 'text/html';
    case 'csv':
      return 'text/csv';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Merge adjacent text blocks from the same document
 */
function mergeAdjacentBlocks(blocks: TextBlock[]): TextBlock[] {
  if (blocks.length <= 1) return blocks;

  const merged: TextBlock[] = [];
  const sorted = [...blocks].sort((a, b) => {
    if (a.doc_id !== b.doc_id) return a.doc_id.localeCompare(b.doc_id);
    if (a.page !== b.page) return (a.page || 0) - (b.page || 0);
    return 0;
  });

  let current = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];

    // Merge if same document and page
    if (
      current.doc_id === next.doc_id &&
      current.page === next.page &&
      Math.abs((current.line_end || 0) - (next.line_start || 0)) <= 1
    ) {
      current = {
        ...current,
        text: current.text + ' ' + next.text,
        line_end: next.line_end,
        block_id: `${current.doc_id}:${current.page || 0}`
      };
    } else {
      merged.push(current);
      current = next;
    }
  }

  merged.push(current);
  return merged;
}

/**
 * Deduplicate entities
 */
function deduplicateEntities(entities: any[]): any[] {
  const seen = new Set<string>();
  return entities.filter(entity => {
    const key = `${entity.kind}:${entity.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Deduplicate dates
 */
function deduplicateDates(dates: any[]): any[] {
  const seen = new Set<string>();
  return dates.filter(date => {
    const key = `${date.kind}:${date.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Validate data pool and generate warnings
 */
function validateDataPool(dataPool: DataPool): string[] {
  const warnings: string[] = [];

  // Check for critical dates
  const hasIhaleDate = dataPool.dates.some(d => d.kind === 'ihale_tarihi');
  if (!hasIhaleDate) {
    warnings.push('İhale tarihi bulunamadı');
  }

  // Check for organization
  const hasKurum = dataPool.entities.some(e => e.kind === 'kurum');
  if (!hasKurum) {
    warnings.push('Kurum bilgisi bulunamadı');
  }

  // Check for budget
  const hasBudget = dataPool.amounts.some(a => a.kind === 'tahmini_bedel');
  if (!hasBudget) {
    warnings.push('Tahmini bedel bilgisi bulunamadı');
  }

  // Check for IKN
  const hasIKN = dataPool.entities.some(e => e.kind === 'ikn');
  if (!hasIKN) {
    warnings.push('İhale Kayıt Numarası (İKN) bulunamadı');
  }

  // Check for document types
  const hasIdari = dataPool.documents.some(d => d.type_guess === 'idari');
  const hasTeknik = dataPool.documents.some(d => d.type_guess === 'teknik');

  if (!hasIdari && !hasTeknik) {
    warnings.push('İdari veya teknik şartname tespit edilemedi');
  }

  // Check if tables contain menu data
  const hasMenuTable = dataPool.tables.some(table => {
    const headers = table.headers.join(' ').toLowerCase();
    return headers.includes('yemek') || headers.includes('menü') || headers.includes('öğün');
  });

  if (dataPool.tables.length > 0 && !hasMenuTable) {
    warnings.push('Menü tablosu tespit edilemedi');
  }

  return warnings;
}

/**
 * Find source reference in data pool
 */
export function findSourceInPool(
  sourceRef: string,
  dataPool: DataPool
): SourceLocation | undefined {
  return dataPool.provenance.get(sourceRef);
}

/**
 * Get context around a source reference
 */
export function getSourceContext(
  sourceRef: string,
  dataPool: DataPool,
  contextLength: number = 200
): string {
  // Parse reference (e.g., "A:12" or "T1:row3")
  if (sourceRef.startsWith('T')) {
    // Table reference
    const [tableId, location] = sourceRef.split(':');
    const table = dataPool.tables.find(t => t.table_id === tableId);

    if (table) {
      if (location && location.startsWith('row')) {
        const rowIndex = parseInt(location.replace('row', ''));
        if (table.rows[rowIndex]) {
          return table.rows[rowIndex].join(' | ');
        }
      }
      return `Table: ${table.headers.join(' | ')}`;
    }
  } else {
    // Text block reference
    const block = dataPool.textBlocks.find(b => b.block_id === sourceRef);
    if (block) {
      return block.text.substring(0, contextLength);
    }
  }

  return '';
}