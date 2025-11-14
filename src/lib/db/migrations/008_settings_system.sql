-- Settings System Migration
-- Stores user preferences and app configuration

-- User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL, -- 'profile', 'ai', 'pipeline', 'appearance', 'security'
  settings_json TEXT NOT NULL, -- JSON blob for flexibility
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, category)
);

-- App-wide Settings (not user-specific)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'database', 'performance', 'monitoring'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- API Keys Management (encrypted storage)
CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE, -- 'anthropic', 'google', 'upstash', etc.
  key_encrypted TEXT NOT NULL, -- Base64 encoded encrypted value
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'expired'
  last_used_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Database Backups Log
CREATE TABLE IF NOT EXISTS backup_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  backup_type TEXT NOT NULL, -- 'manual', 'scheduled', 'auto'
  status TEXT DEFAULT 'completed', -- 'completed', 'failed'
  error TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user
ON user_settings(user_id, category);

CREATE INDEX IF NOT EXISTS idx_app_settings_category
ON app_settings(category);

CREATE INDEX IF NOT EXISTS idx_api_keys_status
ON api_keys(status);

CREATE INDEX IF NOT EXISTS idx_backup_history_created
ON backup_history(created_at DESC);

-- Insert default app settings
INSERT OR IGNORE INTO app_settings (key, value, description, category) VALUES
  ('db_auto_vacuum', 'true', 'Enable automatic database vacuum', 'database'),
  ('db_backup_enabled', 'true', 'Enable automatic backups', 'database'),
  ('db_backup_interval', '86400', 'Backup interval in seconds (24h)', 'database'),
  ('db_retention_days', '30', 'Keep logs for N days', 'database'),
  ('cache_enabled', 'true', 'Enable Redis caching', 'performance'),
  ('cache_ttl', '3600', 'Cache TTL in seconds', 'performance'),
  ('rate_limit_enabled', 'true', 'Enable rate limiting', 'performance'),
  ('rate_limit_max', '100', 'Max requests per window', 'performance'),
  ('monitoring_enabled', 'true', 'Enable system monitoring', 'monitoring'),
  ('monitoring_interval', '10000', 'Monitoring check interval (ms)', 'monitoring');
