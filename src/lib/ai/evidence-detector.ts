/**
 * Evidence-based document detection system
 * Provides detailed scoring breakdown and confidence calculation
 */

import { normalizeText, hasPattern, hasRegexPattern, normalizeFilename } from '@/lib/utils/normalize-utils';
import { 
  DOCUMENT_PATTERNS, 
  AMENDMENT_WORDS, 
  DELTA_WORDS, 
  REFERENCE_KEYWORDS,
  HEADER_PATTERNS,
  FILENAME_PATTERNS
} from './document-patterns';

/**
 * Evidence types for document detection
 */
export type EvidenceType = 'filename' | 'heading' | 'content' | 'date' | 'reference';

/**
 * Detection evidence with confidence score
 */
export interface DetectionEvidence {
  type: EvidenceType;
  text: string;
  position?: number;
  confidence: number;
}

/**
 * Detection result with evidence and scoring
 */
export interface DetectionResult {
  category: string;
  confidence: number;
  evidences: DetectionEvidence[];
  score_breakdown: {
    filename: number;
    heading: number;
    content: number;
    reference: number;
  };
}

/**
 * Evidence-based document detector
 */
export class EvidenceBasedDetector {
  /**
   * Detect document type with evidence
   */
  detectWithEvidence(filename: string, text: string): DetectionResult {
    const evidences: DetectionEvidence[] = [];
    const scoreBreakdown = {
      filename: 0,
      heading: 0,
      content: 0,
      reference: 0
    };

    // Normalize inputs
    const normalizedFilename = normalizeFilename(filename);
    const normalizedText = normalizeText(text);

    // 1. Filename analysis
    const filenameEvidence = this.analyzeFilename(filename, normalizedFilename);
    if (filenameEvidence) {
      evidences.push(filenameEvidence);
      scoreBreakdown.filename = filenameEvidence.confidence;
    }

    // 2. Header analysis (first 1500 characters)
    const headerEvidence = this.analyzeHeader(text.slice(0, 1500));
    if (headerEvidence) {
      evidences.push(headerEvidence);
      scoreBreakdown.heading = headerEvidence.confidence;
    }

    // 3. Content analysis
    const contentEvidences = this.analyzeContent(text, normalizedText);
    contentEvidences.forEach(evidence => {
      evidences.push(evidence);
      scoreBreakdown.content += evidence.confidence;
    });

    // 4. Reference analysis
    const referenceEvidence = this.analyzeReferences(text);
    if (referenceEvidence) {
      evidences.push(referenceEvidence);
      scoreBreakdown.reference = referenceEvidence.confidence;
    }

    // Calculate total score
    const totalScore = Object.values(scoreBreakdown).reduce((a, b) => a + b, 0);

    // Determine category based on evidence
    const category = this.determineCategory(evidences, totalScore);

    return {
      category,
      confidence: Math.min(Math.round(totalScore * 100), 100),
      evidences,
      score_breakdown: scoreBreakdown
    };
  }

  /**
   * Analyze filename for document type indicators
   */
  private analyzeFilename(filename: string, normalizedFilename: string): DetectionEvidence | null {
    // Check for amendment patterns first (highest priority)
    // BOOSTED confidence for clear zeyilname patterns (from 0.35 to 0.50)
    if (hasPattern(AMENDMENT_WORDS, normalizedFilename)) {
      return {
        type: 'filename',
        text: `Dosya adı: "${filename}" (Zeyilname tespit edildi)`,
        confidence: 0.50
      };
    }

    // Check other document type patterns with category info
    // BOOSTED confidence for clear filename patterns (from 0.30 to 0.45)
    for (const [docType, pattern] of Object.entries(FILENAME_PATTERNS)) {
      if (pattern.test(normalizedFilename)) {
        return {
          type: 'filename',
          text: `Dosya adı: "${filename}" (${docType} tespit edildi)`,
          confidence: 0.45
        };
      }
    }

    return null;
  }

  /**
   * Analyze document header for type indicators
   */
  private analyzeHeader(headerText: string): DetectionEvidence | null {
    const normalizedHeader = normalizeText(headerText);

    // Check header patterns - BOOSTED confidence for clear headers
    for (const [docType, pattern] of Object.entries(HEADER_PATTERNS)) {
      const match = headerText.match(pattern);
      if (match) {
        return {
          type: 'heading',
          text: match[0].trim(),
          position: match.index,
          confidence: docType === 'zeylname' ? 0.40 : 0.35  // Boosted from 0.30/0.25
        };
      }
    }

    // Check for amendment words in header
    const amendmentMatch = this.findAmendmentInHeader(headerText, normalizedHeader);
    if (amendmentMatch) {
      return amendmentMatch;
    }

    return null;
  }

  /**
   * Find amendment indicators in header
   */
  private findAmendmentInHeader(text: string, normalizedText: string): DetectionEvidence | null {
    // Look for strong amendment indicators in header
    const strongPatterns = [
      /^\s*zey[il]+(name)?\s*$/im,
      /^\s*d[üu]zeltme\s*ilan[ıi]?\s*$/im,
      /^\s*ek\s*ilan\s*$/im,
      /^\s*addendum\s*$/im,
      /^\s*amendment\s*$/im
    ];

    for (const pattern of strongPatterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          type: 'heading',
          text: match[0].trim(),
          position: match.index,
          confidence: 0.40  // Boosted from 0.30
        };
      }
    }

    return null;
  }

  /**
   * Analyze document content for type indicators
   */
  private analyzeContent(text: string, normalizedText: string): DetectionEvidence[] {
    const evidences: DetectionEvidence[] = [];

    // 1. Check for date patterns and delta words
    const dates = this.extractDates(text);
    const hasDelta = hasPattern(DELTA_WORDS, normalizedText);

    if (dates.length >= 2 && hasDelta) {
      // Find delta words for evidence
      const deltaMatch = this.findFirstMatch(DELTA_WORDS, text);
      evidences.push({
        type: 'content',
        text: `${dates.length} tarih + değişiklik ifadesi: "${deltaMatch}"`,
        confidence: 0.30  // Boosted from 0.25 - strong zeyilname indicator
      });
    }

    // 2. Check for amendment content patterns
    const amendmentContent = this.findAmendmentContent(text, normalizedText);
    if (amendmentContent && !evidences.some(e => e.type === 'content')) {
      evidences.push(amendmentContent);
    }

    // 3. Check for document-specific content
    const specificContent = this.findSpecificContent(text, normalizedText);
    specificContent.forEach(evidence => {
      if (!evidences.some(e => e.text === evidence.text)) {
        evidences.push(evidence);
      }
    });

    return evidences;
  }

  /**
   * Find amendment-specific content
   */
  private findAmendmentContent(text: string, normalizedText: string): DetectionEvidence | null {
    // Look for patterns like "önceki ilanda", "değişiklik yapılmıştır", etc.
    const amendmentPatterns = [
      /önceki\s+ilan(da)?/i,
      /değişiklik\s+yapılmıştır/i,
      /iptal\s+edilmiştir/i,
      /ertelenmiştir/i,
      /güncellen?miştir/i,
      /revize\s+edilmiştir/i,
      /tadil\s+edilmiştir/i
    ];

    for (const pattern of amendmentPatterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          type: 'content',
          text: match[0],
          position: match.index,
          confidence: 0.30  // Boosted from 0.20 - strong zeyilname phrase
        };
      }
    }

    return null;
  }

  /**
   * Find document-specific content patterns
   */
  private findSpecificContent(text: string, normalizedText: string): DetectionEvidence[] {
    const evidences: DetectionEvidence[] = [];

    // Check for tender/procurement content (HIGHEST PRIORITY)
    let ihaleScore = 0;
    const ihalePatterns = [
      /\b(ihale|kamu\s*ihale|kamu\s*alımı|ihalesi|ihalesine)\b/gi,
      /\b(yemek|gıda|catering|iaşe)\s*(hizmeti|alınacaktır|alımı)\b/gi,
      /\bikn[:\s]*\d{7}/gi,
      /\b(ihale\s*kayıt\s*no|ilan\s*no|dosya\s*no)\b/gi,
      /\b(son\s*başvuru|son\s*teklif|ihale\s*tarihi)\b/gi,
      /\b(tahmini\s*bedel|yaklaşık\s*maliyet|muhammen\s*bedel)\b/gi,
      /\b(geçici\s*teminat|kesin\s*teminat)\b/gi
    ];

    ihalePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        ihaleScore += matches.length * 0.10; // Each match adds significant confidence
      }
    });

    if (ihaleScore > 0) {
      evidences.push({
        type: 'content',
        text: 'İhale/Kamu alımı içeriği tespit edildi',
        confidence: Math.min(ihaleScore, 0.50) // Cap at 0.50 for tender content
      });
    }

    // Enhanced menu detection with multiple checks (LOWER PRIORITY)
    let menuScore = 0;
    const menuPatterns = [
      /\b(menü|yemek\s*listesi|günlük\s*menü|haftalık\s*menü)\b/gi,
      /\b(kahvaltı|öğle\s*yemeği|akşam\s*yemeği)\b/gi,
      /\b(çorba|salata|ana\s*yemek|tatlı|meyve)\b/gi,
      /\b(porsiyon|kişilik|gram|kalori)\b/gi,
      /\b(pilav|köfte|tavuk|et\s*yemeği|balık|sebze)\b/gi,
      /\b(pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar)\b/gi
    ];

    menuPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        menuScore += matches.length * 0.05; // Reduced from 0.08
      }
    });

    // Only consider menu if no tender evidence found
    if (menuScore > 0 && ihaleScore === 0) {
      evidences.push({
        type: 'content',
        text: 'Yemek menüsü içeriği tespit edildi',
        confidence: Math.min(menuScore, 0.30) // Reduced cap from 0.40
      });
    }

    // Check for technical specifications
    if (/teknik\s+(özellik|şart|detay)/i.test(text)) {
      evidences.push({
        type: 'content',
        text: 'Teknik özellikler içeriği',
        confidence: 0.20
      });
    }

    // Check for administrative content
    if (/idari\s+(husus|şart|hüküm)/i.test(text)) {
      evidences.push({
        type: 'content',
        text: 'İdari hükümler içeriği',
        confidence: 0.20
      });
    }

    return evidences;
  }

  /**
   * Analyze references (IKN, tender numbers, etc.)
   */
  private analyzeReferences(text: string): DetectionEvidence | null {
    // Look for tender reference patterns
    const referencePatterns = [
      /\b(ihale\s*kay[ıi]t\s*no|ikn)\s*[:\-]?\s*(\d{4,})\b/i,
      /\bilan\s*no\s*[:\-]?\s*(\d+)\b/i,
      /\btender\s*no\s*[:\-]?\s*(\w+)\b/i,
      /\breferans\s*no\s*[:\-]?\s*(\w+)\b/i
    ];

    for (const pattern of referencePatterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          type: 'reference',
          text: match[0],
          position: match.index,
          confidence: 0.10
        };
      }
    }

    return null;
  }

  /**
   * Extract dates from text
   */
  private extractDates(text: string): string[] {
    const datePattern = /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g;
    return text.match(datePattern) || [];
  }

  /**
   * Find first matching pattern in text
   */
  private findFirstMatch(patterns: string[], text: string): string {
    const normalizedText = normalizeText(text);
    for (const pattern of patterns) {
      const regex = new RegExp(`\\b${pattern}\\b`, 'i');
      const match = normalizedText.match(regex);
      if (match) {
        // Find original text
        const originalMatch = text.match(new RegExp(pattern, 'i'));
        return originalMatch ? originalMatch[0] : match[0];
      }
    }
    return '';
  }

  /**
   * Determine document category based on evidence
   */
  private determineCategory(evidences: DetectionEvidence[], totalScore: number): string {
    // Check for specific document types based on evidence
    const categoryScores: { [key: string]: number } = {};

    evidences.forEach(evidence => {
      // Analyze evidence text for category indicators
      const text = evidence.text.toLowerCase();

      // Direct category detection from filename evidence
      if (evidence.type === 'filename') {
        // Extract category from "(category tespit edildi)" format
        const match = text.match(/\((.*?)\s+tespit\s+edildi\)/);
        if (match) {
          const category = match[1];
          categoryScores[category] = (categoryScores[category] || 0) + evidence.confidence;
        }
      }

      // Keyword-based category detection
      if (text.includes('zeyl') || text.includes('düzeltme') || text.includes('değişiklik')) {
        categoryScores.zeyilname = (categoryScores.zeyilname || 0) + evidence.confidence;
      }
      if (text.includes('idari') || text.includes('administrative')) {
        categoryScores.idari = (categoryScores.idari || 0) + evidence.confidence;
      }
      if (text.includes('teknik') || text.includes('technical')) {
        categoryScores.teknik = (categoryScores.teknik || 0) + evidence.confidence;
      }
      if (text.includes('sözleşme') || text.includes('sozlesme') || text.includes('contract')) {
        categoryScores.sozlesme = (categoryScores.sozlesme || 0) + evidence.confidence;
      }
      if (text.includes('menü') || text.includes('menu') || text.includes('yemek')) {
        categoryScores.menu = (categoryScores.menu || 0) + evidence.confidence;
      }
      if (text.includes('fatura') || text.includes('invoice')) {
        categoryScores.fatura = (categoryScores.fatura || 0) + evidence.confidence;
      }
      if (text.includes('personel') || text.includes('cetvel') || text.includes('kadro')) {
        categoryScores.personel = (categoryScores.personel || 0) + evidence.confidence;
      }
      if (text.includes('makine') || text.includes('ekipman') || text.includes('araç')) {
        categoryScores.makine = (categoryScores.makine || 0) + evidence.confidence;
      }
      if (text.includes('rapor') || text.includes('report')) {
        categoryScores.rapor = (categoryScores.rapor || 0) + evidence.confidence;
      }
      if (text.includes('teklif') || text.includes('proposal')) {
        categoryScores.teklif = (categoryScores.teklif || 0) + evidence.confidence;
      }
      if (text.includes('ihale') || text.includes('ilan') || text.includes('tender')) {
        categoryScores.ihale = (categoryScores.ihale || 0) + evidence.confidence;
      }
    });

    // Find category with highest score
    let bestCategory = 'diğer';
    let bestScore = 0;

    for (const [category, score] of Object.entries(categoryScores)) {
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    // Require minimum confidence for categorization (lowered from 0.2 to 0.15)
    if (bestScore < 0.15) {
      return 'diğer';
    }

    return bestCategory;
  }
}
