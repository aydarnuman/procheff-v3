/**
 * Market Robot v2.0 - Main Export
 * Tüm modüllere merkezi erişim
 */

// Core Types
export type {
  Source,
  BrandTier,
  PackagingType,
  PackagingInfo,
  MarketQuote,
  MarketFusion,
  ConfidenceBreakdown,
  BrandPriceOption,
  PriceVolatility,
  PriceRequest,
  BulkRequest
} from './schema';

// Schema & Validation
export {
  PriceRequestSchema,
  BulkRequestSchema
} from './schema';

// Price Guard
export {
  validatePrice,
  validatePriceBulk,
  suggestPriceRange,
  adjustTrustBySource
} from './price-guard';

export type {
  ValidationResult,
  ValidationViolation,
  GuardAction
} from './price-guard';

// Unit Conversion
export {
  parsePackaging,
  normalizePrice,
  convertUnit,
  makeComparable,
  smartPriceExtraction,
  calculatePackagePrice,
  isValidUnit,
  getSupportedUnits,
  getUnitCategory
} from './unit-converter';

export type {
  NormalizedPrice,
  ParsedPackaging
} from './unit-converter';

// Confidence System
export {
  calculateCategoryConfidence,
  calculateVariantConfidence,
  calculateMarketPriceConfidence,
  calculateConfidenceBreakdown,
  simpleConfidence,
  getConfidenceBadge,
  meetsThreshold,
  aggregateConfidence
} from './confidence';

export type {
  CategoryConfidence,
  VariantConfidence,
  MarketPriceConfidence
} from './confidence';

// Trust Scores
export {
  calculateDynamicTrust,
  getSourceReliabilityReport,
  recordValidation,
  getDynamicWeights,
  getSourcePerformanceSummary,
  initTrustScoreTable,
  formatTrustScore,
  BASE_SOURCE_WEIGHTS
} from './trust-score';

export type {
  SourceReliability,
  ValidationHistory
} from './trust-score';

// Product Normalizer
export {
  normalizeProductPipeline,
  normalizeBulk,
  addProductToDB,
  getProductsByCategory,
  getAllCategories
} from './product-normalizer';

export type {
  NormalizedProduct,
  ProductDatabase
} from './product-normalizer';

// Portion Calculator
export {
  calculatePortionCost,
  calculateMealCost,
  calculateBulkPortions,
  calculateServingsFromBudget,
  calculateProfitMargin,
  quickCalculate,
  generateCostSummary,
  STANDARD_PORTIONS
} from './portion-calculator';

export type {
  PortionCost,
  PortionCalculation
} from './portion-calculator';

// Volatility
export {
  analyzeVolatility,
  calculatePriceChange,
  comparePeriodicChanges,
  getVolatilityBadge,
  detectPriceSpikes,
  calculateMovingAverage,
  calculateBollingerBands
} from './volatility';

export type {
  PricePoint,
  PriceChange,
  VolatilityMetrics
} from './volatility';

// Fusion
export {
  fuse,
  fuseSync,
  debugFusion
} from './fuse';

// Forecast
export {
  expSmooth,
  forecastConfidence,
  forecastNextMonth,
  analyzeTrend
} from './forecast';

// Normalization (legacy)
export {
  normalizeProductName,
  normalizeUnit
} from './normalize';

// Cache
export {
  cacheGet,
  cacheSet,
  cacheClear
} from './cache';

// Database
export {
  runAllMigrations,
  checkMigrationStatus,
  upgradeMarketPricesTable,
  createPriceValidationsTable,
  createPriceHistoryTable,
  createProductCatalogTable,
  createCurrentPricesView,
  rollbackMigrations,
  getMigrationReport
} from './migration';

// Initialization
export {
  initializeMarketSystem,
  healthCheck,
  quickTest
} from './init';

// Providers
export { tuikQuote, getAvailableTUIKProducts } from './provider/tuik';
export { webQuote, webQuoteBulk, webHealthCheck } from './provider/web';
export { dbQuote, last12Months, seriesOf, savePriceRecord } from './provider/db';
export { aiQuote, shouldUseAI } from './provider/ai';

