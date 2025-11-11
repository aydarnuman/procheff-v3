import { AIProviderFactory } from './provider-factory';
import { cleanClaudeJSON } from './utils';
import { AILogger } from './logger';

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

Görevin HTML içeriğini 3 kategoriye ayırmak:

1. **TABLOLAR** (tables): HTML'deki tüm <table> elementlerini bul
   - Her tablo için başlık (title), sütun başlıkları (headers) ve satırları (rows) çıkar
   - Tablo yapısını AYNEN koru

2. **KEY-VALUE BİLGİLER** (sections): Tablo olmayan ama yapılandırılmış bilgiler
   - "İlan No: 123456" gibi key-value çiftleri
   - Mantıklı kategorilere ayır (Genel Bilgiler, İdare, Tarih/Saat vb.)

3. **METİN İÇERİK** (textContent): Paragraflar, açıklamalar, uzun metinler
   - Her paragrafı ayrı array elementi olarak
   - Boş paragrafları dahil etme

Çıktı formatı (JSON):
{
  "tables": [
    {
      "title": "Tablo Başlığı veya İçerik Özeti",
      "headers": ["Sütun 1", "Sütun 2", "Sütun 3"],
      "rows": [
        ["Değer 1.1", "Değer 1.2", "Değer 1.3"],
        ["Değer 2.1", "Değer 2.2", "Değer 2.3"]
      ]
    }
  ],
  "sections": [
    {
      "category": "Genel Bilgiler",
      "items": [
        { "label": "İlan No", "value": "123456" },
        { "label": "İhale Türü", "value": "Açık İhale" }
      ]
    }
  ],
  "textContent": [
    "İhale konusu: Yemek hizmeti alımı...",
    "İhale 4734 sayılı kanun kapsamında yapılacaktır..."
  ],
  "summary": "İhalenin kısa özeti (1-2 cümle)"
}

ÖNEMLİ KURALLAR:
- VERİ KAYBI OLMAMALI - HTML'deki HER BİLGİ yukarıdaki 3 kategoriden birine girmeli
- Tabloları tablolara, metinleri metinlere, key-value'ları sections'a koy
- Boş alanları dahil etme
- Türkçe karakterleri koru
- Sadece JSON döndür`;

export async function parseTenderHTMLWithAI(html: string): Promise<ParsedTenderData | null> {
  try {
    AILogger.info('Starting AI-powered HTML parsing', {
      htmlLength: html.length
    });

    const client = AIProviderFactory.getClaude();

    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: `${PARSE_TENDER_HTML_PROMPT}\n\n---HTML İÇERİĞİ---\n${html}`
        }
      ]
    });

    const textContent = response.content[0];
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const cleanedText = cleanClaudeJSON(textContent.text);
    const parsed = JSON.parse(cleanedText) as ParsedTenderData;

    AILogger.success('HTML parsed successfully with AI', {
      sectionsCount: parsed.sections.length,
      tablesCount: parsed.tables?.length || 0,
      textParagraphs: parsed.textContent?.length || 0,
      totalItems: parsed.sections.reduce((sum, s) => sum + s.items.length, 0),
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens
    });

    return parsed;
  } catch (error: any) {
    AILogger.error('Failed to parse HTML with AI', {
      error: error.message,
      stack: error.stack
    });
    return null;
  }
}
