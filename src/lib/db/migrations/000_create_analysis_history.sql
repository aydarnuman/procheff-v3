-- Base migration: ensure analysis_history and data_pools tables exist
-- Created: 2025-11-12

CREATE TABLE IF NOT EXISTS analysis_history (
  id TEXT PRIMARY KEY,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  extracted_fields TEXT,
  contextual_analysis TEXT,
  market_analysis TEXT,
  validation TEXT,
  processing_time_ms INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  storage_path TEXT,
  progress INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  current_step TEXT,
  steps_json TEXT,
  result TEXT,
  error TEXT,
  warnings TEXT,
  duration_ms INTEGER,
  user_id TEXT,
  started_at TEXT,
  completed_at TEXT,
  data_pool TEXT,
  input_files TEXT
);

CREATE INDEX IF NOT EXISTS idx_analysis_history_status
  ON analysis_history(status);

CREATE INDEX IF NOT EXISTS idx_analysis_history_created_at
  ON analysis_history(created_at DESC);

CREATE TABLE IF NOT EXISTS data_pools (
  analysis_id TEXT PRIMARY KEY,
  data_pool_json TEXT NOT NULL,
  text_content TEXT,
  document_count INTEGER,
  table_count INTEGER,
  date_count INTEGER,
  entity_count INTEGER,
  total_size_bytes INTEGER,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_data_pools_expires
  ON data_pools(expires_at);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL CHECK(level IN ('info', 'warning', 'error', 'success')),
  message TEXT NOT NULL,
  details TEXT,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_notifications_created
  ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(is_read, created_at DESC);

