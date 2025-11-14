-- Migration: 009_complete_settings_system
-- Date: 2025-01-14
-- Purpose: Add missing tables for settings system (2FA, Notifications, Reports, Performance)
-- Safety: Uses IF NOT EXISTS to prevent conflicts

-- ============================================
-- 1. TWO-FACTOR AUTHENTICATION
-- ============================================
CREATE TABLE IF NOT EXISTS user_2fa (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  secret TEXT NOT NULL,
  backup_codes TEXT, -- JSON array of 8 backup codes
  enabled INTEGER DEFAULT 0, -- 0 = disabled, 1 = enabled
  enabled_at TEXT,
  last_used TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. SECURITY AUDIT LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  action TEXT NOT NULL, -- login, logout, 2fa_enable, 2fa_disable, password_change, etc.
  ip_address TEXT,
  user_agent TEXT,
  metadata TEXT, -- JSON for additional data
  success INTEGER DEFAULT 1, -- 0 = failed, 1 = success
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. NOTIFICATION SYSTEM
-- ============================================
CREATE TABLE IF NOT EXISTS notification_channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'email', 'sms', 'push', 'in_app'
  destination TEXT NOT NULL, -- email address, phone number, device token
  verified INTEGER DEFAULT 0,
  verification_token TEXT,
  verification_expires TEXT,
  settings TEXT, -- JSON for channel-specific settings
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL, -- 'pipeline_complete', 'analysis_done', etc.
  name TEXT NOT NULL,
  description TEXT,
  email_subject TEXT,
  email_body TEXT, -- HTML template
  sms_template TEXT,
  push_template TEXT,
  in_app_template TEXT,
  variables TEXT, -- JSON array of required variables
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  channel_id INTEGER,
  template_id INTEGER,
  data TEXT, -- JSON with template variables
  status TEXT DEFAULT 'pending', -- 'pending', 'sending', 'sent', 'failed'
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  scheduled_for TEXT,
  sent_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (channel_id) REFERENCES notification_channels(id),
  FOREIGN KEY (template_id) REFERENCES notification_templates(id)
);

-- ============================================
-- 4. REPORT SYSTEM
-- ============================================
CREATE TABLE IF NOT EXISTS report_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'analysis', 'summary', 'detailed', 'custom'
  sections TEXT NOT NULL, -- JSON array of sections to include
  filters TEXT, -- JSON for default filters
  format TEXT DEFAULT 'pdf', -- 'pdf', 'excel', 'csv', 'html'
  schedule TEXT, -- Cron expression for scheduled reports
  recipients TEXT, -- JSON array of email addresses
  last_generated TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS report_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER,
  file_path TEXT,
  file_size INTEGER, -- in bytes
  generation_time INTEGER, -- in milliseconds
  status TEXT, -- 'success', 'failed', 'partial'
  error_message TEXT,
  generated_by TEXT,
  generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES report_templates(id)
);

-- ============================================
-- 5. PERFORMANCE SETTINGS
-- ============================================
CREATE TABLE IF NOT EXISTS performance_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  type TEXT NOT NULL, -- 'number', 'boolean', 'string', 'json'
  category TEXT, -- 'cache', 'memory', 'database', 'api'
  description TEXT,
  min_value INTEGER,
  max_value INTEGER,
  default_value TEXT,
  requires_restart INTEGER DEFAULT 0,
  updated_by TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS performance_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  settings TEXT NOT NULL, -- JSON with all settings
  is_active INTEGER DEFAULT 0,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. API KEY MANAGEMENT (Update existing table)
-- ============================================
-- Add missing columns to existing api_keys table if they don't exist
-- SQLite doesn't support ADD COLUMN IF NOT EXISTS, so we'll handle this in code

-- ============================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_2fa_user
  ON user_2fa(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user
  ON security_audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created
  ON security_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_channels_user
  ON notification_channels(user_id, type);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status
  ON notification_queue(status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_report_history_template
  ON report_history(template_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_settings_category
  ON performance_settings(category, name);

-- ============================================
-- 8. DEFAULT DATA
-- ============================================

-- Default notification templates
INSERT OR IGNORE INTO notification_templates (code, name, description, email_subject, email_body, active) VALUES
  ('pipeline_complete', 'Pipeline Tamamlandı', 'Auto-pipeline işlemi tamamlandığında',
   'ProCheff: Pipeline Tamamlandı - {{tender_name}}',
   '<h2>Pipeline başarıyla tamamlandı</h2><p>{{tender_name}} için analiz hazır.</p>', 1),

  ('pipeline_failed', 'Pipeline Başarısız', 'Pipeline hata ile sonlandığında',
   'ProCheff: Pipeline Hatası - {{tender_name}}',
   '<h2>Pipeline hata verdi</h2><p>{{tender_name}} için işlem başarısız: {{error_message}}</p>', 1),

  ('report_ready', 'Rapor Hazır', 'Rapor oluşturulduğunda',
   'ProCheff: Raporunuz Hazır',
   '<h2>Raporunuz hazır</h2><p>{{report_name}} raporuna <a href="{{download_link}}">buradan</a> ulaşabilirsiniz.</p>', 1);

-- Default performance settings
INSERT OR IGNORE INTO performance_settings (name, value, type, category, description, default_value, min_value, max_value) VALUES
  ('cache_ttl', '3600', 'number', 'cache', 'Cache TTL in seconds', '3600', 60, 86400),
  ('max_memory_mb', '512', 'number', 'memory', 'Maximum memory usage in MB', '512', 128, 2048),
  ('parallel_tasks', '4', 'number', 'processing', 'Number of parallel tasks', '4', 1, 16),
  ('db_connection_limit', '10', 'number', 'database', 'Database connection pool size', '10', 5, 50),
  ('api_rate_limit', '100', 'number', 'api', 'API requests per minute', '100', 10, 1000),
  ('enable_compression', 'true', 'boolean', 'api', 'Enable response compression', 'true', NULL, NULL),
  ('enable_caching', 'true', 'boolean', 'cache', 'Enable Redis caching', 'true', NULL, NULL);

-- Default performance profiles
INSERT OR IGNORE INTO performance_profiles (name, description, settings, is_active) VALUES
  ('low', 'Low resource usage', '{"cache_ttl": 1800, "max_memory_mb": 256, "parallel_tasks": 2}', 0),
  ('medium', 'Balanced performance', '{"cache_ttl": 3600, "max_memory_mb": 512, "parallel_tasks": 4}', 1),
  ('high', 'Maximum performance', '{"cache_ttl": 7200, "max_memory_mb": 1024, "parallel_tasks": 8}', 0);