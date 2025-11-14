import { z } from 'zod';

export type Source = 
  | "migros"
  | "a101"
  | "bim"
  | "sok"
  | "carrefour"
  | "hepsiburada"
  | "trendyol"
  | "ai"
  | "scraper"
  | "api"
  | 'TUIK' | 'WEB' | 'DB' | 'AI'; // Backward compat
export type BrandTier = 'premium' | 'standard' | 'economy';
export type PackagingType = 'bulk' | 'retail' | 'wholesale';

// Paketleme bilgisi
export interface PackagingInfo {
  size: number;              // Paket boyutu (5, 10, 18 gibi)
  unit: string;              // Paket birimi (kg, lt, adet)
  type: PackagingType;       // Paket tipi
  description?: string;      // "18 LT bidon", "5 kg çuval" gibi
}

// Gelişmiş MarketQuote - Brand ve packaging desteği
export interface MarketQuote {
  product_key: string;          // normalize edilmiş anahtar (örn: "tavuk-eti")
  raw_query: string;            // kullanıcı girdi metni
  unit: string;                 // kg | lt | adet
  unit_price: number;           // TL (normalize edilmiş birim fiyat)
  currency: 'TRY';
  market_key?: Source;          // 🔥 EKLENDİ (market identifier)
  stock_status?: "in_stock" | "out_of_stock" | "limited";
  brand?: string;               // Marka adı (Orkide, Komili, vb.)
  brandTier?: BrandTier;        // Marka segmenti
  packaging?: string | PackagingInfo;
  quantity?: number;
  asOf: string;                 // ISO tarih
  source: Source;
  sourceTrust?: number;         // 0-1 arası güvenilirlik
  meta?: Record<string, unknown>;   // link, mağaza vs.
}

// Güven skoru detay breakdown
export interface ConfidenceBreakdown {
  // Old (backward compatible)
  category: number;             // Ürün kategori tespiti güveni (0-1)
  variant: number;              // Varyant match güveni (0-1)
  marketPrice: number;          // Fiyat füzyon güveni (0-1)
  weighted: number;             // Final ağırlıklı skor (0-1)
  
  // New (UI tarafından zorunlu)
  sourceReliability?: number;   // Kaynak güvenilirliği (0-1)
  priceConsistency?: number;    // Fiyat tutarlılığı (0-1)
  dataCompleteness?: number;    // Veri tamlığı (0-1)
  freshness?: number;           // Veri güncelliği (0-1)
  explanation?: string;         // "Yüksek güven: 3 kaynak uyumlu" gibi
}

// Marka bazlı fiyat seçenekleri
export interface BrandPriceOption {
  brand: string;
  price: number;
  availability: 'in_stock' | 'limited' | 'out_of_stock';
  source: Source;
  packaging?: PackagingInfo;
  lastUpdated: string;
}

// Volatility/Değişkenlik analizi
export interface PriceVolatility {
  score: number;                // 0-1: volatilite skoru
  trend: 'rising' | 'falling' | 'stable';
  avgDailyChange: number;       // Ortalama günlük değişim (%)
  maxSpike: number;             // En büyük sıçrama (%)
  recommendation: string;       // "Şimdi alın" / "Bekleyin" gibi
}

// Gelişmiş MarketFusion
export interface MarketFusion {
  product_key: string;
  unit: string;
  price: number;                // füzyon sonucu
  conf: number;                 // 0-1 güven skoru (backward compatible)
  sources: MarketQuote[];       // katkıda bulunanlar
  
  // YENİ: Detaylı güven breakdown
  confidenceBreakdown?: ConfidenceBreakdown;
  
  // YENİ: Marka bazlı fiyatlar
  priceByBrand?: BrandPriceOption[];
  
  // YENİ: Volatilite bilgisi
  volatility?: PriceVolatility;
  
  forecast?: {                  // opsiyonel tahmin
    nextMonth: number;
    conf: number;
    method: 'exp_smoothing' | 'arima' | 'sarima';
    trend?: 'rising' | 'falling' | 'stable';
  };
  
  // COMPACT UI için ek meta bilgiler
  timestamp?: string;
  aiInsights?: string;
  averagePrice?: number;
  minPrice?: number;
  maxPrice?: number;
  priceRange?: number;
  currency?: 'TRY';
  
  meta?: {
    outliers_removed?: number;      // Filtrelenen aşırı fiyat sayısı
    packaging?: PackagingType;      // Dominant paketleme tipi
    brand_tier?: BrandTier;         // Dominant marka segmenti  
    provider_health?: string[];     // Aktif provider listesi
    cache_hit?: boolean;            // Cache'ten mi geldi
  };
}

// Zod şemaları
export const PriceRequestSchema = z.object({
  product: z.string().min(1, 'Ürün adı gerekli'),
  unit: z.string().optional(),
});

export const BulkRequestSchema = z.object({
  items: z.array(z.object({
    product: z.string().min(1),
    unit: z.string().optional(),
  })).min(1, 'En az 1 ürün gerekli'),
});

export type PriceRequest = z.infer<typeof PriceRequestSchema>;
export type BulkRequest = z.infer<typeof BulkRequestSchema>;

// ========================================
// ENTERPRISE V5 ENHANCED TYPES
// ========================================

/**
 * Multi-dimensional market scoring
 * Fiyat, güvenilirlik, tamlık, stok ve güncelliği birleştirir
 */
export interface MarketScore {
  overall: number;              // 0-100: Genel skor
  priceScore: number;           // 0-100: Fiyat rekabetçiliği
  reliabilityScore: number;     // 0-100: Kaynak güvenilirliği
  completenessScore: number;    // 0-100: Veri tamlığı
  stockScore: number;           // 0-100: Stok durumu
  recencyScore: number;         // 0-100: Veri güncelliği
  breakdown: string;            // İnsan okunabilir açıklama
}

/**
 * Veri tamlığı analizi
 */
export interface DataCompleteness {
  hasPrice: boolean;
  hasBrand: boolean;
  hasStock: boolean;
  hasImage: boolean;
  completenessScore: number;    // 0-1
}

/**
 * Bölgesel fiyatlandırma (opsiyonel)
 */
export interface RegionalPricing {
  region: string;               // "Marmara", "Ege", vb.
  city?: string;
  priceVariation: number;       // % fark (ülke ortalamasına göre)
}

/**
 * Enhanced MarketQuote (V2)
 * Backward compatible - MarketQuote'u extend eder
 */
export interface MarketQuoteV2 extends MarketQuote {
  // Multi-dimensional scoring
  marketScore?: MarketScore;

  // Failure tracking
  fetchStatus: 'success' | 'partial' | 'failed';
  failureReason?: 'timeout' | 'not_found' | 'out_of_stock' | 'api_error' | 'parsing_error';
  failureDetails?: string;

  // Data completeness
  dataCompleteness: DataCompleteness;

  // Regional pricing
  regionalPricing?: RegionalPricing;
}

/**
 * SKU suggestion (ürün × marka × boyut kombinasyonu)
 */
export interface SKUSuggestion {
  sku: string;                  // "taris-1kg-domates-salcasi"
  brand: string;
  size: string;
  unit: string;
  estimatedPrice: number;
  availability: 'high' | 'medium' | 'low';
  marketCoverage: number;       // 0-1: Kaç markette mevcut
}

/**
 * Normalized Product V2 (3-layer detection)
 */
export interface NormalizedProductV2 {
  // Layer 1: Normalization
  input: string;
  canonical: string;
  productKey: string;
  confidence: number;           // 0-1
  method: 'exact' | 'fuzzy' | 'ai' | 'fallback';

  // Layer 2: Category & Attributes
  category: string;
  categoryConfidence: number;   // 0-1
  attributes: {
    brand?: string;
    size?: string;
    packaging?: string;
    type?: string;              // "sızma", "rafine", vb.
  };
  variant?: string;
  validVariants: string[];      // Kategori-filtreli varyantlar
  invalidVariantsRemoved?: string[]; // Debug için

  // Layer 3: SKU Level
  skuSuggestions?: SKUSuggestion[];
}

/**
 * Kaynak katkı dağılımı (hangi % market, hangi % AI, vb.)
 */
export interface SourceContribution {
  realMarketData: {
    percentage: number;         // 0-100
    sourceCount: number;
    avgPrice: number;
    weight: number;
  };
  aiEstimation: {
    percentage: number;         // 0-100
    model: string;              // "claude-sonnet-4"
    confidence: number;         // 0-1
    avgPrice: number;
    weight: number;
  };
  historicalTrend: {
    percentage: number;         // 0-100
    dataPoints: number;
    trendDirection: 'rising' | 'falling' | 'stable';
    weight: number;
  };
  tuikData?: {
    percentage: number;         // 0-100
    lastUpdate: string;
    officialPrice: number;
    weight: number;
  };
}

/**
 * Veri tazeliği bilgisi
 */
export interface DataFreshness {
  averageAge: number;           // hours
  oldestSource: string;         // "migros (3 days ago)"
  newestSource: string;         // "a101 (2 hours ago)"
  staleDataCount: number;       // > 7 days
}

/**
 * Fiyat tutarlılık analizi
 */
export interface PriceConsistency {
  score: number;                // 0-1
  coefficientOfVariation: number;
  outlierCount: number;
  standardDeviation: number;
  explanation: string;
}

/**
 * AI Fiyat İstihbaratı
 */
export interface PriceIntelligence {
  finalPrice: number;
  currency: 'TRY';
  confidence: number;           // 0-1 (backward compatible)

  sourceContribution: SourceContribution;
  dataFreshness: DataFreshness;
  priceConsistency: PriceConsistency;

  priceRange: {
    min: number;
    max: number;
    avg: number;
  };

  volatility?: PriceVolatility;
}

/**
 * Risk analizi - Fiyat oynaklığı
 */
export interface PriceVolatilityRisk {
  score: number;                // 0-100
  level: 'low' | 'medium' | 'high';
  stdDev: number;
  coefficientOfVariation: number;
  trend: 'rising' | 'falling' | 'stable';
  maxSpike: number;             // %
  recommendation: string;
}

/**
 * Risk analizi - Stok durumu
 */
export interface StockAvailabilityRisk {
  score: number;                // 0-100
  level: 'low' | 'medium' | 'high';
  availabilityRate: number;     // %
  avgStockDuration: number;     // hours
  frequentOutages: boolean;
  affectedMarkets: string[];
  recommendation: string;
}

/**
 * Risk analizi - Tedarikçi konsantrasyonu
 */
export interface SupplierConcentrationRisk {
  score: number;                // 0-100
  level: 'low' | 'medium' | 'high';
  dominantSupplier?: string;
  marketShare: number;          // %
  diversificationIndex: number; // Herfindahl index
  recommendation: string;
}

/**
 * Risk analizi - Mevsimsellik
 */
export interface SeasonalityRisk {
  score: number;                // 0-100
  level: 'low' | 'medium' | 'high';
  isSeasonal: boolean;
  peakMonths?: string[];
  priceVariation: number;       // %
  currentPhase: 'peak' | 'off-peak' | 'transitioning';
  recommendation: string;
}

/**
 * Risk analizi - Veri kalitesi
 */
export interface DataQualityRisk {
  score: number;                // 0-100
  level: 'low' | 'medium' | 'high';
  completeness: number;         // %
  freshness: number;            // %
  consistency: number;          // %
  sourceReliability: number;    // %
  recommendation: string;
}

/**
 * Risk uyarısı
 */
export interface RiskAlert {
  severity: 'info' | 'warning' | 'critical';
  category: string;
  message: string;
  actionable: boolean;
  suggestedAction?: string;
}

/**
 * Kapsamlı ürün riski analizi
 */
export interface ProductRiskAnalysis {
  overallRiskScore: number;     // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';

  risks: {
    priceVolatility: PriceVolatilityRisk;
    stockAvailability: StockAvailabilityRisk;
    supplierConcentration: SupplierConcentrationRisk;
    seasonality: SeasonalityRisk;
    dataQuality: DataQualityRisk;
  };

  alerts: RiskAlert[];
  mitigationStrategies: string[];
  lastUpdated: string;
}

/**
 * Tarama özeti (başarılı/başarısız)
 */
export interface ScanSummary {
  totalScanned: number;
  successful: number;
  failed: number;
  failureReasons: Array<{
    source: Source;
    reason: string;
    details?: string;
  }>;
}

/**
 * Enhanced Market Fusion V2
 * Backward compatible - MarketFusion'u extend eder
 */
export interface MarketFusionV2 extends MarketFusion {
  // Price intelligence
  priceIntelligence?: PriceIntelligence;

  // Risk analysis
  riskAnalysis?: ProductRiskAnalysis;

  // Enhanced brand options (with scores)
  priceByBrandV2?: Array<{
    brand: string;
    avgPrice: number;
    marketScore: number;
    availability: string;
    source: Source;
    lastUpdated: string;
  }>;

  // Scan summary
  scanSummary?: ScanSummary;
}

// ========================================
// TYPE GUARDS
// ========================================

/**
 * Check if a MarketQuote is V2 (has enhanced features)
 */
export function isMarketQuoteV2(quote: MarketQuote): quote is MarketQuoteV2 {
  return 'fetchStatus' in quote && 'dataCompleteness' in quote;
}

/**
 * Check if a MarketFusion is V2 (has enhanced features)
 */
export function isMarketFusionV2(fusion: MarketFusion): fusion is MarketFusionV2 {
  return 'priceIntelligence' in fusion || 'riskAnalysis' in fusion || 'scanSummary' in fusion;
}

/**
 * Check if a product has SKU suggestions
 */
export function hasSkuSuggestions(product: NormalizedProductV2): product is NormalizedProductV2 & { skuSuggestions: SKUSuggestion[] } {
  return !!product.skuSuggestions && product.skuSuggestions.length > 0;
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Convert MarketQuote to MarketQuoteV2 (with defaults)
 */
export function upgradeToMarketQuoteV2(quote: MarketQuote): MarketQuoteV2 {
  return {
    ...quote,
    fetchStatus: 'success',
    dataCompleteness: {
      hasPrice: !!quote.unit_price,
      hasBrand: !!quote.brand,
      hasStock: !!quote.stock_status,
      hasImage: !!(quote.meta?.image),
      completenessScore: calculateCompletenessScore({
        hasPrice: !!quote.unit_price,
        hasBrand: !!quote.brand,
        hasStock: !!quote.stock_status,
        hasImage: !!(quote.meta?.image),
        completenessScore: 0
      })
    }
  };
}

function calculateCompletenessScore(completeness: DataCompleteness): number {
  const weights = {
    hasPrice: 0.4,
    hasBrand: 0.2,
    hasStock: 0.2,
    hasImage: 0.2
  };

  let score = 0;
  if (completeness.hasPrice) score += weights.hasPrice;
  if (completeness.hasBrand) score += weights.hasBrand;
  if (completeness.hasStock) score += weights.hasStock;
  if (completeness.hasImage) score += weights.hasImage;

  return score;
}

/**
 * Convert MarketFusion to MarketFusionV2 (with defaults)
 */
export function upgradeToMarketFusionV2(fusion: MarketFusion): MarketFusionV2 {
  return {
    ...fusion,
    scanSummary: {
      totalScanned: fusion.sources.length,
      successful: fusion.sources.length,
      failed: 0,
      failureReasons: []
    }
  };
}
