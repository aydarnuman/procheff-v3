/**
 * Helper functions for analysis data processing and categorization
 */

import React from 'react';

import type {
  DataPool,
  ExtractedTable,
  ExtractedDate,
  ExtractedEntity,
  TextBlock,
  DocumentInfo
} from '@/lib/document-processor/types';
import type { MenuItem } from '@/lib/tender-analysis/types';
import { extractMenuItems as marketExtractMenuItems } from '@/lib/tender-analysis/market-intel';

// Type definitions
export interface BasicInfo {
  key: string;
  label: string;
  value: string;
  source: string;
  page?: number;
}

export interface CriticalDate {
  label: string;
  value: string;
  source: string;
  page?: number;
  originalKind: string;
}

export interface GroupedDocument {
  doc_id: string;
  name: string;
  type_guess: string;
  size: number;
  textBlocks: TextBlock[];
}

export interface ExtractedDetails {
  locations: ExtractedEntity[];
  officials: ExtractedEntity[];
  conditions: ExtractedEntity[];
}

export interface EntityWithSource {
  type: string;
  value: string;
  confidence: number;
  source: {
    doc_id: string;
    filename?: string;
    page?: number;
  };
}

export interface CostExtractionItem {
  kalem: string;
  fiyat?: number;
  tutar?: number;
  currency?: string;
  source: {
    doc_id?: string;
    table_id?: string;
    page?: number;
  };
}

export interface CategorizedTables {
  menu: ExtractedTable[];
  cost: ExtractedTable[];
  personnel: ExtractedTable[];
  technical: ExtractedTable[];
  other: ExtractedTable[];
}

/**
 * Extract basic information from data pool
 */
export function extractBasicInfo(dataPool: DataPool): BasicInfo[] {
  const info: BasicInfo[] = [];

  // Find institution
  const institution = dataPool.entities.find(e =>
    (e.kind as string) === 'institution' ||
    e.value.toLowerCase().includes('üniversite') ||
    e.value.toLowerCase().includes('hastane') ||
    e.value.toLowerCase().includes('bakanlık') ||
    e.value.toLowerCase().includes('belediye') ||
    e.value.toLowerCase().includes('müdürlük')
  );

  if (institution) {
    info.push({
      key: 'institution',
      label: 'Kurum',
      value: institution.value,
      source: institution.source,
      page: (institution as any).page_number
    });
  }

  // Find budget
  const budget = dataPool.entities.find(e =>
    (e.kind as string) === 'budget' ||
    (e.kind as string) === 'amount' ||
    (e.value.includes('TL') || e.value.includes('₺')) &&
    (e.value.toLowerCase().includes('bütçe') || e.value.toLowerCase().includes('bedel'))
  );

  if (budget) {
    info.push({
      key: 'budget',
      label: 'Tahmini Bütçe',
      value: budget.value,
      source: budget.source,
      page: (budget as any).page_number
    });
  }

  // Find person count
  const personCount = dataPool.entities.find(e =>
    e.value.toLowerCase().includes('kişi') ||
    e.value.toLowerCase().includes('personel') ||
    e.value.toLowerCase().includes('öğrenci')
  );

  if (personCount) {
    info.push({
      key: 'person_count',
      label: 'Hizmet Verilecek Kişi Sayısı',
      value: personCount.value,
      source: personCount.source,
      page: (personCount as any).page_number
    });
  }

  // Find tender type
  const tenderType = dataPool.entities.find(e =>
    (e.kind as string) === 'tender_type' ||
    e.value.toLowerCase().includes('hizmet alımı') ||
    e.value.toLowerCase().includes('mal alımı') ||
    e.value.toLowerCase().includes('yapım işi')
  );

  if (tenderType) {
    info.push({
      key: 'tender_type',
      label: 'İhale Türü',
      value: tenderType.value,
      source: tenderType.source,
      page: (tenderType as any).page_number
    });
  }

  return info;
}

/**
 * Extract entities with document + page source information
 */
export function extractEntitiesWithSource(dataPool: DataPool): EntityWithSource[] {
  const docMap = new Map(dataPool.documents.map(doc => [doc.doc_id, doc]));
  const provenanceMap =
    dataPool.provenance instanceof Map
      ? dataPool.provenance
      : new Map(Object.entries((dataPool.provenance as unknown as Record<string, any>) || {}));

  return dataPool.entities.map(entity => {
    const provenance = provenanceMap.get(entity.source);
    const doc = provenance ? docMap.get(provenance.doc_id) : docMap.get(entity.source);

    return {
      type: entity.kind,
      value: entity.value,
      confidence: entity.confidence,
      source: {
        doc_id: provenance?.doc_id || doc?.doc_id || entity.source,
        filename: doc?.name,
        page: provenance?.page ?? (entity as any).page ?? undefined
      }
    };
  });
}

/**
 * Extract and categorize critical dates
 */
export function extractCriticalDates(dataPool: DataPool): CriticalDate[] {
  const dateCategories: Record<string, string> = {
    'announcement': 'İlan Tarihi',
    'deadline': 'Son Teklif Tarihi',
    'start': 'Başlangıç Tarihi',
    'end': 'Bitiş Tarihi',
    'delivery': 'Teslimat Tarihi',
    'tender': 'İhale Tarihi',
    'contract': 'Sözleşme Tarihi'
  };

  return dataPool.dates
    .map(date => {
      // Determine category based on kind or keywords in value
      let label = dateCategories[(date.kind as string)] || (date.kind as string);

      // Try to determine category from entity value if kind is generic
      if ((date.kind as string) === 'date' || !dateCategories[(date.kind as string)]) {
        const valueLower = date.value.toLowerCase();
        if (valueLower.includes('ilan')) label = 'İlan Tarihi';
        else if (valueLower.includes('son') || valueLower.includes('teklif')) label = 'Son Teklif Tarihi';
        else if (valueLower.includes('başla')) label = 'Başlangıç Tarihi';
        else if (valueLower.includes('bitiş') || valueLower.includes('son')) label = 'Bitiş Tarihi';
        else if (valueLower.includes('ihale')) label = 'İhale Tarihi';
        else label = 'Diğer Tarih';
      }

      return {
        label,
        value: date.value,
        source: date.source,
        page: (date as any).page_number,
        originalKind: (date.kind as string)
      };
    })
    .sort((a, b) => {
      // Sort chronologically
      try {
        return new Date(a.value).getTime() - new Date(b.value).getTime();
      } catch (error) {
        return 0;
      }
    });
}

/**
 * Group text blocks by document
 */
export function groupByDocument(dataPool: DataPool): GroupedDocument[] {
  const grouped: Map<string, GroupedDocument> = new Map();

  // Initialize with documents
  dataPool.documents.forEach(doc => {
    grouped.set(doc.doc_id, {
      doc_id: doc.doc_id,
      name: doc.name,
      type_guess: doc.type_guess,
      size: doc.size,
      textBlocks: []
    });
  });

  // Add text blocks to their documents
  dataPool.textBlocks.forEach(block => {
    const doc = grouped.get(block.source);
    if (doc) {
      doc.textBlocks.push(block);
    } else {
      // Create a default document if not found
      grouped.set(block.source, {
        doc_id: block.source,
        name: block.source,
        type_guess: 'unknown',
        size: 0,
        textBlocks: [block]
      });
    }
  });

  // Sort text blocks within each document by page number
  grouped.forEach(doc => {
    doc.textBlocks.sort((a, b) => ((a as any).page_number || 0) - ((b as any).page_number || 0));
  });

  return Array.from(grouped.values());
}

/**
 * Extract categorized details from entities
 */
export function extractDetails(dataPool: DataPool): ExtractedDetails {
  const details: ExtractedDetails = {
    locations: [],
    officials: [],
    conditions: []
  };

  dataPool.entities.forEach(entity => {
    const valueLower = entity.value.toLowerCase();
    const kind = entity.kind.toLowerCase();

    // Locations
    if (kind === 'location' ||
        kind === 'address' ||
        valueLower.includes('adres') ||
        valueLower.includes('kampüs') ||
        valueLower.includes('bina') ||
        valueLower.includes('kat')) {
      details.locations.push(entity);
    }

    // Officials
    else if (kind === 'person' ||
             kind === 'official' ||
             valueLower.includes('müdür') ||
             valueLower.includes('başkan') ||
             valueLower.includes('yetkili') ||
             valueLower.includes('komisyon')) {
      details.officials.push(entity);
    }

    // Special conditions
    else if (kind === 'condition' ||
             kind === 'requirement' ||
             valueLower.includes('şart') ||
             valueLower.includes('koşul') ||
             valueLower.includes('gerek') ||
             valueLower.includes('zorunlu')) {
      details.conditions.push(entity);
    }
  });

  return details;
}

/**
 * Check if table is a menu table
 */
export function isMenuTable(table: ExtractedTable): boolean {
  const keywords = ['menü', 'yemek', 'gıda', 'öğün', 'kahvaltı', 'öğle', 'akşam',
                    'porsiyon', 'kalori', 'besin', 'malzeme', 'tarif', 'diyet'];
  const title = table.title?.toLowerCase() || '';
  const headers = table.headers.join(' ').toLowerCase();

  return keywords.some(k => title.includes(k) || headers.includes(k));
}

/**
 * Check if table is a cost table
 */
export function isCostTable(table: ExtractedTable): boolean {
  const keywords = ['fiyat', 'bütçe', 'maliyet', 'ödeme', 'tutar', 'kdv',
                    'bedel', 'ücret', 'teklif', 'birim fiyat', 'toplam'];
  const title = table.title?.toLowerCase() || '';
  const headers = table.headers.join(' ').toLowerCase();

  return keywords.some(k => title.includes(k) || headers.includes(k));
}

/**
 * Check if table is a personnel table
 */
export function isPersonnelTable(table: ExtractedTable): boolean {
  const keywords = ['personel', 'çalışan', 'görev', 'kadro', 'istihdam',
                    'pozisyon', 'unvan', 'sayı', 'adet', 'ekip', 'görevli'];
  const title = table.title?.toLowerCase() || '';
  const headers = table.headers.join(' ').toLowerCase();

  return keywords.some(k => title.includes(k) || headers.includes(k));
}

/**
 * Check if table is a technical table
 */
export function isTechnicalTable(table: ExtractedTable): boolean {
  const keywords = ['ekipman', 'teknik', 'özellik', 'cihaz', 'araç', 'malzeme listesi',
                    'donanım', 'yazılım', 'sistem', 'altyapı', 'tesisat'];
  const title = table.title?.toLowerCase() || '';
  const headers = table.headers.join(' ').toLowerCase();

  return keywords.some(k => title.includes(k) || headers.includes(k));
}

/**
 * Categorize a single table
 */
export function categorizeTable(table: ExtractedTable): 'menu' | 'cost' | 'personnel' | 'technical' | 'other' {
  if (isMenuTable(table)) return 'menu';
  if (isCostTable(table)) return 'cost';
  if (isPersonnelTable(table)) return 'personnel';
  if (isTechnicalTable(table)) return 'technical';
  return 'other';
}

/**
 * Categorize all tables
 */
export function categorizeAllTables(tables: ExtractedTable[]): CategorizedTables {
  const categorized: CategorizedTables = {
    menu: [],
    cost: [],
    personnel: [],
    technical: [],
    other: []
  };

  tables.forEach(table => {
    const category = categorizeTable(table);
    categorized[category].push(table);
  });

  return categorized;
}

/**
 * Re-export menu extraction helper for backwards compatibility
 */
export function extractMenuItems(dataPool: DataPool): MenuItem[] {
  return marketExtractMenuItems(dataPool);
}

/**
 * Extract cost table items with numeric parsing
 */
export function extractCostItems(dataPool: DataPool): CostExtractionItem[] {
  const items: CostExtractionItem[] = [];

  dataPool.tables.forEach(table => {
    if (!isCostTable(table)) return;

    const headerMap = table.headers.map(h => h.toLowerCase());
    const findColumn = (keywords: string[]) => {
      const index = headerMap.findIndex(header =>
        keywords.some(keyword => header.includes(keyword))
      );
      return index >= 0 ? index : undefined;
    };

    const nameIndex = findColumn(['kalem', 'ürün', 'malzeme', 'açıklama']);
    const priceIndex = findColumn(['fiyat', 'birim', 'bedel']);
    const totalIndex = findColumn(['tutar', 'toplam', 'genel']);

    table.rows.forEach(row => {
      if (row.length === 0) return;

      const rawName = nameIndex !== undefined ? row[nameIndex] : row[0];
      const rawPrice = priceIndex !== undefined ? row[priceIndex] : undefined;
      const rawTotal = totalIndex !== undefined ? row[totalIndex] : undefined;

      items.push({
        kalem: rawName?.trim() || 'Kalem',
        fiyat: parseNumericValue(rawPrice),
        tutar: parseNumericValue(rawTotal),
        currency: detectCurrency(rawPrice || rawTotal),
        source: {
          doc_id: table.doc_id,
          table_id: table.table_id,
          page: table.page
        }
      });
    });
  });

  return items;
}

function parseNumericValue(value?: string): number | undefined {
  if (!value) return undefined;
  const normalized = value
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : undefined;
}

function detectCurrency(value?: string): string | undefined {
  if (!value) return undefined;
  if (value.includes('€')) return 'EUR';
  if (value.includes('$')) return 'USD';
  if (value.includes('£')) return 'GBP';
  if (value.includes('₺') || value.toLowerCase().includes('tl')) return 'TRY';
  return undefined;
}

/**
 * Format date to Turkish locale
 */
export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  } catch (error) {
    return dateStr;
  }
}

/**
 * Highlight search term in text
 */
export function highlightSearchTerm(text: string, searchTerm: string): React.ReactNode {
  if (!searchTerm) return text;

  const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === searchTerm.toLowerCase() ? (
          <mark key={index} className="bg-yellow-400/30 text-yellow-200 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}