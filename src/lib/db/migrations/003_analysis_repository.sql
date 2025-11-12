-- ============================================
-- ProCheff v3 - Analysis Repository Migration
-- Version: 003
-- Date: 2025-01-12
-- Purpose: Add tables for AnalysisRepository
-- ============================================

-- Analysis Results (queryable, normalized)
CREATE TABLE IF NOT EXISTS analysis_results_v2 (
  id TEXT PRIMARY KEY,
  tender_id TEXT,
  status TEXT CHECK(status IN ('pending', 'processing', 'completed', 'failed')),

  -- Normalized fields for querying
  institution TEXT,
  budget_amount REAL,
  person_count INTEGER,
  duration_days INTEGER,
  tender_type TEXT,

  -- Analysis scores
  contextual_score REAL,
  market_risk_level TEXT CHECK(market_risk_level IN ('low', 'medium', 'high', NULL)),
  data_quality_score REAL,

  -- Full JSON results
  extracted_fields_json TEXT,
  contextual_analysis_json TEXT,
  market_analysis_json TEXT,
  validation_json TEXT,

  -- Metadata
  processing_time_ms INTEGER,
  tokens_used INTEGER,
  cost_usd REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Full-text search index (FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS analysis_fts USING fts5(
  analysis_id UNINDEXED,
  content,
  tokenize = 'porter unicode61'
);

-- DataPool cache with expiration
CREATE TABLE IF NOT EXISTS data_pools (
  analysis_id TEXT PRIMARY KEY,
  data_pool_json TEXT NOT NULL,
  text_content TEXT,
  document_count INTEGER,
  table_count INTEGER,
  date_count INTEGER,
  entity_count INTEGER,
  total_size_bytes INTEGER,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Menu cache (hash-based deduplication)
CREATE TABLE IF NOT EXISTS menu_cache (
  hash TEXT PRIMARY KEY,
  menu_items_json TEXT NOT NULL,
  item_count INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- API Metrics tracking for cost analysis
CREATE TABLE IF NOT EXISTS api_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL,
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  cost_usd REAL,
  duration_ms INTEGER,
  success INTEGER DEFAULT 1,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_analysis_results_status
  ON analysis_results_v2(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_results_tender
  ON analysis_results_v2(tender_id);

CREATE INDEX IF NOT EXISTS idx_analysis_results_score
  ON analysis_results_v2(contextual_score DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_results_budget
  ON analysis_results_v2(budget_amount DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_results_institution
  ON analysis_results_v2(institution);

CREATE INDEX IF NOT EXISTS idx_datapool_expires
  ON data_pools(expires_at);

CREATE INDEX IF NOT EXISTS idx_menu_cache_last_used
  ON menu_cache(last_used_at);

CREATE INDEX IF NOT EXISTS idx_api_metrics_endpoint
  ON api_metrics(endpoint, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_metrics_cost
  ON api_metrics(cost_usd DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_metrics_model
  ON api_metrics(model, created_at DESC);

