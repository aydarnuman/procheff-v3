/**
 * Schema Validation Tests
 * Tests for JSON schema definitions
 */

import { describe, it, expect } from 'vitest';
import {
  COST_ANALYSIS_SCHEMA,
  DECISION_ANALYSIS_SCHEMA,
  DEEP_ANALYSIS_SCHEMA,
  MENU_PARSER_SCHEMA,
  IHALE_ANALYSIS_SCHEMA,
} from '../schemas';

describe('AI Schemas', () => {
  describe('COST_ANALYSIS_SCHEMA', () => {
    it('should have correct structure', () => {
      expect(COST_ANALYSIS_SCHEMA.name).toBe('cost_analysis');
      expect(COST_ANALYSIS_SCHEMA.schema.type).toBe('object');
      expect(COST_ANALYSIS_SCHEMA.schema.properties).toBeDefined();
      expect(COST_ANALYSIS_SCHEMA.schema.required).toContain('gunluk_kisi_maliyeti');
      expect(COST_ANALYSIS_SCHEMA.schema.required).toContain('tahmini_toplam_gider');
      expect(COST_ANALYSIS_SCHEMA.schema.required).toContain('onerilen_karlilik_orani');
    });

    it('should validate required fields', () => {
      const required = COST_ANALYSIS_SCHEMA.schema.required || [];
      expect(required.length).toBeGreaterThan(0);
    });
  });

  describe('DECISION_ANALYSIS_SCHEMA', () => {
    it('should have correct structure', () => {
      expect(DECISION_ANALYSIS_SCHEMA.name).toBe('decision_analysis');
      expect(DECISION_ANALYSIS_SCHEMA.schema.type).toBe('object');
      expect(DECISION_ANALYSIS_SCHEMA.schema.properties.karar).toBeDefined();
      expect(DECISION_ANALYSIS_SCHEMA.schema.properties.karar.enum).toEqual([
        'Katıl',
        'Katılma',
        'Dikkatli Katıl',
      ]);
    });

    it('should have valid enum values for karar', () => {
      const kararEnum = DECISION_ANALYSIS_SCHEMA.schema.properties.karar.enum;
      expect(kararEnum).toContain('Katıl');
      expect(kararEnum).toContain('Katılma');
      expect(kararEnum).toContain('Dikkatli Katıl');
    });
  });

  describe('DEEP_ANALYSIS_SCHEMA', () => {
    it('should have correct structure', () => {
      expect(DEEP_ANALYSIS_SCHEMA.name).toBe('deep_analysis');
      expect(DEEP_ANALYSIS_SCHEMA.schema.type).toBe('object');
      expect(DEEP_ANALYSIS_SCHEMA.schema.required).toContain('kurum');
      expect(DEEP_ANALYSIS_SCHEMA.schema.required).toContain('ihale_turu');
      expect(DEEP_ANALYSIS_SCHEMA.schema.required).toContain('analiz_ozeti');
    });
  });

  describe('MENU_PARSER_SCHEMA', () => {
    it('should be an array schema', () => {
      expect(MENU_PARSER_SCHEMA.name).toBe('menu_parser');
      expect(MENU_PARSER_SCHEMA.schema.type).toBe('array');
      expect(MENU_PARSER_SCHEMA.schema.items).toBeDefined();
    });

    it('should have menu item structure', () => {
      const itemSchema = MENU_PARSER_SCHEMA.schema.items;
      expect(itemSchema.properties.yemek_adi).toBeDefined();
      expect(itemSchema.properties.gramaj).toBeDefined();
      expect(itemSchema.properties.gramaj.type).toBe('number');
    });
  });

  describe('IHALE_ANALYSIS_SCHEMA', () => {
    it('should have correct structure', () => {
      expect(IHALE_ANALYSIS_SCHEMA.name).toBe('ihale_analysis');
      expect(IHALE_ANALYSIS_SCHEMA.schema.type).toBe('object');
      expect(IHALE_ANALYSIS_SCHEMA.schema.required).toContain('kurum');
      expect(IHALE_ANALYSIS_SCHEMA.schema.required).toContain('ihale_turu');
    });

    it('should have date pattern validation', () => {
      const ilanTarihi = IHALE_ANALYSIS_SCHEMA.schema.properties.ilan_tarihi;
      expect(ilanTarihi.pattern).toBe('^\\d{4}-\\d{2}-\\d{2}$');
    });
  });

  describe('Schema Registry', () => {
    it('should export all schemas', () => {
      const schemas = [
        COST_ANALYSIS_SCHEMA,
        DECISION_ANALYSIS_SCHEMA,
        DEEP_ANALYSIS_SCHEMA,
        MENU_PARSER_SCHEMA,
        IHALE_ANALYSIS_SCHEMA,
      ];

      schemas.forEach((schema) => {
        expect(schema.name).toBeDefined();
        expect(schema.schema).toBeDefined();
        expect(schema.schema.type).toBeDefined();
      });
    });
  });
});

