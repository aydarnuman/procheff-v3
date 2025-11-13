/**
 * PriceGuard - Fiyat Doğrulama ve Validasyon Sistemi
 * Anormal, hatalı veya şüpheli fiyatları tespit eder
 */

import type { MarketQuote } from './schema';
import { AILogger } from '@/lib/ai/logger';

export type GuardAction = 'reject' | 'warn' | 'confirm';

export interface GuardRule {
  name: string;
  check: (quote: MarketQuote, history?: number[]) => boolean;
  action: GuardAction;
  message: string;
  severity: 'high' | 'medium' | 'low';
}

export interface ValidationViolation {
  rule: string;
  severity: 'high' | 'medium' | 'low';
  action: GuardAction;
  message: string;
  value?: number;
}

export interface ValidationResult {
  isValid: boolean;
  warnings: ValidationViolation[];
  requiresConfirmation: boolean;
  score: number; // 0-1 güvenilirlik skoru
}

/**
 * Validasyon kuralları
 */
const GUARD_RULES: GuardRule[] = [
  {
    name: 'zero_price',
    check: (q) => q.unit_price === 0,
    action: 'reject',
    message: 'Fiyat sıfır olamaz',
    severity: 'high'
  },
  {
    name: 'negative_price',
    check: (q) => q.unit_price < 0,
    action: 'reject',
    message: 'Negatif fiyat geçersiz',
    severity: 'high'
  },
  {
    name: 'too_low',
    check: (q) => q.unit_price < 0.5,
    action: 'reject',
    message: 'Fiyat çok düşük (< 0.5 TL) - muhtemelen hata',
    severity: 'high'
  },
  {
    name: 'suspiciously_low',
    check: (q) => q.unit_price >= 0.5 && q.unit_price < 2,
    action: 'warn',
    message: 'Fiyat şüpheli derecede düşük',
    severity: 'medium'
  },
  {
    name: 'premium_check',
    check: (q) => q.unit_price > 1000,
    action: 'confirm',
    message: 'Premium ürün? Fiyat çok yüksek (> 1000 TL)',
    severity: 'medium'
  },
  {
    name: 'extreme_price',
    check: (q) => q.unit_price > 5000,
    action: 'reject',
    message: 'Fiyat aşırı yüksek (> 5000 TL) - muhtemelen hata',
    severity: 'high'
  },
  {
    name: 'outlier_high',
    check: (q, history) => {
      if (!history || history.length < 3) return false;
      const avg = history.reduce((s, h) => s + h, 0) / history.length;
      const stdDev = Math.sqrt(
        history.reduce((s, h) => s + Math.pow(h - avg, 2), 0) / history.length
      );
      // 3 sigma dışında outlier
      return q.unit_price > avg + 3 * stdDev;
    },
    action: 'warn',
    message: 'Fiyat tarihsel ortalamadan çok yüksek',
    severity: 'medium'
  },
  {
    name: 'outlier_low',
    check: (q, history) => {
      if (!history || history.length < 3) return false;
      const avg = history.reduce((s, h) => s + h, 0) / history.length;
      const stdDev = Math.sqrt(
        history.reduce((s, h) => s + Math.pow(h - avg, 2), 0) / history.length
      );
      return q.unit_price < avg - 3 * stdDev;
    },
    action: 'warn',
    message: 'Fiyat tarihsel ortalamadan çok düşük',
    severity: 'medium'
  },
  {
    name: 'significant_deviation',
    check: (q, history) => {
      if (!history || history.length < 3) return false;
      const avg = history.reduce((s, h) => s + h, 0) / history.length;
      const deviation = Math.abs(q.unit_price - avg) / avg;
      // %100'den fazla sapma
      return deviation > 1.0;
    },
    action: 'warn',
    message: 'Fiyat ortalamanın %100+ üzerinde/altında',
    severity: 'low'
  },
  {
    name: 'old_data',
    check: (q) => {
      const quoteDate = new Date(q.asOf);
      const now = new Date();
      const daysDiff = (now.getTime() - quoteDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff > 90; // 90 günden eski
    },
    action: 'warn',
    message: 'Fiyat verisi çok eski (90+ gün)',
    severity: 'low'
  }
];

/**
 * Ana validasyon fonksiyonu
 */
export function validatePrice(
  quote: MarketQuote,
  history?: number[]
): ValidationResult {
  const violations: ValidationViolation[] = [];

  // Her kuralı kontrol et
  for (const rule of GUARD_RULES) {
    try {
      if (rule.check(quote, history)) {
        violations.push({
          rule: rule.name,
          severity: rule.severity,
          action: rule.action,
          message: rule.message,
          value: quote.unit_price
        });
      }
    } catch (error) {
      AILogger.warn('[PriceGuard] Kural kontrolü hatası', {
        rule: rule.name,
        error: error instanceof Error ? error.message : 'Unknown'
      });
    }
  }

  // Sonucu hesapla
  const hasRejection = violations.some(v => v.action === 'reject');
  const requiresConfirmation = violations.some(v => v.action === 'confirm');
  
  // Güvenilirlik skoru hesapla (0-1)
  const score = calculateValidationScore(violations, quote);

  const result: ValidationResult = {
    isValid: !hasRejection,
    warnings: violations.filter(v => v.action === 'warn'),
    requiresConfirmation,
    score
  };

  // Log critical rejections
  if (hasRejection) {
    AILogger.warn('[PriceGuard] Fiyat reddedildi', {
      product: quote.product_key,
      price: quote.unit_price,
      violations: violations.filter(v => v.action === 'reject')
    });
  }

  return result;
}

/**
 * Güvenilirlik skoru hesapla
 */
function calculateValidationScore(
  violations: ValidationViolation[],
  quote: MarketQuote
): number {
  if (violations.length === 0) {
    return 1.0; // Hiç ihlal yok, tam puan
  }

  // Her ihlal tipi için ceza
  const penalties = {
    reject: 1.0,   // Tam ceza (0 puan)
    confirm: 0.3,  // Orta ceza
    warn: 0.15     // Düşük ceza
  };

  const severityMultipliers = {
    high: 1.5,
    medium: 1.0,
    low: 0.5
  };

  let totalPenalty = 0;
  
  for (const violation of violations) {
    const basePenalty = penalties[violation.action];
    const multiplier = severityMultipliers[violation.severity];
    totalPenalty += basePenalty * multiplier;
  }

  // Skoru hesapla (0-1 arası)
  const score = Math.max(0, 1 - (totalPenalty / 3)); // Normalize
  
  return Number(score.toFixed(2));
}

/**
 * Toplu fiyat validasyonu (bulk operations için)
 */
export function validatePriceBulk(
  quotes: MarketQuote[],
  history?: Map<string, number[]>
): Map<string, ValidationResult> {
  const results = new Map<string, ValidationResult>();

  for (const quote of quotes) {
    const productHistory = history?.get(quote.product_key);
    const validation = validatePrice(quote, productHistory);
    results.set(quote.product_key, validation);
  }

  return results;
}

/**
 * Fiyat aralığı önerisi (guard'ın önerdiği makul aralık)
 */
export function suggestPriceRange(
  productKey: string,
  history?: number[]
): { min: number; max: number; avg: number } | null {
  if (!history || history.length < 3) {
    return null;
  }

  const avg = history.reduce((s, h) => s + h, 0) / history.length;
  const stdDev = Math.sqrt(
    history.reduce((s, h) => s + Math.pow(h - avg, 2), 0) / history.length
  );

  // ±2 sigma aralığı (normal dağılımın %95'i)
  return {
    min: Math.max(0, avg - 2 * stdDev),
    max: avg + 2 * stdDev,
    avg
  };
}

/**
 * Debug: Validasyon raporunu yazdır
 */
export function debugValidation(result: ValidationResult): string {
  const lines = [
    `Validasyon Sonucu:`,
    `  Geçerli: ${result.isValid ? '✓' : '✗'}`,
    `  Skor: ${(result.score * 100).toFixed(0)}%`,
    `  Uyarı Sayısı: ${result.warnings.length}`,
    `  Onay Gerekli: ${result.requiresConfirmation ? 'Evet' : 'Hayır'}`,
  ];

  if (result.warnings.length > 0) {
    lines.push('\nUyarılar:');
    for (const warning of result.warnings) {
      lines.push(`  • [${warning.severity}] ${warning.message}`);
    }
  }

  return lines.join('\n');
}

/**
 * Kaynak bazlı güven ayarlaması
 */
export function adjustTrustBySource(
  quote: MarketQuote,
  validationScore: number
): number {
  // Kaynak güvenilirliği ile validasyon skorunu birleştir
  const sourceTrust = quote.sourceTrust || 0.5;
  
  // Ağırlıklı ortalama (validation %60, source %40)
  return Number((validationScore * 0.6 + sourceTrust * 0.4).toFixed(2));
}

