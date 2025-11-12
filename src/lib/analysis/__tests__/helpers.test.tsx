import { describe, it, expect } from 'vitest';
import {
  extractEntitiesWithSource,
  categorizeTable,
  categorizeAllTables,
  extractMenuItems,
  extractCostItems
} from '../helpers';
import type { DataPool } from '@/lib/document-processor/types';

describe('Analysis Helpers', () => {
  describe('extractEntitiesWithSource', () => {
    it('should extract entities with source information', () => {
      const mockDataPool: DataPool = {
        documents: [
          {
            filename: 'test.pdf',
            pages: [
              {
                page_number: 1,
                text: 'Test content',
                entities: [
                  { type: 'kurum', value: 'Test Kurumu', confidence: 0.9 },
                  { type: 'tarih', value: '2025-01-01', confidence: 0.95 }
                ]
              }
            ]
          }
        ],
        tables: [],
        entities: [],
        summary: ''
      };

      const entities = extractEntitiesWithSource(mockDataPool);

      expect(entities).toHaveLength(2);
      expect(entities[0]).toMatchObject({
        type: 'kurum',
        value: 'Test Kurumu',
        source: {
          filename: 'test.pdf',
          page_number: 1
        }
      });
    });

    it('should handle multiple documents', () => {
      const mockDataPool: DataPool = {
        documents: [
          {
            filename: 'doc1.pdf',
            pages: [
              {
                page_number: 1,
                text: 'Content 1',
                entities: [
                  { type: 'kurum', value: 'Kurum 1', confidence: 0.9 }
                ]
              }
            ]
          },
          {
            filename: 'doc2.pdf',
            pages: [
              {
                page_number: 1,
                text: 'Content 2',
                entities: [
                  { type: 'kurum', value: 'Kurum 2', confidence: 0.9 }
                ]
              }
            ]
          }
        ],
        tables: [],
        entities: [],
        summary: ''
      };

      const entities = extractEntitiesWithSource(mockDataPool);

      expect(entities).toHaveLength(2);
      expect(entities[0].source?.filename).toBe('doc1.pdf');
      expect(entities[1].source?.filename).toBe('doc2.pdf');
    });
  });

  describe('categorizeTable', () => {
    it('should categorize menu tables correctly', () => {
      const menuTable = {
        headers: ['Yemek', 'Gramaj', 'Öğün'],
        rows: [
          ['Pilav', '200g', 'Öğle']
        ],
        caption: 'Menü Listesi',
        page_number: 1
      };

      const category = categorizeTable(menuTable);
      expect(category).toBe('menu');
    });

    it('should categorize cost tables correctly', () => {
      const costTable = {
        headers: ['Kalem', 'Fiyat', 'Tutar'],
        rows: [
          ['Item', '10.00', '100.00']
        ],
        caption: 'Maliyet Tablosu',
        page_number: 1
      };

      const category = categorizeTable(costTable);
      expect(category).toBe('cost');
    });

    it('should categorize personnel tables correctly', () => {
      const personnelTable = {
        headers: ['Personel', 'Sayısı', 'Görev'],
        rows: [
          ['Aşçı', '5', 'Yemek Hazırlama']
        ],
        caption: 'Personel Listesi',
        page_number: 1
      };

      const category = categorizeTable(personnelTable);
      expect(category).toBe('personnel');
    });

    it('should categorize technical tables correctly', () => {
      const technicalTable = {
        headers: ['Ekipman', 'Model', 'Adet'],
        rows: [
          ['Fırın', 'XYZ-100', '2']
        ],
        caption: 'Teknik Özellikler',
        page_number: 1
      };

      const category = categorizeTable(technicalTable);
      expect(category).toBe('technical');
    });

    it('should return "other" for unrecognized tables', () => {
      const unknownTable = {
        headers: ['Random', 'Headers'],
        rows: [
          ['Some', 'Data']
        ],
        caption: 'Unknown Table',
        page_number: 1
      };

      const category = categorizeTable(unknownTable);
      expect(category).toBe('other');
    });
  });

  describe('categorizeAllTables', () => {
    it('should categorize all tables and group by category', () => {
      const tables = [
        {
          headers: ['Yemek', 'Gramaj'],
          rows: [['Pilav', '200g']],
          caption: 'Menü',
          page_number: 1
        },
        {
          headers: ['Kalem', 'Fiyat'],
          rows: [['Item', '10']],
          caption: 'Maliyet',
          page_number: 2
        },
        {
          headers: ['Yemek Adı', 'Porsiyon'],
          rows: [['Çorba', '150ml']],
          caption: 'Menü 2',
          page_number: 3
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
      const mockDataPool: DataPool = {
        documents: [],
        tables: [
          {
            headers: ['Yemek', 'Gramaj', 'Öğün'],
            rows: [
              ['Pilav', '200g', 'Öğle'],
              ['Çorba', '150ml', 'Öğle']
            ],
            caption: 'Menü Listesi',
            page_number: 1
          }
        ],
        entities: [],
        summary: ''
      };

      const menuItems = extractMenuItems(mockDataPool);

      expect(menuItems.length).toBeGreaterThan(0);
      expect(menuItems[0]).toHaveProperty('yemek');
      expect(menuItems[0]).toHaveProperty('gramaj');
    });
  });

  describe('extractCostItems', () => {
    it('should extract cost items from data pool', () => {
      const mockDataPool: DataPool = {
        documents: [],
        tables: [
          {
            headers: ['Kalem', 'Fiyat', 'Tutar'],
            rows: [
              ['Malzeme 1', '10.00', '100.00'],
              ['Malzeme 2', '20.00', '200.00']
            ],
            caption: 'Maliyet Tablosu',
            page_number: 1
          }
        ],
        entities: [],
        summary: ''
      };

      const costItems = extractCostItems(mockDataPool);

      expect(costItems.length).toBeGreaterThan(0);
      expect(costItems[0]).toHaveProperty('kalem');
      expect(costItems[0]).toHaveProperty('tutar');
    });
  });
});



