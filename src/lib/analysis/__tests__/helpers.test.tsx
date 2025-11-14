import { describe, it, expect } from 'vitest';
import {
  extractEntitiesWithSource,
  categorizeTable,
  categorizeAllTables,
  extractMenuItems,
  extractCostItems
} from '../helpers';
import type {
  DataPool,
  DocumentType,
  ExtractedTable,
  SourceLocation,
  EntityKind
} from '@/lib/document-processor/types';

function createMockDataPool(overrides: Partial<DataPool> = {}): DataPool {
  return {
    documents: overrides.documents ?? [],
    textBlocks: overrides.textBlocks ?? [],
    tables: overrides.tables ?? [],
    dates: overrides.dates ?? [],
    amounts: overrides.amounts ?? [],
    entities: overrides.entities ?? [],
    rawText: overrides.rawText ?? '',
    basicInfo: overrides.basicInfo,
    metadata: {
      total_pages: 0,
      total_words: 0,
      extraction_time_ms: 0,
      ocr_used: false,
      languages_detected: [],
      warnings: [],
      ...(overrides.metadata ?? {})
    },
    provenance: overrides.provenance ?? new Map<string, SourceLocation>()
  };
}

describe('Analysis Helpers', () => {
  describe('extractEntitiesWithSource', () => {
    it('should extract entities with source information', () => {
      const documents = [
        {
          doc_id: 'DOC1',
          type_guess: 'idari' as DocumentType,
          hash: 'hash-doc-1',
          name: 'test.pdf',
          size: 1024,
          mime_type: 'application/pdf',
          created_at: new Date().toISOString()
        }
      ];

      const mockDataPool = createMockDataPool({
        documents,
        entities: [
          { kind: 'kurum' as EntityKind, value: 'Test Kurumu', source: 'DOC1:1', confidence: 0.9 },
          { kind: 'yetkili' as EntityKind, value: 'Yetkili Kişi', source: 'DOC1:2', confidence: 0.95 }
        ],
        provenance: new Map([
          ['DOC1:1', { doc_id: 'DOC1', page: 1, text_snippet: 'Test content' }],
          ['DOC1:2', { doc_id: 'DOC1', page: 1, text_snippet: 'Date content' }]
        ])
      });

      const entities = extractEntitiesWithSource(mockDataPool);

      expect(entities).toHaveLength(2);
      expect(entities[0]).toMatchObject({
        type: 'kurum',
        value: 'Test Kurumu',
        source: expect.objectContaining({
          filename: 'test.pdf',
          page: 1
        })
      });
    });

    it('should handle multiple documents', () => {
      const documents = [
        {
          doc_id: 'DOC1',
          type_guess: 'idari' as DocumentType,
          hash: 'hash1',
          name: 'doc1.pdf',
          size: 2048,
          mime_type: 'application/pdf',
          created_at: new Date().toISOString()
        },
        {
          doc_id: 'DOC2',
          type_guess: 'teknik' as DocumentType,
          hash: 'hash2',
          name: 'doc2.pdf',
          size: 4096,
          mime_type: 'application/pdf',
          created_at: new Date().toISOString()
        }
      ];

      const mockDataPool = createMockDataPool({
        documents,
        entities: [
          { kind: 'kurum' as EntityKind, value: 'Kurum 1', source: 'DOC1:entity', confidence: 0.9 },
          { kind: 'kurum' as EntityKind, value: 'Kurum 2', source: 'DOC2:entity', confidence: 0.9 }
        ],
        provenance: new Map([
          ['DOC1:entity', { doc_id: 'DOC1', page: 1, text_snippet: 'Content 1' }],
          ['DOC2:entity', { doc_id: 'DOC2', page: 1, text_snippet: 'Content 2' }]
        ])
      });

      const entities = extractEntitiesWithSource(mockDataPool);

      expect(entities).toHaveLength(2);
      expect(entities[0].source.filename).toBe('doc1.pdf');
      expect(entities[1].source.filename).toBe('doc2.pdf');
    });
  });

  describe('categorizeTable', () => {
    it('should categorize menu tables correctly', () => {
      const menuTable: ExtractedTable = {
        table_id: 'T1',
        doc_id: 'DOC1',
        headers: ['Yemek', 'Gramaj', 'Öğün'],
        rows: [
          ['Pilav', '200g', 'Öğle']
        ],
        title: 'Menü Listesi',
        page: 1
      };

      const category = categorizeTable(menuTable);
      expect(category).toBe('menu');
    });

    it('should categorize cost tables correctly', () => {
      const costTable: ExtractedTable = {
        table_id: 'T2',
        doc_id: 'DOC1',
        headers: ['Kalem', 'Fiyat', 'Tutar'],
        rows: [
          ['Item', '10.00', '100.00']
        ],
        title: 'Maliyet Tablosu',
        page: 1
      };

      const category = categorizeTable(costTable);
      expect(category).toBe('cost');
    });

    it('should categorize personnel tables correctly', () => {
      const personnelTable: ExtractedTable = {
        table_id: 'T3',
        doc_id: 'DOC1',
        headers: ['Personel', 'Sayısı', 'Görev'],
        rows: [
          ['Aşçı', '5', 'Yemek Hazırlama']
        ],
        title: 'Personel Listesi',
        page: 1
      };

      const category = categorizeTable(personnelTable);
      expect(category).toBe('personnel');
    });

    it('should categorize technical tables correctly', () => {
      const technicalTable: ExtractedTable = {
        table_id: 'T4',
        doc_id: 'DOC1',
        headers: ['Ekipman', 'Model', 'Adet'],
        rows: [
          ['Fırın', 'XYZ-100', '2']
        ],
        title: 'Teknik Özellikler',
        page: 1
      };

      const category = categorizeTable(technicalTable);
      expect(category).toBe('technical');
    });

    it('should return "other" for unrecognized tables', () => {
      const unknownTable: ExtractedTable = {
        table_id: 'T5',
        doc_id: 'DOC1',
        headers: ['Random', 'Headers'],
        rows: [
          ['Some', 'Data']
        ],
        title: 'Unknown Table',
        page: 1
      };

      const category = categorizeTable(unknownTable);
      expect(category).toBe('other');
    });
  });

  describe('categorizeAllTables', () => {
    it('should categorize all tables and group by category', () => {
      const tables: ExtractedTable[] = [
        {
          table_id: 'T1',
          doc_id: 'DOC1',
          headers: ['Yemek', 'Gramaj'],
          rows: [['Pilav', '200g']],
          title: 'Menü',
          page: 1
        },
        {
          table_id: 'T2',
          doc_id: 'DOC1',
          headers: ['Kalem', 'Fiyat'],
          rows: [['Item', '10']],
          title: 'Maliyet',
          page: 2
        },
        {
          table_id: 'T3',
          doc_id: 'DOC1',
          headers: ['Yemek Adı', 'Porsiyon'],
          rows: [['Çorba', '150ml']],
          title: 'Menü 2',
          page: 3
        }
      ];

      const categorized = categorizeAllTables(tables);

      expect(categorized.menu).toHaveLength(2);
      expect(categorized.cost).toHaveLength(1);
      expect(categorized.personnel).toHaveLength(0);
      expect(categorized.technical).toHaveLength(0);
      expect(categorized.other).toHaveLength(0);
    });
  });

  describe('extractMenuItems', () => {
    it('should extract menu items from data pool', () => {
      const mockDataPool = createMockDataPool({
        tables: [
          {
            table_id: 'T1',
            doc_id: 'DOC1',
            headers: ['Yemek', 'Gramaj', 'Öğün'],
            rows: [
              ['Pilav', '200g', 'Öğle'],
              ['Çorba', '150ml', 'Öğle']
            ],
            title: 'Menü Listesi',
            page: 1
          }
        ]
      });

      const menuItems = extractMenuItems(mockDataPool);

      expect(menuItems.length).toBeGreaterThan(0);
      expect(menuItems[0]).toHaveProperty('yemek');
      expect(menuItems[0]).toHaveProperty('gramaj');
    });
  });

  describe('extractCostItems', () => {
    it('should extract cost items from data pool', () => {
      const mockDataPool = createMockDataPool({
        tables: [
          {
            table_id: 'T1',
            doc_id: 'DOC1',
            headers: ['Kalem', 'Fiyat', 'Tutar'],
            rows: [
              ['Malzeme 1', '10,00 TL', '100,00 TL'],
              ['Malzeme 2', '20,00 TL', '200,00 TL']
            ],
            title: 'Maliyet Tablosu',
            page: 1
          }
        ]
      });

      const costItems = extractCostItems(mockDataPool);

      expect(costItems.length).toBeGreaterThan(0);
      expect(costItems[0]).toHaveProperty('kalem');
      expect(costItems[0]).toHaveProperty('tutar');
    });
  });
});
