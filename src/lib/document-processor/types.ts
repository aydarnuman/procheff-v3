/**
 * Document Processor Type Definitions
 * Core data structures for tender document analysis
 */

// Document types
export type DocumentType = 'idari' | 'teknik' | 'ilan' | 'sozlesme' | 'ek' | 'menu' | 'gramaj' | 'bilinmeyen';

// Document metadata
export interface DocumentInfo {
  doc_id: string;           // Unique identifier (e.g., "A", "B", "C")
  type_guess: DocumentType;
  hash: string;             // SHA-256 hash for deduplication
  name: string;             // Original filename
  size: number;             // File size in bytes
  mime_type: string;        // MIME type
  created_at: string;       // ISO timestamp
}

// Text extraction results
export interface TextBlock {
  block_id: string;         // Reference ID (e.g., "A:12")
  text: string;             // Extracted text
  doc_id: string;           // Parent document ID
  page?: number;            // Page number (if applicable)
  line_start?: number;      // Starting line number
  line_end?: number;        // Ending line number
  confidence?: number;      // OCR confidence (0-1)
  bbox?: {                  // Bounding box coordinates
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Table extraction
export interface ExtractedTable {
  table_id: string;         // Reference ID (e.g., "T1")
  doc_id: string;           // Parent document ID
  headers: string[];        // Table headers
  rows: string[][];         // Table data rows
  page?: number;            // Page number
  title?: string;           // Table title/caption
  context?: string;         // Surrounding text for context
}

// Date extraction
export interface ExtractedDate {
  kind: DateKind;
  value: string;            // ISO 8601 format
  source: string;           // Reference (e.g., "A:23")
  original: string;         // Original text
  confidence: number;       // Extraction confidence
}

export type DateKind =
  | 'ihale_tarihi'          // Tender date
  | 'son_teklif'            // Bid deadline
  | 'sozlesme_baslangic'    // Contract start
  | 'teslim'                // Delivery date
  | 'yayin'                 // Publication date
  | 'diger';                // Other

// Number/amount extraction
export interface ExtractedAmount {
  kind: AmountKind;
  value: number;
  unit?: string;
  currency?: string;
  source: string;
  original: string;
}

export type AmountKind =
  | 'tahmini_bedel'         // Estimated budget
  | 'gecici_teminat'        // Temporary guarantee
  | 'kesin_teminat'         // Final guarantee
  | 'ceza_orani'            // Penalty rate
  | 'kisi_sayisi'           // Person count
  | 'gun_sayisi'            // Day count
  | 'ogun_sayisi'           // Meal count per day
  | 'porsiyon'              // Portion count
  | 'gramaj';               // Weight/portion size

// Entity extraction
export interface ExtractedEntity {
  kind: EntityKind;
  value: string;
  normalized?: string;       // Normalized form
  source: string;
  confidence: number;
}

export type EntityKind =
  | 'kurum'                 // Organization
  | 'adres'                 // Address
  | 'telefon'               // Phone
  | 'email'                 // Email
  | 'ikn'                   // İhale Kayıt No
  | 'ilan_no'               // Announcement number
  | 'yetkili';              // Authorized person

// Complete data pool
export interface DataPool {
  // Document registry
  documents: DocumentInfo[];

  // Extracted content
  textBlocks: TextBlock[];
  tables: ExtractedTable[];
  dates: ExtractedDate[];
  amounts: ExtractedAmount[];
  entities: ExtractedEntity[];

  // Combined text for search/analysis
  rawText: string;

  // Metadata
  metadata: {
    total_pages: number;
    total_words: number;
    extraction_time_ms: number;
    ocr_used: boolean;
    languages_detected: string[];
    warnings: string[];
  };

  // Provenance map for quick lookup
  provenance: Map<string, SourceLocation>;
}

// Source tracking
export interface SourceLocation {
  doc_id: string;
  page?: number;
  line?: number;
  table_id?: string;
  row?: number;
  col?: number;
  text_snippet: string;      // 50 chars before/after for context
}

// Processing options
export interface ProcessingOptions {
  ocr_enabled: boolean;
  ocr_language?: string;
  extract_tables: boolean;
  extract_dates: boolean;
  extract_amounts: boolean;
  extract_entities: boolean;
  merge_blocks: boolean;       // Merge adjacent text blocks
  clean_text: boolean;         // Remove extra whitespace
  detect_language: boolean;
}

// Processing result
export interface ProcessingResult {
  success: boolean;
  dataPool?: DataPool;
  errors: ProcessingError[];
  duration_ms: number;
}

export interface ProcessingError {
  doc_id?: string;
  stage: 'upload' | 'extract' | 'parse' | 'classify' | 'validate';
  message: string;
  details?: any;
}