/**
 * Zod Validation Schemas for Market Robot Enterprise V5
 *
 * Tüm V2 interface'leri için runtime validation
 * @see src/lib/market/schema.ts
 */

import { z } from 'zod';

// ========================================
// CORE SCHEMAS
// ========================================

/**
 * Multi-dimensional market scoring schema
 */
export const MarketScoreSchema = z.object({
  overall: z.number().min(0).max(100),
  priceScore: z.number().min(0).max(100),
  reliabilityScore: z.number().min(0).max(100),
  completenessScore: z.number().min(0).max(100),
  stockScore: z.number().min(0).max(100),
  recencyScore: z.number().min(0).max(100),
  breakdown: z.string()
});

/**
 * Data completeness schema
 */
export const DataCompletenessSchema = z.object({
  hasPrice: z.boolean(),
  hasBrand: z.boolean(),
  hasStock: z.boolean(),
  hasImage: z.boolean(),
  completenessScore: z.number().min(0).max(1)
});

/**
 * Regional pricing schema
 */
export const RegionalPricingSchema = z.object({
  region: z.string().min(1),
  city: z.string().optional(),
  priceVariation: z.number()
});

/**
 * Enhanced MarketQuote V2 schema
 */
export const MarketQuoteV2Schema = z.object({
  // MarketQuote base fields
  product_key: z.string().min(1),
  raw_query: z.string().min(1),
  unit: z.string().min(1),
  unit_price: z.number().positive(),
  currency: z.literal('TRY'),
  market_key: z.enum(['migros', 'a101', 'bim', 'sok', 'carrefour', 'hepsiburada', 'trendyol']).optional(),
  stock_status: z.enum(['in_stock', 'out_of_stock', 'limited']).optional(),
  brand: z.string().optional(),
  brandTier: z.enum(['premium', 'standard', 'economy']).optional(),
  packaging: z.union([z.string(), z.object({
    size: z.number(),
    unit: z.string(),
    type: z.enum(['bulk', 'retail', 'wholesale']),
    description: z.string().optional()
  })]).optional(),
  quantity: z.number().optional(),
  asOf: z.string().datetime(),
  source: z.string(),
  sourceTrust: z.number().min(0).max(1).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),

  // V2 enhanced fields
  marketScore: MarketScoreSchema.optional(),
  fetchStatus: z.enum(['success', 'partial', 'failed']),
  failureReason: z.enum(['timeout', 'not_found', 'out_of_stock', 'api_error', 'parsing_error']).optional(),
  failureDetails: z.string().optional(),
  dataCompleteness: DataCompletenessSchema,
  regionalPricing: RegionalPricingSchema.optional()
});

/**
 * SKU suggestion schema
 */
export const SKUSuggestionSchema = z.object({
  sku: z.string().min(1),
  brand: z.string().min(1),
  size: z.string().min(1),
  unit: z.string().min(1),
  estimatedPrice: z.number().nonnegative(),
  availability: z.enum(['high', 'medium', 'low']),
  marketCoverage: z.number().min(0).max(1)
});

/**
 * Normalized Product V2 schema (3-layer detection)
 */
export const NormalizedProductV2Schema = z.object({
  // Layer 1
  input: z.string().min(1),
  canonical: z.string().min(1),
  productKey: z.string().min(1),
  confidence: z.number().min(0).max(1),
  method: z.enum(['exact', 'fuzzy', 'ai', 'fallback']),

  // Layer 2
  category: z.string().min(1),
  categoryConfidence: z.number().min(0).max(1),
  attributes: z.object({
    brand: z.string().optional(),
    size: z.string().optional(),
    packaging: z.string().optional(),
    type: z.string().optional()
  }),
  variant: z.string().optional(),
  validVariants: z.array(z.string()),
  invalidVariantsRemoved: z.array(z.string()).optional(),

  // Layer 3
  skuSuggestions: z.array(SKUSuggestionSchema).optional()
});

// ========================================
// PRICE INTELLIGENCE SCHEMAS
// ========================================

/**
 * Source contribution schema
 */
export const SourceContributionSchema = z.object({
  realMarketData: z.object({
    percentage: z.number().min(0).max(100),
    sourceCount: z.number().int().nonnegative(),
    avgPrice: z.number().positive(),
    weight: z.number().nonnegative()
  }),
  aiEstimation: z.object({
    percentage: z.number().min(0).max(100),
    model: z.string(),
    confidence: z.number().min(0).max(1),
    avgPrice: z.number().positive(),
    weight: z.number().nonnegative()
  }),
  historicalTrend: z.object({
    percentage: z.number().min(0).max(100),
    dataPoints: z.number().int().nonnegative(),
    trendDirection: z.enum(['rising', 'falling', 'stable']),
    weight: z.number().nonnegative()
  }),
  tuikData: z.object({
    percentage: z.number().min(0).max(100),
    lastUpdate: z.string().datetime(),
    officialPrice: z.number().positive(),
    weight: z.number().nonnegative()
  }).optional()
});

/**
 * Data freshness schema
 */
export const DataFreshnessSchema = z.object({
  averageAge: z.number().nonnegative(),
  oldestSource: z.string(),
  newestSource: z.string(),
  staleDataCount: z.number().int().nonnegative()
});

/**
 * Price consistency schema
 */
export const PriceConsistencySchema = z.object({
  score: z.number().min(0).max(1),
  coefficientOfVariation: z.number().nonnegative(),
  outlierCount: z.number().int().nonnegative(),
  standardDeviation: z.number().nonnegative(),
  explanation: z.string()
});

/**
 * Price intelligence schema
 */
export const PriceIntelligenceSchema = z.object({
  finalPrice: z.number().positive(),
  currency: z.literal('TRY'),
  confidence: z.number().min(0).max(1),

  sourceContribution: SourceContributionSchema,
  dataFreshness: DataFreshnessSchema,
  priceConsistency: PriceConsistencySchema,

  priceRange: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
    avg: z.number().positive()
  }),

  volatility: z.object({
    score: z.number().min(0).max(1),
    trend: z.enum(['rising', 'falling', 'stable']),
    avgDailyChange: z.number(),
    maxSpike: z.number(),
    recommendation: z.string()
  }).optional()
});

// ========================================
// RISK ANALYSIS SCHEMAS
// ========================================

/**
 * Price volatility risk schema
 */
export const PriceVolatilityRiskSchema = z.object({
  score: z.number().min(0).max(100),
  level: z.enum(['low', 'medium', 'high']),
  stdDev: z.number().nonnegative(),
  coefficientOfVariation: z.number().nonnegative(),
  trend: z.enum(['rising', 'falling', 'stable']),
  maxSpike: z.number(),
  recommendation: z.string()
});

/**
 * Stock availability risk schema
 */
export const StockAvailabilityRiskSchema = z.object({
  score: z.number().min(0).max(100),
  level: z.enum(['low', 'medium', 'high']),
  availabilityRate: z.number().min(0).max(100),
  avgStockDuration: z.number().nonnegative(),
  frequentOutages: z.boolean(),
  affectedMarkets: z.array(z.string()),
  recommendation: z.string()
});

/**
 * Supplier concentration risk schema
 */
export const SupplierConcentrationRiskSchema = z.object({
  score: z.number().min(0).max(100),
  level: z.enum(['low', 'medium', 'high']),
  dominantSupplier: z.string().optional(),
  marketShare: z.number().min(0).max(100),
  diversificationIndex: z.number().nonnegative(),
  recommendation: z.string()
});

/**
 * Seasonality risk schema
 */
export const SeasonalityRiskSchema = z.object({
  score: z.number().min(0).max(100),
  level: z.enum(['low', 'medium', 'high']),
  isSeasonal: z.boolean(),
  peakMonths: z.array(z.string()).optional(),
  priceVariation: z.number(),
  currentPhase: z.enum(['peak', 'off-peak', 'transitioning']),
  recommendation: z.string()
});

/**
 * Data quality risk schema
 */
export const DataQualityRiskSchema = z.object({
  score: z.number().min(0).max(100),
  level: z.enum(['low', 'medium', 'high']),
  completeness: z.number().min(0).max(100),
  freshness: z.number().min(0).max(100),
  consistency: z.number().min(0).max(100),
  sourceReliability: z.number().min(0).max(100),
  recommendation: z.string()
});

/**
 * Risk alert schema
 */
export const RiskAlertSchema = z.object({
  severity: z.enum(['info', 'warning', 'critical']),
  category: z.string(),
  message: z.string(),
  actionable: z.boolean(),
  suggestedAction: z.string().optional()
});

/**
 * Product risk analysis schema
 */
export const ProductRiskAnalysisSchema = z.object({
  overallRiskScore: z.number().min(0).max(100),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),

  risks: z.object({
    priceVolatility: PriceVolatilityRiskSchema,
    stockAvailability: StockAvailabilityRiskSchema,
    supplierConcentration: SupplierConcentrationRiskSchema,
    seasonality: SeasonalityRiskSchema,
    dataQuality: DataQualityRiskSchema
  }),

  alerts: z.array(RiskAlertSchema),
  mitigationStrategies: z.array(z.string()),
  lastUpdated: z.string().datetime()
});

// ========================================
// MARKET FUSION V2 SCHEMAS
// ========================================

/**
 * Scan summary schema
 */
export const ScanSummarySchema = z.object({
  totalScanned: z.number().int().nonnegative(),
  successful: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  failureReasons: z.array(z.object({
    source: z.string(),
    reason: z.string(),
    details: z.string().optional()
  }))
});

/**
 * Enhanced brand price option V2 schema
 */
export const BrandPriceOptionV2Schema = z.object({
  brand: z.string(),
  avgPrice: z.number().positive(),
  marketScore: z.number().min(0).max(100),
  availability: z.string(),
  source: z.string(),
  lastUpdated: z.string().datetime()
});

/**
 * Market Fusion V2 schema
 */
export const MarketFusionV2Schema = z.object({
  // Base MarketFusion fields
  product_key: z.string().min(1),
  unit: z.string().min(1),
  price: z.number().positive(),
  conf: z.number().min(0).max(1),
  sources: z.array(z.any()), // MarketQuote array

  // Optional base fields
  confidenceBreakdown: z.object({
    category: z.number().min(0).max(1),
    variant: z.number().min(0).max(1),
    marketPrice: z.number().min(0).max(1),
    weighted: z.number().min(0).max(1),
    sourceReliability: z.number().min(0).max(1).optional(),
    priceConsistency: z.number().min(0).max(1).optional(),
    dataCompleteness: z.number().min(0).max(1).optional(),
    freshness: z.number().min(0).max(1).optional(),
    explanation: z.string().optional()
  }).optional(),

  priceByBrand: z.array(z.object({
    brand: z.string(),
    price: z.number(),
    availability: z.enum(['in_stock', 'limited', 'out_of_stock']),
    source: z.string(),
    packaging: z.any().optional(),
    lastUpdated: z.string()
  })).optional(),

  volatility: z.object({
    score: z.number().min(0).max(1),
    trend: z.enum(['rising', 'falling', 'stable']),
    avgDailyChange: z.number(),
    maxSpike: z.number(),
    recommendation: z.string()
  }).optional(),

  forecast: z.object({
    nextMonth: z.number(),
    conf: z.number(),
    method: z.enum(['exp_smoothing', 'arima', 'sarima']),
    trend: z.enum(['rising', 'falling', 'stable']).optional()
  }).optional(),

  timestamp: z.string().optional(),
  aiInsights: z.string().optional(),
  averagePrice: z.number().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  priceRange: z.number().optional(),
  currency: z.literal('TRY').optional(),

  meta: z.object({
    outliers_removed: z.number().optional(),
    packaging: z.enum(['bulk', 'retail', 'wholesale']).optional(),
    brand_tier: z.enum(['premium', 'standard', 'economy']).optional(),
    provider_health: z.array(z.string()).optional(),
    cache_hit: z.boolean().optional()
  }).optional(),

  // V2 enhanced fields
  priceIntelligence: PriceIntelligenceSchema.optional(),
  riskAnalysis: ProductRiskAnalysisSchema.optional(),
  priceByBrandV2: z.array(BrandPriceOptionV2Schema).optional(),
  scanSummary: ScanSummarySchema.optional()
});

// ========================================
// API REQUEST/RESPONSE SCHEMAS
// ========================================

/**
 * Enhanced price request schema (V2)
 */
export const EnhancedPriceRequestSchema = z.object({
  product: z.string().min(1, 'Ürün adı gerekli'),
  unit: z.string().optional(),
  includeRiskAnalysis: z.boolean().optional().default(false),
  includeSKUSuggestions: z.boolean().optional().default(false),
  includeRegionalPricing: z.boolean().optional().default(false)
});

/**
 * Product detection request schema
 */
export const ProductDetectRequestSchema = z.object({
  product: z.string().min(1, 'Ürün adı gerekli'),
  includeSKU: z.boolean().optional().default(true)
});

/**
 * Risk analysis request schema
 */
export const RiskAnalyzeRequestSchema = z.object({
  productKey: z.string().min(1, 'Product key gerekli'),
  includePriceHistory: z.boolean().optional().default(true),
  includeStockHistory: z.boolean().optional().default(true)
});

/**
 * Enhanced price response schema
 */
export const EnhancedPriceResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    normalized: NormalizedProductV2Schema.optional(),
    fusion: MarketFusionV2Schema
  }),
  error: z.string().optional()
});

/**
 * Product detection response schema
 */
export const ProductDetectResponseSchema = z.object({
  success: z.boolean(),
  data: NormalizedProductV2Schema.optional(),
  error: z.string().optional()
});

/**
 * Risk analysis response schema
 */
export const RiskAnalyzeResponseSchema = z.object({
  success: z.boolean(),
  data: ProductRiskAnalysisSchema.optional(),
  error: z.string().optional()
});

// ========================================
// TYPE INFERENCE
// ========================================

export type MarketScoreInput = z.infer<typeof MarketScoreSchema>;
export type DataCompletenessInput = z.infer<typeof DataCompletenessSchema>;
export type RegionalPricingInput = z.infer<typeof RegionalPricingSchema>;
export type MarketQuoteV2Input = z.infer<typeof MarketQuoteV2Schema>;
export type SKUSuggestionInput = z.infer<typeof SKUSuggestionSchema>;
export type NormalizedProductV2Input = z.infer<typeof NormalizedProductV2Schema>;
export type SourceContributionInput = z.infer<typeof SourceContributionSchema>;
export type DataFreshnessInput = z.infer<typeof DataFreshnessSchema>;
export type PriceConsistencyInput = z.infer<typeof PriceConsistencySchema>;
export type PriceIntelligenceInput = z.infer<typeof PriceIntelligenceSchema>;
export type PriceVolatilityRiskInput = z.infer<typeof PriceVolatilityRiskSchema>;
export type StockAvailabilityRiskInput = z.infer<typeof StockAvailabilityRiskSchema>;
export type SupplierConcentrationRiskInput = z.infer<typeof SupplierConcentrationRiskSchema>;
export type SeasonalityRiskInput = z.infer<typeof SeasonalityRiskSchema>;
export type DataQualityRiskInput = z.infer<typeof DataQualityRiskSchema>;
export type RiskAlertInput = z.infer<typeof RiskAlertSchema>;
export type ProductRiskAnalysisInput = z.infer<typeof ProductRiskAnalysisSchema>;
export type ScanSummaryInput = z.infer<typeof ScanSummarySchema>;
export type BrandPriceOptionV2Input = z.infer<typeof BrandPriceOptionV2Schema>;
export type MarketFusionV2Input = z.infer<typeof MarketFusionV2Schema>;
export type EnhancedPriceRequest = z.infer<typeof EnhancedPriceRequestSchema>;
export type ProductDetectRequest = z.infer<typeof ProductDetectRequestSchema>;
export type RiskAnalyzeRequest = z.infer<typeof RiskAnalyzeRequestSchema>;
export type EnhancedPriceResponse = z.infer<typeof EnhancedPriceResponseSchema>;
export type ProductDetectResponse = z.infer<typeof ProductDetectResponseSchema>;
export type RiskAnalyzeResponse = z.infer<typeof RiskAnalyzeResponseSchema>;

// ========================================
// VALIDATION HELPERS
// ========================================

/**
 * Validate and parse enhanced price request
 */
export function validateEnhancedPriceRequest(data: unknown): EnhancedPriceRequest {
  return EnhancedPriceRequestSchema.parse(data);
}

/**
 * Validate and parse product detection request
 */
export function validateProductDetectRequest(data: unknown): ProductDetectRequest {
  return ProductDetectRequestSchema.parse(data);
}

/**
 * Validate and parse risk analysis request
 */
export function validateRiskAnalyzeRequest(data: unknown): RiskAnalyzeRequest {
  return RiskAnalyzeRequestSchema.parse(data);
}

/**
 * Safe parse with error formatting
 */
export function safeParseRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string; details: z.ZodIssue[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    error: 'Validation failed',
    details: result.error.issues
  };
}
