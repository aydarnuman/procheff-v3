/**
 * AI Smart Detection System
 * Dosya tipini ve içeriğini otomatik tanıma
 */

import { AILogger } from './logger';
import { GeminiDocumentClassifier } from './gemini-document-classifier';
import { EnhancedSmartDetection as EnhancedDetector } from './enhanced-smart-detection';

// Import types for usage
import type { SmartDetection, DetectionEvidence } from './enhanced-smart-detection';

// Re-export enhanced detection as primary detector
export { EnhancedSmartDetection as AIDocumentDetector } from './enhanced-smart-detection';
export type { SmartDetection, DetectionEvidence } from './enhanced-smart-detection';

// Legacy interface for backward compatibility
export interface SmartDetectionLegacy {
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
  estimatedProcessTime?: number; // seconds
}

// Legacy detector - kept for backward compatibility if needed
export class LegacyDocumentDetector {
  // Keywords for document type detection
  private static readonly TYPE_KEYWORDS = {
    'Fatura': [
      'fatura', 'invoice', 'kdv', 'vergi no', 'matrah', 'toplam tutar',
      'fatura no', 'fatura tarihi', 'vade', 'ödeme'
    ],
    'Sözleşme': [
      'sözleşme', 'contract', 'madde', 'taraflar', 'yüklenici', 'imza',
      'taahhüt', 'şartlar', 'hükümler', 'fesih'
    ],
    'Teknik Şartname': [
      'teknik', 'şartname', 'özellikler', 'standart', 'spesifikasyon',
      'gereksinim', 'kriter', 'ölçüt', 'tolerans', 'test'
    ],
    'Menü': [
      'menü', 'yemek', 'kahvaltı', 'öğle', 'akşam', 'porsiyon',
      'kalori', 'gram', 'kişi başı', 'günlük', 'haftalık'
    ],
    'Rapor': [
      'rapor', 'analiz', 'değerlendirme', 'sonuç', 'bulgu',
      'öneri', 'inceleme', 'tespit', 'gözlem', 'yorum'
    ],
    'Teklif': [
      'teklif', 'fiyat', 'birim fiyat', 'iskonto', 'vade',
      'teslimat', 'ödeme koşul', 'geçerlilik', 'opsiyon'
    ]
  };

  // Category mapping
  private static readonly CATEGORY_MAP: Record<string, string> = {
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

  /**
   * Detect document type and properties using AI
   */
  static async detect(
    file: File,
    firstPageText?: string
  ): Promise<SmartDetectionLegacy> {
    // Get text sample for analysis
    const textSample = firstPageText || await this.extractTextSample(file);
    
    let documentType = this.detectDocumentType(textSample);
    
    // Detect language
    const language = this.detectLanguage(textSample);
    
    let autoTags = this.generateAutoTags(file, textSample, documentType);
    
    // Assess quality
    const quality = this.assessQuality(file, textSample);
    
    // Extract key entities
    const keyEntities = this.extractKeyEntities(textSample);
    
    // Estimate processing time
    const estimatedProcessTime = this.estimateProcessingTime(file);
    
    let confidence = this.calculateConfidence(textSample, documentType);

    if (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) {
      try {
        const geminiResult = await GeminiDocumentClassifier.classify({
          fileName: file.name,
          fileExtension: file.name.split('.').pop() || file.type.split('/').pop() || 'bin',
          textSample,
        });

        if (geminiResult) {
          documentType = this.normalizeDocumentType(geminiResult.documentType) ?? documentType;
          confidence = Math.max(confidence, geminiResult.confidence);
          autoTags = Array.from(new Set([...autoTags, ...geminiResult.tags]));
        }
      } catch (error) {
        AILogger.warn('Gemini classification failed, using heuristic detection', {
          error,
          fileName: file.name,
        });
      }
    }
    
    return {
      documentType,
      confidence,
      suggestedCategory: this.CATEGORY_MAP[documentType],
      autoTags,
      language,
      quality,
      contentSummary: this.generateSummary(textSample),
      keyEntities,
      estimatedProcessTime
    };
  }

  /**
   * Extract text sample from file
   */
  private static async extractTextSample(file: File): Promise<string> {
    // For text files, read first 5KB
    if (file.type.startsWith('text/')) {
      const slice = file.slice(0, 5000);
      return await slice.text();
    }
    
    // For other files, use file name and metadata
    return file.name;
  }

  /**
   * Detect document type based on keywords
   */
  private static detectDocumentType(text: string): SmartDetectionLegacy['documentType'] {
    const lowerText = text.toLowerCase();
    const scores: Record<string, number> = {};
    
    // Calculate scores for each type
    for (const [type, keywords] of Object.entries(this.TYPE_KEYWORDS)) {
      scores[type] = keywords.reduce((score, keyword) => {
        const occurrences = (lowerText.match(new RegExp(keyword, 'gi')) || []).length;
        return score + occurrences;
      }, 0);
    }
    
    // Find type with highest score
    let maxScore = 0;
    let detectedType: SmartDetectionLegacy['documentType'] = 'Diğer';
    
    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedType = type as SmartDetectionLegacy['documentType'];
      }
    }
    
    // If no clear match, return 'Diğer'
    if (maxScore < 3) {
      return 'Diğer';
    }
    
    return detectedType;
  }

  /**
   * Detect language
   */
  private static detectLanguage(text: string): SmartDetectionLegacy['language'] {
    const turkishChars = /[ğüşıöçĞÜŞİÖÇ]/g;
    const turkishWords = /\b(ve|veya|ile|için|olan|olarak|bu|bir|de|da)\b/gi;
    
    const turkishCharCount = (text.match(turkishChars) || []).length;
    const turkishWordCount = (text.match(turkishWords) || []).length;
    
    if (turkishCharCount > 5 || turkishWordCount > 3) {
      return 'TR';
    }
    
    // Check for English
    const englishWords = /\b(the|and|or|for|with|this|that|have|from)\b/gi;
    const englishWordCount = (text.match(englishWords) || []).length;
    
    if (englishWordCount > 5) {
      return 'EN';
    }
    
    return 'OTHER';
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
      tags.push(yearMatch[1]);
    } else {
      tags.push(currentYear.toString());
    }
    
    // Add quarter
    const month = new Date().getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    tags.push(`Q${quarter}`);
    
    // Add document type tag
    tags.push(documentType);
    
    // Add file extension
    const extension = file.name.split('.').pop()?.toUpperCase();
    if (extension) {
      tags.push(extension);
    }
    
    // Add size category
    if (file.size < 1024 * 1024) {
      tags.push('Küçük');
    } else if (file.size < 10 * 1024 * 1024) {
      tags.push('Orta');
    } else {
      tags.push('Büyük');
    }
    
    // Add special tags based on content
    if (text.match(/acil|urgent|kritik/gi)) {
      tags.push('Acil');
    }
    
    if (text.match(/onay|approved|imza/gi)) {
      tags.push('Onaylı');
    }
    
    if (text.match(/taslak|draft|müsvedde/gi)) {
      tags.push('Taslak');
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Assess document quality
   */
  private static assessQuality(file: File, text: string): SmartDetectionLegacy['quality'] {
    let qualityScore = 0;
    
    // Check file size (optimal: 100KB - 5MB)
    if (file.size > 100 * 1024 && file.size < 5 * 1024 * 1024) {
      qualityScore += 2;
    }
    
    // Check text density
    const words = text.split(/\s+/).length;
    if (words > 100) {
      qualityScore += 2;
    }
    
    // Check for structure (headers, sections)
    if (text.match(/^#+\s/gm) || text.match(/^\d+\./gm)) {
      qualityScore += 1;
    }
    
    // Check for tables
    if (text.includes('|') || text.match(/\t/)) {
      qualityScore += 1;
    }
    
    // Determine quality level
    if (qualityScore >= 5) {
      return 'Yüksek';
    } else if (qualityScore >= 3) {
      return 'Orta';
    }
    
    return 'Düşük';
  }

  /**
   * Extract key entities
   */
  private static extractKeyEntities(text: string): string[] {
    const entities: string[] = [];
    
    // Extract dates
    const datePattern = /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/g;
    const dates = text.match(datePattern) || [];
    entities.push(...dates.slice(0, 3));
    
    // Extract amounts
    const amountPattern = /\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?\s*(?:TL|USD|EUR|₺|\$|€)/gi;
    const amounts = text.match(amountPattern) || [];
    entities.push(...amounts.slice(0, 3));
    
    // Extract percentages
    const percentPattern = /%\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s*%/g;
    const percents = text.match(percentPattern) || [];
    entities.push(...percents.slice(0, 2));
    
    // Extract document numbers
    const docNumPattern = /(?:No|#|Sayı)[:\s]*([A-Z0-9\-/]+)/gi;
    let match;
    while ((match = docNumPattern.exec(text)) !== null && entities.length < 10) {
      entities.push(match[1]);
    }
    
    return [...new Set(entities)].slice(0, 10); // Max 10 unique entities
  }

  /**
   * Generate content summary
   */
  private static generateSummary(text: string): string {
    // Get first meaningful sentence
    const sentences = text.split(/[.!?]\s+/);
    const meaningful = sentences.find(s => s.length > 30 && s.length < 200);
    
    if (meaningful) {
      return meaningful.substring(0, 150) + (meaningful.length > 150 ? '...' : '');
    }
    
    // Fallback to first 150 chars
    return text.substring(0, 150) + (text.length > 150 ? '...' : '');
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
    
    return time;
  }

  /**
   * Calculate confidence score
   */
  private static calculateConfidence(text: string, documentType: string): number {
    if (documentType === 'Diğer') {
      return 0.3;
    }
    
    const keywords = this.TYPE_KEYWORDS[documentType as keyof typeof this.TYPE_KEYWORDS] || [];
    const lowerText = text.toLowerCase();
    
    let matchCount = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        matchCount++;
      }
    }
    
    // Calculate confidence (0.5 to 1.0)
    const confidence = Math.min(0.5 + (matchCount * 0.1), 1.0);
    
    return Math.round(confidence * 100) / 100;
  }

  private static normalizeDocumentType(value: string): SmartDetectionLegacy['documentType'] | null {
    const normalized = value.toLowerCase().replace(/["']/g, '').trim();
    if (normalized.includes('ilan')) return 'İhale İlanı';
    if (normalized.includes('idari')) return 'İdari Şartname';
    if (normalized.includes('teknik')) return 'Teknik Şartname';
    if (normalized.includes('zeyil')) return 'Zeyilname';
    if (normalized.includes('taslak') || normalized.includes('sozlesme taslag') || normalized.includes('sözleşme tasla')) return 'Sözleşme Taslağı';
    if (normalized.includes('sozlesme') || normalized.includes('sözleşme')) return 'Sözleşme';
    if (normalized.includes('teklif')) return 'Teklif Evrakı';
    if (normalized.includes('fatura')) return 'Fatura';
    if (normalized.includes('menu')) return 'Menü';
    if (normalized.includes('rapor')) return 'Rapor';
    return null;
  }

  /**
   * Batch detection for multiple files
   */
  static async detectBatch(
    files: File[]
  ): Promise<Map<string, SmartDetectionLegacy>> {
    const results = new Map<string, SmartDetectionLegacy>();
    
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
}
