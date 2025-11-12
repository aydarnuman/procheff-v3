/**
 * OCR fallback handler for low text density PDFs
 * Uses Gemini Vision API for text extraction
 */

import { AILogger } from './logger';

/**
 * Calculate text density for a file
 * @param file - File to analyze
 * @returns Text density ratio (0-1)
 */
export async function calculateTextDensity(file: File): Promise<number> {
  if (!file.type.includes('pdf')) {
    return 1; // Assume non-PDF files have good text density
  }

  try {
    // For PDF files, we need to extract text first
    const text = await extractTextFromPDF(file);
    
    // Calculate density based on text length vs file size
    // Rough heuristic: expect at least 100 chars per KB for good text density
    const expectedChars = (file.size / 1024) * 100;
    const actualChars = text.length;
    const density = Math.min(actualChars / expectedChars, 1);
    
    AILogger.info('Text density calculated', {
      fileName: file.name,
      fileSize: file.size,
      textLength: text.length,
      density: Math.round(density * 100) + '%'
    });
    
    return density;
  } catch (error) {
    AILogger.error('Failed to calculate text density', {
      fileName: file.name,
      error: error instanceof Error ? error.message : String(error)
    });
    return 0;
  }
}

/**
 * Extract text from PDF using basic extraction
 * @param file - PDF file
 * @returns Extracted text
 */
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Dynamic import to avoid bundling issues
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    // Extract text from first few pages for density check
    const pagesToCheck = Math.min(pdf.numPages, 3);
    
    for (let i = 1; i <= pagesToCheck; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  } catch (error) {
    AILogger.error('PDF text extraction failed', {
      fileName: file.name,
      error: error instanceof Error ? error.message : String(error)
    });
    return '';
  }
}

/**
 * Run OCR using Gemini Vision API
 * @param file - File to process with OCR
 * @returns Extracted text from OCR
 */
export async function runOCRWithGemini(file: File): Promise<string> {
  const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  
  if (!googleApiKey) {
    AILogger.warn('Gemini API key not configured for OCR');
    return '';
  }
  
  try {
    // Convert file to base64
    const base64 = await fileToBase64(file);
    
    // Dynamic import to avoid bundling issues
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    
    const genAI = new GoogleGenerativeAI(googleApiKey.trim());
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_VISION_MODEL || 'gemini-1.5-flash',
    });
    
    const prompt = `
      Bu görüntüdeki tüm metni çıkar. 
      Sadece metni ver, başka açıklama yapma.
      Tablo varsa düzenli bir formatta göster.
      Türkçe karakterlere dikkat et.
    `;
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: file.type,
          data: base64
        }
      }
    ]);
    
    const text = result.response.text();
    
    AILogger.info('OCR completed successfully', {
      fileName: file.name,
      extractedLength: text.length
    });
    
    return text;
  } catch (error) {
    AILogger.error('Gemini OCR failed', {
      fileName: file.name,
      error: error instanceof Error ? error.message : String(error)
    });
    return '';
  }
}

/**
 * Convert file to base64 string
 * @param file - File to convert
 * @returns Base64 string without data URL prefix
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Handle files with low text density
 * @param file - File to process
 * @returns Extracted text (from OCR if needed)
 */
export async function handleLowTextDensity(file: File): Promise<string> {
  const density = await calculateTextDensity(file);
  
  if (density < 0.3) {
    AILogger.info('Low text density detected, running OCR', {
      fileName: file.name,
      density: Math.round(density * 100) + '%'
    });
    
    // Run OCR
    const ocrText = await runOCRWithGemini(file);
    
    // If OCR result is also poor, rely on filename
    if (ocrText.length < 100) {
      AILogger.warn('OCR result insufficient, relying on filename for detection', {
        fileName: file.name,
        ocrLength: ocrText.length
      });
      return ''; // Return empty to trigger filename-based detection
    }
    
    return ocrText;
  }
  
  // Normal text extraction for files with good density
  if (file.type.includes('pdf')) {
    return await extractTextFromPDF(file);
  }
  
  // For text files
  if (file.type.startsWith('text/')) {
    return await file.text();
  }
  
  return '';
}

/**
 * Detect if text has OCR artifacts (broken characters, spacing issues)
 * @param text - Text to check
 * @returns true if text appears to have OCR issues
 */
export function hasOCRIssues(text: string): boolean {
  // Check for excessive spaces between characters
  const excessiveSpaces = /\w\s{2,}\w/g;
  const spaceMatches = text.match(excessiveSpaces) || [];
  
  // Check for broken UTF-8 or unusual characters
  const brokenChars = /[\uFFFD\u0000-\u001F\u0080-\u009F]/g;
  const brokenMatches = text.match(brokenChars) || [];
  
  // Check for very short words (single letters separated by spaces)
  const shortWords = text.split(/\s+/).filter(w => w.length === 1).length;
  const totalWords = text.split(/\s+/).length;
  const shortWordRatio = totalWords > 0 ? shortWords / totalWords : 0;
  
  // If more than 20% of words are single letters, likely OCR issue
  if (shortWordRatio > 0.2) {
    return true;
  }
  
  // If many excessive spaces or broken characters
  if (spaceMatches.length > 5 || brokenMatches.length > 10) {
    return true;
  }
  
  return false;
}

/**
 * Clean OCR text artifacts
 * @param text - Text to clean
 * @returns Cleaned text
 */
export function cleanOCRText(text: string): string {
  // Remove excessive spaces
  let cleaned = text.replace(/\s{2,}/g, ' ');
  
  // Fix common OCR mistakes for Turkish
  const replacements: [RegExp, string][] = [
    [/\bi\s*l\s*a\s*n/gi, 'ilan'],
    [/\bs\s*a\s*r\s*t\s*n\s*a\s*m\s*e/gi, 'şartname'],
    [/\bt\s*e\s*k\s*n\s*i\s*k/gi, 'teknik'],
    [/\bi\s*d\s*a\s*r\s*i/gi, 'idari'],
    [/\bz\s*e\s*y\s*i\s*l/gi, 'zeyil'],
    [/\bd\s*u\s*z\s*e\s*l\s*t\s*m\s*e/gi, 'düzeltme'],
  ];
  
  replacements.forEach(([pattern, replacement]) => {
    cleaned = cleaned.replace(pattern, replacement);
  });
  
  // Remove null characters and other artifacts
  cleaned = cleaned.replace(/[\u0000-\u001F\u0080-\u009F]/g, '');
  
  // Normalize whitespace again
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}
