-- Migration: 009_ai_logs_table.sql
-- Create AI logs table for tracking AI operations
--Date: 2025-11-14

CREATE TABLE IF NOT EXISTS ai_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL CHECK(level IN ('info', 'warn', 'error', 'success')),
  message TEXT NOT NULL,
  context TEXT, -- JSON string with additional context
  tokens_used INTEGER,
  duration_ms INTEGER,
  model TEXT,
  endpoint TEXT,
  user_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient querying by level and date
CREATE INDEX IF NOT EXISTS idx_ai_logs_level_created
ON ai_logs(level, created_at DESC);

-- Index for user-specific logs
CREATE INDEX IF NOT EXISTS idx_ai_logs_user
ON ai_logs(user_id, created_at DESC);

-- Index for endpoint tracking
CREATE INDEX IF NOT EXISTS idx_ai_logs_endpoint
ON ai_logs(endpoint, created_at DESC);
