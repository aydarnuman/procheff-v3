import { toCSV, toJSON, toTXT } from '../utils/exporters';
import type { TenderExportData } from '../utils/exporters';

describe('Exporters', () => {
  const mockTenders: TenderExportData[] = [
    {
      id: '12345',
      tenderNumber: '2025/1845237',
      title: 'Test İhale 1',
      organization: 'Test Belediyesi',
      city: 'İstanbul',
      tenderType: 'Açık ihale usulü',
      partialBidAllowed: false,
      publishDate: '01.01.2025',
      tenderDate: '15.01.2025',
      daysRemaining: 10,
      url: 'https://www.ihalebul.com/tender/12345',
    },
    {
      id: '67890',
      tenderNumber: '2025/1845238',
      title: 'Test İhale 2',
      organization: 'Test Üniversitesi',
      city: 'Ankara',
      tenderType: 'Pazarlık usulü',
      partialBidAllowed: true,
      publishDate: '02.01.2025',
      tenderDate: '20.01.2025',
      daysRemaining: null,
      url: 'https://www.ihalebul.com/tender/67890',
    },
  ];

  describe('toCSV', () => {
    it('should convert tenders to CSV format', () => {
      const csv = toCSV(mockTenders);

      expect(csv).toBeDefined();
      expect(typeof csv).toBe('string');
      expect(csv.length).toBeGreaterThan(0);
    });

    it('should include BOM for Excel UTF-8 support', () => {
      const csv = toCSV(mockTenders);

      // BOM should be present for UTF-8 encoding
      expect(csv).toContain('İlan No');
      expect(csv).toContain('Başlık');
    });

    it('should include all fields', () => {
      const csv = toCSV(mockTenders);

      expect(csv).toContain('ID');
      expect(csv).toContain('İlan No');
      expect(csv).toContain('Başlık');
      expect(csv).toContain('İdare');
      expect(csv).toContain('Şehir');
      expect(csv).toContain('İhale Türü');
      expect(csv).toContain('Kısmi Teklif');
      expect(csv).toContain('Yayın Tarihi');
      expect(csv).toContain('Teklif Tarihi');
      expect(csv).toContain('Kalan Gün');
      expect(csv).toContain('URL');
    });

    it('should include all tender data', () => {
      const csv = toCSV(mockTenders);

      expect(csv).toContain('12345');
      expect(csv).toContain('2025/1845237');
      expect(csv).toContain('Test İhale 1');
      expect(csv).toContain('Test Belediyesi');
      expect(csv).toContain('İstanbul');
    });

    it('should handle empty array', () => {
      const csv = toCSV([]);

      expect(csv).toBeDefined();
      expect(typeof csv).toBe('string');
      // Should still have headers
      expect(csv).toContain('ID');
    });

    it('should handle Turkish characters correctly', () => {
      const csv = toCSV(mockTenders);

      expect(csv).toContain('İstanbul');
      expect(csv).toContain('Açık ihale usulü');
      expect(csv).toContain('Üniversitesi');
    });
  });

  describe('toJSON', () => {
    it('should convert tenders to JSON format', () => {
      const json = toJSON(mockTenders);

      expect(json).toBeDefined();
      expect(typeof json).toBe('string');
      expect(json.length).toBeGreaterThan(0);
    });

    it('should include metadata', () => {
      const json = toJSON(mockTenders);
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty('metadata');
      expect(parsed.metadata).toHaveProperty('totalCount');
      expect(parsed.metadata).toHaveProperty('exportDate');
      expect(parsed.metadata).toHaveProperty('source');
    });

    it('should include tenders array', () => {
      const json = toJSON(mockTenders);
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty('tenders');
      expect(Array.isArray(parsed.tenders)).toBe(true);
      expect(parsed.tenders).toHaveLength(2);
    });

    it('should preserve all tender fields', () => {
      const json = toJSON(mockTenders);
      const parsed = JSON.parse(json);

      const tender = parsed.tenders[0];
      expect(tender).toHaveProperty('id');
      expect(tender).toHaveProperty('tenderNumber');
      expect(tender).toHaveProperty('title');
      expect(tender).toHaveProperty('organization');
      expect(tender).toHaveProperty('city');
      expect(tender).toHaveProperty('tenderType');
      expect(tender).toHaveProperty('partialBidAllowed');
      expect(tender).toHaveProperty('publishDate');
      expect(tender).toHaveProperty('tenderDate');
      expect(tender).toHaveProperty('daysRemaining');
      expect(tender).toHaveProperty('url');
    });

    it('should be pretty-printed', () => {
      const json = toJSON(mockTenders);

      // Pretty-printed JSON should have newlines and indentation
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });

    it('should handle empty array', () => {
      const json = toJSON([]);
      const parsed = JSON.parse(json);

      expect(parsed.metadata.totalCount).toBe(0);
      expect(parsed.tenders).toHaveLength(0);
    });

    it('should include correct total count', () => {
      const json = toJSON(mockTenders);
      const parsed = JSON.parse(json);

      expect(parsed.metadata.totalCount).toBe(2);
    });
  });

  describe('toTXT', () => {
    it('should convert tenders to TXT format', () => {
      const txt = toTXT(mockTenders);

      expect(txt).toBeDefined();
      expect(typeof txt).toBe('string');
      expect(txt.length).toBeGreaterThan(0);
    });

    it('should include header with report title', () => {
      const txt = toTXT(mockTenders);

      expect(txt).toContain('İHALEBUL - İHALE LİSTESİ RAPORU');
      expect(txt).toContain('Toplam İhale Sayısı:');
      expect(txt).toContain('Rapor Tarihi:');
    });

    it('should include all tenders', () => {
      const txt = toTXT(mockTenders);

      expect(txt).toContain('1. İHALE');
      expect(txt).toContain('2. İHALE');
      expect(txt).toContain('Test İhale 1');
      expect(txt).toContain('Test İhale 2');
    });

    it('should include tender details with emojis', () => {
      const txt = toTXT(mockTenders);

      expect(txt).toContain('📋 İlan No');
      expect(txt).toContain('📌 Başlık');
      expect(txt).toContain('🏢 İdare');
      expect(txt).toContain('📍 Şehir');
      expect(txt).toContain('📝 İhale Türü');
      expect(txt).toContain('✅ Kısmi Teklif');
      expect(txt).toContain('📅 Yayın Tarihi');
      expect(txt).toContain('⏰ Teklif Tarihi');
      expect(txt).toContain('🔗 Link');
    });

    it('should format days remaining correctly', () => {
      const txt = toTXT(mockTenders);

      expect(txt).toContain('⏳ Durum');
      expect(txt).toContain('10 gün kaldı');
    });

    it('should handle null days remaining', () => {
      const txt = toTXT(mockTenders);

      // Should not throw and should handle null gracefully
      expect(txt).toBeDefined();
    });

    it('should include footer', () => {
      const txt = toTXT(mockTenders);

      expect(txt).toContain('Rapor Sonu');
      expect(txt).toContain('2 ihale listelendi');
    });

    it('should handle empty array', () => {
      const txt = toTXT([]);

      expect(txt).toContain('Toplam İhale Sayısı: 0');
      expect(txt).toContain('0 ihale listelendi');
    });

    it('should use visual separators', () => {
      const txt = toTXT(mockTenders);

      expect(txt).toContain('═');
      expect(txt).toContain('─');
    });

    it('should handle partial bid correctly', () => {
      const txt = toTXT(mockTenders);

      expect(txt).toContain('Hayır'); // First tender
      expect(txt).toContain('Evet'); // Second tender
    });
  });

  describe('Integration', () => {
    it('should produce consistent data across formats', () => {
      const csv = toCSV(mockTenders);
      const json = toJSON(mockTenders);
      const txt = toTXT(mockTenders);

      // All should include the same tender IDs
      expect(csv).toContain('12345');
      expect(json).toContain('12345');
      expect(txt).toContain('12345');

      expect(csv).toContain('67890');
      expect(json).toContain('67890');
      expect(txt).toContain('67890');
    });

    it('should handle large datasets', () => {
      const largeTenders: TenderExportData[] = [];

      for (let i = 0; i < 1000; i++) {
        largeTenders.push({
          id: `${i}`,
          tenderNumber: `2025/${i}`,
          title: `İhale ${i}`,
          organization: `Kurum ${i}`,
          city: 'İstanbul',
          tenderType: 'Açık ihale',
          partialBidAllowed: i % 2 === 0,
          publishDate: '01.01.2025',
          tenderDate: '15.01.2025',
          daysRemaining: 10,
          url: `https://example.com/${i}`,
        });
      }

      expect(() => toCSV(largeTenders)).not.toThrow();
      expect(() => toJSON(largeTenders)).not.toThrow();
      expect(() => toTXT(largeTenders)).not.toThrow();
    });
  });
});
