/**
 * Entity Extraction Module
 * Extract structured entities from preprocessed document chunks
 *
 * Extracts:
 * - Kurum (institution)
 * - İhale numarası (tender number)
 * - Tarihler (dates)
 * - Bütçe/fiyat (budget/price)
 * - Kişi sayısı (participant count)
 * - Yetkili (authorized person)
 * - Lokasyon (location)
 * - Özel şartlar (special conditions)
 */

import { AILogger } from '@/lib/ai/logger';
import { DocumentChunk } from './document-chunker';

export interface ExtractedEntities {
  kurum?: string;
  ihale_no?: string;
  dates: ExtractedDate[];
  budget?: string;
  participant_count?: number;
  authorized_person?: string;
  location?: string;
  special_conditions: string[];
  keywords: string[];
  confidence: number;
}

export interface ExtractedDate {
  type: 'ilan' | 'son_teklif' | 'ihale' | 'other';
  date: string;
  rawText: string;
}

/**
 * Extract entities from document chunks
 */
export async function extractEntitiesFromChunks(
  chunks: DocumentChunk[]
): Promise<ExtractedEntities> {
  AILogger.info('Starting entity extraction', { totalChunks: chunks.length });

  const allEntities: Partial<ExtractedEntities>[] = [];

  // Extract from each chunk
  for (const chunk of chunks) {
    const entities = extractFromChunk(chunk);
    allEntities.push(entities);
  }

  // Aggregate results
  const aggregated = aggregateEntities(allEntities);

  AILogger.success('Entity extraction completed', {
    kurum: aggregated.kurum || 'not found',
    dates: aggregated.dates.length,
    conditions: aggregated.special_conditions.length,
    confidence: aggregated.confidence,
  });

  return aggregated;
}

/**
 * Extract entities from a single chunk
 */
function extractFromChunk(chunk: DocumentChunk): Partial<ExtractedEntities> {
  const text = chunk.content;
  const entities: Partial<ExtractedEntities> = {
    dates: [],
    special_conditions: [],
    keywords: [],
  };

  // Extract kurum (institution)
  const kurumMatch = extractKurum(text);
  if (kurumMatch) entities.kurum = kurumMatch;

  // Extract ihale numarası
  const ihaleNoMatch = extractIhaleNo(text);
  if (ihaleNoMatch) entities.ihale_no = ihaleNoMatch;

  // Extract dates
  entities.dates = extractDates(text);

  // Extract budget
  const budgetMatch = extractBudget(text);
  if (budgetMatch) entities.budget = budgetMatch;

  // Extract participant count
  const participantMatch = extractParticipantCount(text);
  if (participantMatch) entities.participant_count = participantMatch;

  // Extract authorized person
  const authorizedMatch = extractAuthorizedPerson(text);
  if (authorizedMatch) entities.authorized_person = authorizedMatch;

  // Extract location
  const locationMatch = extractLocation(text);
  if (locationMatch) entities.location = locationMatch;

  // Extract special conditions
  entities.special_conditions = extractSpecialConditions(text);

  // Extract keywords
  entities.keywords = extractKeywords(text);

  return entities;
}

/**
 * Aggregate entities from multiple chunks
 */
function aggregateEntities(allEntities: Partial<ExtractedEntities>[]): ExtractedEntities {
  const aggregated: ExtractedEntities = {
    dates: [],
    special_conditions: [],
    keywords: [],
    confidence: 0,
  };

  // Find most common kurum
  const kurumCounts = new Map<string, number>();
  allEntities.forEach(e => {
    if (e.kurum) {
      kurumCounts.set(e.kurum, (kurumCounts.get(e.kurum) || 0) + 1);
    }
  });
  if (kurumCounts.size > 0) {
    aggregated.kurum = Array.from(kurumCounts.entries()).sort((a, b) => b[1] - a[1])[0][0];
  }

  // Find most common ihale_no
  const ihaleNoCounts = new Map<string, number>();
  allEntities.forEach(e => {
    if (e.ihale_no) {
      ihaleNoCounts.set(e.ihale_no, (ihaleNoCounts.get(e.ihale_no) || 0) + 1);
    }
  });
  if (ihaleNoCounts.size > 0) {
    aggregated.ihale_no = Array.from(ihaleNoCounts.entries()).sort((a, b) => b[1] - a[1])[0][0];
  }

  // Aggregate dates (deduplicate)
  const dateSet = new Set<string>();
  allEntities.forEach(e => {
    e.dates?.forEach(d => {
      const key = `${d.type}:${d.date}`;
      if (!dateSet.has(key)) {
        dateSet.add(key);
        aggregated.dates.push(d);
      }
    });
  });

  // Sort dates chronologically
  aggregated.dates.sort((a, b) => {
    const dateA = parseDate(a.date);
    const dateB = parseDate(b.date);
    return dateA.getTime() - dateB.getTime();
  });

  // Take first budget found
  for (const e of allEntities) {
    if (e.budget) {
      aggregated.budget = e.budget;
      break;
    }
  }

  // Take first participant count found
  for (const e of allEntities) {
    if (e.participant_count) {
      aggregated.participant_count = e.participant_count;
      break;
    }
  }

  // Take first authorized person found
  for (const e of allEntities) {
    if (e.authorized_person) {
      aggregated.authorized_person = e.authorized_person;
      break;
    }
  }

  // Take first location found
  for (const e of allEntities) {
    if (e.location) {
      aggregated.location = e.location;
      break;
    }
  }

  // Aggregate special conditions (deduplicate)
  const conditionSet = new Set<string>();
  allEntities.forEach(e => {
    e.special_conditions?.forEach(c => conditionSet.add(c));
  });
  aggregated.special_conditions = Array.from(conditionSet);

  // Aggregate keywords (deduplicate, take top 20)
  const keywordCounts = new Map<string, number>();
  allEntities.forEach(e => {
    e.keywords?.forEach(k => {
      keywordCounts.set(k, (keywordCounts.get(k) || 0) + 1);
    });
  });
  aggregated.keywords = Array.from(keywordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([keyword]) => keyword);

  // Calculate confidence
  let score = 0;
  if (aggregated.kurum) score += 25;
  if (aggregated.ihale_no) score += 20;
  if (aggregated.dates.length > 0) score += 20;
  if (aggregated.budget) score += 15;
  if (aggregated.participant_count) score += 10;
  if (aggregated.location) score += 5;
  if (aggregated.authorized_person) score += 5;
  aggregated.confidence = Math.min(100, score);

  return aggregated;
}

/**
 * Extract kurum (institution name)
 */
function extractKurum(text: string): string | undefined {
  // Pattern 1: "İdarenin Adı: ..."
  let match = text.match(/idarenin\s+adı\s*[:：]\s*(.+)/i);
  if (match) return match[1].trim().split('\n')[0].trim();

  // Pattern 2: "İdare: ..."
  match = text.match(/idare\s*[:：]\s*(.+)/i);
  if (match) return match[1].trim().split('\n')[0].trim();

  // Pattern 3: Look for words ending with common suffixes
  match = text.match(/([\w\s]+(?:belediyesi|müdürlüğü|başkanlığı|üniversitesi|bakanlığı|kurumu))/i);
  if (match) return match[1].trim();

  return undefined;
}

/**
 * Extract ihale numarası
 */
function extractIhaleNo(text: string): string | undefined {
  // Pattern 1: "İhale Kayıt Numarası: ..."
  let match = text.match(/ihale\s+kayıt\s+numaras[ıi]\s*[:：]\s*([\d\-]+)/i);
  if (match) return match[1].trim();

  // Pattern 2: "Dosya No: ..."
  match = text.match(/dosya\s+no\s*[:：]\s*([\d\-]+)/i);
  if (match) return match[1].trim();

  // Pattern 3: Generic number after "ihale"
  match = text.match(/ihale\s*[:：]?\s*([\d]{4,}[\d\-\/]*)/i);
  if (match) return match[1].trim();

  return undefined;
}

/**
 * Extract dates
 */
function extractDates(text: string): ExtractedDate[] {
  const dates: ExtractedDate[] = [];

  // Pattern 1: DD/MM/YYYY or DD.MM.YYYY
  const datePattern = /(\d{1,2})[\.\/](\d{1,2})[\.\/](\d{4})/g;
  let match;

  while ((match = datePattern.exec(text)) !== null) {
    const dateStr = match[0];
    const context = text.slice(Math.max(0, match.index - 50), match.index + 50);
    const type = inferDateType(context);

    dates.push({
      type,
      date: dateStr,
      rawText: context.trim(),
    });
  }

  return dates;
}

/**
 * Infer date type from context
 */
function inferDateType(context: string): ExtractedDate['type'] {
  const lower = context.toLowerCase();
  if (lower.includes('ilan') || lower.includes('yayın')) return 'ilan';
  if (lower.includes('son') && lower.includes('teklif')) return 'son_teklif';
  if (lower.includes('ihale') && lower.includes('tarih')) return 'ihale';
  return 'other';
}

/**
 * Extract budget/price
 */
function extractBudget(text: string): string | undefined {
  // Pattern: "Yaklaşık Maliyet: 1.234.567,89 TL"
  let match = text.match(/(?:yaklaşık\s+maliyet|tahmini\s+bedel)\s*[:：]\s*([\d\.,]+\s*TL)/i);
  if (match) return match[1].trim();

  // Pattern: Look for large numbers followed by TL
  match = text.match(/([\d]{1,3}(?:[.,][\d]{3})*[.,][\d]{2}\s*TL)/i);
  if (match) return match[1].trim();

  return undefined;
}

/**
 * Extract participant count
 */
function extractParticipantCount(text: string): number | undefined {
  // Pattern: "... kişi" or "... kişilik"
  const match = text.match(/([\d]{1,6})\s*kişi(?:lik)?/i);
  if (match) {
    const count = parseInt(match[1].replace(/\./g, ''), 10);
    if (!isNaN(count) && count > 0 && count < 1000000) {
      return count;
    }
  }
  return undefined;
}

/**
 * Extract authorized person
 */
function extractAuthorizedPerson(text: string): string | undefined {
  // Pattern: "Yetkili: ..." or "İrtibat: ..."
  const match = text.match(/(?:yetkili|irtibat|sorumlu)\s*[:：]\s*([A-ZĞÜŞİÖÇ][a-zğüşıöç]+\s+[A-ZĞÜŞİÖÇ][a-zğüşıöç]+)/i);
  if (match) return match[1].trim();

  return undefined;
}

/**
 * Extract location
 */
function extractLocation(text: string): string | undefined {
  // Pattern: Look for city names
  const cities = [
    'Ankara', 'İstanbul', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep',
    'Şanlıurfa', 'Kocaeli', 'Mersin', 'Diyarbakır', 'Hatay', 'Manisa', 'Kayseri',
  ];

  for (const city of cities) {
    const regex = new RegExp(`\\b${city}\\b`, 'i');
    if (regex.test(text)) {
      return city;
    }
  }

  return undefined;
}

/**
 * Extract special conditions
 */
function extractSpecialConditions(text: string): string[] {
  const conditions: string[] = [];

  // Look for numbered conditions or bullet points
  const conditionPattern = /(?:^|\n)\s*[\d\-•]\s*(.+?)(?=\n|$)/g;
  let match;

  while ((match = conditionPattern.exec(text)) !== null) {
    const condition = match[1].trim();
    if (condition.length > 10 && condition.length < 200) {
      conditions.push(condition);
    }
  }

  return conditions.slice(0, 10); // Max 10 conditions
}

/**
 * Extract keywords
 */
function extractKeywords(text: string): string[] {
  const keywords: string[] = [];

  // Common tender keywords
  const keywordPatterns = [
    /\b(yemek|gıda|catering|iaşe)\b/gi,
    /\b(teknik|şartname|idari)\b/gi,
    /\b(ihale|teklif|sözleşme)\b/gi,
    /\b(menü|öğün|kalori)\b/gi,
    /\b(personel|işçilik|hizmet)\b/gi,
  ];

  keywordPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(m => keywords.push(m.toLowerCase()));
    }
  });

  return Array.from(new Set(keywords));
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr: string): Date {
  const parts = dateStr.split(/[\.\/]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(0); // Fallback to epoch
}
