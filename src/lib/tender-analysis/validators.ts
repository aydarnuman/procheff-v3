/**
 * Data Validation Module
 * Validates and checks consistency of analysis data
 */

import type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ExtractedFields,
  ContextualAnalysis,
  MarketAnalysis
} from './types';

/**
 * Validate analysis data
 */
export function validateAnalysisData(
  extractedFields: ExtractedFields,
  contextual?: ContextualAnalysis,
  market?: MarketAnalysis
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate extracted fields
  validateExtractedFields(extractedFields, errors, warnings);

  // Validate contextual analysis
  if (contextual) {
    validateContextualAnalysis(contextual, extractedFields, errors, warnings);
  }

  // Validate market analysis
  if (market) {
    validateMarketAnalysis(market, extractedFields, errors, warnings);
  }

  // Cross-validate between analyses
  if (contextual && market) {
    crossValidate(contextual, market, extractedFields, errors, warnings);
  }

  // Calculate data quality score
  const dataQualityScore = calculateDataQualityScore(
    extractedFields,
    errors,
    warnings
  );

  return {
    is_valid: errors.filter(e => e.severity === 'critical').length === 0,
    errors,
    warnings,
    data_quality_score: dataQualityScore
  };
}

/**
 * Validate extracted fields
 */
function validateExtractedFields(
  fields: ExtractedFields,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // Check required fields
  if (!fields.kurum) {
    warnings.push({
      field: 'kurum',
      message: 'Kurum bilgisi bulunamadı',
      suggestion: 'İlan metninden kurum adını manuel olarak ekleyin'
    });
  }

  if (!fields.ihale_tarihi) {
    errors.push({
      field: 'ihale_tarihi',
      message: 'İhale tarihi bulunamadı',
      severity: 'high'
    });
  }

  // Validate person count
  if (fields.kisi_sayisi) {
    if (fields.kisi_sayisi < 10) {
      warnings.push({
        field: 'kisi_sayisi',
        message: `Kişi sayısı çok düşük: ${fields.kisi_sayisi}`,
        suggestion: 'Kişi sayısını kontrol edin'
      });
    } else if (fields.kisi_sayisi > 10000) {
      warnings.push({
        field: 'kisi_sayisi',
        message: `Kişi sayısı çok yüksek: ${fields.kisi_sayisi}`,
        suggestion: 'Kişi sayısını kontrol edin'
      });
    }
  }

  // Validate day count
  if (fields.gun_sayisi) {
    if (fields.gun_sayisi < 1) {
      errors.push({
        field: 'gun_sayisi',
        message: 'Gün sayısı geçersiz',
        severity: 'high'
      });
    } else if (fields.gun_sayisi > 730) {
      warnings.push({
        field: 'gun_sayisi',
        message: `Gün sayısı 2 yıldan fazla: ${fields.gun_sayisi}`,
        suggestion: 'Süreyi kontrol edin'
      });
    }
  }

  // Validate budget
  if (fields.tahmini_butce) {
    if (fields.tahmini_butce < 10000) {
      warnings.push({
        field: 'tahmini_butce',
        message: `Bütçe çok düşük: ${fields.tahmini_butce} TL`,
        suggestion: 'Bütçe birimini kontrol edin (TL/USD/EUR)'
      });
    }
  }

  // Validate dates
  if (fields.ihale_tarihi && fields.sozlesme_baslangic) {
    const daysBetween = Math.floor(
      (fields.sozlesme_baslangic.getTime() - fields.ihale_tarihi.getTime()) /
      (1000 * 60 * 60 * 24)
    );

    if (daysBetween < 0) {
      errors.push({
        field: 'sozlesme_baslangic',
        message: 'Sözleşme başlangıcı ihale tarihinden önce',
        severity: 'high'
      });
    } else if (daysBetween < 7) {
      warnings.push({
        field: 'sozlesme_baslangic',
        message: `Hazırlık süresi çok kısa: ${daysBetween} gün`,
        suggestion: 'Hazırlık için yeterli süre olduğundan emin olun'
      });
    }
  }
}

/**
 * Validate contextual analysis
 */
function validateContextualAnalysis(
  contextual: ContextualAnalysis,
  fields: ExtractedFields,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // Check risk level consistency
  if (contextual.operasyonel_riskler.seviye === 'yuksek' &&
      contextual.genel_degerlendirme.puan > 80) {
    warnings.push({
      field: 'contextual.risk',
      message: 'Yüksek risk seviyesi ile yüksek puan uyumsuz',
      suggestion: 'Risk değerlendirmesini gözden geçirin'
    });
  }

  // Validate personnel requirement
  if (contextual.personel_gereksinimi.tahmini_sayi > 0 && fields.kisi_sayisi) {
    const ratioPerPerson = fields.kisi_sayisi / contextual.personel_gereksinimi.tahmini_sayi;

    if (ratioPerPerson > 200) {
      warnings.push({
        field: 'contextual.personel',
        message: `Personel başına düşen kişi sayısı çok yüksek: ${Math.round(ratioPerPerson)}`,
        suggestion: 'Personel sayısını artırmayı düşünün'
      });
    }
  }

  // Check cost deviation
  if (contextual.maliyet_sapma_olasiligi.oran > 0.5) {
    warnings.push({
      field: 'contextual.maliyet_sapma',
      message: `Yüksek maliyet sapma riski: %${Math.round(contextual.maliyet_sapma_olasiligi.oran * 100)}`,
      suggestion: 'Detaylı maliyet analizi yapın'
    });
  }
}

/**
 * Validate market analysis
 */
function validateMarketAnalysis(
  market: MarketAnalysis,
  fields: ExtractedFields,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // Check if cost items exist
  if (market.cost_items.length === 0) {
    errors.push({
      field: 'market.cost_items',
      message: 'Maliyet kalemleri bulunamadı',
      severity: 'high'
    });
  }

  // Validate total cost
  if (market.total_cost <= 0) {
    errors.push({
      field: 'market.total_cost',
      message: 'Toplam maliyet hesaplanamadı',
      severity: 'critical'
    });
  }

  // Check cost breakdown consistency
  const breakdown = market.cost_breakdown;
  const calculatedTotal = breakdown.food_cost +
                         breakdown.labor_cost +
                         breakdown.operational_cost +
                         breakdown.overhead +
                         (breakdown.profit_margin || 0);

  const difference = Math.abs(calculatedTotal - market.total_cost);
  const percentageDiff = (difference / market.total_cost) * 100;

  if (percentageDiff > 10) {
    warnings.push({
      field: 'market.cost_breakdown',
      message: `Maliyet dağılımı tutarsız: %${Math.round(percentageDiff)} fark`,
      suggestion: 'Maliyet hesaplamalarını kontrol edin'
    });
  }

  // Check low confidence items
  const lowConfidenceItems = market.cost_items.filter(item => item.confidence < 0.5);
  if (lowConfidenceItems.length > 0) {
    warnings.push({
      field: 'market.cost_items',
      message: `${lowConfidenceItems.length} ürün için düşük fiyat güvenilirliği`,
      suggestion: 'Bu ürünler için manuel fiyat araştırması yapın'
    });
  }

  // Validate comparison with budget
  if (fields.tahmini_butce && market.comparison) {
    if (market.comparison.risk_level === 'risky') {
      errors.push({
        field: 'market.comparison',
        message: `Hesaplanan maliyet bütçeyi aşıyor: ${Math.abs(market.comparison.margin_percentage)}%`,
        severity: 'high'
      });
    }
  }
}

/**
 * Cross-validate between analyses
 */
function crossValidate(
  contextual: ContextualAnalysis,
  market: MarketAnalysis,
  fields: ExtractedFields,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // Check consistency between risk assessments
  if (contextual.operasyonel_riskler.seviye === 'yuksek' &&
      market.comparison.risk_level === 'safe') {
    warnings.push({
      field: 'cross_validation',
      message: 'Operasyonel risk yüksek ama finansal risk düşük görünüyor',
      suggestion: 'Risk değerlendirmelerini yeniden gözden geçirin'
    });
  }

  // Check personnel cost alignment
  if (contextual.personel_gereksinimi.tahmini_sayi > 0) {
    const avgSalary = 15000; // Average monthly salary estimate
    const months = (fields.gun_sayisi || 365) / 30;
    const estimatedLaborCost = contextual.personel_gereksinimi.tahmini_sayi * avgSalary * months;

    const difference = Math.abs(estimatedLaborCost - market.cost_breakdown.labor_cost);
    const percentageDiff = (difference / market.cost_breakdown.labor_cost) * 100;

    if (percentageDiff > 30) {
      warnings.push({
        field: 'cross_validation.labor',
        message: `İşçilik maliyeti tahminleri uyumsuz: %${Math.round(percentageDiff)} fark`,
        suggestion: 'Personel sayısı ve maaş tahminlerini kontrol edin'
      });
    }
  }
}

/**
 * Calculate data quality score
 */
function calculateDataQualityScore(
  fields: ExtractedFields,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): number {
  let score = 100;

  // Deduct for missing required fields
  const requiredFields = [
    'kurum', 'ihale_tarihi', 'ihale_turu',
    'kisi_sayisi', 'gun_sayisi', 'tahmini_butce'
  ];

  for (const field of requiredFields) {
    if (!(field in fields) || (fields as Record<string, unknown>)[field] === undefined) {
      score -= 10;
    }
  }

  // Deduct for errors
  for (const error of errors) {
    switch (error.severity) {
      case 'critical':
        score -= 20;
        break;
      case 'high':
        score -= 10;
        break;
      case 'medium':
        score -= 5;
        break;
      case 'low':
        score -= 2;
        break;
    }
  }

  // Deduct for warnings (less penalty)
  score -= warnings.length * 2;

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score));
}