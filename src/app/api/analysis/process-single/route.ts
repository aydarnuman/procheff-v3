/**
 * Single File Processing Endpoint
 * Processes one file with OCR + extraction
 * Returns partial DataPool for that file
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildDataPool } from '@/lib/document-processor/data-pool';
import { AILogger } from '@/lib/ai/logger';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileTypeFromBuffer } from 'file-type';
import mammoth from 'mammoth';
import crypto from 'crypto';
import { createSSEResponse, SSEStream } from '@/lib/utils/sse-stream';
import { DataPoolManager } from '@/lib/state/data-pool-manager';

// Dynamic import for pdf-parse
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

/** SHA-256 hash */
async function sha256(buf: Buffer): Promise<string> {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/** Detect MIME type */
async function detectMime(buf: Buffer, filename?: string): Promise<string> {
  // Try file-type detection first
  const ft = await fileTypeFromBuffer(buf);
  if (ft?.mime) return ft.mime;
  
  // Fallback: Check file extension for text-based files
  if (filename) {
    const ext = filename.toLowerCase().split('.').pop();
    if (ext === 'csv') return 'text/csv';
    if (ext === 'json') return 'application/json';
    if (ext === 'txt') return 'text/plain';
    if (ext === 'html' || ext === 'htm') return 'text/html';
    if (ext === 'xml') return 'text/xml';
  }
  
  // Try to detect if it's UTF-8 text
  try {
    const text = buf.toString('utf8');
    if (text.length > 0 && text.length < 1000000) { // Max 1MB for text detection
      const validChars = text.match(/[\x20-\x7E\n\r\t\u00A0-\uFFFF]/g);
      if (validChars && validChars.length / text.length > 0.9) {
        return 'text/plain';
      }
    }
  } catch {
    // Not valid UTF-8
  }
  
  return 'application/octet-stream';
}

/** Text extraction based on MIME type */
async function extractText(buf: Buffer, mime: string): Promise<string> {
  if (mime === 'application/pdf') {
    try {
      const data = await pdfParse(buf);
      return data.text;
    } catch {
      return '';
    }
  }
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const res = await mammoth.extractRawText({ buffer: buf });
    return res.value;
  }
  
  // Support text-based formats
  if (
    mime.startsWith('text/') || 
    mime === 'application/json' || 
    mime === 'text/csv' ||
    mime === 'application/csv'
  ) {
    return buf.toString('utf8');
  }
  
  return '';
}

/** Calculate text density */
function textDensity(str: string): number {
  const sample = str.slice(0, 8000);
  const alpha = (sample.match(/[A-Za-zĞÜŞİÖÇğüşiöç0-9\s]/g) || []).length;
  return alpha / Math.max(1, sample.length);
}

/** OCR with multi-engine fallback support */
async function runOCRGemini(buf: Buffer): Promise<string> {
  // Import OCR service
  const { OCRService } = await import('@/lib/document-processor/ocr-service');

  // Get OCR configuration from environment
  const provider = (process.env.OCR_PROVIDER || 'auto') as 'auto' | 'gemini' | 'tesseract';
  const language = process.env.OCR_LANGUAGE || 'tur+eng';
  const timeout = parseInt(process.env.OCR_TIMEOUT || '120000', 10);

  AILogger.info('Starting OCR with fallback support', {
    provider,
    language,
    timeout,
    bufferSize: buf.length,
  });

  // If buffer is a PDF and feature flag is enabled, rasterize pages and run batch OCR
  const isPdf = buf.length >= 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-';
  const rasterizeEnabled = (process.env.OCR_PDF_RASTERIZE || 'false').toLowerCase() === 'true';

  if (isPdf && rasterizeEnabled) {
    try {
      const dpi = parseInt(process.env.OCR_DPI || '200', 10);
      const maxPages = parseInt(process.env.OCR_MAX_PAGES || '5', 10);
      const { renderPdfToImages } = await import('@/lib/document-processor/pdf-image-renderer');
      const raster = await renderPdfToImages(buf, { dpi, maxPages });

      if (raster.images.length === 0) {
        AILogger.warn('PDF rasterization returned no images, falling back to direct OCR');
      } else {
        AILogger.info('Running batch OCR on rasterized PDF images', {
          pages: raster.images.length,
          dpi
        });
        const results = await OCRService.batchOCR(raster.images, { provider, language, timeout });
        const text = results.map(r => r.text || '').filter(t => t.length > 0).join('\n\n');
        if (text.trim().length > 0) {
          return text;
        }
        AILogger.warn('Batch OCR returned empty text, falling back to direct OCR');
      }
    } catch (err) {
      AILogger.error('Rasterize+batch OCR failed, falling back', {
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  // Perform OCR with fallback
  const result = await OCRService.performOCR(buf, {
    provider,
    language,
    timeout,
  });

  if (result.error) {
    AILogger.error('All OCR providers failed', { error: result.error });
    throw new Error(result.error);
  }

  AILogger.info('OCR completed successfully', {
    provider: result.provider,
    textLength: result.text.length,
    confidence: result.confidence,
    processingTime: result.processingTime,
  });

  return result.text;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const sessionId = `process-single_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Defensive: Check request size limit (50MB max)
  const contentLength = request.headers.get('content-length');
  const MAX_SIZE = 50 * 1024 * 1024; // 50MB
  
  if (contentLength && parseInt(contentLength) > MAX_SIZE) {
    return NextResponse.json(
      { error: 'File too large', message: 'Dosya boyutu 50MB\'ı aşamaz' },
      { status: 413 }
    );
  }
  
  // Check if client wants SSE streaming
  const acceptHeader = request.headers.get('accept') || '';
  const wantsStreaming = acceptHeader.includes('text/event-stream') || 
                         request.headers.get('x-want-streaming') === 'true';

  // If streaming requested, return SSE response
  if (wantsStreaming) {
    return createStreamingResponse(sessionId, request);
  }

  // Otherwise, return normal JSON response
  try {
    AILogger.sessionStart(sessionId);
    
    // Defensive: Add timeout for formData parsing (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      clearTimeout(timeoutId);
      AILogger.error('FormData parsing failed', { error, sessionId });
      return NextResponse.json(
        { error: 'Invalid form data', message: 'Geçersiz dosya formatı' },
        { status: 400 }
      );
    } finally {
      clearTimeout(timeoutId);
    }
    
    const file = formData.get('file') as File;

    if (!file) {
      AILogger.sessionEnd(sessionId, 'failed');
      return NextResponse.json(
        { error: 'No file provided', message: 'Lütfen bir dosya seçin' },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const mime = await detectMime(buf, file.name);
    const hash = await sha256(buf);

    AILogger.info('Single file processing started', {
      filename: file.name,
      mime,
      size: file.size,
      hash
    });

    // Step 1: Extract text
    let text = await extractText(buf, mime);
    const density = textDensity(text);

    // Step 2: Check if we need OCR (low density or PDF)
    let ocrUsed = false;
    let fileToProcess = file;
    let ocrTextResult: string | null = null;

    // For PDFs, check text density and run OCR if needed
    if (mime === 'application/pdf') {
      const needsOCR = density < 0.25 || text.trim().length < 100;

      AILogger.info('PDF processing decision', {
        filename: file.name,
        density,
        originalTextLength: text.length,
        needsOCR,
        reason: needsOCR ?
          (density < 0.25 ? 'Low text density' : 'Insufficient text') :
          'Sufficient text extracted'
      });

      if (needsOCR) {
        try {
          AILogger.info('Starting OCR for PDF', { filename: file.name });
          const ocrText = await runOCRGemini(buf);
          const ocrTextTrimmed = ocrText?.trim() || '';

          AILogger.info('OCR result received', {
            filename: file.name,
            ocrTextLength: ocrTextTrimmed.length,
            firstChars: ocrTextTrimmed.substring(0, 200)
          });
        
          // Check if OCR text is meaningful (at least 500 characters or 50 words)
          const wordCount = ocrTextTrimmed.split(/\s+/).filter(w => w.length > 0).length;

          if (ocrTextTrimmed.length > 500 || wordCount > 50) {
            ocrTextResult = ocrTextTrimmed;
            ocrUsed = true;
            // Create a new File with OCR text encoded as UTF-8
            const encoder = new TextEncoder();
            const encodedText = encoder.encode(ocrTextTrimmed);
            fileToProcess = new File([encodedText], file.name.replace('.pdf', '.txt'), { type: 'text/plain' });

            AILogger.success('OCR completed successfully', {
              filename: file.name,
              ocrTextLength: ocrTextTrimmed.length,
              wordCount
            });
          } else {
            AILogger.warn('OCR returned insufficient text, using original extraction', {
              filename: file.name,
              ocrTextLength: ocrTextTrimmed.length,
              wordCount,
              threshold: '500 chars or 50 words'
            });
            // Continue with original file extraction
          }
        } catch (ocrError) {
          AILogger.error('OCR failed, using original text', {
            filename: file.name,
            error: ocrError instanceof Error ? ocrError.message : String(ocrError),
            stack: ocrError instanceof Error ? ocrError.stack : undefined
          });
          // Continue with original file
        }
      }
    } else if (density < 0.25 && mime.startsWith('image/')) {
      // Also handle image files with OCR
      AILogger.info('Image file detected, running OCR', { filename: file.name, mime });
      try {
        const ocrText = await runOCRGemini(buf);
        if (ocrText.trim().length > 100) {
          ocrTextResult = ocrText.trim();
          ocrUsed = true;
          const encoder = new TextEncoder();
          const encodedText = encoder.encode(ocrTextResult);
          fileToProcess = new File([encodedText], file.name.replace(/\.\w+$/, '.txt'), { type: 'text/plain' });
          AILogger.success('OCR completed for image', { filename: file.name, textLength: ocrTextResult.length });
        }
      } catch (ocrError) {
        AILogger.error('Image OCR failed', { filename: file.name, error: ocrError });
      }
    }

    // Step 3: Build DataPool with full extraction
    // Use the processed file (with OCR text if available)
    let result;
    
    if (ocrUsed && ocrTextResult) {
      // If OCR was used, ensure the text is properly processed
      AILogger.info('Building DataPool with OCR text', {
        filename: file.name,
        ocrTextLength: ocrTextResult.length
      });
    }
    
    result = await buildDataPool([fileToProcess], {
      ocr_enabled: ocrUsed, // Mark as OCR-enabled
      extract_tables: true,
      extract_dates: true,
      extract_amounts: true,
      extract_entities: true,
      merge_blocks: true,
      clean_text: true,
      detect_language: false
    });
    
    // If OCR was used but result has very few words, log warning
    if (ocrUsed && result.dataPool) {
      const wordCount = result.dataPool.metadata.total_words;
      if (wordCount < 50) {
        AILogger.warn('OCR result has very few words', {
          filename: file.name,
          wordCount,
          ocrTextLength: ocrTextResult?.length || 0,
          rawTextLength: result.dataPool.rawText.length
        });
      }
    }

    if (!result.success || !result.dataPool) {
      return NextResponse.json(
        {
          error: 'Extraction failed',
          message: 'Dosya işlenirken hata oluştu',
          details: result.errors
        },
        { status: 500 }
      );
    }

    const { dataPool } = result;

    // Mark OCR usage in metadata
    dataPool.metadata.ocr_used = ocrUsed;

    const duration = Date.now() - startTime;

    // Special logging for PDFs
    if (mime === 'application/pdf') {
      AILogger.info('PDF processing results', {
        filename: file.name,
        ocrUsed,
        ocrTextLength: ocrTextResult?.length || 0,
        finalTextBlocks: dataPool.textBlocks.length,
        finalRawTextLength: dataPool.rawText.length,
        finalWords: dataPool.metadata.total_words,
        extractedTables: dataPool.tables.length,
        hasContent: dataPool.rawText.trim().length > 0
      });
    }

    AILogger.success('Single file processing completed', {
      filename: file.name,
      documents: dataPool.documents.length,
      textBlocks: dataPool.textBlocks.length,
      tables: dataPool.tables.length,
      dates: dataPool.dates.length,
      amounts: dataPool.amounts.length,
      entities: dataPool.entities.length,
      ocrUsed,
      duration
    });

    return NextResponse.json({
      success: true,
      filename: file.name,
      hash,
      mime,
      ocrUsed,
      dataPool: {
        documents: dataPool.documents,
        textBlocks: dataPool.textBlocks,
        tables: dataPool.tables,
        dates: dataPool.dates,
        amounts: dataPool.amounts,
        entities: dataPool.entities,
        rawText: dataPool.rawText,
        metadata: dataPool.metadata
      },
      duration_ms: duration
    });

    AILogger.sessionEnd(sessionId, 'completed');

  } catch (error) {
    AILogger.error('Single file processing error', { error });
    AILogger.sessionEnd(sessionId, 'failed');

    return NextResponse.json(
      {
        error: 'Processing failed',
        message: error instanceof Error ? error.message : 'Bilinmeyen hata oluştu'
      },
      { status: 500 }
    );
  }
}

/**
 * Create SSE streaming response for real-time progress
 */
function createStreamingResponse(sessionId: string, request: NextRequest): Response {
  return createSSEResponse(async (stream: SSEStream) => {
    try {
      const startTime = Date.now(); // FIX: Add startTime for duration calculation
      AILogger.sessionStart(sessionId);
      stream.sendProgress('start', 0, '🚀 İşlem başladı');

      stream.sendProgress('upload', 5, '📤 Dosya alınıyor...');
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        stream.sendError('NO_FILES', 'Dosya bulunamadı');
        AILogger.sessionEnd(sessionId, 'failed');
        return;
      }

      stream.sendProgress('processing', 10, `📄 ${file.name} işleniyor...`);

        const buf = Buffer.from(await file.arrayBuffer());
        const mime = await detectMime(buf, file.name);
        const hash = await sha256(buf);

        AILogger.info('Single file processing started', {
          filename: file.name,
          mime,
          size: file.size,
          hash,
          sessionId
        });

        stream.sendProgress('extraction', 20, '📝 Metin çıkarılıyor...');
        let text = await extractText(buf, mime);
        const density = textDensity(text);

        let ocrUsed = false;
        let fileToProcess = file;
        let ocrTextResult: string | null = null;

        // For PDFs, check text density and run OCR if needed
        if (mime === 'application/pdf') {
          const needsOCR = density < 0.25 || text.trim().length < 100;

          AILogger.info('PDF processing decision (streaming)', {
            filename: file.name,
            density,
            originalTextLength: text.length,
            needsOCR,
            reason: needsOCR ?
              (density < 0.25 ? 'Low text density' : 'Insufficient text') :
              'Sufficient text extracted'
          });

          if (needsOCR) {
            stream.sendProgress('ocr', 30, '🔍 OCR çalışıyor...');
            try {
              const ocrText = await runOCRGemini(buf);
              const ocrTextTrimmed = ocrText?.trim() || '';

              stream.sendProgress('ocr', 50, '✅ OCR tamamlandı');
            
            const wordCount = ocrTextTrimmed.split(/\s+/).filter(w => w.length > 0).length;
            
            if (ocrTextTrimmed.length > 500 || wordCount > 50) {
              ocrTextResult = ocrTextTrimmed;
              ocrUsed = true;
              const encoder = new TextEncoder();
              const encodedText = encoder.encode(ocrTextTrimmed);
              fileToProcess = new File([encodedText], file.name.replace('.pdf', '.txt'), { type: 'text/plain' });
              
              AILogger.success('OCR completed successfully', { 
                filename: file.name,
                ocrTextLength: ocrTextTrimmed.length,
                wordCount
              });
            } else {
              AILogger.warn('OCR returned insufficient text, using original extraction', {
                filename: file.name,
                ocrTextLength: ocrTextTrimmed.length,
                wordCount
              });
            }
            } catch (ocrError) {
              AILogger.error('OCR failed, using original text', {
                filename: file.name,
                error: ocrError instanceof Error ? ocrError.message : String(ocrError)
              });
              stream.sendProgress('ocr', 50, '⚠️ OCR başarısız, orijinal metin kullanılıyor');
            }
          }
        } else if (density < 0.25 && mime.startsWith('image/')) {
          // Also handle image files with OCR
          stream.sendProgress('ocr', 30, '🔍 Resim için OCR çalışıyor...');
          try {
            const ocrText = await runOCRGemini(buf);
            if (ocrText.trim().length > 100) {
              ocrTextResult = ocrText.trim();
              ocrUsed = true;
              const encoder = new TextEncoder();
              const encodedText = encoder.encode(ocrTextResult);
              fileToProcess = new File([encodedText], file.name.replace(/\.\w+$/, '.txt'), { type: 'text/plain' });
              stream.sendProgress('ocr', 50, '✅ Resim OCR başarılı');
            }
          } catch (ocrError) {
            stream.sendProgress('ocr', 50, '⚠️ Resim OCR başarısız');
          }
        }

        stream.sendProgress('extraction', 55, '🔧 İçerik ve tablolar çıkarılıyor...');
        
        const result = await buildDataPool([fileToProcess], {
          ocr_enabled: ocrUsed,
          extract_tables: true,
          extract_dates: true,
          extract_amounts: true,
          extract_entities: true,
          merge_blocks: true,
          clean_text: true,
          detect_language: false
        }, (message, progress) => {
          // Forward progress from buildDataPool - map to extraction stage (55-90% range)
          // If no progress value provided, calculate based on message content
          let actualProgress = progress;
          if (actualProgress === undefined) {
            // Estimate progress based on message content
            if (message.includes('tamamlandı') || message.includes('oluşturuldu')) {
              actualProgress = 80;
            } else if (message.includes('OCR')) {
              actualProgress = 50;
            } else if (message.includes('işlendi')) {
              actualProgress = 60;
            } else if (message.includes('işleniyor')) {
              actualProgress = 30;
            } else {
              actualProgress = 40; // Default progress for unknown messages
            }
          }
          
          const adjustedProgress = 55 + (actualProgress / 100) * 35;  // 55-90% range
          stream.sendProgress('extraction', adjustedProgress, message);
        });
        
        if (!result.success || !result.dataPool) {
          stream.sendError('PROCESSING_ERROR', 'DataPool oluşturulamadı');
          AILogger.sessionEnd(sessionId, 'failed');
          return;
        }

        const { dataPool } = result;
        dataPool.metadata.ocr_used = ocrUsed;

        // Save to DataPoolManager (optional - for caching)
        // Note: This is a temporary ID for single file processing
        // The actual analysisId will be generated during batch analysis
        const tempAnalysisId = `single_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await DataPoolManager.save(tempAnalysisId, dataPool, {
          status: 'extracting'
        });

        const duration = Date.now() - startTime;

        stream.sendProgress('complete', 100, '✅ İşlem tamamlandı');

        AILogger.success('Single file processing completed', {
          filename: file.name,
          documents: dataPool.documents.length,
          textBlocks: dataPool.textBlocks.length,
          tables: dataPool.tables.length,
          dates: dataPool.dates.length,
          amounts: dataPool.amounts.length,
          entities: dataPool.entities.length,
          ocrUsed,
          duration,
          sessionId
        });

        // LOG: Check what we're sending
        AILogger.info('Sending success response', {
          filename: file.name,
          tables: dataPool.tables?.length || 0,
          amounts: dataPool.amounts?.length || 0,
          entities: dataPool.entities?.length || 0,
          textBlocks: dataPool.textBlocks?.length || 0
        });

        // ✅ FIX: Send dataPool at top level for frontend compatibility
        stream.send({
          type: 'success',
          message: 'Dosya başarıyla işlendi',
          timestamp: Date.now(),
          data: {
            success: true,
            filename: file.name,
            hash,
            mime,
            ocrUsed,
            analysisId: tempAnalysisId,
            dataPool: dataPool, // ✅ Top-level for frontend: data.dataPool
            duration_ms: duration
          }
        });

        AILogger.sessionEnd(sessionId, 'completed');
      } catch (error) {
        AILogger.error('Single file processing error', { error, sessionId });
        AILogger.sessionEnd(sessionId, 'failed');
        
        stream.sendError(
          'UNKNOWN_ERROR',
          error instanceof Error ? error.message : 'Bilinmeyen hata oluştu'
        );
      }
    });
}

