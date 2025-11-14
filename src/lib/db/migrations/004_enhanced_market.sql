-- Enhanced Market Tables for ProCheff v2.0
-- Hybrid data model with normalization, verification, and trust scoring

-- Normalized prices table
CREATE TABLE IF NOT EXISTS normalized_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_price_id INTEGER REFERENCES market_prices_v2(id) ON DELETE CASCADE,
  original_price REAL NOT NULL,
  original_weight REAL NOT NULL,
  original_unit TEXT NOT NULL CHECK(original_unit IN ('kg','g','lt','ml','adet')),
  normalized_price_per_kg REAL NOT NULL,
  normalization_factor REAL NOT NULL,
  confidence_score REAL DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Brand mappings and classification
CREATE TABLE IF NOT EXISTS brand_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_name TEXT UNIQUE NOT NULL,
  brand_tier TEXT CHECK(brand_tier IN ('premium','standard','economy')),
  parent_brand TEXT,
  category_focus TEXT, -- Bakliyat, Süt Ürünleri, etc.
  is_market_brand BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fuzzy matches cache for performance
CREATE TABLE IF NOT EXISTS fuzzy_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query_text TEXT NOT NULL,
  matched_product_id TEXT NOT NULL,
  match_score REAL NOT NULL,
  match_method TEXT, -- levenshtein, soundex, tfidf
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User submitted prices (crowdsourcing)
CREATE TABLE IF NOT EXISTS user_price_submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  normalized_product_name TEXT NOT NULL,
  barcode TEXT,
  price REAL NOT NULL,
  unit TEXT NOT NULL,
  weight REAL NOT NULL,
  weight_unit TEXT NOT NULL CHECK(weight_unit IN ('kg','g','lt','ml','adet')),
  market_name TEXT NOT NULL,
  market_branch TEXT,
  city TEXT NOT NULL,
  district TEXT,
  latitude REAL,
  longitude REAL,
  receipt_image_url TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verification_status TEXT DEFAULT 'pending' CHECK(verification_status IN ('pending','verified','rejected')),
  verified_by TEXT, -- JSON array of user IDs
  trust_score REAL DEFAULT 0.5,
  rejection_reason TEXT
);

-- User trust metrics
CREATE TABLE IF NOT EXISTS user_trust_metrics (
  user_id TEXT PRIMARY KEY,
  total_submissions INTEGER DEFAULT 0,
  verified_submissions INTEGER DEFAULT 0,
  rejected_submissions INTEGER DEFAULT 0,
  average_accuracy REAL DEFAULT 0.5,
  receipt_submission_rate REAL DEFAULT 0.0,
  location_consistency REAL DEFAULT 1.0,
  submission_frequency REAL DEFAULT 0.0, -- submissions per day
  last_activity_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  flagged_behaviors TEXT, -- JSON array
  trust_score REAL DEFAULT 0.5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API provider health tracking
CREATE TABLE IF NOT EXISTS api_provider_health (
  provider_name TEXT PRIMARY KEY,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  average_response_time REAL, -- milliseconds
  last_error TEXT,
  last_error_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  last_check_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scraper proxy performance
CREATE TABLE IF NOT EXISTS scraper_proxies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proxy_url TEXT UNIQUE NOT NULL,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  average_response_time REAL,
  last_used_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Market category averages for verification
CREATE TABLE IF NOT EXISTS market_category_averages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  market_name TEXT NOT NULL,
  category TEXT NOT NULL,
  average_price REAL NOT NULL,
  min_price REAL NOT NULL,
  max_price REAL NOT NULL,
  sample_count INTEGER NOT NULL,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(market_name, category)
);

-- Queue for scraping tasks
CREATE TABLE IF NOT EXISTS scraping_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_query TEXT NOT NULL,
  market_name TEXT NOT NULL,
  priority INTEGER DEFAULT 5, -- 1-10, higher is more urgent
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','failed')),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Webhook subscriptions for real-time updates
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  market_name TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  events TEXT NOT NULL, -- JSON array of event types
  is_active BOOLEAN DEFAULT TRUE,
  last_delivery_at TIMESTAMP,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(market_name, webhook_url)
);

-- Accuracy tracking
CREATE TABLE IF NOT EXISTS accuracy_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  provider_type TEXT NOT NULL CHECK(provider_type IN ('api','scraper','crowd','ai')),
  provider_name TEXT NOT NULL,
  total_prices INTEGER DEFAULT 0,
  accurate_prices INTEGER DEFAULT 0,
  accuracy_rate REAL DEFAULT 0.0,
  average_deviation REAL DEFAULT 0.0,
  outliers_detected INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, provider_type, provider_name)
);

-- Insert default brand mappings
INSERT OR IGNORE INTO brand_mappings (brand_name, brand_tier, category_focus) VALUES
  ('Tariş', 'premium', 'Bakliyat'),
  ('Duru', 'premium', 'Bakliyat'),
  ('Ülker', 'premium', 'Bisküvi/Çikolata'),
  ('Pınar', 'premium', 'Süt Ürünleri'),
  ('Sütaş', 'premium', 'Süt Ürünleri'),
  ('Yayla', 'standard', 'Bakliyat'),
  ('Sezer', 'standard', 'Bakliyat'),
  ('İçim', 'standard', 'Süt Ürünleri'),
  ('Torku', 'standard', 'Genel'),
  ('Carrefour', 'economy', 'Genel'),
  ('Migros', 'economy', 'Genel'),
  ('A101', 'economy', 'Genel'),
  ('BİM Dost', 'economy', 'Genel');

-- Insert initial API provider health records
INSERT OR IGNORE INTO api_provider_health (provider_name, is_active) VALUES
  ('Migros', TRUE),
  ('Getir', TRUE),
  ('Trendyol', TRUE),
  ('CarrefourSA', FALSE), -- Requires API key
  ('A101', FALSE),        -- No API available
  ('BİM', FALSE);         -- No API available

-- Create indexes for performance (after tables are created)
CREATE INDEX IF NOT EXISTS idx_normalized_prices_raw ON normalized_prices(raw_price_id);
CREATE INDEX IF NOT EXISTS idx_fuzzy_matches_query ON fuzzy_matches(query_text, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_submissions_product ON user_price_submissions(normalized_product_name, market_name, city);
CREATE INDEX IF NOT EXISTS idx_user_submissions_status ON user_price_submissions(verification_status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_user_trust_score ON user_trust_metrics(trust_score);
CREATE INDEX IF NOT EXISTS idx_scraping_queue_status ON scraping_queue(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_accuracy_date ON accuracy_metrics(date, provider_type);
