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
async function detectMime(buf: Buffer): Promise<string> {
  const ft = await fileTypeFromBuffer(buf);
  return ft?.mime ?? 'application/octet-stream';
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
  if (mime.startsWith('text/')) return buf.toString('utf8');
  return '';
}

/** Calculate text density */
function textDensity(str: string): number {
  const sample = str.slice(0, 8000);
  const alpha = (sample.match(/[A-Za-zĞÜŞİÖÇğüşiöç0-9\s]/g) || []).length;
  return alpha / Math.max(1, sample.length);
}

/** Gemini 2.0 Vision OCR - Always runs for PDFs */
async function runOCRGemini(buf: Buffer): Promise<string> {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY not configured');
  }

  const gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = gemini.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  const img = {
    inlineData: {
      data: buf.toString('base64'),
      mimeType: 'application/pdf',
    },
  };

  // Add timeout for OCR (60 seconds)
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('OCR timeout: 60 seconds exceeded')), 60000);
  });

  const ocrPromise = model.generateContent([
    {
      inlineData: img.inlineData,
    },
    {
      text: 'Bu görsel/dokümandaki metni UTF-8 düz metin olarak çıkar. Ek yorum ekleme.',
    },
  ]).then(result => result.response.text());

  const result = await Promise.race([ocrPromise, timeoutPromise]);
  return result;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const sessionId = `process-single_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
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
    
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      AILogger.sessionEnd(sessionId, 'failed');
      return NextResponse.json(
        { error: 'No file provided', message: 'Lütfen bir dosya seçin' },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const mime = await detectMime(buf);
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

    // Step 2: Always run OCR for PDFs (user requested)
    let ocrUsed = false;
    let fileToProcess = file;
    let ocrTextResult: string | null = null;
    
    if (mime === 'application/pdf') {
      AILogger.info('Running OCR for PDF', { filename: file.name, density, originalTextLength: text.length });
      
      try {
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
          error: ocrError instanceof Error ? ocrError.message : String(ocrError)
        });
        // Continue with original file
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
        const mime = await detectMime(buf);
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
        
        if (mime === 'application/pdf') {
          stream.sendProgress('ocr', 30, '🔍 OCR çalışıyor...');
          AILogger.info('Running OCR for PDF', { filename: file.name, density, originalTextLength: text.length });
          
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

        stream.sendProgress('datapool', 60, '🔧 DataPool oluşturuluyor...');
        
        // Add realistic delay based on file size
        const processingDelay = Math.min(500 + (file.size / 1024), 3000); // 0.5-3 seconds
        await new Promise(resolve => setTimeout(resolve, processingDelay));
        
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
          // Forward progress from buildDataPool
          const adjustedProgress = 60 + (progress || 0) * 0.3; // 60-90% range
          stream.sendProgress('datapool', adjustedProgress, message);
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
          success: true,
          filename: file.name,
          hash,
          mime,
          ocrUsed,
          analysisId: tempAnalysisId,
          dataPool: dataPool, // ✅ Top-level for frontend: data.dataPool
          duration_ms: duration,
          message: 'Dosya başarıyla işlendi',
          timestamp: Date.now()
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

