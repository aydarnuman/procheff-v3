/**
 * Dynamic Trust Score System
 * Öğrenen kaynak güvenilirlik sistemi
 */

import type { Source } from './schema';
import { getDatabase } from '@/lib/db/universal-client';
import { AILogger } from '@/lib/ai/logger';

export interface SourceReliability {
  source: Source;
  baseTrust: number;           // Başlangıç güven skoru (0-1)
  historicalAccuracy: number;  // Geçmiş doğruluk oranı (0-1)
  recentPerformance: number;   // Son 30 gün performansı (0-1)
  finalTrust: number;          // Hesaplanmış final güven
  dataPoints: number;          // Toplam veri noktası sayısı
  lastUpdated: string;         // Son güncelleme
}

export interface ValidationHistory {
  source: Source;
  product_key: string;
  quoted_price: number;
  actual_price?: number;       // Gerçek fiyat (validation için)
  wasAccurate: boolean;        // Doğru muydu?
  deviation: number;           // Sapma yüzdesi
  timestamp: string;
}

/**
 * Statik kaynak ağırlıkları (REAL DATA MODE)
 * Mock data kaldırıldı, AI primary source
 */
export const BASE_SOURCE_WEIGHTS: Record<Source, number> = {
  migros: 0.1,
  a101: 0.08,
  bim: 0.08,
  sok: 0.07,
  carrefour: 0.08,
  hepsiburada: 0.05,
  trendyol: 0.06,
  ai: 0.12,
  scraper: 0.08,
  api: 0.08,
  TUIK: 0.04,
  WEB: 0.04,
  DB: 0.06,
  AI: 0.16
};

const TRACKED_SOURCES: Source[] = [
  'migros',
  'a101',
  'bim',
  'sok',
  'carrefour',
  'hepsiburada',
  'trendyol',
  'ai',
  'scraper',
  'api',
  'TUIK',
  'WEB',
  'DB',
  'AI'
];

/**
 * Dinamik trust score hesapla
 */
export function calculateDynamicTrust(
  source: Source,
  history: ValidationHistory[]
): number {
  const base = BASE_SOURCE_WEIGHTS[source];

  if (history.length === 0) {
    // Hiç veri yoksa base değeri kullan
    return base;
  }

  // Geçmiş doğruluk oranı
  const accurateCount = history.filter(h => h.wasAccurate).length;
  const accuracy = accurateCount / history.length;

  // Son 30 günün performansı
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentHistory = history.filter(h =>
    new Date(h.timestamp) >= thirtyDaysAgo
  );

  const recentAccuracy = recentHistory.length > 0
    ? recentHistory.filter(h => h.wasAccurate).length / recentHistory.length
    : accuracy;

  // Ortalama sapma (düşük sapma = yüksek güven)
  const avgDeviation = history.reduce((s, h) => s + Math.abs(h.deviation), 0) / history.length;
  const deviationScore = 1 / (1 + avgDeviation); // Normalize

  // Final trust formülü
  // base * (0.3) + accuracy * (0.4) + recentPerformance * (0.2) + deviationScore * (0.1)
  const dynamicTrust = (
    base * 0.3 +
    accuracy * 0.4 +
    recentAccuracy * 0.2 +
    deviationScore * 0.1
  );

  // 0-1 arasında sınırla
  return Number(Math.max(0.05, Math.min(1, dynamicTrust)).toFixed(2));
}

/**
 * Tüm kaynaklar için güvenilirlik raporunu al
 */
export async function getSourceReliabilityReport(): Promise<Map<Source, SourceReliability>> {
  const report = new Map<Source, SourceReliability>();

  for (const source of TRACKED_SOURCES) {
    try {
      const history = await getValidationHistory(source, 90); // Son 90 gün
      const finalTrust = calculateDynamicTrust(source, history);

      const accuracy = history.length > 0
        ? history.filter(h => h.wasAccurate).length / history.length
        : 0;

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentHistory = history.filter(h =>
        new Date(h.timestamp) >= thirtyDaysAgo
      );
      const recentPerf = recentHistory.length > 0
        ? recentHistory.filter(h => h.wasAccurate).length / recentHistory.length
        : 0;

      report.set(source, {
        source,
        baseTrust: BASE_SOURCE_WEIGHTS[source],
        historicalAccuracy: Number(accuracy.toFixed(2)),
        recentPerformance: Number(recentPerf.toFixed(2)),
        finalTrust,
        dataPoints: history.length,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      AILogger.warn('[TrustScore] Kaynak raporu alınamadı', {
        source,
        error: error instanceof Error ? error.message : 'Unknown'
      });

      // Hata durumunda base değeri kullan
      report.set(source, {
        source,
        baseTrust: BASE_SOURCE_WEIGHTS[source],
        historicalAccuracy: 0,
        recentPerformance: 0,
        finalTrust: BASE_SOURCE_WEIGHTS[source],
        dataPoints: 0,
        lastUpdated: new Date().toISOString()
      });
    }
  }

  return report;
}

/**
 * Validation history'yi veritabanından al
 */
async function getValidationHistory(
  source: Source,
  days = 90
): Promise<ValidationHistory[]> {
  try {
    const db = await getDatabase();

    const query = `
      SELECT
        source,
        product_key,
        quoted_price,
        actual_price,
        was_accurate as wasAccurate,
        deviation,
        timestamp
      FROM price_validations
      WHERE source = $1
        AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
      ORDER BY timestamp DESC
    `;

    const rows = await db.query(query, [source]) as any[];

    return rows.map(row => ({
      source: row.source as Source,
      product_key: row.product_key,
      quoted_price: row.quoted_price,
      actual_price: row.actual_price,
      wasAccurate: Boolean(row.wasaccurate),
      deviation: row.deviation,
      timestamp: row.timestamp
    }));
  } catch (error) {
    // Tablo henüz yoksa boş array dön
    AILogger.info('[TrustScore] Validation history alınamadı', {
      source,
      error: error instanceof Error ? error.message : 'Unknown'
    });
    return [];
  }
}

/**
 * Validation kaydı ekle (gelecekte kullanılmak üzere)
 */
export async function recordValidation(
  source: Source,
  product_key: string,
  quoted_price: number,
  actual_price: number,
  threshold = 0.15 // %15 sapma toleransı
): Promise<void> {
  try {
    const deviation = Math.abs(quoted_price - actual_price) / actual_price;
    const wasAccurate = deviation <= threshold;

    const db = await getDatabase();

    const query = `
      INSERT INTO price_validations
        (source, product_key, quoted_price, actual_price, was_accurate, deviation, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    `;

    await db.execute(query, [
      source,
      product_key,
      quoted_price,
      actual_price,
      wasAccurate,
      deviation
    ]);

    AILogger.info('[TrustScore] Validation kaydedildi', {
      source,
      product_key,
      wasAccurate,
      deviation: (deviation * 100).toFixed(1) + '%'
    });
  } catch (error) {
    AILogger.warn('[TrustScore] Validation kaydedilemedi', {
      source,
      product_key,
      error: error instanceof Error ? error.message : 'Unknown'
    });
  }
}

/**
 * Dinamik ağırlıkları al (fusion için)
 */
export async function getDynamicWeights(): Promise<Record<Source, number>> {
  const report = await getSourceReliabilityReport();

  const weights: Record<Source, number> = { ...BASE_SOURCE_WEIGHTS };

  // Her kaynak için dinamik trust'ı kullan
  for (const [source, reliability] of report.entries()) {
    weights[source] = reliability.finalTrust;
  }

  return weights;
}

/**
 * Kaynak performans özeti
 */
export async function getSourcePerformanceSummary(): Promise<string> {
  const report = await getSourceReliabilityReport();

  const lines = ['Kaynak Güvenilirlik Raporu:', ''];

  for (const [source, reliability] of report.entries()) {
    const badge = reliability.finalTrust >= 0.7 ? '✅' :
                  reliability.finalTrust >= 0.5 ? '⚠️' : '❌';

    lines.push(
      `${badge} ${source}:`,
      `   Trust: ${(reliability.finalTrust * 100).toFixed(0)}% (base: ${(reliability.baseTrust * 100).toFixed(0)}%)`,
      `   Accuracy: ${(reliability.historicalAccuracy * 100).toFixed(0)}%`,
      `   Recent: ${(reliability.recentPerformance * 100).toFixed(0)}%`,
      `   Data points: ${reliability.dataPoints}`,
      ''
    );
  }

  return lines.join('\n');
}

/**
 * Trust score database tablosu oluştur
 */
export async function initTrustScoreTable(): Promise<void> {
  try {
    const db = await getDatabase();

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS price_validations (
        id SERIAL PRIMARY KEY,
        source TEXT NOT NULL,
        product_key TEXT NOT NULL,
        quoted_price REAL NOT NULL,
        actual_price REAL,
        was_accurate BOOLEAN NOT NULL,
        deviation REAL NOT NULL,
        timestamp TIMESTAMP NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_price_validations_source
        ON price_validations(source, timestamp);

      CREATE INDEX IF NOT EXISTS idx_price_validations_product
        ON price_validations(product_key);
    `;

    await db.execute(createTableQuery);
    AILogger.info('[TrustScore] price_validations tablosu oluşturuldu');
  } catch (error) {
    AILogger.error('[TrustScore] Tablo oluşturma hatası', {
      error: error instanceof Error ? error.message : 'Unknown'
    });
  }
}

/**
 * Trust score'u UI için formatla
 */
export function formatTrustScore(trust: number): {
  percentage: string;
  badge: string;
  color: string;
} {
  const percentage = (trust * 100).toFixed(0) + '%';

  if (trust >= 0.8) {
    return { percentage, badge: 'Çok Güvenilir', color: 'green' };
  }
  if (trust >= 0.6) {
    return { percentage, badge: 'Güvenilir', color: 'blue' };
  }
  if (trust >= 0.4) {
    return { percentage, badge: 'Orta', color: 'yellow' };
  }
  return { percentage, badge: 'Düşük', color: 'red' };
}
