# Utility Functions Documentation

**Procheff-v3 Utility Functions Reference Guide**

This document provides comprehensive documentation for all utility functions in the Procheff-v3 codebase. These utilities are designed to handle common tasks like text normalization, file processing, error handling, and more.

## 📚 Table of Contents

- [Turkish Normalizer](#turkish-normalizer)
- [Smart Text Formatter](#smart-text-formatter)
- [ZIP Extractor](#zip-extractor)
- [XLSX Processor](#xlsx-processor)
- [Error Codes](#error-codes)
- [Retry Utility](#retry-utility)
- [SSE Stream](#sse-stream)
- [HTML Parser](#html-parser)
- [Color Helpers](#color-helpers)
- [Format Extractors](#format-extractors)

---

## Turkish Normalizer

**File**: `src/lib/utils/turkish-normalizer.ts`

Turkish text normalization utilities for converting Turkish characters to ASCII equivalents.

### Class: `TurkishNormalizer`

Static utility class for Turkish character normalization.

#### Methods

##### `toAscii(text: string): string`

Converts Turkish characters to their ASCII equivalents.

**Parameters:**
- `text` (string): Input text containing Turkish characters

**Returns:**
- `string`: Text with Turkish characters replaced by ASCII equivalents

**Example:**
```typescript
import { TurkishNormalizer } from '@/lib/utils/turkish-normalizer';

const normalized = TurkishNormalizer.toAscii('İstanbul Çağrı Merkezi');
// Returns: "Istanbul Cagri Merkezi"
```

**Character Mappings:**
- `Ç/ç` → `C/c`
- `Ğ/ğ` → `G/g`
- `İ/ı` → `I/i`
- `Ö/ö` → `O/o`
- `Ş/ş` → `S/s`
- `Ü/ü` → `U/u`

##### `normalizeForSearch(text: string): string`

Normalizes text for search operations (lowercase + ASCII conversion).

**Parameters:**
- `text` (string): Input text to normalize

**Returns:**
- `string`: Lowercased ASCII-normalized text

**Example:**
```typescript
const searchable = TurkishNormalizer.normalizeForSearch('İSTANBUL');
// Returns: "istanbul"
```

---

## Smart Text Formatter

**File**: `src/lib/utils/smart-text-formatter.ts`

Intelligent text formatting utility that detects and formats various text patterns including headings, lists, and paragraphs.

### Function: `formatSmartText(text: string): React.ReactElement | null`

Formats raw text with intelligent detection of:
- Headings (ALL CAPS lines)
- Numbered lists (lines starting with numbers)
- Bullet lists (lines starting with `-`, `*`, or `•`)
- MADDE format (Turkish legal document format)
- Regular paragraphs

**Parameters:**
- `text` (string): Raw text to format

**Returns:**
- `React.ReactElement | null`: Formatted React element or null if text is empty

**Example:**
```typescript
import { formatSmartText } from '@/lib/utils/smart-text-formatter';

const formatted = formatSmartText(`
BAŞLIK
Bu bir paragraf.

1. İlk madde
2. İkinci madde

- Liste öğesi 1
- Liste öğesi 2
`);
```

**Features:**
- Automatic heading detection (ALL CAPS lines)
- Numbered list formatting (`1.`, `2.`, etc.)
- Bullet list formatting (`-`, `*`, `•`)
- MADDE format support
- Paragraph grouping
- Client-side component (uses `'use client'`)

---

## ZIP Extractor

**File**: `src/lib/utils/zip-extractor.ts`

Utility for extracting files from ZIP archives with MIME type detection.

### Class: `ZipExtractor`

Static utility class for ZIP file extraction.

#### Interfaces

##### `ExtractedFile`

```typescript
interface ExtractedFile {
  name: string;           // File name
  content: ArrayBuffer;    // File content as ArrayBuffer
  size: number;            // File size in bytes
  type: string;            // MIME type (inferred from extension)
}
```

##### `ZipExtractionResult`

```typescript
interface ZipExtractionResult {
  success: boolean;        // Whether extraction succeeded
  files: ExtractedFile[];  // Array of extracted files
  error?: string;          // Error message if failed
  totalFiles: number;      // Total number of files extracted
  totalSize: number;       // Total size of all files in bytes
}
```

#### Methods

##### `extract(file: File): Promise<ZipExtractionResult>`

Extracts all files from a ZIP archive.

**Parameters:**
- `file` (File): ZIP file to extract

**Returns:**
- `Promise<ZipExtractionResult>`: Extraction result with files and metadata

**Example:**
```typescript
import { ZipExtractor } from '@/lib/utils/zip-extractor';

const result = await ZipExtractor.extract(zipFile);
if (result.success) {
  console.log(`Extracted ${result.totalFiles} files`);
  result.files.forEach(file => {
    console.log(`${file.name}: ${file.size} bytes (${file.type})`);
  });
}
```

**Supported MIME Types:**
- PDF: `application/pdf`
- DOCX: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- DOC: `application/msword`
- TXT: `text/plain`
- RTF: `text/rtf`
- HTML: `text/html`
- XLSX: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- XLS: `application/vnd.ms-excel`

**Error Handling:**
- Invalid ZIP format
- Corrupted files
- Unsupported file types
- Extraction failures

---

## XLSX Processor

**File**: `src/lib/utils/xlsx-processor.ts`

Utility for processing Excel files (XLSX/XLS) and extracting text content from all sheets.

### Class: `XlsxProcessor`

Static utility class for Excel file processing.

#### Interfaces

##### `SheetData`

```typescript
interface SheetData {
  name: string;    // Sheet name
  rows: number;    // Number of rows
  cols: number;    // Number of columns
  text: string;    // Extracted text content
}
```

##### `XlsxProcessingResult`

```typescript
interface XlsxProcessingResult {
  success: boolean;      // Whether processing succeeded
  text: string;          // Combined text from all sheets
  sheets: SheetData[];   // Array of sheet data
  error?: string;        // Error message if failed
  totalRows: number;     // Total rows across all sheets
  totalCells: number;    // Total cells processed
}
```

#### Methods

##### `process(file: File, onProgress?: (message: string) => void): Promise<XlsxProcessingResult>`

Processes an Excel file and extracts text from all sheets.

**Parameters:**
- `file` (File): Excel file (XLSX or XLS) to process
- `onProgress` (optional): Callback function for progress updates

**Returns:**
- `Promise<XlsxProcessingResult>`: Processing result with extracted text and sheet data

**Example:**
```typescript
import { XlsxProcessor } from '@/lib/utils/xlsx-processor';

const result = await XlsxProcessor.process(excelFile, (message) => {
  console.log(`Progress: ${message}`);
});

if (result.success) {
  console.log(`Processed ${result.sheets.length} sheets`);
  console.log(`Total rows: ${result.totalRows}`);
  console.log(`Combined text: ${result.text.substring(0, 100)}...`);
  
  result.sheets.forEach(sheet => {
    console.log(`Sheet "${sheet.name}": ${sheet.rows} rows, ${sheet.cols} cols`);
  });
}
```

**Features:**
- Multi-sheet support
- Progress callbacks
- Text extraction from all cells
- Row and column counting
- Error handling with detailed messages

---

## Error Codes

**File**: `src/lib/utils/error-codes.ts`

Structured error code system for consistent error handling across the application.

### Usage

Error codes provide a standardized way to identify and handle different error types.

**Example:**
```typescript
import { ErrorCodes } from '@/lib/utils/error-codes';

// Check error type
if (error.code === ErrorCodes.API_RATE_LIMIT) {
  // Handle rate limit error
}
```

---

## Retry Utility

**File**: `src/lib/utils/retry.ts`

Utility for implementing retry logic with exponential backoff.

### Usage

Retry failed operations with configurable attempts and delays.

**Example:**
```typescript
import { retry } from '@/lib/utils/retry';

const result = await retry(
  async () => {
    return await fetch('/api/data');
  },
  {
    maxAttempts: 3,
    delay: 1000,
    exponentialBackoff: true
  }
);
```

---

## SSE Stream

**File**: `src/lib/utils/sse-stream.ts`

Utility for parsing Server-Sent Events (SSE) streams.

### Usage

Parse SSE streams for real-time data updates.

**Example:**
```typescript
import { parseSSEStream } from '@/lib/utils/sse-stream';

const response = await fetch('/api/stream');
const reader = response.body?.getReader();

if (reader) {
  for await (const chunk of parseSSEStream(reader)) {
    console.log('SSE Event:', chunk);
  }
}
```

---

## HTML Parser

**File**: `src/lib/utils/html-parser.ts`

Utility for parsing HTML content and extracting structured data.

### Usage

Parse HTML and extract tables, sections, and text content.

**Example:**
```typescript
import { parseHTML } from '@/lib/utils/html-parser';

const result = parseHTML(htmlContent);
console.log('Tables:', result.tables);
console.log('Sections:', result.sections);
console.log('Text:', result.text);
```

---

## Color Helpers

**File**: `src/lib/utils/color-helpers.ts`

Utility functions for color manipulation and theme support.

### Usage

Helper functions for color operations in the UI.

**Example:**
```typescript
import { getColorForLevel } from '@/lib/utils/color-helpers';

const color = getColorForLevel('error'); // Returns error color
```

---

## Format Extractors

**File**: `src/lib/utils/format-extractors.ts`

Utility functions for extracting data from various formats.

### Usage

Extract structured data from different document formats.

**Example:**
```typescript
import { extractTableData } from '@/lib/utils/format-extractors';

const tableData = extractTableData(rawText);
```

---

## Best Practices

### When to Use Utilities

1. **Text Normalization**: Use `TurkishNormalizer` for search and comparison operations
2. **File Processing**: Use `ZipExtractor` and `XlsxProcessor` for document processing
3. **Text Formatting**: Use `formatSmartText` for displaying user-generated content
4. **Error Handling**: Use structured error codes for consistent error management
5. **Retry Logic**: Use retry utility for network operations and API calls

### Performance Considerations

- **ZIP Extraction**: Large ZIP files may take time; consider progress callbacks
- **Excel Processing**: Large spreadsheets may impact performance; process in chunks if needed
- **Text Formatting**: Client-side operation; consider memoization for large texts

### Error Handling

All utilities include error handling:
- Return success/error status in result objects
- Provide detailed error messages
- Log errors using AILogger when available

---

## Contributing

When adding new utilities:

1. Add JSDoc comments with parameter and return type descriptions
2. Include usage examples in this documentation
3. Add error handling with descriptive messages
4. Use TypeScript interfaces for complex return types
5. Export from `src/lib/utils/index.ts` if creating a new utility

---

**Last Updated**: 2025-01-12  
**Maintained By**: Procheff-v3 Development Team


