/**
 * PDF Text Preprocessing Module
 * Cleans OCR output to prepare for AI analysis
 *
 * Handles:
 * - Header/footer removal
 * - Page number removal
 * - Hyphenated word merging
 * - Whitespace normalization
 * - Duplicate line removal
 * - Section detection
 * - Table structure preservation
 */

import { AILogger } from '@/lib/ai/logger';

export interface CleaningOptions {
  removeHeaders?: boolean;
  removeFooters?: boolean;
  removePageNumbers?: boolean;
  mergeHyphenatedWords?: boolean;
  normalizeWhitespace?: boolean;
  removeDuplicateLines?: boolean;
  preserveTables?: boolean;
  detectSections?: boolean;
}

export interface CleanedDocument {
  cleanedText: string;
  sections: DocumentSection[];
  statistics: CleaningStatistics;
}

export interface DocumentSection {
  title: string;
  content: string;
  startPosition: number;
  endPosition: number;
  type: 'header' | 'body' | 'table' | 'list' | 'footer';
}

export interface CleaningStatistics {
  originalLength: number;
  cleanedLength: number;
  removedLines: number;
  mergedWords: number;
  detectedSections: number;
  detectedTables: number;
  processingTime: number;
}

/**
 * Main preprocessing function
 */
export async function preprocessPDFText(
  rawText: string,
  options: CleaningOptions = {}
): Promise<CleanedDocument> {
  const startTime = Date.now();

  const defaultOptions: CleaningOptions = {
    removeHeaders: true,
    removeFooters: true,
    removePageNumbers: true,
    mergeHyphenatedWords: true,
    normalizeWhitespace: true,
    removeDuplicateLines: true,
    preserveTables: true,
    detectSections: true,
  };

  const opts = { ...defaultOptions, ...options };

  AILogger.info('Starting PDF text preprocessing', {
    originalLength: rawText.length,
    options: opts,
  });

  let text = rawText;
  const stats: Partial<CleaningStatistics> = {
    originalLength: rawText.length,
    removedLines: 0,
    mergedWords: 0,
    detectedSections: 0,
    detectedTables: 0,
  };

  // Step 1: Remove page numbers
  if (opts.removePageNumbers) {
    text = removePageNumbers(text);
  }

  // Step 2: Remove headers and footers
  if (opts.removeHeaders || opts.removeFooters) {
    const result = removeHeadersFooters(text, opts.removeHeaders, opts.removeFooters);
    text = result.text;
    stats.removedLines = result.removedLines;
  }

  // Step 3: Merge hyphenated words
  if (opts.mergeHyphenatedWords) {
    const result = mergeHyphenatedWords(text);
    text = result.text;
    stats.mergedWords = result.mergedCount;
  }

  // Step 4: Remove duplicate lines
  if (opts.removeDuplicateLines) {
    const result = removeDuplicateLines(text);
    text = result.text;
    stats.removedLines = (stats.removedLines || 0) + result.removedCount;
  }

  // Step 5: Normalize whitespace
  if (opts.normalizeWhitespace) {
    text = normalizeWhitespace(text);
  }

  // Step 6: Detect sections
  let sections: DocumentSection[] = [];
  if (opts.detectSections) {
    sections = detectDocumentSections(text);
    stats.detectedSections = sections.length;
  }

  // Step 7: Detect tables
  if (opts.preserveTables) {
    stats.detectedTables = countTables(text);
  }

  const processingTime = Date.now() - startTime;

  const finalStats: CleaningStatistics = {
    originalLength: stats.originalLength!,
    cleanedLength: text.length,
    removedLines: stats.removedLines || 0,
    mergedWords: stats.mergedWords || 0,
    detectedSections: stats.detectedSections || 0,
    detectedTables: stats.detectedTables || 0,
    processingTime,
  };

  AILogger.success('PDF text preprocessing completed', finalStats);

  return {
    cleanedText: text,
    sections,
    statistics: finalStats,
  };
}

/**
 * Remove page numbers from text
 * Patterns: "Sayfa 1", "Page 1", "1/10", "1 / 10", isolated numbers at line start/end
 */
function removePageNumbers(text: string): string {
  // Remove Turkish page numbers
  text = text.replace(/^sayfa\s+\d+\s*$/gim, '');
  text = text.replace(/^sayfa:\s*\d+\s*$/gim, '');

  // Remove English page numbers
  text = text.replace(/^page\s+\d+\s*$/gim, '');
  text = text.replace(/^page:\s*\d+\s*$/gim, '');

  // Remove fraction format (1/10, 1 / 10)
  text = text.replace(/^\s*\d+\s*\/\s*\d+\s*$/gm, '');

  // Remove isolated numbers at line start/end (conservative)
  text = text.replace(/^\s*\d{1,3}\s*$/gm, '');

  // Remove "- 1 -" style page numbers
  text = text.replace(/^[-\s]*\d+[-\s]*$/gm, '');

  return text;
}

/**
 * Remove headers and footers
 * Strategy: detect repeated lines across pages
 */
function removeHeadersFooters(
  text: string,
  removeHeaders: boolean = true,
  removeFooters: boolean = true
): { text: string; removedLines: number } {
  const lines = text.split('\n');

  // Find repeated patterns (headers/footers appear on multiple pages)
  const lineFrequency = new Map<string, number>();

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.length > 5 && trimmed.length < 200) {
      lineFrequency.set(trimmed, (lineFrequency.get(trimmed) || 0) + 1);
    }
  });

  // Lines appearing 3+ times and < 200 chars are likely headers/footers
  const repeatedPatterns = new Set<string>();
  lineFrequency.forEach((count, line) => {
    if (count >= 3) {
      repeatedPatterns.add(line);
    }
  });

  // Filter out repeated patterns
  let removedCount = 0;
  const filtered = lines.filter(line => {
    const trimmed = line.trim();
    if (repeatedPatterns.has(trimmed)) {
      removedCount++;
      return false;
    }
    return true;
  });

  return {
    text: filtered.join('\n'),
    removedLines: removedCount,
  };
}

/**
 * Merge hyphenated words at line breaks
 * Example: "şart-\nname" -> "şartname"
 */
function mergeHyphenatedWords(text: string): { text: string; mergedCount: number } {
  let mergedCount = 0;

  // Match word ending with hyphen, optional whitespace, newline, then word start
  const merged = text.replace(/(\w+)-\s*\n\s*(\w+)/g, (match, before, after) => {
    mergedCount++;
    return before + after;
  });

  return { text: merged, mergedCount };
}

/**
 * Remove duplicate consecutive lines
 */
function removeDuplicateLines(text: string): { text: string; removedCount: number } {
  const lines = text.split('\n');
  const deduped: string[] = [];
  let removedCount = 0;
  let previousLine = '';

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed !== previousLine || trimmed.length === 0) {
      deduped.push(line);
      previousLine = trimmed;
    } else {
      removedCount++;
    }
  });

  return {
    text: deduped.join('\n'),
    removedCount,
  };
}

/**
 * Normalize whitespace
 * - Collapse multiple spaces
 * - Remove trailing spaces
 * - Normalize line breaks
 */
function normalizeWhitespace(text: string): string {
  // Collapse multiple spaces
  text = text.replace(/ {2,}/g, ' ');

  // Remove trailing spaces
  text = text.replace(/ +$/gm, '');

  // Remove leading spaces (but preserve indentation for tables)
  text = text.replace(/^ +/gm, match => {
    if (match.length > 10) return '    '; // Keep 4 spaces for tables
    return '';
  });

  // Normalize line breaks (max 2 consecutive)
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

/**
 * Detect document sections by headings
 */
function detectDocumentSections(text: string): DocumentSection[] {
  const sections: DocumentSection[] = [];
  const lines = text.split('\n');

  // Common Turkish tender document section patterns
  const sectionPatterns = [
    /^(BÖLÜM|KISIM|MADDE)\s+\d+/i,
    /^[IVXLCDM]+\.\s+[A-ZĞÜŞİÖÇ\s]{3,50}$/,  // Roman numerals
    /^\d+\.\s+[A-ZĞÜŞİÖÇ\s]{3,50}$/,          // Numbered sections
    /^[A-ZĞÜŞİÖÇ\s]{3,50}:$/,                 // ALL CAPS with colon
    /^(İDARİ|TEKNİK|MALİ|GENEL)\s+ŞARTLAR/i,
    /^(İHALE|SÖZLEŞME|ŞARTNAME)\s+/i,
  ];

  interface TempSection {
    title: string;
    startPosition: number;
    contentLines: string[];
  }

  let currentSection: TempSection | null = null;
  let position = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const isHeading = sectionPatterns.some(pattern => pattern.test(trimmed));

    if (isHeading) {
      // Save previous section
      if (currentSection) {
        sections.push({
          title: currentSection.title,
          content: currentSection.contentLines.join('\n'),
          startPosition: currentSection.startPosition,
          endPosition: position,
          type: 'header',
        });
      }

      // Start new section
      currentSection = {
        title: trimmed,
        startPosition: position,
        contentLines: [],
      };
    } else if (currentSection) {
      currentSection.contentLines.push(line);
    }

    position += line.length + 1; // +1 for newline
  }

  // Save final section
  if (currentSection) {
    sections.push({
      title: currentSection.title,
      content: currentSection.contentLines.join('\n'),
      startPosition: currentSection.startPosition,
      endPosition: position,
      type: 'header',
    });
  }

  return sections;
}

/**
 * Count tables in document
 * Tables are identified by consistent alignment characters
 */
function countTables(text: string): number {
  // Look for lines with multiple tab characters or pipe characters
  const lines = text.split('\n');
  let tableCount = 0;
  let inTable = false;

  lines.forEach(line => {
    const hasPipes = (line.match(/\|/g) || []).length >= 2;
    const hasTabs = (line.match(/\t/g) || []).length >= 2;
    const hasMultipleSpaces = /\s{3,}.*\s{3,}/.test(line);

    if (hasPipes || hasTabs || hasMultipleSpaces) {
      if (!inTable) {
        tableCount++;
        inTable = true;
      }
    } else if (line.trim().length === 0) {
      inTable = false;
    }
  });

  return tableCount;
}

/**
 * Quick utility: estimate if text needs preprocessing
 */
export function needsPreprocessing(text: string): boolean {
  // Check for common OCR artifacts
  const hasExcessiveSpaces = /\s{5,}/.test(text);
  const hasPageNumbers = /^(sayfa|page)\s+\d+/im.test(text);
  const hasHyphenatedWords = /\w+-\s*\n\s*\w+/.test(text);
  const hasDuplicateLines = countDuplicateLines(text) > 10;

  return hasExcessiveSpaces || hasPageNumbers || hasHyphenatedWords || hasDuplicateLines;
}

/**
 * Count duplicate consecutive lines
 */
function countDuplicateLines(text: string): number {
  const lines = text.split('\n');
  let count = 0;
  let prev = '';

  lines.forEach(line => {
    if (line.trim() === prev && line.trim().length > 0) {
      count++;
    }
    prev = line.trim();
  });

  return count;
}
