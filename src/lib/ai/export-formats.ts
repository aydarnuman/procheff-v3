/**
 * AI-powered export format generators
 * Uses Gemini to extract clean, formatted data for TXT, CSV, JSON exports
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { cleanClaudeJSON } from './utils';
import { AILogger } from './logger';

const TXT_EXPORT_PROMPT = `Sen bir ihale ilanı parser'ısın. Sana ihalebul.com'dan gelen HTML içeriği verilecek.

Görevin: SADECE İHALE İLANI METNİNİ çıkarmak. UI elementlerini, navigasyon linklerini, butonları, "Görüntüleyen", "Takip eden", "Notlarım", "İdari Şartname", "Teknik Şartname" gibi site arayüz metinlerini TAMAMEN ATLA.

Çıkarılacak içerik:
1. İhale başlığı
2. İdare adı (kurum)
3. Tüm ihale detayları (key-value çiftleri): Kayıt No, İhale Türü, Tarih, Adres, vb.
4. İhale ilanı metni (paragraflar halinde, düzgün formatlanmış)
5. Şartlar, koşullar, açıklamalar

ATLANACAK:
- Tablolar (Mal/Hizmet Listesi) - bunlar CSV'de olacak
- UI elementleri (butonlar, linkler, navigasyon)
- "Bu ilan bilgilendirme amaçlıdır" gibi tekrar eden metinler (sadece bir kez)
- Pagination metinleri ("14 kayıttan 1 - 10 arasındaki kayıtlar gösteriliyor")
- Doküman başlıkları ("İdari Şartname", "Teknik Şartname")

Çıktı formatı: Düz metin, paragraflar arasında boş satır, key-value çiftleri düzgün formatlanmış.

Sadece temiz, okunabilir metin döndür. JSON değil, sadece metin.`;

const CSV_EXPORT_PROMPT = `Sen bir tablo parser'ısın. Sana ihalebul.com'dan gelen HTML içeriği verilecek.

Görevin: SADECE MAL/HİZMET LİSTESİ tablolarını çıkarmak.

Çıkarılacak:
- Tablo başlıkları (sütun isimleri)
- Tüm satırlar (ürün adı, miktar, birim, fiyat, vb.)

ATLANACAK:
- Key-value tabloları (2 sütunlu, az satırlı)
- UI tabloları
- Diğer tüm içerik

Çıktı formatı (JSON):
{
  "tables": [
    {
      "title": "Mal/Hizmet Listesi",
      "headers": ["Sıra No", "Ürün Adı", "Miktar", "Birim", "Birim Fiyat", "Toplam"],
      "rows": [
        ["1", "Normal Yemek", "450.000", "ADET", "15.50", "6975000.00"],
        ["2", "Normal Kahvaltı", "145.000", "ADET", "8.00", "1160000.00"]
      ]
    }
  ]
}

Sadece JSON döndür, başka hiçbir şey yazma.`;

const JSON_EXPORT_PROMPT = `Sen bir ihale parser'ısın. Sana ihalebul.com'dan gelen HTML içeriği verilecek.

Görevin: Tüm ihale bilgilerini yapılandırılmış JSON formatında çıkarmak.

Çıkarılacak:
1. title: İhale başlığı
2. organization: İdare adı
3. details: Tüm key-value çiftleri (Kayıt No, İhale Türü, Tarih, Adres, vb.)
4. tables: Tüm tablolar (başlıklar ve satırlar)
5. textContent: İhale ilanı metni (paragraflar halinde)
6. documents: Doküman listesi (varsa)

ATLANACAK:
- UI elementleri
- Navigasyon linkleri
- Butonlar
- Tekrar eden metinler

Çıktı formatı (JSON):
{
  "title": "string",
  "organization": "string",
  "details": {
    "Kayıt No": "string",
    "İhale Türü": "string",
    ...
  },
  "tables": [
    {
      "title": "string",
      "headers": ["string"],
      "rows": [["string"]]
    }
  ],
  "textContent": ["string"],
  "documents": [
    {
      "title": "string",
      "url": "string",
      "type": "string"
    }
  ]
}

Sadece JSON döndür, başka hiçbir şey yazma.`;

/**
 * Extract clean TXT format using AI
 */
export async function extractTXTWithAI(html: string): Promise<string> {
  try {
    AILogger.info('Extracting TXT format with AI', { htmlLength: html.length });

    const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    if (!googleApiKey) {
      throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY environment variable is not set');
    }

    const gemini = new GoogleGenerativeAI(googleApiKey.trim());
    const model = gemini.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8000,
      }
    });

    const prompt = `${TXT_EXPORT_PROMPT}\n\n---HTML İÇERİĞİ---\n${html.slice(0, 500000)}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const cleanText = response.text().trim();

    AILogger.success('TXT extraction completed with Gemini', {
      outputLength: cleanText.length,
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'
    });

    return cleanText;
  } catch (error: any) {
    AILogger.error('Failed to extract TXT with AI', {
      error: error.message,
      stack: error.stack,
      provider: 'Gemini'
    });
    throw error;
  }
}

/**
 * Extract clean CSV tables using AI
 */
export async function extractCSVWithAI(html: string): Promise<Array<{
  title: string;
  headers: string[];
  rows: string[][];
}>> {
  try {
    AILogger.info('Extracting CSV tables with AI', { htmlLength: html.length });

    const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    if (!googleApiKey) {
      throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY environment variable is not set');
    }

    const gemini = new GoogleGenerativeAI(googleApiKey.trim());
    const model = gemini.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8000,
      }
    });

    const prompt = `${CSV_EXPORT_PROMPT}\n\n---HTML İÇERİĞİ---\n${html.slice(0, 500000)}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const cleanedText = cleanClaudeJSON(text);
    const parsed = JSON.parse(cleanedText) as { tables: Array<{ title: string; headers: string[]; rows: string[][] }> };

    AILogger.success('CSV extraction completed with Gemini', {
      tablesCount: parsed.tables?.length || 0,
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'
    });

    return parsed.tables || [];
  } catch (error: any) {
    AILogger.error('Failed to extract CSV with AI', {
      error: error.message,
      stack: error.stack,
      provider: 'Gemini'
    });
    throw error;
  }
}

/**
 * Extract structured JSON using AI
 */
export async function extractJSONWithAI(html: string): Promise<any> {
  try {
    AILogger.info('Extracting JSON format with AI', { htmlLength: html.length });

    const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    if (!googleApiKey) {
      throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY environment variable is not set');
    }

    const gemini = new GoogleGenerativeAI(googleApiKey.trim());
    const model = gemini.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 16000,
      }
    });

    const prompt = `${JSON_EXPORT_PROMPT}\n\n---HTML İÇERİĞİ---\n${html.slice(0, 500000)}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const cleanedText = cleanClaudeJSON(text);
    const parsed = JSON.parse(cleanedText);

    AILogger.success('JSON extraction completed with Gemini', {
      hasTitle: !!parsed.title,
      hasOrganization: !!parsed.organization,
      detailsCount: Object.keys(parsed.details || {}).length,
      tablesCount: parsed.tables?.length || 0,
      textParagraphs: parsed.textContent?.length || 0,
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'
    });

    return parsed;
  } catch (error: any) {
    AILogger.error('Failed to extract JSON with AI', {
      error: error.message,
      stack: error.stack,
      provider: 'Gemini'
    });
    throw error;
  }
}

