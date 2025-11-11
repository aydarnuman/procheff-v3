-- Migration: Add analysis tables for Phase 2
-- Created: 2024-11-11

-- Update analysis_history table to include new fields
ALTER TABLE analysis_history ADD COLUMN extracted_fields TEXT;
ALTER TABLE analysis_history ADD COLUMN contextual_analysis TEXT;
ALTER TABLE analysis_history ADD COLUMN market_analysis TEXT;
ALTER TABLE analysis_history ADD COLUMN validation TEXT;
ALTER TABLE analysis_history ADD COLUMN processing_time_ms INTEGER;
ALTER TABLE analysis_history ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create analysis results table
CREATE TABLE IF NOT EXISTS analysis_results (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL,
  stage TEXT NOT NULL, -- 'contextual', 'market', 'deep'
  result_data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (analysis_id) REFERENCES analysis_history(id)
);

-- Create market prices cache table
CREATE TABLE IF NOT EXISTS market_prices (
  product_key TEXT PRIMARY KEY,
  prices JSON NOT NULL,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confidence REAL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_analysis_results_analysis_id ON analysis_results(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_stage ON analysis_results(stage);
CREATE INDEX IF NOT EXISTS idx_market_prices_updated ON market_prices(last_updated);