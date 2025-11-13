/**
 * OCR Service
 * Provides multiple OCR engines with fallback support
 * - Gemini Vision (fast, quota-limited)
 * - Tesseract.js (slower, no limits)
 */

import Tesseract, { createWorker, type Worker } from 'tesseract.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AILogger } from '@/lib/ai/logger';

export type OCRProvider = 'gemini' | 'tesseract' | 'auto';
export type ProgressCallback = (message: string, progress?: number) => void;

export interface OCROptions {
  provider?: OCRProvider;
  language?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface OCRResult {
  text: string;
  provider: OCRProvider;
  confidence?: number;
  processingTime: number;
  error?: string;
}

/**
 * OCR Service Class
 */
export class OCRService {
  private static tesseractWorker: Worker | null = null;
  private static workerInitialized: boolean = false;

  /**
   * Initialize Tesseract worker (lazy loading)
   * Using WASM mode for Next.js dev/prod compatibility
   */
  private static async initTesseractWorker(language: string = 'tur+eng'): Promise<Worker> {
    if (this.tesseractWorker && this.workerInitialized) {
      return this.tesseractWorker;
    }

    AILogger.info('Initializing Tesseract worker (WASM mode)', { language });

    try {
      // ✅ Use default paths (tesseract.js handles them internally)
      this.tesseractWorker = await createWorker(language, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            AILogger.info(`Tesseract progress: ${Math.round(m.progress * 100)}%`);
          }
        },
        // ✅ Force WASM mode to prevent Node.js worker issues
        corePath: '/tesseract-core.wasm',
        workerPath: '/tesseract-worker.min.js',
        langPath: 'https://tessdata.projectnaptha.com/4.0.0'
      });
      this.workerInitialized = true;
      AILogger.info('✅ Tesseract worker initialized successfully');
      return this.tesseractWorker;
    } catch (error) {
      AILogger.error('❌ Failed to initialize Tesseract worker', { error });
      this.tesseractWorker = null;
      this.workerInitialized = false;
      throw new Error(`Tesseract worker initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Terminate Tesseract worker
   */
  static async terminateWorker(): Promise<void> {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
      this.tesseractWorker = null;
      this.workerInitialized = false;
      AILogger.info('Tesseract worker terminated');
    }
  }

  /**
   * OCR with Gemini Vision
   */
  private static async ocrWithGemini(
    imageBuffer: Buffer,
    timeout: number,
    onProgress?: ProgressCallback
  ): Promise<OCRResult> {
    const startTime = Date.now();
    
    // Defensive: Check buffer size (max 20MB for images)
    const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
    if (imageBuffer.length > MAX_IMAGE_SIZE) {
      AILogger.error('❌ Image too large for Gemini OCR', { 
        size: imageBuffer.length, 
        maxSize: MAX_IMAGE_SIZE 
      });
      return {
        text: '',
        confidence: 0,
        error: 'Image too large (>20MB)',
        provider: 'gemini',
        processingTime: 0
      };
    }
    
    try {
      onProgress?.('🔍 Gemini Vision ile OCR yapılıyor...', 0);

      const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY;
      if (!apiKey) {
        AILogger.error('❌ Gemini API key not configured', {
          env_keys: {
            GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
            GOOGLE_AI_API_KEY: !!process.env.GOOGLE_AI_API_KEY
          }
        });
        throw new Error('GOOGLE_API_KEY or GOOGLE_AI_API_KEY not configured');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        // Use an OCR-capable general vision model by default
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
      });

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Gemini OCR timeout')), timeout);
      });

      // Detect buffer type; reject PDF buffers which must be rasterized first
      const isPdf = imageBuffer.length >= 5 && imageBuffer.subarray(0, 5).toString('ascii') === '%PDF-';
      if (isPdf) {
        AILogger.warn('Gemini OCR received PDF buffer - needs rasterization first');
        return {
          text: '',
          provider: 'gemini',
          processingTime: Date.now() - startTime,
          error: 'PDF buffer provided; rasterize to image(s) before OCR'
        };
      }

      // Detect common image types for correct mime
      let mimeType: 'image/png' | 'image/jpeg' = 'image/png';
      const buf = imageBuffer;
      const isPng = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
      const isJpg = buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
      if (isJpg) mimeType = 'image/jpeg';
      else if (isPng) mimeType = 'image/png';

      // Convert buffer to base64
      const base64Image = imageBuffer.toString('base64');

      // Generate content with timeout
      const resultPromise = model.generateContent([
        {
          inlineData: {
            data: base64Image,
            mimeType,
          },
        },
        {
          text: 'Bu görüntüdeki tüm metni, tabloları ve içeriği Türkçe karakterleri koruyarak aynen çıkar. Sadece metni yaz, başka açıklama ekleme.',
        },
      ]);

      const result = await Promise.race([resultPromise, timeoutPromise]);
      const response = await result.response;
      const text = response.text();

      const processingTime = Date.now() - startTime;

      onProgress?.('✅ Gemini Vision OCR tamamlandı', 100);

      AILogger.info('✅ Gemini Vision OCR completed', {
        textLength: text.length,
        processingTime,
      });

      // Heuristic confidence based on text quality
      const confidence = computeTextQualityConfidence(text);

      return {
        text,
        provider: 'gemini',
        processingTime,
        confidence,
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      AILogger.error('❌ Gemini Vision OCR failed', { 
        error: error.message,
        errorType: error.constructor.name,
        errorCode: error.code,
        errorStatus: error.status,
        stack: error.stack?.split('\n')[0] // Only first line
      });

      return {
        text: '',
        provider: 'gemini',
        processingTime,
        error: error.message,
      };
    }
  }

  /**
   * OCR with Tesseract.js
   */
  private static async ocrWithTesseract(
    imageBuffer: Buffer,
    language: string,
    onProgress?: ProgressCallback
  ): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      onProgress?.('🔤 Tesseract ile OCR yapılıyor...', 0);

      const worker = await this.initTesseractWorker(language);

      const { data } = await worker.recognize(imageBuffer);

      const processingTime = Date.now() - startTime;

      onProgress?.('✅ Tesseract OCR tamamlandı', 100);

      AILogger.info('✅ Tesseract OCR completed', {
        textLength: data.text.length,
        confidence: data.confidence,
        processingTime,
      });

      return {
        text: data.text,
        provider: 'tesseract',
        confidence: data.confidence,
        processingTime,
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      AILogger.error('❌ Tesseract OCR failed', { error: error.message });

      return {
        text: '',
        provider: 'tesseract',
        processingTime,
        error: error.message,
      };
    }
  }

  /**
   * Main OCR function with fallback support
   */
  static async performOCR(
    imageBuffer: Buffer,
    options: OCROptions = {},
    onProgress?: ProgressCallback
  ): Promise<OCRResult> {
    const {
      provider = 'auto',
      language = 'tur+eng',
      timeout = 60000,
      maxRetries = 1,
    } = options;

    AILogger.info('Starting OCR', {
      provider,
      language,
      timeout,
      imageSize: imageBuffer.length,
    });

    // If specific provider is requested
    if (provider === 'gemini') {
      return this.ocrWithGemini(imageBuffer, timeout, onProgress);
    }

    if (provider === 'tesseract') {
      return this.ocrWithTesseract(imageBuffer, language, onProgress);
    }

    // Auto mode: Try Gemini first, fallback to Tesseract
    onProgress?.('🔄 OCR başlatılıyor (Gemini → Tesseract fallback)...', 0);

    // Try Gemini Vision first
    const geminiResult = await this.ocrWithGemini(imageBuffer, timeout, onProgress);

    // Check if Gemini was successful
    if (geminiResult.text && geminiResult.text.length > 50) {
      AILogger.info('✅ OCR completed with Gemini', {
        textLength: geminiResult.text.length,
        processingTime: geminiResult.processingTime,
      });
      return geminiResult;
    }

    // Gemini failed or returned insufficient text, fallback to Tesseract
    AILogger.warn('⚠️ Gemini OCR insufficient, falling back to Tesseract', {
      geminiError: geminiResult.error,
      geminiTextLength: geminiResult.text.length,
    });

    onProgress?.('🔄 Gemini yetersiz, Tesseract ile deneniyor...', 50);

    try {
      const tesseractResult = await this.ocrWithTesseract(imageBuffer, language, onProgress);

      // Return Tesseract result (even if failed, it will have error info)
      if (tesseractResult.text && tesseractResult.text.length > 0) {
        AILogger.info('✅ OCR completed with Tesseract fallback', {
          textLength: tesseractResult.text.length,
          confidence: tesseractResult.confidence,
          processingTime: tesseractResult.processingTime,
        });
        return tesseractResult;
      }

      // Tesseract returned empty result, return Gemini result
      AILogger.error('❌ Both OCR providers failed', {
        geminiError: geminiResult.error,
        tesseractError: tesseractResult.error,
      });

      return {
        ...geminiResult,
        error: `Both OCR providers failed. Gemini: ${geminiResult.error}, Tesseract: ${tesseractResult.error}`,
      };
    } catch (tesseractError) {
      // Tesseract completely failed - don't crash the server
      AILogger.error('❌ Tesseract fallback crashed, returning Gemini result', { tesseractError });
      
      return {
        ...geminiResult,
        error: `Gemini failed: ${geminiResult.error}. Tesseract crashed: ${tesseractError instanceof Error ? tesseractError.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Batch OCR for multiple images
   */
  static async batchOCR(
    imageBuffers: Buffer[],
    options: OCROptions = {},
    onProgress?: ProgressCallback
  ): Promise<OCRResult[]> {
    const results: OCRResult[] = [];

    for (let i = 0; i < imageBuffers.length; i++) {
      const buffer = imageBuffers[i];
      onProgress?.(`📄 ${i + 1}/${imageBuffers.length} görüntü işleniyor...`, (i / imageBuffers.length) * 100);

      const result = await this.performOCR(buffer, options, (msg, progress) => {
        onProgress?.(msg, ((i + (progress || 0) / 100) / imageBuffers.length) * 100);
      });

      results.push(result);
    }

    onProgress?.('✅ Tüm görüntüler işlendi', 100);

    return results;
  }
}

/**
 * Estimate text quality to derive a heuristic confidence (0-100).
 * This is used for providers that do not return a native confidence.
 */
function computeTextQualityConfidence(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length < 50) return 5;
  if (trimmed.length < 200) return 20;

  const total = trimmed.length;
  const alphaMatches = trimmed.match(/[A-Za-zĞÜŞİÖÇğüşiöç0-9\s]/g) || [];
  const alphaRatio = alphaMatches.length / total; // 0..1

  const turkishMatches = trimmed.match(/[ĞÜŞİÖÇğüşiöç]/g) || [];
  const turkishRatio = turkishMatches.length / Math.max(1, (trimmed.match(/[A-Za-zĞÜŞİÖÇğüşiöç]/g) || []).length);

  const words = trimmed.split(/\s+/);
  const shortWordRatio = words.length > 0 ? words.filter(w => w.length === 1).length / words.length : 0;

  const badChars = trimmed.match(/[\uFFFD\u0000-\u001F\u0080-\u009F]/g) || [];
  const badCharRatio = badChars.length / total;

  // Weighted heuristic
  let score = 50;
  score += 40 * Math.max(0, Math.min(1, alphaRatio));        // clean text density
  score += 10 * Math.max(0, Math.min(1, turkishRatio));      // language fit
  score -= 30 * Math.max(0, Math.min(1, shortWordRatio));    // too many single letters → OCR artifact
  score -= 20 * Math.max(0, Math.min(1, badCharRatio));      // broken chars

  if (words.length > 1000) score += 5; // long text likely better
  if (alphaRatio < 0.3) score -= 20;

  // Clamp 0..100
  if (score < 0) score = 0;
  if (score > 100) score = 100;
  return Math.round(score);
}

