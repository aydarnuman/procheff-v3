/**
 * Multi-file upload endpoint for tender analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildDataPool } from '@/lib/document-processor/data-pool';
import { getDB } from '@/lib/db/sqlite-client';
import { AILogger } from '@/lib/ai/logger';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file
const MAX_TOTAL_SIZE = 200 * 1024 * 1024; // 200MB total
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/zip',
  'text/plain',
  'text/html',
  'text/csv'
];

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const formData = await request.formData();
    const files: File[] = [];
    let totalSize = 0;

    // Extract all files from form data
    for (const [key, value] of formData) {
      if (key.startsWith('file') && value instanceof File) {
        // Validate file size
        if (value.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            {
              error: 'File too large',
              message: `${value.name} exceeds maximum size of 50MB`
            },
            { status: 400 }
          );
        }

        // Validate file type
        const fileType = value.type || getMimeTypeFromName(value.name);
        if (!ALLOWED_TYPES.includes(fileType) && !value.name.endsWith('.docx')) {
          return NextResponse.json(
            {
              error: 'Invalid file type',
              message: `${value.name} is not a supported file type`
            },
            { status: 400 }
          );
        }

        totalSize += value.size;
        files.push(value);
      }
    }

    // Validate total size
    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        {
          error: 'Total size too large',
          message: 'Total file size exceeds 200MB limit'
        },
        { status: 400 }
      );
    }

    // Validate at least one file
    if (files.length === 0) {
      return NextResponse.json(
        {
          error: 'No files provided',
          message: 'Please upload at least one file'
        },
        { status: 400 }
      );
    }

    AILogger.info('Processing tender documents', {
      fileCount: files.length,
      totalSize: Math.round(totalSize / 1024 / 1024 * 100) / 100 + 'MB',
      files: files.map(f => ({ name: f.name, size: f.size, type: f.type }))
    });

    // Build data pool from files
    const result = await buildDataPool(files, {
      ocr_enabled: false, // Will implement OCR later
      extract_tables: true,
      extract_dates: true,
      extract_amounts: true,
      extract_entities: true,
      merge_blocks: true,
      clean_text: true,
      detect_language: false
    });

    if (!result.success || !result.dataPool) {
      AILogger.error('Data extraction failed', {
        errors: result.errors
      });

      return NextResponse.json(
        {
          error: 'Extraction failed',
          message: 'Failed to extract data from documents',
          details: result.errors
        },
        { status: 500 }
      );
    }

    const { dataPool } = result;

    // Generate analysis ID
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store initial analysis in database
    try {
      const db = getDB();

      // Create analysis record
      const stmt = db.prepare(`
        INSERT INTO analysis_history (
          id, status, input_files, data_pool,
          created_at, duration_ms
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        analysisId,
        'extracting',
        JSON.stringify(files.map(f => ({ name: f.name, size: f.size }))),
        JSON.stringify(dataPool),
        new Date().toISOString(),
        result.duration_ms
      );

      AILogger.success('Data extraction completed', {
        analysisId,
        documents: dataPool.documents.length,
        textBlocks: dataPool.textBlocks.length,
        tables: dataPool.tables.length,
        dates: dataPool.dates.length,
        entities: dataPool.entities.length,
        warnings: dataPool.metadata.warnings,
        duration: result.duration_ms
      });
    } catch (dbError) {
      AILogger.error('Database save failed', { error: dbError });
      // Continue even if DB save fails
    }

    // Trigger background analysis process
    try {
      // Call the process endpoint asynchronously
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/analysis/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          analysisId,
          dataPool,
          options: {
            enable_contextual: true,
            enable_market: true,
            enable_deep: false,
            parallel_processing: true
          }
        })
      }).then(response => {
        if (!response.ok) {
          AILogger.error('Background analysis failed to start', {
            analysisId,
            status: response.status
          });
        }
      }).catch(error => {
        AILogger.error('Background analysis error', { analysisId, error });
      });

      AILogger.info('Background analysis triggered', { analysisId });
    } catch (error) {
      AILogger.error('Failed to trigger background analysis', { analysisId, error });
    }

    // Return data pool
    return NextResponse.json({
      success: true,
      analysisId,
      dataPool,
      metadata: {
        fileCount: files.length,
        totalSize,
        extractionTime: result.duration_ms,
        warnings: dataPool.metadata.warnings,
        analysisStarted: true
      }
    });

  } catch (error) {
    AILogger.error('Upload endpoint error', { error });

    return NextResponse.json(
      {
        error: 'Processing failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

/**
 * Get MIME type from filename
 */
function getMimeTypeFromName(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'zip':
      return 'application/zip';
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