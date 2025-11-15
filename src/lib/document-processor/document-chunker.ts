/**
 * Document Chunking Module
 * Intelligent text chunking for large documents
 *
 * Strategies:
 * - Section-based chunking (by headings)
 * - Semantic chunking (by paragraph boundaries)
 * - Token-aware chunking (prevent AI context overflow)
 * - Smart overlap (maintain context between chunks)
 */

import { AILogger } from '@/lib/ai/logger';
import { DocumentSection } from './pdf-cleaner';

export interface ChunkingOptions {
  maxChunkSize?: number;        // Max characters per chunk
  minChunkSize?: number;        // Min characters per chunk
  overlapSize?: number;         // Characters to overlap between chunks
  chunkBySection?: boolean;     // Chunk based on document sections
  preserveParagraphs?: boolean; // Don't split paragraphs
  preserveTables?: boolean;     // Keep tables intact
}

export interface DocumentChunk {
  id: string;
  content: string;
  startPosition: number;
  endPosition: number;
  chunkIndex: number;
  totalChunks: number;
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  sectionTitle?: string;
  hasTable?: boolean;
  wordCount: number;
  characterCount: number;
  estimatedTokens: number;
  type: 'section' | 'semantic' | 'overflow';
}

export interface ChunkedDocument {
  chunks: DocumentChunk[];
  statistics: ChunkingStatistics;
}

export interface ChunkingStatistics {
  originalLength: number;
  totalChunks: number;
  avgChunkSize: number;
  minChunkSize: number;
  maxChunkSize: number;
  overlapTotal: number;
  processingTime: number;
}

/**
 * Main chunking function
 */
export function chunkDocument(
  text: string,
  sections?: DocumentSection[],
  options: ChunkingOptions = {}
): ChunkedDocument {
  const startTime = Date.now();

  const defaultOptions: ChunkingOptions = {
    maxChunkSize: 12000,      // ~3000 tokens (4 chars per token)
    minChunkSize: 2000,       // ~500 tokens
    overlapSize: 500,         // ~125 tokens overlap
    chunkBySection: true,
    preserveParagraphs: true,
    preserveTables: true,
  };

  const opts = { ...defaultOptions, ...options };

  AILogger.info('Starting document chunking', {
    textLength: text.length,
    sections: sections?.length || 0,
    options: opts,
  });

  let chunks: DocumentChunk[] = [];

  // Strategy 1: Section-based chunking (if sections available)
  if (opts.chunkBySection && sections && sections.length > 0) {
    chunks = chunkBySections(text, sections, opts);
  } else {
    // Strategy 2: Semantic chunking (by paragraphs)
    chunks = chunkSemanticaly(text, opts);
  }

  // Calculate statistics
  const sizes = chunks.map(c => c.content.length);
  const avgChunkSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
  const minChunkSize = Math.min(...sizes);
  const maxChunkSize = Math.max(...sizes);

  const overlapTotal = chunks.reduce((sum, chunk, index) => {
    if (index === 0) return 0;
    const prevEnd = chunks[index - 1].endPosition;
    const currentStart = chunk.startPosition;
    return sum + Math.max(0, prevEnd - currentStart);
  }, 0);

  const processingTime = Date.now() - startTime;

  const stats: ChunkingStatistics = {
    originalLength: text.length,
    totalChunks: chunks.length,
    avgChunkSize: Math.round(avgChunkSize),
    minChunkSize,
    maxChunkSize,
    overlapTotal,
    processingTime,
  };

  AILogger.success('Document chunking completed', stats);

  return { chunks, statistics: stats };
}

/**
 * Chunk by document sections
 */
function chunkBySections(
  text: string,
  sections: DocumentSection[],
  options: ChunkingOptions
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  sections.forEach(section => {
    const sectionText = section.content;

    // If section is small enough, keep as one chunk
    if (sectionText.length <= options.maxChunkSize!) {
      chunks.push({
        id: `chunk-${chunkIndex}`,
        content: sectionText,
        startPosition: section.startPosition,
        endPosition: section.endPosition,
        chunkIndex,
        totalChunks: 0, // Will be updated later
        metadata: {
          sectionTitle: section.title,
          hasTable: detectTable(sectionText),
          wordCount: countWords(sectionText),
          characterCount: sectionText.length,
          estimatedTokens: estimateTokens(sectionText),
          type: 'section',
        },
      });
      chunkIndex++;
    } else {
      // Section too large, split it
      const subChunks = chunkSemanticaly(sectionText, options, section.startPosition);
      subChunks.forEach(subChunk => {
        chunks.push({
          ...subChunk,
          id: `chunk-${chunkIndex}`,
          chunkIndex,
          metadata: {
            ...subChunk.metadata,
            sectionTitle: section.title,
          },
        });
        chunkIndex++;
      });
    }
  });

  // Update totalChunks for all
  chunks.forEach(chunk => {
    chunk.totalChunks = chunks.length;
  });

  return chunks;
}

/**
 * Chunk semantically by paragraphs and size limits
 */
function chunkSemanticaly(
  text: string,
  options: ChunkingOptions,
  basePosition: number = 0
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const paragraphs = text.split(/\n\n+/);

  let currentChunk: string[] = [];
  let currentSize = 0;
  let chunkIndex = 0;
  let position = basePosition;

  paragraphs.forEach((para, _index) => {
    const paraSize = para.length;

    // Check if adding this paragraph exceeds max chunk size
    if (currentSize + paraSize > options.maxChunkSize! && currentSize >= options.minChunkSize!) {
      // Save current chunk
      const content = currentChunk.join('\n\n');
      chunks.push({
        id: `chunk-${chunkIndex}`,
        content,
        startPosition: position - currentSize,
        endPosition: position,
        chunkIndex,
        totalChunks: 0,
        metadata: {
          hasTable: detectTable(content),
          wordCount: countWords(content),
          characterCount: content.length,
          estimatedTokens: estimateTokens(content),
          type: 'semantic',
        },
      });

      chunkIndex++;

      // Start new chunk with overlap
      if (options.overlapSize! > 0 && currentChunk.length > 0) {
        const lastPara = currentChunk[currentChunk.length - 1];
        if (lastPara.length < options.overlapSize!) {
          currentChunk = [lastPara];
          currentSize = lastPara.length;
        } else {
          currentChunk = [];
          currentSize = 0;
        }
      } else {
        currentChunk = [];
        currentSize = 0;
      }
    }

    // Add paragraph to current chunk
    currentChunk.push(para);
    currentSize += paraSize + 2; // +2 for \n\n
    position += paraSize + 2;
  });

  // Save final chunk
  if (currentChunk.length > 0) {
    const content = currentChunk.join('\n\n');
    chunks.push({
      id: `chunk-${chunkIndex}`,
      content,
      startPosition: position - currentSize,
      endPosition: position,
      chunkIndex,
      totalChunks: 0,
      metadata: {
        hasTable: detectTable(content),
        wordCount: countWords(content),
        characterCount: content.length,
        estimatedTokens: estimateTokens(content),
        type: 'semantic',
      },
    });
  }

  // Update totalChunks
  chunks.forEach(chunk => {
    chunk.totalChunks = chunks.length;
  });

  return chunks;
}

/**
 * Detect if text contains a table
 */
function detectTable(text: string): boolean {
  // Look for table indicators
  const hasPipes = (text.match(/\|/g) || []).length >= 3;
  const hasTabs = (text.match(/\t/g) || []).length >= 3;
  const hasMultipleSpaces = /\s{3,}.*\s{3,}/g.test(text);
  const hasTableKeywords = /(çizelge|tablo|table)/i.test(text);

  return hasPipes || hasTabs || (hasMultipleSpaces && hasTableKeywords);
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Estimate token count (rough heuristic: 4 chars per token)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Extract specific chunk by index
 */
export function getChunk(chunks: DocumentChunk[], index: number): DocumentChunk | null {
  return chunks[index] || null;
}

/**
 * Get chunks containing specific keyword
 */
export function findChunksWithKeyword(chunks: DocumentChunk[], keyword: string): DocumentChunk[] {
  const regex = new RegExp(keyword, 'gi');
  return chunks.filter(chunk => regex.test(chunk.content));
}

/**
 * Merge chunks back into full text
 */
export function mergeChunks(chunks: DocumentChunk[]): string {
  return chunks
    .sort((a, b) => a.chunkIndex - b.chunkIndex)
    .map(chunk => chunk.content)
    .join('\n\n--- CHUNK BOUNDARY ---\n\n');
}

/**
 * Get chunk summary for logging
 */
export function getChunkSummary(chunk: DocumentChunk): string {
  const preview = chunk.content.slice(0, 100).replace(/\n/g, ' ');
  return `[${chunk.chunkIndex + 1}/${chunk.totalChunks}] ${chunk.metadata.characterCount} chars, ${chunk.metadata.estimatedTokens} tokens - "${preview}..."`;
}