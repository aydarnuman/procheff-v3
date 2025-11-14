/**
 * Analysis Type Definitions
 * Types for tender analysis, data pool, and AI analysis results
 */

/**
 * Analysis status
 */
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Analysis data source
 */
export interface DataSource {
  id: string;
  type: 'document' | 'table' | 'text' | 'extracted';
  filename?: string;
  pageNumber?: number;
  sectionName?: string;
}

/**
 * Extracted text item
 */
export interface ExtractedText {
  id: string;
  content: string;
  source: DataSource;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Extracted table
 */
export interface ExtractedTable {
  id: string;
  title?: string;
  headers: string[];
  rows: Array<Record<string, unknown>>;
  source: DataSource;
  category?: 'menu' | 'cost' | 'personnel' | 'technical' | 'other';
}

/**
 * Data pool - raw extracted data
 */
export interface DataPool {
  id: string;
  tenderId: string;
  texts: ExtractedText[];
  tables: ExtractedTable[];
  metadata: {
    totalFiles: number;
    totalPages: number;
    extractedAt: string;
    confidence: number;
  };
}

/**
 * Basic tender information
 */
export interface TenderBasicInfo {
  kurum: string;
  ihale_turu: string;
  kisilik: number;
  butce?: number;
  gun_sayisi?: number;
  konum?: string;
  yetkili?: string;
}

/**
 * Critical dates
 */
export interface CriticalDates {
  ilan_tarihi?: string;
  son_teklif_tarihi?: string;
  ihale_tarihi?: string;
  baslangic_tarihi?: string;
  bitis_tarihi?: string;
}

/**
 * Risk assessment
 */
export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  category: 'operational' | 'financial' | 'time' | 'personnel' | 'technical';
  description: string;
  score: number;
  mitigation?: string;
}

/**
 * Opportunity assessment
 */
export interface OpportunityAssessment {
  type: 'profit' | 'scale' | 'reputation' | 'strategic';
  description: string;
  potential: number;
  confidence: number;
}

/**
 * Contextual analysis result
 */
export interface ContextualAnalysis {
  id: string;
  tenderId: string;
  basicInfo: TenderBasicInfo;
  criticalDates: CriticalDates;
  risks: RiskAssessment[];
  opportunities: OpportunityAssessment[];
  operationalFeasibility: {
    score: number;
    factors: Array<{
      name: string;
      status: 'pass' | 'warning' | 'fail';
      description: string;
    }>;
  };
  costDeviation: {
    probability: number;
    factors: string[];
    estimatedRange: {
      min: number;
      max: number;
    };
  };
  timeAdequacy: {
    isAdequate: boolean;
    preparationDays: number;
    concerns: string[];
  };
  personnelRequirement: {
    required: number;
    available: number;
    gap: number;
    skills: string[];
  };
  equipmentNeeds: {
    items: Array<{
      name: string;
      quantity: number;
      available: boolean;
      cost?: number;
    }>;
    totalCost: number;
  };
  createdAt: string;
}

/**
 * Market price data
 */
export interface MarketPrice {
  product: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  unit: string;
  source: string;
  date: string;
  confidence: number;
}

/**
 * Market analysis result
 */
export interface MarketAnalysis {
  id: string;
  tenderId: string;
  products: MarketPrice[];
  totalEstimatedCost: number;
  priceVariance: number;
  marketTrends: Array<{
    product: string;
    trend: 'increasing' | 'stable' | 'decreasing';
    changePercent: number;
  }>;
  createdAt: string;
}

/**
 * Cost breakdown item
 */
export interface CostBreakdownItem {
  category: string;
  subcategory?: string;
  amount: number;
  unit: string;
  quantity: number;
  totalCost: number;
  notes?: string;
}

/**
 * Cost analysis result
 */
export interface CostAnalysis {
  id: string;
  tenderId: string;
  breakdown: CostBreakdownItem[];
  totalCost: number;
  profitMargin: number;
  estimatedProfit: number;
  riskAdjustedCost: number;
  confidence: number;
  assumptions: string[];
  createdAt: string;
}

/**
 * AI recommendation
 */
export interface AIRecommendation {
  type: 'strategic' | 'operational' | 'financial' | 'risk';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  rationale: string;
  actionItems?: string[];
}

/**
 * Decision result
 */
export interface DecisionResult {
  id: string;
  tenderId: string;
  decision: 'participate' | 'skip' | 'participate_cautiously';
  confidence: number;
  reasoning: string;
  recommendations: AIRecommendation[];
  prerequisites: Array<{
    requirement: string;
    status: 'met' | 'unmet' | 'partial';
    description: string;
  }>;
  strategicFit: {
    score: number;
    factors: string[];
  };
  createdAt: string;
}

/**
 * Complete analysis result
 */
export interface CompleteAnalysis {
  id: string;
  tenderId: string;
  dataPool: DataPool;
  contextualAnalysis?: ContextualAnalysis;
  marketAnalysis?: MarketAnalysis;
  costAnalysis?: CostAnalysis;
  decisionResult?: DecisionResult;
  status: AnalysisStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Analysis request
 */
export interface AnalysisRequest {
  tenderId: string;
  files: File[];
  options?: {
    skipMarketAnalysis?: boolean;
    forceOCR?: boolean;
    aiModel?: string;
  };
}

/**
 * Analysis progress
 */
export interface AnalysisProgress {
  stage: 'upload' | 'extraction' | 'contextual' | 'market' | 'cost' | 'decision' | 'complete';
  progress: number;
  message: string;
  estimatedTime?: number;
}
