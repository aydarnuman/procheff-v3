-- Migration: Add storage_path and progress fields to analysis_history
-- Created: 2025-01-XX

-- Add storage_path column for file storage tracking
ALTER TABLE analysis_history ADD COLUMN storage_path TEXT;

-- Add progress column for progress tracking (0-100)
ALTER TABLE analysis_history ADD COLUMN progress INTEGER DEFAULT 0;

-- Update status enum to include 'queued'
-- Note: SQLite doesn't support ENUM, so this is just documentation
-- Status values: 'pending', 'queued', 'processing', 'completed', 'failed'

-- Create index for faster lookups by status
CREATE INDEX IF NOT EXISTS idx_analysis_history_status ON analysis_history(status);

-- Create index for storage_path lookups
CREATE INDEX IF NOT EXISTS idx_analysis_history_storage_path ON analysis_history(storage_path);

