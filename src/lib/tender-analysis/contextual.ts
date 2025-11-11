/**
 * Contextual Analysis Engine
 * Analyzes tender documents for risks, opportunities, and operational requirements
 */

import type {
  ContextualAnalysis,
  ExtractedFields,
  SourcedStatement
} from './types';
import type { DataPool } from '@/lib/document-processor/types';
import { AIProviderFactory } from '@/lib/ai/provider-factory';
import { cleanClaudeJSON } from '@/lib/ai/utils';
import { AILogger } from '@/lib/ai/logger';

/**
 * Extract basic fields from data pool
 */
export async function extractBasicFields(dataPool: DataPool): Promise<ExtractedFields> {
  const fields: ExtractedFields = {};

  // Extract organization from entities
  const kurumEntity = dataPool.entities.find(e => e.kind === 'kurum');
  if (kurumEntity) {
    fields.kurum = kurumEntity.value;
  }

  // Extract IKN
  const iknEntity = dataPool.entities.find(e => e.kind === 'ikn');
  if (iknEntity) {
    fields.ikn = iknEntity.value;
  }

  // Extract dates
  const ihaleDate = dataPool.dates.find(d => d.kind === 'ihale_tarihi');
  if (ihaleDate) {
    fields.ihale_tarihi = new Date(ihaleDate.value);
  }

  const sozlesmeDate = dataPool.dates.find(d => d.kind === 'sozlesme_baslangic');
  if (sozlesmeDate) {
    fields.sozlesme_baslangic = new Date(sozlesmeDate.value);
  }

  // Extract amounts
  const budget = dataPool.amounts.find(a => a.kind === 'tahmini_bedel');
  if (budget) {
    fields.tahmini_butce = budget.value;
  }

  const kisiSayisi = dataPool.amounts.find(a => a.kind === 'kisi_sayisi');
  if (kisiSayisi) {
    fields.kisi_sayisi = kisiSayisi.value;
  }

  const gunSayisi = dataPool.amounts.find(a => a.kind === 'gun_sayisi');
  if (gunSayisi) {
    fields.gun_sayisi = gunSayisi.value;
  }

  const ogunSayisi = dataPool.amounts.find(a => a.kind === 'ogun_sayisi');
  if (ogunSayisi) {
    fields.ogun_sayisi = ogunSayisi.value;
  }

  // Extract tender type from text
  const tenderTypePatterns = [
    { pattern: /hizmet alımı/i, value: 'hizmet_alimi' },
    { pattern: /mal alımı/i, value: 'mal_alimi' },
    { pattern: /yapım işi/i, value: 'yapim_isi' },
    { pattern: /yemek hizmeti/i, value: 'yemek_hizmeti' },
    { pattern: /catering/i, value: 'catering' }
  ];

  for (const textBlock of dataPool.textBlocks) {
    for (const { pattern, value } of tenderTypePatterns) {
      if (pattern.test(textBlock.text)) {
        fields.ihale_turu = value;
        break;
      }
    }
    if (fields.ihale_turu) break;
  }

  // Extract penalty clauses
  fields.cezai_sartlar = extractPenaltyClauses(dataPool);

  return fields;
}

/**
 * Extract penalty clauses from text
 */
function extractPenaltyClauses(dataPool: DataPool): SourcedStatement[] {
  const penalties: SourcedStatement[] = [];
  const penaltyKeywords = ['ceza', 'gecikme', 'tazminat', 'kesinti', 'müeyyide'];

  for (const block of dataPool.textBlocks) {
    const lowerText = block.text.toLowerCase();

    if (penaltyKeywords.some(keyword => lowerText.includes(keyword))) {
      // Extract sentences containing penalty information
      const sentences = block.text.split(/[.!?]+/);

      for (const sentence of sentences) {
        if (penaltyKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
          penalties.push({
            text: sentence.trim(),
            source_ref: [block.block_id],
            confidence: 0.9,
            context: block.text.substring(0, 200)
          });
        }
      }
    }
  }

  return penalties;
}

/**
 * Perform contextual analysis using AI
 */
export async function performContextualAnalysis(
  dataPool: DataPool,
  extractedFields: ExtractedFields
): Promise<ContextualAnalysis> {
  const startTime = Date.now();

  try {
    AILogger.info('Starting contextual analysis', {
      documents: dataPool.documents.length,
      textBlocks: dataPool.textBlocks.length,
      extractedFields: Object.keys(extractedFields)
    });

    // Prepare context for AI
    const context = prepareContextForAI(dataPool, extractedFields);

    // Call AI for analysis
    const client = AIProviderFactory.getClaude();
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: createContextualPrompt(context)
        }
      ]
    });

    // Parse response
    const responseText = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    const cleanedJSON = cleanClaudeJSON(responseText);
    const analysis = JSON.parse(cleanedJSON) as ContextualAnalysis;

    AILogger.success('Contextual analysis completed', {
      duration: Date.now() - startTime,
      riskLevel: analysis.operasyonel_riskler.seviye,
      score: analysis.genel_degerlendirme.puan
    });

    return analysis;

  } catch (error) {
    AILogger.error('Contextual analysis failed', { error });

    // Return default analysis on error
    return createDefaultAnalysis();
  }
}

/**
 * Prepare context for AI analysis
 */
function prepareContextForAI(
  dataPool: DataPool,
  extractedFields: ExtractedFields
): string {
  let context = '## EXTRACTED FIELDS:\n';
  context += JSON.stringify(extractedFields, null, 2) + '\n\n';

  // Add key text blocks
  context += '## KEY TEXT BLOCKS:\n';
  const keyBlocks = dataPool.textBlocks
    .filter(block => {
      const text = block.text.toLowerCase();
      return text.includes('şart') ||
             text.includes('ceza') ||
             text.includes('personel') ||
             text.includes('ekipman') ||
             text.includes('teslim') ||
             text.includes('risk');
    })
    .slice(0, 10);

  for (const block of keyBlocks) {
    context += `[${block.block_id}]: ${block.text.substring(0, 300)}...\n\n`;
  }

  // Add tables summary
  if (dataPool.tables.length > 0) {
    context += '## TABLES:\n';
    for (const table of dataPool.tables.slice(0, 5)) {
      context += `[${table.table_id}]: ${table.headers.join(' | ')}\n`;
      context += `Rows: ${table.rows.length}\n\n`;
    }
  }

  return context;
}

/**
 * Create contextual analysis prompt
 */
function createContextualPrompt(context: string): string {
  return `Sen bir ihale uzmanısın. Verilen ihale dokümanlarını analiz ederek risk ve fırsat değerlendirmesi yapacaksın.

${context}

Lütfen aşağıdaki analizleri yap:

1. OPERASYONEL RİSKLER:
   - Personel yönetimi riskleri
   - Ekipman/altyapı riskleri
   - Lojistik riskler
   - Seviye: 'dusuk' | 'orta' | 'yuksek'

2. MALİYET SAPMA OLASILIĞI:
   - Fiyat artışı riskleri
   - Gizli maliyetler
   - Sapma oranı (0-1 arası)

3. ZAMAN UYGUNLUĞU:
   - Hazırlık süresi yeterliliği
   - Kritik tarihler
   - Yeterli mi: true/false

4. PERSONEL GEREKSİNİMİ:
   - Tahmini personel sayısı
   - Kritik pozisyonlar

5. EKİPMAN İHTİYACI:
   - Gerekli kritik ekipmanlar
   - Tahmini maliyet

6. GENEL DEĞERLENDİRME:
   - Puan (0-100)
   - Özet
   - Öneriler

Her tespit için mutlaka kaynak referansı belirt (örn: "A:12" veya "T1").

Yanıtını şu JSON formatında ver:

{
  "operasyonel_riskler": {
    "seviye": "orta",
    "nedenler": [
      {
        "text": "1800 kişilik yemek hizmeti büyük ölçekli operasyon gerektirir",
        "source_ref": ["A:12", "T1"],
        "confidence": 0.9
      }
    ],
    "skor": 65,
    "onlemler": ["Deneyimli personel istihdamı", "Yedek ekipman bulundurma"]
  },
  "maliyet_sapma_olasiligi": {
    "oran": 0.25,
    "faktorler": [
      {
        "text": "Enflasyon ve döviz kuru riski",
        "source_ref": ["B:5"],
        "confidence": 0.8
      }
    ]
  },
  "zaman_uygunlugu": {
    "yeterli": true,
    "gun_analizi": [
      {
        "text": "İhale tarihi ile başlangıç arası 45 gün var",
        "source_ref": ["A:23"],
        "confidence": 0.95
      }
    ],
    "kritik_tarihler": [
      {
        "tarih": "2024-01-15",
        "aciklama": "Sözleşme başlangıç tarihi",
        "kaynak": "A:23"
      }
    ]
  },
  "personel_gereksinimi": {
    "tahmini_sayi": 25,
    "detay": [
      {
        "text": "3 vardiya için minimum 25 personel gerekli",
        "source_ref": ["calculated"],
        "confidence": 0.85
      }
    ],
    "kritik_pozisyonlar": ["Aşçıbaşı", "Gıda Mühendisi", "Depo Sorumlusu"]
  },
  "ekipman_ihtiyaci": {
    "kritik_ekipmanlar": ["Endüstriyel mutfak ekipmanları", "Soğuk hava deposu"],
    "tahmini_maliyet": 500000,
    "kaynak": [
      {
        "text": "Teknik şartnamede belirtilen ekipman listesi",
        "source_ref": ["C:45"],
        "confidence": 0.9
      }
    ]
  },
  "genel_degerlendirme": {
    "puan": 72,
    "ozet": "Orta ölçekli riskler içeren, dikkatli planlama gerektiren ihale",
    "oneriler": [
      "Detaylı maliyet analizi yapılmalı",
      "Personel planlaması önceden tamamlanmalı",
      "Ekipman kiralama alternatifleri değerlendirilmeli"
    ]
  }
}`;
}

/**
 * Create default analysis for fallback
 */
function createDefaultAnalysis(): ContextualAnalysis {
  return {
    operasyonel_riskler: {
      seviye: 'orta',
      nedenler: [{
        text: 'Detaylı analiz için yeterli veri bulunamadı',
        source_ref: [],
        confidence: 0.3
      }],
      skor: 50,
      onlemler: []
    },
    maliyet_sapma_olasiligi: {
      oran: 0.5,
      faktorler: []
    },
    zaman_uygunlugu: {
      yeterli: false,
      gun_analizi: [],
      kritik_tarihler: []
    },
    personel_gereksinimi: {
      tahmini_sayi: 0,
      detay: [],
      kritik_pozisyonlar: []
    },
    ekipman_ihtiyaci: {
      kritik_ekipmanlar: [],
      kaynak: []
    },
    genel_degerlendirme: {
      puan: 0,
      ozet: 'Analiz tamamlanamadı',
      oneriler: []
    }
  };
}