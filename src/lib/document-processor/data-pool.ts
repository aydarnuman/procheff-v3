/**
 * Data Pool Builder
 * Combines extracted data from multiple documents into a unified structure
 */

import { extractFromFile, guessDocumentType, type ProgressCallback } from './extractor';
import { extractDates, extractAmounts, extractEntities, parseMenuFromTable } from './parser';
import { AILogger } from '@/lib/ai/logger';
import type {
  DataPool,
  DocumentInfo,
  TextBlock,
  ExtractedTable,
  ExtractedEntity,
  ExtractedDate,
  ExtractedAmount,
  ProcessingOptions,
  ProcessingResult,
  ProcessingError,
  SourceLocation
} from './types';

/**
 * Process multiple files and build a data pool
 * Enhanced with progress callback support
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
  },
  onProgress?: ProgressCallback
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

  // First pass: Extract all ZIP files and collect extracted files
  const filesToProcess: File[] = [];
  const processedZipFiles = new Set<string>(); // Track processed ZIP files to prevent loops
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Handle ZIP files - extract first, then process extracted files
    if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
      // Check if we've already processed this ZIP (prevent infinite loops)
      const fileKey = `${file.name}_${file.size}`;
      if (processedZipFiles.has(fileKey)) {
        AILogger.warn('ZIP dosyası zaten işlendi, atlanıyor', { filename: file.name });
        continue;
      }
      processedZipFiles.add(fileKey);
      
      AILogger.info('ZIP dosyası tespit edildi', { filename: file.name, size: file.size });
      onProgress?.(`📦 ZIP çıkarılıyor: ${file.name}`);
      
      const extractResult = await extractZipFile(file);
      if (extractResult.success && extractResult.files.length > 0) {
        // Add extracted files to processing queue (not to current array to avoid infinite loop)
        filesToProcess.push(...extractResult.files);
        // Log successful extraction
        AILogger.info('ZIP dosyası başarıyla çıkarıldı', {
          filename: file.name,
          extractedCount: extractResult.files.length,
          files: extractResult.files.map(f => ({ name: f.name, type: f.type, size: f.size }))
        });
        dataPool.metadata.warnings.push(
          `ZIP dosyası çıkarıldı: ${extractResult.files.length} dosya (${file.name})`
        );
        onProgress?.(`✅ ${extractResult.files.length} dosya çıkarıldı`);
      } else {
        // ZIP extraction failed - add ZIP file itself to processing queue as fallback
        const errorMsg = extractResult.error instanceof Error 
          ? extractResult.error.message 
          : String(extractResult.error || 'Bilinmeyen hata');
        AILogger.error('ZIP dosyası çıkarılamadı', {
          filename: file.name,
          error: errorMsg
        });
        errors.push({
          doc_id: generateDocId(i),
          stage: 'extract_zip' as any,
          message: `ZIP dosyası çıkarılamadı: ${file.name}`,
          details: { error: errorMsg } as any
        });
        // Add ZIP file itself to processing queue as fallback
        filesToProcess.push(file);
      }
    } else {
      // Non-ZIP file, add directly to processing queue
      filesToProcess.push(file);
    }
  }
  
  // Second pass: Process all files (including extracted ones)
  for (let i = 0; i < filesToProcess.length; i++) {
    const file = filesToProcess[i];
    const docId = generateDocId(i);

    try {
      // Skip nested ZIP files (prevent recursive extraction)
      if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
        AILogger.warn('İç içe ZIP dosyası atlandı', { filename: file.name });
        errors.push({
          doc_id: docId,
          stage: 'extract',
          message: `İç içe ZIP dosyası desteklenmiyor: ${file.name}`,
          details: { reason: 'Nested ZIP files are not supported to prevent infinite loops' } as any
        });
        continue;
      }

      // Extract content from file
      let extractionResult;
      try {
        onProgress?.(`📄 İşleniyor: ${file.name} (${i + 1}/${filesToProcess.length})`);
        extractionResult = await extractFromFile(
          file,
          docId,
          options,
          (msg, progress) => {
            onProgress?.(`[${file.name}] ${msg}`, progress);
          }
        );
      } catch (extractError) {
        AILogger.error('File extraction threw exception', {
          filename: file.name,
          docId,
          error: extractError instanceof Error ? extractError.message : String(extractError)
        });
        errors.push({
          doc_id: docId,
          stage: 'extract',
          message: `Dosya işlenirken hata: ${file.name}`,
          details: { error: extractError instanceof Error ? extractError.message : String(extractError) } as any
        });
        continue;
      }

      const { info, textBlocks, tables, rawText } = extractionResult;

      // Update document type based on content (with confidence)
      if (info.type_guess === 'bilinmeyen' && rawText) {
        const typeGuess = guessDocumentType(info.name, rawText);
        info.type_guess = typeGuess.type;
        info.type_confidence = typeGuess.confidence;
      } else if (rawText && !info.type_confidence) {
        // Re-guess with content for better confidence
        const typeGuess = guessDocumentType(info.name, rawText);
        if (typeGuess.confidence > (info.type_confidence || 0)) {
          info.type_guess = typeGuess.type;
          info.type_confidence = typeGuess.confidence;
        }
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
        details: error as any
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
async function extractZipFile(zipFile: File): Promise<{
  success: boolean;
  files: File[];
  error?: unknown;
}> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const extracted: File[] = [];
  const maxFiles = 100; // Prevent too many files
  const maxSize = 200 * 1024 * 1024; // 200MB total
  let totalSize = 0;

  try {
    const zipContent = await zip.loadAsync(zipFile);
    const fileEntries = Object.entries(zipContent.files);

    if (fileEntries.length === 0) {
      return {
        success: false,
        files: [],
        error: 'ZIP dosyası boş'
      };
    }

    if (fileEntries.length > maxFiles) {
      return {
        success: false,
        files: [],
        error: `ZIP dosyası çok fazla dosya içeriyor (${fileEntries.length} > ${maxFiles})`
      };
    }

    for (const [path, file] of fileEntries) {
      if (!file.dir) {
        try {
          const blob = await file.async('blob');
          totalSize += blob.size;

          if (totalSize > maxSize) {
            return {
              success: false,
              files: extracted,
              error: `ZIP içeriği çok büyük (${Math.round(totalSize / 1024 / 1024)}MB > ${Math.round(maxSize / 1024 / 1024)}MB)`
            };
          }

          // Skip nested ZIP files to prevent infinite loops
          if (path.toLowerCase().endsWith('.zip')) {
            continue;
          }

          // Get filename from path (handle nested paths)
          const filename = path.split('/').pop() || path;
          const mimeType = getMimeType(filename);
          
          // Skip unsupported file types
          const supportedExtensions = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.txt', '.html', '.htm', '.csv'];
          const fileExt = filename.toLowerCase().substring(filename.lastIndexOf('.'));
          if (!supportedExtensions.includes(fileExt) && mimeType === 'application/octet-stream') {
            AILogger.warn('ZIP içindeki desteklenmeyen dosya atlandı', {
              filename,
              mimeType
            });
            continue;
          }
          
          const extractedFile = new File([blob], filename, {
            type: mimeType
          });
          extracted.push(extractedFile);
        } catch (fileError) {
          // Skip individual file errors, continue with others
          console.warn(`ZIP içindeki dosya çıkarılamadı: ${path}`, fileError);
        }
      }
    }

    if (extracted.length === 0) {
      return {
        success: false,
        files: [],
        error: 'ZIP dosyasından hiçbir dosya çıkarılamadı'
      };
    }

    return {
      success: true,
      files: extracted
    };
  } catch (error) {
    return {
      success: false,
      files: extracted,
      error: error instanceof Error ? error.message : 'ZIP çıkarma hatası'
    };
  }
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
    case 'doc':
      return 'application/msword';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'txt':
      return 'text/plain';
    case 'html':
    case 'htm':
      return 'text/html';
    case 'csv':
      return 'text/csv';
    case 'zip':
      return 'application/zip';
    case 'rar':
      return 'application/x-rar-compressed';
    case '7z':
      return 'application/x-7z-compressed';
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
function deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
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
function deduplicateDates(dates: ExtractedDate[]): ExtractedDate[] {
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