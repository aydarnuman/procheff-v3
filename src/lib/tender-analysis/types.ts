/**
 * Tender Analysis Type Definitions
 */

import type { DataPool } from '@/lib/document-processor/types';

// Source tracking for provenance
export interface SourcedStatement {
  text: string;
  source_ref: string[];  // ["A:12", "T1:row3"]
  confidence: number;
  context?: string;      // Optional surrounding text
}

// Basic extracted fields from documents
export interface ExtractedFields {
  // Organization info
  kurum?: string;
  kurum_adres?: string;

  // Tender info
  ihale_turu?: string;
  ihale_no?: string;
  ikn?: string;

  // Scale info
  kisi_sayisi?: number;
  gun_sayisi?: number;
  ogun_sayisi?: number;

  // Financial info
  tahmini_butce?: number;
  gecici_teminat?: number;
  kesin_teminat?: number;

  // Dates
  ihale_tarihi?: Date;
  sozlesme_baslangic?: Date;
  teslim_suresi?: number; // days

  // Requirements
  belge_listesi?: string[];
  teknik_sartlar?: string[];
  cezai_sartlar?: SourcedStatement[];
}

// Contextual Analysis Output
export interface ContextualAnalysis {
  operasyonel_riskler: {
    seviye: 'dusuk' | 'orta' | 'yuksek';
    nedenler: SourcedStatement[];
    skor: number; // 0-100
    onlemler: string[];
  };

  maliyet_sapma_olasiligi: {
    oran: number; // 0-1
    faktorler: SourcedStatement[];
    tahmini_sapma_miktari?: number;
  };

  zaman_uygunlugu: {
    yeterli: boolean;
    gun_analizi: SourcedStatement[];
    kritik_tarihler: Array<{
      tarih: Date;
      aciklama: string;
      kaynak: string;
    }>;
  };

  personel_gereksinimi: {
    tahmini_sayi: number;
    detay: SourcedStatement[];
    kritik_pozisyonlar: string[];
  };

  ekipman_ihtiyaci: {
    kritik_ekipmanlar: string[];
    tahmini_maliyet?: number;
    kaynak: SourcedStatement[];
  };

  genel_degerlendirme: {
    puan: number; // 0-100
    ozet: string;
    oneriler: string[];
  };

  // 2025 Uyumluluk Kontrolü (optional - from old system)
  uyumluluk_2025?: {
    r_katsayisi_uygun: boolean;
    ekap_e_imza_gerekli: boolean;
    fiyat_fark_rejimi: string; // 'otomatik' | 'manuel' | 'hibrit'
    adt_ek_h4: boolean;
    uyarilar?: string[];
  };
}

// Menu item structure
export interface MenuItem {
  id?: string;
  name: string;
  category?: string;
  portion?: number;
  unit?: string;
  frequency?: string;
  notes?: string;
}

// Market Intelligence Output
export interface MarketAnalysis {
  cost_items: CostItem[];

  total_cost: number;

  cost_breakdown: {
    food_cost: number;
    labor_cost: number;
    operational_cost: number;
    overhead: number;
    profit_margin?: number;
  };

  price_sources: {
    tuik_used: boolean;
    web_used: boolean;
    db_used: boolean;
    manual_used: boolean;
  };

  forecast: {
    current_month: number;
    next_month: number;
    next_quarter?: number;
    trend: 'up' | 'down' | 'stable';
    seasonal_factor?: number;
    confidence: number;
  };

  comparison: {
    budget_vs_calculated: number;
    margin_percentage: number;
    risk_level: 'safe' | 'tight' | 'risky';
    recommendation: string;
  };

  warnings: string[];
}

export interface CostItem {
  product_key: string;
  name_original: string;
  name_normalized: string;
  category?: string;
  unit: string;
  quantity: number;

  // Price details from different sources
  prices: {
    tuik?: PriceData;
    web?: PriceData;
    db?: PriceData;
    manual?: PriceData;
  };

  // Fused result
  unit_price: number;
  confidence: number; // 0-1
  total_price: number;

  // Metadata
  last_updated?: Date;
  notes?: string;
}

export interface PriceData {
  value: number;
  currency: string;
  date: string;
  source?: string;
  confidence?: number;
}

// Validation results
export interface ValidationResult {
  is_valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  data_quality_score: number; // 0-100
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  source?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
  source?: string;
}

// Complete analysis result
export interface TenderAnalysisResult {
  analysis_id: string;
  created_at: Date;

  // Raw inputs
  data_pool: DataPool;

  // Extracted data
  extracted_fields: ExtractedFields;

  // Analysis results
  contextual?: ContextualAnalysis;
  market?: MarketAnalysis;

  // Validation
  validation?: ValidationResult;

  // Metadata
  processing_time_ms: number;
  tokens_used?: number;
  cost_usd?: number;

  // Status tracking
  status: AnalysisStatus;
  current_stage: AnalysisStage;
  errors?: string[];
}

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type AnalysisStage = 'extraction' | 'contextual' | 'market' | 'validation' | 'deep' | 'done';

// Processing options
export interface AnalysisOptions {
  enable_contextual: boolean;
  enable_market: boolean;
  enable_deep: boolean;
  use_ai_for_market: boolean;
  parallel_processing: boolean;
  save_to_db: boolean;
  generate_report: boolean;
}