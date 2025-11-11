/**
 * Parser for extracting dates, amounts, and entities from text
 */

import type {
  ExtractedDate,
  ExtractedAmount,
  ExtractedEntity,
  DateKind,
  AmountKind,
  EntityKind
} from './types';

/**
 * Turkish date patterns
 */
const DATE_PATTERNS = [
  // DD.MM.YYYY HH:mm
  /(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(?:saat\s+)?(\d{1,2})[:\.](\d{2})/gi,
  // DD/MM/YYYY HH:mm
  /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(?:saat\s+)?(\d{1,2}):(\d{2})/gi,
  // DD.MM.YYYY
  /(\d{1,2})\.(\d{1,2})\.(\d{4})/gi,
  // DD/MM/YYYY
  /(\d{1,2})\/(\d{1,2})\/(\d{4})/gi,
  // DD Month YYYY
  /(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+(\d{4})/gi,
];

const MONTH_MAP: Record<string, string> = {
  'Ocak': '01', 'Şubat': '02', 'Mart': '03', 'Nisan': '04',
  'Mayıs': '05', 'Haziran': '06', 'Temmuz': '07', 'Ağustos': '08',
  'Eylül': '09', 'Ekim': '10', 'Kasım': '11', 'Aralık': '12'
};

/**
 * Extract dates from text
 */
export function extractDates(text: string, sourceRef: string): ExtractedDate[] {
  const dates: ExtractedDate[] = [];
  const foundDates = new Set<string>();

  // Keywords for date context
  const contexts = {
    'ihale tarihi': 'ihale_tarihi',
    'son teklif': 'son_teklif',
    'teklif verme': 'son_teklif',
    'başvuru tarihi': 'son_teklif',
    'sözleşme başlangıç': 'sozlesme_baslangic',
    'işe başlama': 'sozlesme_baslangic',
    'teslim tarihi': 'teslim',
    'yayın tarihi': 'yayin',
    'ilan tarihi': 'yayin'
  };

  for (const pattern of DATE_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      try {
        let isoDate: string;
        const original = match[0];

        if (match.length === 6) {
          // With time: DD.MM.YYYY HH:mm
          const [, day, month, year, hour, minute] = match;
          isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00+03:00`;
        } else if (match.length === 4) {
          // Date only
          if (MONTH_MAP[match[2]]) {
            // DD Month YYYY
            const [, day, monthName, year] = match;
            const month = MONTH_MAP[monthName];
            isoDate = `${year}-${month}-${day.padStart(2, '0')}`;
          } else {
            // DD.MM.YYYY or DD/MM/YYYY
            const [, day, month, year] = match;
            isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        } else {
          continue;
        }

        // Skip duplicates
        if (foundDates.has(isoDate)) continue;
        foundDates.add(isoDate);

        // Determine date kind from context
        let kind: DateKind = 'diger';
        const contextWindow = text.substring(Math.max(0, match.index - 50), match.index + 50).toLowerCase();

        for (const [keyword, dateKind] of Object.entries(contexts)) {
          if (contextWindow.includes(keyword)) {
            kind = dateKind as DateKind;
            break;
          }
        }

        dates.push({
          kind,
          value: isoDate,
          source: sourceRef,
          original: original,
          confidence: 0.9
        });
      } catch (error) {
        // Skip invalid dates
        continue;
      }
    }
  }

  return dates;
}

/**
 * Extract amounts (money, quantities, percentages)
 */
export function extractAmounts(text: string, sourceRef: string): ExtractedAmount[] {
  const amounts: ExtractedAmount[] = [];

  // Turkish number format: 1.234.567,89
  const MONEY_PATTERN = /([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?)\s*(TL|₺|TRY|EUR|€|USD|\$)/gi;
  const PERCENTAGE_PATTERN = /(%\s*[0-9]+(?:[,.][0-9]+)?|[0-9]+(?:[,.][0-9]+)?\s*%)/gi;
  const QUANTITY_PATTERN = /([0-9]+(?:\.[0-9]{3})*(?:,[0-9]+)?)\s*(kişi|gün|öğün|porsiyon|adet|kg|gr|lt|ml)\b/gi;

  // Extract money amounts
  let match;
  while ((match = MONEY_PATTERN.exec(text)) !== null) {
    const [original, numberStr, currency] = match;
    const value = parseFloat(numberStr.replace(/\./g, '').replace(',', '.'));

    // Determine kind from context
    let kind: AmountKind = 'tahmini_bedel';
    const contextWindow = text.substring(Math.max(0, match.index - 100), match.index).toLowerCase();

    if (contextWindow.includes('geçici teminat')) {
      kind = 'gecici_teminat';
    } else if (contextWindow.includes('kesin teminat')) {
      kind = 'kesin_teminat';
    } else if (contextWindow.includes('yaklaşık maliyet') || contextWindow.includes('tahmini bedel')) {
      kind = 'tahmini_bedel';
    }

    amounts.push({
      kind,
      value,
      currency: currency.replace('₺', 'TRY').replace('$', 'USD').replace('€', 'EUR'),
      source: sourceRef,
      original
    });
  }

  // Extract quantities
  while ((match = QUANTITY_PATTERN.exec(text)) !== null) {
    const [original, numberStr, unit] = match;
    const value = parseFloat(numberStr.replace(/\./g, '').replace(',', '.'));

    let kind: AmountKind;
    switch (unit.toLowerCase()) {
      case 'kişi':
        kind = 'kisi_sayisi';
        break;
      case 'gün':
        kind = 'gun_sayisi';
        break;
      case 'öğün':
        kind = 'ogun_sayisi';
        break;
      case 'porsiyon':
        kind = 'porsiyon';
        break;
      case 'kg':
      case 'gr':
        kind = 'gramaj';
        break;
      default:
        kind = 'porsiyon';
    }

    amounts.push({
      kind,
      value,
      unit,
      source: sourceRef,
      original
    });
  }

  // Extract percentages
  while ((match = PERCENTAGE_PATTERN.exec(text)) !== null) {
    const original = match[0];
    const value = parseFloat(original.replace('%', '').replace(',', '.').trim());

    // Check if it's a penalty rate
    const contextWindow = text.substring(Math.max(0, match.index - 100), match.index + 100).toLowerCase();
    if (contextWindow.includes('ceza') || contextWindow.includes('gecikme')) {
      amounts.push({
        kind: 'ceza_orani',
        value,
        unit: '%',
        source: sourceRef,
        original
      });
    }
  }

  return amounts;
}

/**
 * Extract entities (organizations, addresses, contacts)
 */
export function extractEntities(text: string, sourceRef: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  // IKN pattern
  const IKN_PATTERN = /(?:İhale Kayıt No|IKN|İKN)\s*:?\s*([0-9]{4,})/gi;

  // İlan No pattern
  const ILAN_PATTERN = /(?:İlan No|İlan Numarası)\s*:?\s*([0-9\/\-]+)/gi;

  // Email pattern
  const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  // Phone pattern (Turkish)
  const PHONE_PATTERN = /(?:\+90|0)?(?:\s*\(?(?:212|216|312|232|224|262|264|322|342|352|362|382|384|414|422|424|432|434|442|462|472|482|484|488)[)\s*]?)[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}/g;

  // Extract IKN
  let match;
  while ((match = IKN_PATTERN.exec(text)) !== null) {
    entities.push({
      kind: 'ikn',
      value: match[1],
      source: sourceRef,
      confidence: 0.95
    });
  }

  // Extract İlan No
  while ((match = ILAN_PATTERN.exec(text)) !== null) {
    entities.push({
      kind: 'ilan_no',
      value: match[1],
      source: sourceRef,
      confidence: 0.95
    });
  }

  // Extract emails
  while ((match = EMAIL_PATTERN.exec(text)) !== null) {
    entities.push({
      kind: 'email',
      value: match[0],
      normalized: match[0].toLowerCase(),
      source: sourceRef,
      confidence: 0.98
    });
  }

  // Extract phones
  while ((match = PHONE_PATTERN.exec(text)) !== null) {
    const phone = match[0];
    const normalized = phone.replace(/[^\d]/g, '');
    entities.push({
      kind: 'telefon',
      value: phone,
      normalized: normalized,
      source: sourceRef,
      confidence: 0.9
    });
  }

  // Extract organization names (heuristic)
  const orgPatterns = [
    /(?:Kurum|İdare|Üniversite|Hastane|Belediye)[:\s]+([A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)*)/g,
    /([A-ZÇĞİÖŞÜ]{2,}(?:\s+[A-ZÇĞİÖŞÜ]{2,})*)\s+(?:Üniversitesi|Hastanesi|Belediyesi|Müdürlüğü|Başkanlığı)/g
  ];

  for (const pattern of orgPatterns) {
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        kind: 'kurum',
        value: match[1] || match[0],
        source: sourceRef,
        confidence: 0.7
      });
    }
  }

  return entities;
}

/**
 * Parse menu items from tables
 */
export interface MenuItem {
  name: string;
  category?: string;
  portion?: number;
  unit?: string;
  frequency?: string;
}

export function parseMenuFromTable(
  headers: string[],
  rows: string[][]
): MenuItem[] {
  const items: MenuItem[] = [];

  // Detect column indices
  const nameCol = headers.findIndex(h =>
    h.toLowerCase().includes('yemek') ||
    h.toLowerCase().includes('ürün') ||
    h.toLowerCase().includes('malzeme')
  );

  const portionCol = headers.findIndex(h =>
    h.toLowerCase().includes('miktar') ||
    h.toLowerCase().includes('porsiyon') ||
    h.toLowerCase().includes('gramaj')
  );

  const unitCol = headers.findIndex(h =>
    h.toLowerCase().includes('birim')
  );

  if (nameCol === -1) return items;

  for (const row of rows) {
    if (row.length > nameCol && row[nameCol]) {
      const item: MenuItem = {
        name: row[nameCol].trim()
      };

      if (portionCol !== -1 && row[portionCol]) {
        const portionStr = row[portionCol].replace(',', '.');
        const portion = parseFloat(portionStr);
        if (!isNaN(portion)) {
          item.portion = portion;
        }
      }

      if (unitCol !== -1 && row[unitCol]) {
        item.unit = row[unitCol].trim();
      }

      items.push(item);
    }
  }

  return items;
}