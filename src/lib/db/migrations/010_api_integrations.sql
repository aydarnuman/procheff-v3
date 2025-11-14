-- Migration 010: API & Integrations System
-- Created: 2025-11-14
-- Description: Add tables for webhooks, API usage tracking, and third-party integrations

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT NOT NULL, -- JSON array of event types
  headers TEXT, -- JSON object with custom headers
  secret TEXT, -- For HMAC signature validation
  active INTEGER DEFAULT 1,
  retry_count INTEGER DEFAULT 3,
  timeout_ms INTEGER DEFAULT 5000,
  last_triggered TEXT,
  last_status INTEGER,
  failure_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- API usage logs for tracking and rate limiting
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  user_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  request_body_size INTEGER,
  response_body_size INTEGER,
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Integration configurations
CREATE TABLE IF NOT EXISTS integration_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service TEXT NOT NULL UNIQUE, -- 'ihalebul', 'google_sheets', 'slack', 'discord', 'zapier'
  config TEXT NOT NULL, -- JSON configuration
  enabled INTEGER DEFAULT 0,
  last_sync TEXT,
  sync_status TEXT, -- 'success', 'failed', 'pending'
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Webhook event logs for debugging
CREATE TABLE IF NOT EXISTS webhook_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  webhook_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL, -- JSON payload sent
  status_code INTEGER,
  response TEXT,
  retry_count INTEGER DEFAULT 0,
  success INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
);

-- API keys table (moved from in-memory to database)
CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE, -- Store hashed version
  key_preview TEXT NOT NULL, -- First and last 4 chars: sk-ant...xxxx
  service TEXT NOT NULL, -- 'claude', 'gemini', 'openai', 'internal'
  permissions TEXT, -- JSON array of allowed endpoints
  rate_limit INTEGER DEFAULT 1000, -- Requests per hour
  last_used TEXT,
  usage_count INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  expires_at TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON api_usage_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- Default integration configs
INSERT OR IGNORE INTO integration_configs (service, config, enabled) VALUES
  ('ihalebul', '{"auto_sync": false, "sync_interval": 3600}', 0),
  ('google_sheets', '{"spreadsheet_id": null, "credentials": null}', 0),
  ('slack', '{"webhook_url": null, "channel": null, "username": "ProCheff"}', 0),
  ('discord', '{"webhook_url": null, "username": "ProCheff"}', 0),
  ('zapier', '{"webhook_url": null, "api_key": null}', 0);

-- Sample webhook for testing
INSERT OR IGNORE INTO webhooks (name, url, events, active) VALUES
  ('Test Webhook', 'https://webhook.site/test', '["test_event"]', 0);