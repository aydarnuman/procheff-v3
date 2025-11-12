import { cleanClaudeJSON } from './utils';
import { AILogger } from './logger';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface TenderSection {
  category: string;
  items: Array<{
    label: string;
    value: string;
  }>;
}

export interface TenderTable {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface ParsedTenderData {
  sections: TenderSection[];
  tables: TenderTable[];
  textContent: string[];
  summary?: string;
}

const PARSE_TENDER_HTML_PROMPT = `Sen bir HTML parser asistanısın. Sana ihalebul.com'dan gelen ihale detay sayfasının HTML içeriği verilecek.

**ÖNEMLİ:** UI elementlerini, navigasyon linklerini, butonları, "Görüntüleyen", "Takip eden", "Not ekle" gibi site arayüz metinlerini TAMAMEN ATLA. Sadece ihale ilanının gerçek içeriğini çıkar.

**SADECE ŞU 4 BÖLÜMÜ ÇIKAR:**

1. **İHALE BİLGİLERİ** (sections - category: "İhale Bilgileri")
   - İlan No, İhale Türü, İhale Usulü, Teklif Tarihi, Yayın Tarihi
   - Kısmi Teklif Verilebilir, Yaklaşık Maliyet Limiti
   - Toplantı Adresi, İhale Yeri
   - Tüm ihale ile ilgili key-value çiftleri

2. **İDARE BİLGİLERİ** (sections - category: "İdare Bilgileri")
   - İdare Adı, Kurum, Kuruluş
   - İletişim bilgileri (telefon, e-posta, adres)
   - İdare ile ilgili tüm bilgiler

3. **İHALE İLANI** (textContent)
   - İhale ilanının tam metni
   - Açıklamalar, şartlar, koşullar
   - Paragraflar halinde (her paragraf ayrı array elementi)
   - Sadece asıl ilan metni, döküman listesi değil

4. **MAL/HİZMET LİSTESİ** (tables)
   - "Mal/Hizmet Listesi", "Kalem Listesi", "Ürün Listesi" gibi tablolar
   - Sütun başlıkları ve tüm satırlar
   - Tablo yapısını AYNEN koru
   - Sadece mal/hizmet listesi tablolarını al, diğer tabloları atla

**ATLANACAK:**
- UI tabloları (navigasyon, menü, vb.)
- Döküman listesi (bu ayrı bir bölüm)
- "Görüntüleyen", "Takip eden" gibi UI metinleri
- Butonlar, linkler, navigasyon elementleri

Çıktı formatı (JSON):
{
  "sections": [
    {
      "category": "İhale Bilgileri",
      "items": [
        { "label": "İlan No", "value": "123456" },
        { "label": "İhale Türü", "value": "Açık İhale" },
        { "label": "Teklif Tarihi", "value": "15.01.2025" }
      ]
    },
    {
      "category": "İdare Bilgileri",
      "items": [
        { "label": "İdare Adı", "value": "Ankara Büyükşehir Belediyesi" },
        { "label": "Telefon", "value": "0312 123 45 67" }
      ]
    }
  ],
  "textContent": [
    "İhale konusu: Yemek hizmeti alımı...",
    "İhale 4734 sayılı kanun kapsamında yapılacaktır...",
    "Teknik şartnameye uygun olarak..."
  ],
  "tables": [
    {
      "title": "Mal/Hizmet Listesi",
      "headers": ["Sıra No", "Ürün Adı", "Miktar", "Birim", "Birim Fiyat", "Toplam"],
      "rows": [
        ["1", "Domates", "100", "KG", "15.50", "1,550.00"],
        ["2", "Soğan", "50", "KG", "12.00", "600.00"]
      ]
    }
  ]
}

ÖNEMLİ KURALLAR:
- SADECE yukarıdaki 4 bölümü çıkar (İhale Bilgileri, İdare Bilgileri, İhale İlanı, Mal/Hizmet Listesi)
- Diğer bilgileri dahil etme
- Tabloları sadece Mal/Hizmet Listesi için kullan
- textContent sadece ihale ilanı metni için
- Türkçe karakterleri koru
- Sadece JSON döndür`;

/**
 * Parse tender HTML with AI using Gemini Vision - supports both HTML-only and screenshot+HTML modes
 * @param html HTML content
 * @param screenshot Optional base64-encoded screenshot (image/png)
 */
export async function parseTenderHTMLWithAI(
  html: string,
  screenshot?: string
): Promise<ParsedTenderData | null> {
  try {
    AILogger.info('Starting AI-powered parsing with Gemini Vision', {
      htmlLength: html.length,
      hasScreenshot: !!screenshot
    });

    // Use Gemini Vision instead of Claude
    const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!googleApiKey) {
      console.error('❌ [CRITICAL] GOOGLE_API_KEY or GEMINI_API_KEY not configured!');
      console.error('   → Add GOOGLE_API_KEY=your-key to your .env.local file');
      console.error('   → Get your API key from: https://aistudio.google.com/app/apikey');
      throw new Error('GOOGLE_API_KEY environment variable is not set');
    }

    const gemini = new GoogleGenerativeAI(googleApiKey.trim());
    const model = gemini.getGenerativeModel({ 
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8000,
      }
    });

    // Build content array for Gemini - screenshot first if available, then text
    const contentParts: any[] = [];

    if (screenshot) {
      // Validate screenshot is a string
      if (typeof screenshot !== 'string') {
        console.error('❌ [AI PARSING] Screenshot is not a string!', {
          type: typeof screenshot,
          isArray: Array.isArray(screenshot),
          constructor: screenshot?.constructor?.name,
          value: String(screenshot).slice(0, 100)
        });
        AILogger.error('Screenshot validation failed', {
          type: typeof screenshot,
          hasScreenshot: !!screenshot
        });
        // Continue without screenshot
      } else {
        // Add screenshot as image input for Gemini Vision
        contentParts.push({
          inlineData: {
            data: screenshot,
            mimeType: 'image/png',
          },
        });
        AILogger.info('Screenshot added to Gemini Vision request', {
          screenshotLength: screenshot.length,
          preview: screenshot.slice(0, 50) + '...'
        });
      }
    }

    // Add HTML prompt and content
    const textPrompt = screenshot
      ? `${PARSE_TENDER_HTML_PROMPT}

**ÖNEMLİ:** Yukarıdaki screenshot'u kullanarak sayfanın görsel yapısını analiz et. Screenshot'taki tabloları, metinleri ve yapılandırılmış bilgileri görsel olarak oku. HTML içeriği ile birlikte kullanarak en doğru parse işlemini yap.

**Screenshot Analizi:**
- Tabloları görsel olarak oku ve yapıyı koru
- Metin formatlamasını (kalın, italik, renkler) dikkate al
- Sayfa düzenini ve bilgi hiyerarşisini anla
- UI elementlerini (butonlar, navigasyon) atla

---HTML İÇERİĞİ---
${html.slice(0, 500000)}`
      : `${PARSE_TENDER_HTML_PROMPT}\n\n---HTML İÇERİĞİ---\n${html}`;

    contentParts.push({
      text: textPrompt,
    });

    // Call Gemini Vision API
    const result = await model.generateContent(contentParts);
    const response = result.response;
    const textContent = response.text();

    // Clean and parse JSON response
    const cleanedText = cleanClaudeJSON(textContent);
    const parsed = JSON.parse(cleanedText) as ParsedTenderData;

    AILogger.success('Parsing completed successfully with Gemini Vision', {
      mode: screenshot ? 'screenshot+html' : 'html-only',
      sectionsCount: parsed.sections.length,
      tablesCount: parsed.tables?.length || 0,
      textParagraphs: parsed.textContent?.length || 0,
      totalItems: parsed.sections.reduce((sum, s) => sum + s.items.length, 0),
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'
    });

    return parsed;
  } catch (error: any) {
    // Log full error details for debugging
    const errorMessage = error?.message || String(error);
    const errorName = error?.name || 'UnknownError';
    const errorStack = error?.stack || 'No stack trace';
    
    // Check for API authentication errors (Gemini uses different error codes)
    const isAuthError = errorMessage?.includes('authentication') || 
                       errorMessage?.includes('401') ||
                       errorMessage?.includes('403') ||
                       errorMessage?.includes('API_KEY_INVALID') ||
                       errorMessage?.includes('API key not valid') ||
                       errorMessage?.includes('PERMISSION_DENIED') ||
                       errorName === 'APIError' ||
                       errorName === 'GoogleGenerativeAIError';
    
    const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    
    const errorDetails = {
      message: errorMessage,
      name: errorName,
      stack: errorStack,
      hasScreenshot: !!screenshot,
      screenshotType: screenshot ? typeof screenshot : 'none',
      screenshotLength: screenshot ? (typeof screenshot === 'string' ? screenshot.length : 'not-string') : 0,
      isAuthError,
      apiKeyConfigured: !!googleApiKey,
      apiKeyLength: googleApiKey?.length || 0,
      provider: 'Gemini Vision'
    };
    
    // Log error with proper serialization
    console.error('❌ [AI PARSING ERROR - Gemini Vision]', JSON.stringify(errorDetails, null, 2));
    
    if (isAuthError) {
      const apiKeyPreview = googleApiKey 
        ? `${googleApiKey.slice(0, 15)}...${googleApiKey.slice(-5)} (${googleApiKey.length} chars)`
        : 'NOT SET';
      
      console.error('❌ [CRITICAL] Gemini API authentication failed!');
      console.error('   → API Key Status:', googleApiKey ? 'CONFIGURED' : 'MISSING');
      console.error('   → API Key Preview:', apiKeyPreview);
      console.error('   → Error:', errorMessage);
      console.error('');
      console.error('   🔧 FIX STEPS:');
      console.error('   1. Check your .env.local file');
      console.error('   2. Verify GOOGLE_API_KEY or GEMINI_API_KEY is set');
      console.error('   3. Remove any leading/trailing spaces');
      console.error('   4. Get a new key from: https://aistudio.google.com/app/apikey');
      console.error('   5. Restart your dev server after updating .env.local');
    }
    
    AILogger.error('Failed to parse with Gemini Vision', {
      message: errorMessage,
      name: errorName,
      hasScreenshot: !!screenshot,
      isAuthError,
      apiKeyConfigured: !!googleApiKey,
      apiKeyLength: googleApiKey?.length || 0,
      provider: 'Gemini Vision'
    });
    
    return null;
  }
}
