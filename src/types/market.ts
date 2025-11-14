/**
 * Market Type Definitions
 * Types for market price data, product categories, and price analysis
 */

/**
 * Product category
 */
export type ProductCategory =
  | 'et_urunleri'
  | 'sebze'
  | 'meyve'
  | 'sut_urunleri'
  | 'bakliyat'
  | 'tahil'
  | 'baharat'
  | 'icecek'
  | 'temizlik'
  | 'diger';

/**
 * Price source
 */
export type PriceSource =
  | 'hal'
  | 'market'
  | 'toptan'
  | 'manual'
  | 'api'
  | 'scraper';

/**
 * Price unit
 */
export type PriceUnit = 'kg' | 'adet' | 'lt' | 'gr' | 'paket' | 'kutu' | 'diger';

/**
 * Price trend
 */
export type PriceTrend = 'increasing' | 'stable' | 'decreasing';

/**
 * Product
 */
export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  unit: PriceUnit;
  aliases?: string[];
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Price entry
 */
export interface PriceEntry {
  id: string;
  productId: string;
  productName: string;
  price: number;
  unit: PriceUnit;
  source: PriceSource;
  location?: string;
  date: string;
  quality?: 'standard' | 'premium' | 'economy';
  notes?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Price statistics
 */
export interface PriceStatistics {
  productId: string;
  productName: string;
  unit: PriceUnit;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  medianPrice: number;
  stdDeviation: number;
  sampleSize: number;
  lastUpdated: string;
}

/**
 * Price history
 */
export interface PriceHistory {
  productId: string;
  productName: string;
  entries: Array<{
    date: string;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    sampleSize: number;
  }>;
  trend: PriceTrend;
  changePercent: number;
}

/**
 * Market price data (aggregated)
 */
export interface MarketPriceData {
  product: string;
  category: ProductCategory;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  unit: PriceUnit;
  source: PriceSource;
  date: string;
  confidence: number;
  trend?: PriceTrend;
  changePercent?: number;
}

/**
 * Price comparison
 */
export interface PriceComparison {
  productName: string;
  category: ProductCategory;
  unit: PriceUnit;
  sources: Array<{
    source: PriceSource;
    price: number;
    location?: string;
    date: string;
  }>;
  recommended: {
    source: PriceSource;
    price: number;
    reason: string;
  };
  variance: number;
}

/**
 * Market API source
 */
export interface MarketAPISource {
  id: string;
  name: string;
  type: 'hal' | 'market' | 'wholesale' | 'custom';
  url: string;
  apiKey?: string;
  isActive: boolean;
  lastSync?: string;
  reliability: number;
}

/**
 * Price fetch request
 */
export interface PriceFetchRequest {
  products: string[];
  sources?: PriceSource[];
  dateRange?: {
    from: string;
    to: string;
  };
  includeHistory?: boolean;
}

/**
 * Price fetch response
 */
export interface PriceFetchResponse {
  success: boolean;
  data?: MarketPriceData[];
  errors?: Array<{
    product: string;
    error: string;
  }>;
  metadata: {
    totalProducts: number;
    successCount: number;
    failureCount: number;
    sources: PriceSource[];
    fetchedAt: string;
  };
}

/**
 * Cost estimation input
 */
export interface CostEstimationInput {
  items: Array<{
    product: string;
    quantity: number;
    unit: PriceUnit;
    category?: ProductCategory;
  }>;
  options?: {
    quality?: 'standard' | 'premium' | 'economy';
    preferredSources?: PriceSource[];
    includeMargin?: boolean;
    marginPercent?: number;
  };
}

/**
 * Cost estimation result
 */
export interface CostEstimationResult {
  items: Array<{
    product: string;
    quantity: number;
    unit: PriceUnit;
    unitPrice: number;
    totalPrice: number;
    priceSource: PriceSource;
    confidence: number;
    alternatives?: Array<{
      source: PriceSource;
      unitPrice: number;
      totalPrice: number;
    }>;
  }>;
  summary: {
    subtotal: number;
    margin?: number;
    marginPercent?: number;
    total: number;
    averageConfidence: number;
  };
  risks: Array<{
    type: 'price_volatility' | 'availability' | 'data_quality';
    severity: 'low' | 'medium' | 'high';
    description: string;
    affectedItems: string[];
  }>;
}

/**
 * Price alert
 */
export interface PriceAlert {
  id: string;
  productId: string;
  productName: string;
  condition: 'above' | 'below' | 'change_percent';
  threshold: number;
  currentValue: number;
  isTriggered: boolean;
  triggeredAt?: string;
  createdAt: string;
  isActive: boolean;
}

/**
 * Seasonal price data
 */
export interface SeasonalPriceData {
  productId: string;
  productName: string;
  seasons: Array<{
    season: 'spring' | 'summer' | 'fall' | 'winter';
    months: number[];
    avgPrice: number;
    priceChange: number;
    availability: 'high' | 'medium' | 'low';
  }>;
  peakSeason: string;
  offSeason: string;
}

/**
 * Supplier information
 */
export interface Supplier {
  id: string;
  name: string;
  type: 'wholesale' | 'producer' | 'distributor';
  categories: ProductCategory[];
  location?: string;
  contact?: {
    phone?: string;
    email?: string;
    address?: string;
  };
  rating?: number;
  reliability?: number;
  isActive: boolean;
}

/**
 * Price analysis request
 */
export interface PriceAnalysisRequest {
  tenderId: string;
  menuItems: Array<{
    name: string;
    quantity: number;
    unit: PriceUnit;
  }>;
  options?: {
    includeAlternatives?: boolean;
    includeTrends?: boolean;
    includeSeasonal?: boolean;
  };
}

/**
 * Price analysis result
 */
export interface PriceAnalysisResult {
  tenderId: string;
  items: Array<{
    menuItem: string;
    matchedProduct: string;
    matchConfidence: number;
    priceData: MarketPriceData;
    alternatives?: MarketPriceData[];
    trend?: PriceHistory;
    seasonalInfo?: SeasonalPriceData;
  }>;
  totalEstimate: {
    optimistic: number;
    realistic: number;
    pessimistic: number;
  };
  risks: string[];
  opportunities: string[];
  analyzedAt: string;
}
