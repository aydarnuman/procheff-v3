/**
 * Test suite for enhanced document detection
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { EnhancedSmartDetection } from '../enhanced-smart-detection';
import { EvidenceBasedDetector } from '../evidence-detector';
import { normalizeText } from '@/lib/utils/normalize-utils';

describe('Enhanced Document Detection', () => {
  beforeEach(() => {
    // Clear cache before each test
    EnhancedSmartDetection.clearCache();
  });

  describe('Evidence-Based Detection', () => {
    const detector = new EvidenceBasedDetector();

    test('Zeyilname detection - filename', () => {
      const result = detector.detectWithEvidence(
        'zeyilname_2.pdf',
        'İçerik metni...'
      );
      
      expect(result.category).toBe('zeyilname');
      expect(result.confidence).toBeGreaterThanOrEqual(35);
      expect(result.evidences).toContainEqual(
        expect.objectContaining({ 
          type: 'filename',
          confidence: 0.35
        })
      );
    });

    test('Zeyilname detection - multiple variations', () => {
      const variations = [
        'zeyilname.pdf',
        'zeylname.pdf',
        'duzeltme_ilani.pdf',
        'düzeltme_ilanı.pdf',
        'ek_ilan.pdf',
        'degisiklik_ilani.pdf',
        'revize_dokuman.pdf'
      ];

      variations.forEach(filename => {
        const result = detector.detectWithEvidence(filename, 'Test içerik');
        expect(result.confidence).toBeGreaterThanOrEqual(30);
        expect(result.scoreBreakdown.filename).toBeGreaterThan(0);
      });
    });

    test('False positive prevention - zeynep', () => {
      const result = detector.detectWithEvidence(
        'zeynep_formu.pdf',
        'Form içeriği...'
      );
      
      expect(result.category).toBe('diğer');
      expect(result.scoreBreakdown.filename).toBe(0);
    });

    test('Multi-evidence high confidence', () => {
      const content = `
        DÜZELTME İLANI
        İhale Kayıt No: 2024/123456
        
        15.01.2024 tarihli ilanda değişiklik yapılmıştır.
        Yeni son başvuru tarihi: 30.01.2024
        
        İptal edilen maddeler:
        - Madde 5.2
        - Madde 7.8
      `;
      
      const result = detector.detectWithEvidence(
        'duzeltme_ilani.pdf',
        content
      );
      
      expect(result.category).toBe('zeyilname');
      expect(result.confidence).toBeGreaterThanOrEqual(75);
      expect(result.evidences.length).toBeGreaterThanOrEqual(3);
      
      // Should have filename, heading, content, and reference evidences
      const evidenceTypes = result.evidences.map(e => e.type);
      expect(evidenceTypes).toContain('filename');
      expect(evidenceTypes).toContain('heading');
      expect(evidenceTypes).toContain('reference');
    });

    test('Content-based detection without filename hint', () => {
      const content = `
        Sayın İlgililer,
        
        Önceki ilanda belirtilen teknik şartnamede değişiklik yapılmıştır.
        Güncellenen hususlar aşağıda belirtilmiştir:
        
        1. Personel sayısı 50'den 75'e çıkarılmıştır
        2. Hizmet süresi 12 aydan 18 aya uzatılmıştır
        
        İKN: 2024/987654
      `;
      
      const result = detector.detectWithEvidence(
        'dokuman_1.pdf',
        content
      );
      
      expect(result.confidence).toBeGreaterThanOrEqual(25);
      expect(result.evidences).toContainEqual(
        expect.objectContaining({ type: 'content' })
      );
    });
  });

  describe('Turkish Text Normalization', () => {
    test('Diacritic removal', () => {
      expect(normalizeText('Zeyilname')).toBe('zeyilname');
      expect(normalizeText('DÜZELTME İLANI')).toBe('duzeltme ilani');
      expect(normalizeText('değişiklik')).toBe('degisiklik');
      expect(normalizeText('Sözleşme Taslağı')).toBe('sozlesme taslagi');
    });

    test('Whitespace normalization', () => {
      expect(normalizeText('  Zeyil   name  ')).toBe('zeyil name');
      expect(normalizeText('Düzeltme\n\tİlanı')).toBe('duzeltme ilani');
    });
  });

  describe('Smart Detection Integration', () => {
    test('Basic file detection', async () => {
      const file = new File(['Test content'], 'test.pdf', { type: 'application/pdf' });
      const result = await EnhancedSmartDetection.detect(file);
      
      expect(result).toHaveProperty('documentType');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('autoTags');
      expect(result).toHaveProperty('language');
      expect(result).toHaveProperty('quality');
    });

    test('Zeyilname file detection', async () => {
      const content = 'DÜZELTME İLANI\nİhale şartnamesinde değişiklik yapılmıştır.';
      const file = new File([content], 'zeyilname_1.pdf', { type: 'application/pdf' });
      const result = await EnhancedSmartDetection.detect(file, content);
      
      expect(result.documentType).toBe('Zeyilname');
      expect(result.confidence).toBeGreaterThanOrEqual(50);
      expect(result.autoTags).toContain('revize');
    });

    test('Batch detection', async () => {
      const files = [
        new File(['İdari şartname'], 'idari.pdf', { type: 'application/pdf' }),
        new File(['Teknik şartname'], 'teknik.pdf', { type: 'application/pdf' }),
        new File(['Zeyilname'], 'zeyil.pdf', { type: 'application/pdf' })
      ];
      
      const results = await EnhancedSmartDetection.detectBatch(files);
      
      expect(results.size).toBe(3);
      expect(results.get('idari.pdf')?.documentType).toContain('İdari');
      expect(results.get('teknik.pdf')?.documentType).toContain('Teknik');
      expect(results.get('zeyil.pdf')?.documentType).toBe('Zeyilname');
    });

    test('Cache functionality', async () => {
      const file = new File(['Cached content'], 'cached.pdf', { type: 'application/pdf' });
      
      // First call
      const result1 = await EnhancedSmartDetection.detect(file);
      
      // Second call should use cache
      const result2 = await EnhancedSmartDetection.detect(file);
      
      expect(result1).toEqual(result2);
      
      // Check cache stats
      const stats = EnhancedSmartDetection.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('Document Type Patterns', () => {
    const detector = new EvidenceBasedDetector();

    test('İdari Şartname detection', () => {
      const result = detector.detectWithEvidence(
        'idari_sartname.pdf',
        'İDARİ ŞARTNAME\nGenel hükümler ve idari hususlar...'
      );
      
      expect(result.category).toBe('idari');
      expect(result.confidence).toBeGreaterThanOrEqual(25);
    });

    test('Teknik Şartname detection', () => {
      const result = detector.detectWithEvidence(
        'teknik_sartname.pdf',
        'TEKNİK ŞARTNAME\nTeknik özellikler ve standartlar...'
      );
      
      expect(result.category).toBe('teknik');
      expect(result.confidence).toBeGreaterThanOrEqual(25);
    });

    test('Mixed content detection', () => {
      const content = `
        İDARİ VE TEKNİK ŞARTNAME
        
        1. İdari Hususlar
        - Teklif verme süresi
        - Geçici teminat
        
        2. Teknik Özellikler
        - Minimum sistem gereksinimleri
        - Performans kriterleri
      `;
      
      const result = detector.detectWithEvidence(
        'idari_teknik_sartname.pdf',
        content
      );
      
      // Should detect as either idari or teknik based on stronger signals
      expect(['idari', 'teknik']).toContain(result.category);
    });
  });

  describe('Quality Assessment', () => {
    test('High quality document', async () => {
      const content = `
        # İHALE İLANI
        
        ## 1. İdare Bilgileri
        Kurum: Test Kurumu
        Adres: Test Adresi
        
        ## 2. İhale Bilgileri
        İhale Kayıt No: 2024/123456
        İhale Tarihi: 15.03.2024
        
        | Kalem | Miktar | Birim Fiyat |
        |-------|--------|-------------|
        | A     | 100    | 50 TL       |
        | B     | 200    | 75 TL       |
        
        Toplam Bedel: 20.000 TL
      `;
      
      const file = new File([content], 'ihale.pdf', { 
        type: 'application/pdf'
      });
      
      const result = await EnhancedSmartDetection.detect(file, content);
      expect(result.quality).toBe('Yüksek');
    });

    test('Low quality document', async () => {
      const content = 'kısa metin';
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      const result = await EnhancedSmartDetection.detect(file, content);
      expect(result.quality).toBe('Düşük');
    });
  });

  describe('Entity Extraction', () => {
    test('Extract dates, amounts, and references', async () => {
      const content = `
        İhale Tarihi: 15.03.2024
        Son Başvuru: 30.03.2024
        
        Tahmini Bedel: 1.250.000,00 TL
        Geçici Teminat: %3 (37.500 TL)
        
        İKN: 2024/123456
        Dosya No: TND-2024-001
      `;
      
      const file = new File([content], 'ihale.pdf', { type: 'application/pdf' });
      const result = await EnhancedSmartDetection.detect(file, content);
      
      expect(result.keyEntities).toBeDefined();
      expect(result.keyEntities).toContainEqual(expect.stringContaining('15.03.2024'));
      expect(result.keyEntities).toContainEqual(expect.stringContaining('1.250.000,00 TL'));
      expect(result.keyEntities).toContainEqual(expect.stringContaining('2024/123456'));
    });
  });
});
