import { MarketQuote } from '../schema';

/**
 * TÜİK (Türkiye İstatistik Kurumu) fiyat sağlayıcısı
 * Gerçek entegrasyon için TÜİK API veya CSV import gerekir
 * Şimdilik mock data ile çalışıyor
 */

// Mock TÜİK verileri (gerçek entegrasyonda buradan silinecek)
const TUIK_MOCK_DATA: Record<string, { unit_price: number; unit: string; asOf: string }> = {
  'tavuk-eti': { unit_price: 95.80, unit: 'kg', asOf: '2025-11-01' },
  'zeytinyagi': { unit_price: 285.50, unit: 'lt', asOf: '2025-11-01' },
  'makarna': { unit_price: 38.20, unit: 'kg', asOf: '2025-11-01' },
  'sut': { unit_price: 24.50, unit: 'lt', asOf: '2025-11-01' },
  'yogurt': { unit_price: 45.30, unit: 'kg', asOf: '2025-11-01' },
  'beyaz-peynir': { unit_price: 182.40, unit: 'kg', asOf: '2025-11-01' },
  'domates': { unit_price: 28.90, unit: 'kg', asOf: '2025-11-01' },
  'sivri-biber': { unit_price: 42.10, unit: 'kg', asOf: '2025-11-01' },
  'sogan': { unit_price: 18.60, unit: 'kg', asOf: '2025-11-01' },
  'sarimsak': { unit_price: 68.20, unit: 'kg', asOf: '2025-11-01' },
  'patates': { unit_price: 22.50, unit: 'kg', asOf: '2025-11-01' },
  'pirinc': { unit_price: 52.80, unit: 'kg', asOf: '2025-11-01' },
  'mercimek': { unit_price: 65.40, unit: 'kg', asOf: '2025-11-01' },
  'nohut': { unit_price: 78.90, unit: 'kg', asOf: '2025-11-01' },
  'fasulye': { unit_price: 95.20, unit: 'kg', asOf: '2025-11-01' },
  'un': { unit_price: 18.50, unit: 'kg', asOf: '2025-11-01' },
  'seker': { unit_price: 42.30, unit: 'kg', asOf: '2025-11-01' },
  'tuz': { unit_price: 8.90, unit: 'kg', asOf: '2025-11-01' },
};

/**
 * TÜİK'ten fiyat getir
 * NOT: TÜİK public API yok, bu provider devre dışı
 */
export async function tuikQuote(product_key: string): Promise<MarketQuote | null> {
  // TÜİK public API olmadığı için null dön
  // AI provider devreye girecek
  console.log('[TUIK] Public API yok, AI provider kullanılacak');
  return null;
}

/**
 * TÜİK veri güncelleme (CSV import için)
 * Gerçek uygulamada aylık cron job ile çalışacak
 */
export async function updateTUIKData(csvPath: string): Promise<number> {
  // TODO: CSV parse ve veritabanına yazma
  console.log('[TUIK Provider] Veri güncelleme:', csvPath);
  return 0;
}

/**
 * TÜİK'te mevcut ürünleri listele
 */
export function getAvailableTUIKProducts(): string[] {
  return Object.keys(TUIK_MOCK_DATA);
}
