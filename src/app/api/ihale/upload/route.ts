import { AILogger } from "@/lib/ai/logger";
import { IHALE_ANALYSIS_PROMPT } from "@/lib/ai/prompts";
import { AIProviderFactory } from "@/lib/ai/provider-factory";
import { IHALE_ANALYSIS_SCHEMA, type IhaleAnalysisResponse } from "@/lib/ai/schemas";
import { auth } from "@/lib/auth";
import { AnalysisRepository } from "@/lib/db/analysis-repository";
import { jobManager } from "@/lib/jobs/job-manager";
import crypto from "crypto";
import { fileTypeFromBuffer } from "file-type";
import mammoth from "mammoth";
import { NextRequest, NextResponse } from "next/server";

// Dynamic import for pdf-parse (CommonJS module)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

export const config = { api: { bodyParser: false } };
export const runtime = "nodejs";

/** SHA-256 hash */
async function sha256(buf: Buffer): Promise<string> {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/** Text extraction based on MIME type */
async function extractText(buf: Buffer, mime: string): Promise<string> {
  if (mime === "application/pdf") {
    try {
      const data = await pdfParse(buf);
      return data.text;
    } catch {
      return "";
    }
  }
  if (
    mime ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const res = await mammoth.extractRawText({ buffer: buf });
    return res.value;
  }
  if (mime.startsWith("text/")) return buf.toString("utf8");
  return "";
}

/** Detect MIME type using magic bytes */
async function detectMime(buf: Buffer): Promise<string> {
  const ft = await fileTypeFromBuffer(buf);
  return ft?.mime ?? "application/octet-stream";
}

/** Calculate text density */
function textDensity(str: string): number {
  const sample = str.slice(0, 8000);
  const alpha = (sample.match(/[A-Za-zĞÜŞİÖÇğüşiöç0-9\s]/g) || []).length;
  return alpha / Math.max(1, sample.length);
}

/** OCR with multi-engine fallback support (+optional PDF rasterization) */
async function runOCRGemini(buf: Buffer): Promise<string> {
  const { OCRService } = await import('@/lib/document-processor/ocr-service');

  const provider = (process.env.OCR_PROVIDER || 'auto') as 'auto' | 'gemini' | 'tesseract';
  const language = process.env.OCR_LANGUAGE || 'tur+eng';
  const timeout = parseInt(process.env.OCR_TIMEOUT || '120000', 10);

  // Detect PDF buffer
  const isPdf = buf.length >= 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-';
  const rasterizeEnabled = (process.env.OCR_PDF_RASTERIZE || 'false').toLowerCase() === 'true';

  if (isPdf && rasterizeEnabled) {
    try {
      const dpi = parseInt(process.env.OCR_DPI || '200', 10);
      const maxPages = parseInt(process.env.OCR_MAX_PAGES || '5', 10);
      const { renderPdfToImages } = await import('@/lib/document-processor/pdf-image-renderer');
      const raster = await renderPdfToImages(buf, { dpi, maxPages });
      if (raster.images.length > 0) {
        const results = await OCRService.batchOCR(raster.images, { provider, language, timeout });
        const text = results.map(r => r.text || '').filter(t => t.length > 0).join('\n\n');
        if (text.trim().length > 0) return text;
      }
    } catch {
      // Fallback to direct performOCR below
    }
  }

  const result = await OCRService.performOCR(buf, { provider, language, timeout });
  if (result.error) {
    // Return empty to allow caller decide whether to keep original text
    return '';
  }
  return result.text;
}

/** Main POST handler */
export async function POST(req: NextRequest) {
  // Authentication check
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Defensive: Check request size limit (50MB max)
  const contentLength = req.headers.get('content-length');
  const MAX_SIZE = 50 * 1024 * 1024; // 50MB
  
  if (contentLength && parseInt(contentLength) > MAX_SIZE) {
    return NextResponse.json(
      { success: false, error: 'File too large', message: 'Dosya boyutu 50MB\'ı aşamaz' },
      { status: 413 }
    );
  }

  const jobId = crypto.randomUUID();

  try {
    // Create job
    jobManager.createJob(jobId);
    jobManager.updateJob(jobId, { status: 'processing', progress: 10 });

    // Parse multipart form data with timeout (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (error) {
      clearTimeout(timeoutId);
      jobManager.updateJob(jobId, {
        status: 'error',
        error: 'FormData parsing failed',
        progress: 0
      });
      AILogger.error('FormData parsing failed', { error, jobId });
      return NextResponse.json(
        { success: false, error: 'Invalid form data', message: 'Geçersiz dosya formatı' },
        { status: 400 }
      );
    } finally {
      clearTimeout(timeoutId);
    }
    
    const file = formData.get("file") as File;

    if (!file) {
      jobManager.updateJob(jobId, {
        status: 'error',
        error: 'Dosya bulunamadı',
        progress: 0
      });
      return NextResponse.json({ success: false, error: "Dosya bulunamadı" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const mime = await detectMime(buf);
    const hash = await sha256(buf);
    const sizeMB = (buf.byteLength / 1024 / 1024).toFixed(2);

    jobManager.updateJob(jobId, {
      progress: 20,
      metadata: {
        filename: file.name,
        filesize: buf.byteLength,
        mime_type: mime,
      },
    });

    AILogger.info("📄 Yeni ihale dokümanı alındı", {
      jobId,
      name: file.name,
      mime,
      sizeMB,
    });

    // Extract text
    jobManager.updateJob(jobId, { status: 'extract', progress: 30 });
    let text = await extractText(buf, mime);
    const density = textDensity(text);

    // Check if OCR needed
    let ocrUsed = false;
    if (mime === "application/pdf" && density < 0.25) {
      AILogger.warn("⚠️ Metin yoğunluğu düşük, Gemini Vision OCR devreye alındı", {
        jobId,
        density,
      });
      
      jobManager.updateJob(jobId, { status: 'ocr', progress: 50 });
      const ocrText = await runOCRGemini(buf);
      const wordCount = ocrText.trim().split(/\s+/).filter(Boolean).length;
      if (ocrText.trim().length > 500 || wordCount > 50) {
        text = ocrText;
        ocrUsed = true;
      } else {
        AILogger.warn("OCR metni yetersiz, orijinal extraction kullanılacak", {
          jobId,
          ocrLength: ocrText.length,
          wordCount
        });
      }
    }

    if (!text || text.trim().length < 100) {
      jobManager.updateJob(jobId, {
        status: 'error',
        error: 'Doküman metni okunamadı veya çok kısa',
        progress: 0
      });
      return NextResponse.json({
        success: false,
        error: "Doküman metni okunamadı veya çok kısa.",
      }, { status: 400 });
    }

    // 🆕 Step 1: Preprocess text (clean OCR artifacts)
    jobManager.updateJob(jobId, { status: 'preprocess', progress: 55 });
    const { preprocessPDFText, needsPreprocessing } = await import('@/lib/document-processor/pdf-cleaner');

    let processedText = text;
    let preprocessingStats;
    let extractedEntities;

    // Always preprocess for OCR'd documents or documents with potential issues
    const shouldPreprocess = ocrUsed || needsPreprocessing(text) || mime === "application/pdf";

    AILogger.info('Preprocessing decision', {
      jobId,
      ocrUsed,
      needsPreprocessing: needsPreprocessing(text),
      mime,
      shouldPreprocess
    });

    if (shouldPreprocess) {
      AILogger.info('Text needs preprocessing, cleaning...', { jobId });
      const preprocessResult = await preprocessPDFText(text, {
        removeHeaders: true,
        removeFooters: true,
        removePageNumbers: true,
        mergeHyphenatedWords: true,
        normalizeWhitespace: true,
        removeDuplicateLines: true,
        preserveTables: true,
        detectSections: true,
      });
      processedText = preprocessResult.cleanedText;
      preprocessingStats = preprocessResult.statistics;

      AILogger.success('Text preprocessing completed', {
        jobId,
        originalLength: preprocessingStats.originalLength,
        cleanedLength: preprocessingStats.cleanedLength,
        sectionsDetected: preprocessResult.sections.length,
      });

      // 🆕 Step 2: Chunk document
      jobManager.updateJob(jobId, { status: 'chunk', progress: 60 });
      const { chunkDocument } = await import('@/lib/document-processor/document-chunker');
      const chunkResult = chunkDocument(processedText, preprocessResult.sections, {
        maxChunkSize: 12000,
        minChunkSize: 2000,
        overlapSize: 500,
        chunkBySection: true,
      });

      AILogger.info('Document chunked', {
        jobId,
        totalChunks: chunkResult.chunks.length,
        avgChunkSize: chunkResult.statistics.avgChunkSize,
      });

      // 🆕 Step 3: Extract entities from chunks
      jobManager.updateJob(jobId, { status: 'extract', progress: 65 });
      const { extractEntitiesFromChunks } = await import('@/lib/document-processor/entity-extractor');
      const entities = await extractEntitiesFromChunks(chunkResult.chunks);

      AILogger.info('Entities extracted', {
        jobId,
        kurum: entities.kurum || 'not found',
        dates: entities.dates.length,
        confidence: entities.confidence,
      });

      // Combine first 2 chunks for AI analysis (to stay within token limits)
      const combinedChunks = chunkResult.chunks
        .slice(0, 2)
        .map(c => c.content)
        .join('\n\n--- BÖLÜM ---\n\n');

      processedText = combinedChunks;
    }

    // Claude analysis
    jobManager.updateJob(jobId, { status: 'analyze', progress: 70 });

    // Limit to 20000 characters for AI analysis
    const analysisText = processedText.slice(0, 20000);
    const prompt = `${IHALE_ANALYSIS_PROMPT}\n\nDOKÜMAN METNİ:\n${analysisText}`;

    // 🎯 Use structured output for guaranteed valid JSON
    const { data, metadata } = await AIProviderFactory.createStructuredMessage<IhaleAnalysisResponse>(
      prompt,
      IHALE_ANALYSIS_SCHEMA,
      {
        temperature: 0.3,
        max_tokens: 8000,
      }
    );

    AILogger.success("✅ İhale analizi tamamlandı", {
      jobId,
      kurum: data.kurum,
      duration_ms: metadata.duration_ms,
      input_tokens: metadata.input_tokens,
      output_tokens: metadata.output_tokens,
      cost_usd: metadata.cost_usd,
      ocr_used: ocrUsed,
      hash,
    });

    // Save API metrics (non-blocking)
    try {
      AnalysisRepository.saveAPIMetric({
        endpoint: "/api/ihale/upload",
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        input_tokens: metadata.input_tokens,
        output_tokens: metadata.output_tokens,
        total_tokens: metadata.total_tokens,
        cost_usd: metadata.cost_usd,
        duration_ms: metadata.duration_ms,
        success: true,
      });
    } catch (metricError) {
      AILogger.warn("Failed to save API metric", { error: metricError });
    }

    // Update job as completed
    jobManager.updateJob(jobId, {
      status: 'completed',
      progress: 100,
      result: data,
      metadata: {
        ...jobManager.getJob(jobId)?.metadata,
        ocr_used: ocrUsed,
        preprocessing_applied: !!preprocessingStats,
      },
    });

    return NextResponse.json({
      success: true,
      jobId,
      data,
      meta: {
        duration_ms: metadata.duration_ms,
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        input_tokens: metadata.input_tokens,
        output_tokens: metadata.output_tokens,
        total_tokens: metadata.total_tokens,
        cost_usd: metadata.cost_usd,
        ocr_used: ocrUsed,
        sha256: hash,
        mime_type: mime,
        preprocessing_applied: !!preprocessingStats,
        preprocessing_stats: preprocessingStats || null,
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Unknown error";
    AILogger.error("❌ İhale analizi başarısız", { jobId, error });
    
    jobManager.updateJob(jobId, {
      status: 'error',
      error,
      progress: 0
    });

    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
