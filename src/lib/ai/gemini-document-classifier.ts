import { GoogleGenerativeAI } from '@google/generative-ai';
import { cleanClaudeJSON } from './utils';
import { AILogger } from './logger';

export interface GeminiClassificationResult {
  documentType: string;
  confidence: number;
  tags: string[];
}

const DEFAULT_PROMPT = `
You are an expert Turkish public procurement (kamu ihale) document classifier specializing in tender document analysis.

INPUT:
- file_name: the document file name
- text_sample: a UTF-8 text excerpt (up to ~5 KB) from the document
- file_extension: extension (pdf, docx, csv, txt, xlsx, etc.)

CLASSIFICATION CATEGORIES:
1. "Zeyilname" (HIGHEST PRIORITY - Amendment/Revision)
   - Keywords: zeylname, zeyil, düzeltme, değişiklik, ek ilan, revize, güncelleme, iptal, erteleme, addendum, amendment
   - Structure: References to previous announcement, date changes, cancellations
   - Context: "önceki ilanda", "değişiklik yapılmıştır", "ertelenmiştir"

2. "İhale İlanı" (Tender Announcement)
   - Keywords: ihale, kamu alımı, ilan, duyuru, tender
   - Structure: IKN (İhale Kayıt No), bidding dates, budget info
   - Context: Formal procurement announcement

3. "İdari Şartname" (Administrative Specifications)
   - Keywords: idari, idari şartname, administrative, şartlar, hükümler
   - Structure: Legal terms, payment conditions, administrative procedures

4. "Teknik Şartname" (Technical Specifications)
   - Keywords: teknik, teknik şartname, technical, özellikler, spesifikasyon
   - Structure: Technical requirements, standards, measurements

5. "Sözleşme Taslağı" (Contract Draft)
   - Keywords: sözleşme, sozlesme, contract, taslak, draft, madde, hükümler
   - Structure: Article-based legal document with party definitions

6. "Teklif Evrakı" (Proposal/Bid Documents)
   - Keywords: teklif, fiyat teklifi, bid, proposal
   - Structure: Pricing tables, offer forms

7. "Diğer" (Other)
   - Use when document doesn't clearly match any category above

DETECTION RULES:
1. **Zeyilname Detection (Critical):**
   - If filename contains "zeyl", "zeyil", "düzeltme", "ek_ilan" → ALWAYS classify as Zeyilname (confidence ≥ 0.9)
   - If text contains amendment phrases like "önceki ilanda", "değişiklik yapılmıştır" → Zeyilname (confidence ≥ 0.85)
   - Zeyilname takes precedence over other categories

2. **Context-Aware Classification:**
   - Consider both filename AND content
   - Turkish characters (ğ, ü, ş, ı, ö, ç) indicate Turkish document
   - Look for structural indicators (dates, reference numbers, sections)

3. **Confidence Scoring:**
   - 0.9-1.0: Very strong evidence (filename + content match)
   - 0.7-0.9: Strong evidence (clear keywords and structure)
   - 0.5-0.7: Moderate evidence (some keywords present)
   - 0.3-0.5: Weak evidence (ambiguous content)
   - 0.0-0.3: No clear evidence (default to "Diğer")

OUTPUT FORMAT (strictly valid JSON):
{
  "documentType": "one of the 7 categories above",
  "confidence": number between 0 and 1,
  "tags": [array of 2-5 short lowercase descriptive tags]
}

TAGS EXAMPLES:
- For Zeyilname: ["zeyilname", "değişiklik", "tarih güncelleme", "2025"]
- For İhale İlanı: ["ihale", "kamu alımı", "yemek hizmeti", "2025-q1"]
- For Teknik Şartname: ["teknik", "özellikler", "kalite standartları"]

IMPORTANT:
- Zeyilname detection is CRITICAL - prioritize it over all other categories
- Be conservative: if uncertain between categories, use "Diğer" with lower confidence
- Output ONLY valid JSON, no markdown formatting or extra text
`;

export class GeminiDocumentClassifier {
  private static instance: ReturnType<typeof GoogleGenerativeAI.prototype.getGenerativeModel> | null = null;

  private static getModel() {
    if (this.instance) return this.instance;

    // Server-side only: API key is never exposed to browser
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY environment variable is required for Gemini classification.');
    }

    const gemini = new GoogleGenerativeAI(apiKey.trim());
    this.instance = gemini.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
      generationConfig: {
        temperature: 0.15,
        maxOutputTokens: 512,
      },
    });

    return this.instance;
  }

  static async classify(params: {
    fileName: string;
    textSample: string;
    fileExtension: string;
  }): Promise<GeminiClassificationResult | null> {
    try {
      const model = this.getModel();
      const prompt = `${DEFAULT_PROMPT}\n\nINPUT:\n${JSON.stringify({
        file_name: params.fileName,
        file_extension: params.fileExtension,
        text_sample: params.textSample?.slice(0, 5000) || '',
      })}`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text().trim();

      const cleaned = cleanClaudeJSON(text);
      const parsed = JSON.parse(cleaned) as {
        documentType?: string;
        confidence?: number;
        tags?: string[];
      };

      if (!parsed.documentType) {
        throw new Error('Gemini response missing documentType');
      }

      return {
        documentType: parsed.documentType,
        confidence: Math.min(Math.max(parsed.confidence ?? 0.5, 0), 1),
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8).map(tag => tag.toLowerCase()) : [],
      };
    } catch (error: any) {
      AILogger.warn('Gemini classification failed, falling back to heuristic detection', {
        error: error?.message || String(error),
      });
      return null;
    }
  }
}
