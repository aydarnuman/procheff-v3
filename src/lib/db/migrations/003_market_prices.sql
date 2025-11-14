-- Market Prices Tables Migration
-- Created: 2024-11-14

-- Product cards table
CREATE TABLE IF NOT EXISTS product_cards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT,
  category TEXT,
  subcategory TEXT,
  icon TEXT,
  brand TEXT,
  tags TEXT, -- JSON array
  has_variants BOOLEAN DEFAULT 0,
  variants TEXT, -- JSON array
  default_variant TEXT,
  nutrition_category TEXT,
  barcode TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Market prices table (real-time prices)
CREATE TABLE IF NOT EXISTS market_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_card_id TEXT NOT NULL,
  product_key TEXT NOT NULL,
  market_name TEXT NOT NULL,
  market_branch TEXT,
  unit_price REAL NOT NULL,
  discount_price REAL,
  package_size REAL DEFAULT 1,
  unit TEXT DEFAULT 'kg',
  brand TEXT,
  is_promotion BOOLEAN DEFAULT 0,
  promotion_end_date TIMESTAMP,
  stock_status TEXT DEFAULT 'in_stock', -- in_stock, low_stock, out_of_stock
  confidence_score REAL DEFAULT 1.0,
  data_source TEXT DEFAULT 'web', -- web, api, manual, ai, crowdsource
  last_verified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_card_id) REFERENCES product_cards(id) ON DELETE CASCADE
);

-- Price history table
CREATE TABLE IF NOT EXISTS price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  price_entry_id INTEGER NOT NULL,
  product_key TEXT NOT NULL,
  market_name TEXT NOT NULL,
  old_price REAL,
  new_price REAL NOT NULL,
  change_percent REAL,
  change_reason TEXT, -- promotion, inflation, season
  detected_by TEXT DEFAULT 'system', -- system, user, ai
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (price_entry_id) REFERENCES market_prices(id) ON DELETE CASCADE
);

-- Price alerts table
CREATE TABLE IF NOT EXISTS price_alerts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_card_id TEXT NOT NULL,
  target_price REAL,
  alert_type TEXT NOT NULL, -- price_drop, back_in_stock, new_promotion
  notification_channels TEXT NOT NULL, -- JSON array: email, sms, push, in_app
  is_active BOOLEAN DEFAULT 1,
  triggered_count INTEGER DEFAULT 0,
  last_triggered TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_card_id) REFERENCES product_cards(id) ON DELETE CASCADE
);

-- Market metadata table
CREATE TABLE IF NOT EXISTS markets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  api_available BOOLEAN DEFAULT 0,
  scraping_available BOOLEAN DEFAULT 1,
  average_price_level TEXT, -- cheap, normal, expensive, premium
  last_sync TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default markets
INSERT OR IGNORE INTO markets (name, display_name, average_price_level) VALUES
  ('migros', 'Migros', 'expensive'),
  ('carrefoursa', 'CarrefourSA', 'normal'),
  ('a101', 'A101', 'cheap'),
  ('bim', 'BİM', 'cheap'),
  ('sok', 'ŞOK', 'cheap'),
  ('metro', 'Metro', 'expensive'),
  ('getir', 'Getir', 'expensive'),
  ('trendyol', 'Trendyol Market', 'normal'),
  ('hepsiburada', 'Hepsiburada Market', 'normal'),
  ('istegelsin', 'İstegelsin', 'expensive');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_market_prices_product_key ON market_prices(product_key);
CREATE INDEX IF NOT EXISTS idx_market_prices_market_name ON market_prices(market_name);
CREATE INDEX IF NOT EXISTS idx_market_prices_updated_at ON market_prices(updated_at);
CREATE INDEX IF NOT EXISTS idx_price_history_product_key ON price_history(product_key);
CREATE INDEX IF NOT EXISTS idx_price_history_changed_at ON price_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_price_alerts_product_card_id ON price_alerts(product_card_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON price_alerts(user_id);

-- Create triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_product_cards_timestamp 
  AFTER UPDATE ON product_cards
  FOR EACH ROW
BEGIN
  UPDATE product_cards SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_market_prices_timestamp 
  AFTER UPDATE ON market_prices
  FOR EACH ROW
BEGIN
  UPDATE market_prices SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_price_alerts_timestamp 
  AFTER UPDATE ON price_alerts
  FOR EACH ROW
BEGIN
  UPDATE price_alerts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
