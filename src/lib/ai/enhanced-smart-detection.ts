/**
 * Enhanced AI Smart Detection System
 * Integrates evidence-based detection with caching and Gemini AI
 */

import { AILogger } from './logger';
import { GeminiDocumentClassifier } from './gemini-document-classifier';
import { EvidenceBasedDetector, DetectionResult } from './evidence-detector';
import { getCategoryLabel } from './document-patterns';
import { normalizeText } from '@/lib/utils/normalize-utils';
import { handleLowTextDensity, hasOCRIssues, cleanOCRText } from './ocr-handler';

export interface SmartDetection {
  documentType:
    | 'İhale İlanı'
    | 'İdari Şartname'
    | 'Teknik Şartname'
    | 'Zeyilname'
    | 'Sözleşme Taslağı'
    | 'Teklif Evrakı'
    | 'Fatura'
    | 'Sözleşme'
    | 'Menü'
    | 'Rapor'
    | 'Teklif'
    | 'Diğer';
  confidence: number;
  suggestedCategory: string;
  autoTags: string[];
  language: 'TR' | 'EN' | 'OTHER';
  quality: 'Yüksek' | 'Orta' | 'Düşük';
  contentSummary?: string;
  keyEntities?: string[];
  estimatedProcessTime?: number;
  evidences?: DetectionEvidence[];
  scoreBreakdown?: {
    filename: number;
    heading: number;
    content: number;
    reference: number;
  };
}

export interface DetectionEvidence {
  type: 'filename' | 'heading' | 'content' | 'date' | 'reference';
  text: string;
  position?: number;
  confidence: number;
}

interface CachedResult {
  detection: SmartDetection;
  timestamp: number;
}

export class EnhancedSmartDetection {
  private static cache = new Map<string, CachedResult>();
  private static evidenceDetector = new EvidenceBasedDetector();
  private static readonly CACHE_TTL = 3600000; // 1 hour

  /**
   * Enhanced document detection with evidence
   */
  static async detect(
    file: File,
    firstPageText?: string
  ): Promise<SmartDetection> {
    // Generate cache key
    const cacheKey = this.getCacheKey(file, firstPageText);
    
    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      AILogger.info('Using cached detection result', { fileName: file.name });
      return cached;
    }

    // Get text sample for analysis
    const textSample = firstPageText || await this.extractTextSample(file);

    // 1. Evidence-based heuristic detection
    const evidenceResult = this.evidenceDetector.detectWithEvidence(
      file.name,
      textSample
    );

    AILogger.info('Evidence-based detection completed', {
      fileName: file.name,
      category: evidenceResult.category,
      confidence: evidenceResult.confidence,
      evidenceCount: evidenceResult.evidences.length
    });

    // 2. AI detection for low confidence or unclear cases
    let aiResult = null;
    // Calculate PATTERN MATCHING confidence (not data extraction quality)
    const patternConfidence = evidenceResult.confidence;

    // Use Gemini AI ONLY for genuinely unclear documents (confidence < 40%)
    // OR when text sample is just filename (minimal data)
    const needsAI = (patternConfidence < 40 || textSample === file.name || textSample.length < 100)
                    && textSample.length > 0;

    if (needsAI) {
      AILogger.info('Low pattern confidence or minimal text, calling Gemini AI for verification', {
        fileName: file.name,
        patternConfidence: patternConfidence,
        textLength: textSample.length,
        isFilenameOnly: textSample === file.name
      });
      aiResult = await this.callAIWithEvidence(file.name, textSample);
      if (aiResult) {
        AILogger.success('Gemini AI detection successful', {
          fileName: file.name,
          aiCategory: aiResult.category,
          aiConfidence: aiResult.confidence * 100
        });
      } else {
        AILogger.warn('Gemini AI detection returned no result', {
          fileName: file.name
        });
      }
    } else {
      AILogger.info('High confidence from evidence-based detection, skipping AI', {
        fileName: file.name,
        patternConfidence: patternConfidence
      });
    }

    // 3. Merge results
    const finalResult = this.mergeResults(file, textSample, evidenceResult, aiResult);
    
    // 4. Cache result
    this.addToCache(cacheKey, finalResult);
    
    return finalResult;
  }

  /**
   * Call AI (Gemini) for enhanced detection with evidence
   * Uses secure API endpoint to protect API keys
   */
  private static async callAIWithEvidence(
    filename: string,
    text: string
  ): Promise<{
    category: string;
    evidence: string;
    confidence: number;
    tags: string[];
  } | null> {
    try {
      const fileExtension = filename.split('.').pop() || 'unknown';

      // Call secure API endpoint instead of direct Gemini access
      const response = await fetch('/api/ai/classify-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: filename,
          textSample: text,
          fileExtension: fileExtension
        })
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.result) {
        return {
          category: data.result.documentType,
          evidence: `AI tespit: ${data.result.documentType}`,
          confidence: data.result.confidence,
          tags: data.result.tags
        };
      }

      // API returned null result (classification failed but no error)
      return null;
    } catch (error) {
      AILogger.warn('AI classification failed', {
        error: error instanceof Error ? error.message : String(error),
        fileName: filename
      });
    }
    return null;
  }

  /**
   * Merge heuristic and AI results
   * CONFIDENCE = Pattern matching confidence (how sure we are of the category)
   * QUALITY = Data extraction quality (how much text we extracted)
   */
  private static mergeResults(
    file: File,
    textSample: string,
    evidenceResult: DetectionResult,
    aiResult: any
  ): SmartDetection {
    // Start with evidence-based results for CATEGORY
    let documentType = this.mapCategoryToDocumentType(evidenceResult.category);
    let autoTags = this.generateAutoTags(file, textSample, documentType);
    let patternConfidence = evidenceResult.confidence;

    // Override with AI results if available AND AI is more confident
    if (aiResult && aiResult.confidence > 0.5) {
      const aiConfidence = aiResult.confidence * 100;

      // Only override if AI has higher confidence
      if (aiConfidence > patternConfidence) {
        AILogger.info('Using AI category (higher confidence)', {
          fileName: file.name,
          aiCategory: aiResult.category,
          aiConfidence,
          evidenceConfidence: patternConfidence
        });
        documentType = this.mapCategoryToDocumentType(aiResult.category);
        patternConfidence = aiConfidence;
      }

      autoTags = [...new Set([...autoTags, ...aiResult.tags])];

      // Add AI evidence
      evidenceResult.evidences.push({
        type: 'content',
        text: aiResult.evidence,
        confidence: aiResult.confidence
      });
    }

    // Additional analysis
    const language = this.detectLanguage(textSample);
    const quality = this.assessQuality(file, textSample);
    const keyEntities = this.extractKeyEntities(textSample);
    const estimatedProcessTime = this.estimateProcessingTime(file);

    // FINAL CONFIDENCE = Pattern matching confidence (not data quality)
    // This represents how sure we are about the document TYPE
    const finalConfidence = Math.min(patternConfidence, 100);

    AILogger.info('Final detection results', {
      fileName: file.name,
      documentType,
      patternConfidence: finalConfidence,
      dataQuality: quality,
      entityCount: keyEntities.length,
      usedAI: !!aiResult
    });

    return {
      documentType,
      confidence: finalConfidence, // Pattern matching confidence
      suggestedCategory: this.getSuggestedCategory(documentType),
      autoTags,
      language,
      quality, // Data extraction quality (separate metric)
      contentSummary: this.generateSummary(textSample),
      keyEntities,
      estimatedProcessTime,
      evidences: evidenceResult.evidences,
      scoreBreakdown: evidenceResult.score_breakdown
    };
  }


  /**
   * Map category to document type
   */
  private static mapCategoryToDocumentType(category: string): SmartDetection['documentType'] {
    const mapping: { [key: string]: SmartDetection['documentType'] } = {
      'zeyilname': 'Zeyilname',
      'zeylname': 'Zeyilname',
      'idari': 'İdari Şartname',
      'teknik': 'Teknik Şartname',
      'sozlesme': 'Sözleşme Taslağı',
      'sözleşme': 'Sözleşme Taslağı',
      'ihale': 'İhale İlanı',
      'fatura': 'Fatura',
      'menu': 'Menü',
      'menü': 'Menü',
      'rapor': 'Rapor',
      'teklif': 'Teklif',
      'personel': 'Rapor', // Personel listeleri rapor olarak sınıflandırılıyor
      'makine': 'Rapor',   // Makine listeleri rapor olarak sınıflandırılıyor
      'diğer': 'Diğer',
      'diger': 'Diğer'
    };

    return mapping[category.toLowerCase()] || 'Diğer';
  }

  /**
   * Get suggested category
   */
  private static getSuggestedCategory(documentType: SmartDetection['documentType']): string {
    const categoryMap: Record<SmartDetection['documentType'], string> = {
      'İhale İlanı': 'İhale Belgeleri',
      'İdari Şartname': 'İdari Belgeler',
      'Teknik Şartname': 'Teknik Dokümanlar',
      'Zeyilname': 'Revizyon Belgeleri',
      'Sözleşme Taslağı': 'Hukuki Belgeler',
      'Teklif Evrakı': 'Teklif Dokümanları',
      'Fatura': 'Mali Belgeler',
      'Sözleşme': 'Hukuki Belgeler',
      'Menü': 'Operasyonel Belgeler',
      'Rapor': 'Analiz Belgeleri',
      'Teklif': 'Ticari Belgeler',
      'Diğer': 'Genel Belgeler'
    };

    return categoryMap[documentType];
  }

  /**
   * Generate cache key
   */
  private static getCacheKey(file: File, text?: string): string {
    const firstKb = text?.slice(0, 1024) || '';
    return `${file.name}_${file.size}_${file.lastModified}_${normalizeText(firstKb).slice(0, 100)}`;
  }

  /**
   * Get from cache
   */
  private static getFromCache(key: string): SmartDetection | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.detection;
    }
    // Remove expired entry
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Add to cache
   */
  private static addToCache(key: string, detection: SmartDetection): void {
    this.cache.set(key, {
      detection,
      timestamp: Date.now()
    });

    // Limit cache size
    if (this.cache.size > 1000) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      entries.slice(0, 100).forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Extract text sample from file
   */
  private static async extractTextSample(file: File): Promise<string> {
    // For text files (TXT, CSV), read first 10KB
    if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
      try {
        const slice = file.slice(0, 10000);
        return await slice.text();
      } catch (error) {
        AILogger.warn('Failed to read text file', {
          fileName: file.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // For JSON files, read and parse
    if (file.type === 'application/json' || file.name.endsWith('.json')) {
      try {
        const slice = file.slice(0, 50000); // Read up to 50KB for JSON
        const text = await slice.text();
        const json = JSON.parse(text);
        // Convert JSON to searchable text
        return JSON.stringify(json, null, 2).slice(0, 10000);
      } catch (error) {
        AILogger.warn('Failed to parse JSON file', {
          fileName: file.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // For Excel/XLSX files
    if (file.type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // For now, just use filename - proper XLSX parsing would need library
      AILogger.info('XLSX file detected, using filename for detection', { fileName: file.name });
      return file.name;
    }

    // For PDFs - skip text extraction in detection phase to avoid client-side errors
    // The filename is usually sufficient for classification, and full text extraction
    // will be done server-side during the analysis phase
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      AILogger.info('PDF detected, using filename for initial detection', {
        fileName: file.name,
        fileSize: file.size
      });
      // Just return filename - evidence-based detection can work with that
      return file.name;
    }

    // For Word documents
    if (file.type.includes('document') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
      AILogger.info('Document file detected, using filename for detection', {
        fileName: file.name
      });
      return file.name;
    }

    // For images - skip OCR in detection phase
    if (file.type.includes('image')) {
      AILogger.info('Image file detected, using filename for detection', {
        fileName: file.name
      });
      return file.name;
    }

    // For other files, use file name
    return file.name;
  }

  /**
   * Detect language
   */
  private static detectLanguage(text: string): SmartDetection['language'] {
    // Turkish-specific characters
    const turkishChars = /[ğüşıöçĞÜŞİÖÇ]/g;

    // Common Turkish words (expanded list including menu-related words)
    const turkishWords = /\b(ve|veya|ile|için|olan|olarak|bu|bir|de|da|menü|yemek|çorba|salata|tatlı|günlük|haftalık|porsiyon|kahvaltı|öğle|akşam)\b/gi;

    // Turkish food-related words
    const turkishFoodWords = /\b(pilav|köfte|tavuk|et|balık|sebze|meyve|ekmek|peynir|zeytin|domates|biber|patates|soğan|sarmısak|süt|yoğurt)\b/gi;

    const turkishCharCount = (text.match(turkishChars) || []).length;
    const turkishWordCount = (text.match(turkishWords) || []).length;
    const turkishFoodWordCount = (text.match(turkishFoodWords) || []).length;

    // More lenient Turkish detection (lowered thresholds)
    if (turkishCharCount > 2 || turkishWordCount > 2 || turkishFoodWordCount > 1) {
      return 'TR';
    }

    // Check for English
    const englishWords = /\b(the|and|or|for|with|this|that|have|from|menu|food|breakfast|lunch|dinner)\b/gi;
    const englishWordCount = (text.match(englishWords) || []).length;

    if (englishWordCount > 5) {
      return 'EN';
    }

    return 'TR'; // Default to TR instead of OTHER for Turkish tender system
  }

  /**
   * Generate automatic tags
   */
  private static generateAutoTags(
    file: File,
    text: string,
    documentType: string
  ): string[] {
    const tags: string[] = [];
    
    // Add year
    const currentYear = new Date().getFullYear();
    const yearMatch = text.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      tags.push(`#${yearMatch[1]}`);
    } else {
      tags.push(`#${currentYear}`);
    }
    
    // Add quarter
    const month = new Date().getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    tags.push(`#Q${quarter}`);
    
    // Add document type tag
    if (documentType !== 'Diğer') {
      tags.push(documentType.toLowerCase().replace(/\s+/g, '-'));
    }
    
    // Add file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension && ['pdf', 'docx', 'xlsx', 'csv'].includes(extension)) {
      tags.push(extension);
    }
    
    // Add special tags based on content
    if (text.match(/acil|urgent|kritik/gi)) {
      tags.push('acil');
    }
    
    if (text.match(/onay|approved|imza/gi)) {
      tags.push('onaylı');
    }
    
    if (text.match(/taslak|draft|müsvedde/gi)) {
      tags.push('taslak');
    }

    if (text.match(/iptal|cancel/gi)) {
      tags.push('iptal');
    }

    if (text.match(/revize|revise|güncelle/gi)) {
      tags.push('revize');
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Assess document quality based on DATA EXTRACTION SUCCESS (not keyword matching)
   * Quality = How much usable data we extracted from the file
   */
  private static assessQuality(file: File, text: string): SmartDetection['quality'] {
    // Text density: characters per KB
    const textDensity = text.length / (file.size / 1024);

    // Word count
    const words = text.split(/\s+/).filter(w => w.length > 2).length;

    // Check if we only have filename (worst case - no extraction)
    if (text === file.name || text.length < 50) {
      AILogger.warn('Very low text extraction', {
        fileName: file.name,
        extractedLength: text.length
      });
      return 'Düşük';
    }

    // Calculate extraction success score (0-100)
    let extractionScore = 0;

    // 1. Text density score (40 points max)
    if (textDensity > 500) {
      extractionScore += 40; // Excellent text extraction (>500 chars/KB)
    } else if (textDensity > 200) {
      extractionScore += 30; // Good extraction (200-500 chars/KB)
    } else if (textDensity > 50) {
      extractionScore += 20; // Fair extraction (50-200 chars/KB)
    } else {
      extractionScore += 10; // Poor extraction (<50 chars/KB)
    }

    // 2. Word count score (30 points max)
    if (words > 500) {
      extractionScore += 30; // Rich content
    } else if (words > 200) {
      extractionScore += 20; // Moderate content
    } else if (words > 50) {
      extractionScore += 10; // Minimal content
    }

    // 3. Structure indicators (30 points max)
    let structureScore = 0;
    if (text.match(/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/)) structureScore += 10; // Has dates
    if (text.includes('|') || text.match(/\t/)) structureScore += 10; // Has tables
    if (text.match(/^\d+\./gm) || text.match(/^[a-zA-Z]\)/gm)) structureScore += 10; // Has lists
    extractionScore += structureScore;

    AILogger.info('Data extraction quality assessment', {
      fileName: file.name,
      textDensity: Math.round(textDensity),
      words,
      extractionScore,
      quality: extractionScore >= 70 ? 'Yüksek' : extractionScore >= 40 ? 'Orta' : 'Düşük'
    });

    // Determine quality based on extraction success
    if (extractionScore >= 70) {
      return 'Yüksek'; // 70-100: Excellent data extraction
    } else if (extractionScore >= 40) {
      return 'Orta';   // 40-69: Moderate data extraction (may have some loss)
    }

    return 'Düşük';    // 0-39: Poor data extraction (significant data loss)
  }

  /**
   * Extract key entities
   */
  private static extractKeyEntities(text: string): string[] {
    const entities: string[] = [];
    
    // Extract dates
    const datePattern = /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/g;
    const dates = text.match(datePattern) || [];
    entities.push(...dates.slice(0, 3).map(d => `tarih: ${d}`));
    
    // Extract amounts
    const amountPattern = /\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?\s*(?:TL|USD|EUR|₺|\$|€)/gi;
    const amounts = text.match(amountPattern) || [];
    entities.push(...amounts.slice(0, 3).map(a => `tutar: ${a}`));
    
    // Extract percentages
    const percentPattern = /%\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s*%/g;
    const percents = text.match(percentPattern) || [];
    entities.push(...percents.slice(0, 2));
    
    // Extract document numbers
    const docNumPattern = /(?:No|#|Sayı)[:\s]*([A-Z0-9\-/]+)/gi;
    let match;
    while ((match = docNumPattern.exec(text)) !== null && entities.length < 10) {
      entities.push(`no: ${match[1]}`);
    }

    // Extract IKN
    const iknPattern = /\b(?:ihale\s*kay[ıi]t\s*no|ikn)[:\s]*(\d+)/gi;
    const iknMatch = iknPattern.exec(text);
    if (iknMatch) {
      entities.push(`ikn: ${iknMatch[1]}`);
    }
    
    return [...new Set(entities)].slice(0, 10); // Max 10 unique entities
  }

  /**
   * Generate content summary
   */
  private static generateSummary(text: string): string {
    // Clean text
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    // Get first meaningful sentence
    const sentences = cleanText.split(/[.!?]\s+/);
    const meaningful = sentences.find(s => {
      const words = s.split(/\s+/).length;
      return words > 5 && words < 50 && !s.match(/^[\d\s\W]+$/);
    });
    
    if (meaningful) {
      return meaningful.substring(0, 150) + (meaningful.length > 150 ? '...' : '');
    }
    
    // Fallback to first 150 chars
    return cleanText.substring(0, 150) + (cleanText.length > 150 ? '...' : '');
  }

  /**
   * Estimate processing time
   */
  private static estimateProcessingTime(file: File): number {
    // Base time: 2 seconds
    let time = 2;
    
    // Add time based on size (1 second per MB)
    time += Math.ceil(file.size / (1024 * 1024));
    
    // Add time for PDFs (OCR may be needed)
    if (file.type === 'application/pdf') {
      time += 3;
    }
    
    // Add time for large files
    if (file.size > 10 * 1024 * 1024) {
      time += 5;
    }

    // Add time for Excel files (complex parsing)
    if (file.type.includes('spreadsheet') || file.name.endsWith('.xlsx')) {
      time += 2;
    }
    
    return time;
  }

  /**
   * Batch detection for multiple files
   */
  static async detectBatch(
    files: File[]
  ): Promise<Map<string, SmartDetection>> {
    const results = new Map<string, SmartDetection>();
    
    // Process files in parallel (max 5 at a time)
    const batchSize = 5;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const detections = await Promise.all(
        batch.map(file => this.detect(file))
      );
      
      batch.forEach((file, index) => {
        results.set(file.name, detections[index]);
      });
    }
    
    return results;
  }

  /**
   * Clear cache
   */
  static clearCache(): void {
    this.cache.clear();
    AILogger.info('Detection cache cleared');
  }

  /**
   * Get cache stats
   */
  static getCacheStats(): { size: number; oldestEntry: number | null } {
    if (this.cache.size === 0) {
      return { size: 0, oldestEntry: null };
    }

    const timestamps = Array.from(this.cache.values()).map(v => v.timestamp);
    return {
      size: this.cache.size,
      oldestEntry: Math.min(...timestamps)
    };
  }
}
