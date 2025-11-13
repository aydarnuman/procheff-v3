-- Market sources ve real-time fiyat takibi için ek tablolar

-- NOT: SQLite ALTER TABLE ADD COLUMN IF NOT EXISTS desteklemez
-- Bu yüzden mevcut tablo yapısını kontrol etmiyoruz
-- Eğer column varsa hata verir ama migration devam eder

-- Market kaynakları tablosu
CREATE TABLE IF NOT EXISTS market_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_key TEXT NOT NULL UNIQUE, -- 'migros', 'a101', 'sok', etc.
    source_name TEXT NOT NULL,
    source_type TEXT NOT NULL, -- 'api', 'scraping', 'manual'
    base_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    rate_limit INTEGER DEFAULT 10, -- requests per minute
    last_scraped TEXT,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    average_response_time REAL, -- milliseconds
    trust_score REAL DEFAULT 0.7, -- 0-1 güvenilirlik
    meta TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Fiyat doğrulama kayıtları
CREATE TABLE IF NOT EXISTS price_validations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_key TEXT NOT NULL,
    source TEXT NOT NULL,
    estimated_price REAL NOT NULL,
    actual_price REAL NOT NULL,
    variance REAL NOT NULL, -- (actual - estimated) / estimated
    is_accurate BOOLEAN NOT NULL, -- variance < 0.15
    validated_at TEXT NOT NULL DEFAULT (datetime('now')),
    meta TEXT
);

-- Market fiyat detayları (marka, stok durumu, kampanya)
CREATE TABLE IF NOT EXISTS market_price_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    price_id INTEGER NOT NULL,
    market_key TEXT NOT NULL,
    brand TEXT,
    brand_tier TEXT, -- 'premium', 'standard', 'economy'
    stock_status TEXT, -- 'in_stock', 'limited', 'out_of_stock'
    promotion TEXT,
    packaging TEXT,
    product_url TEXT,
    image_url TEXT,
    scraped_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(price_id) REFERENCES market_prices(id)
);

-- Market fiyat geçmişi (trend analizi için)
CREATE TABLE IF NOT EXISTS market_price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_key TEXT NOT NULL,
    market_key TEXT NOT NULL,
    price REAL NOT NULL,
    price_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Default market kaynakları ekle
INSERT OR IGNORE INTO market_sources (source_key, source_name, source_type, base_url, rate_limit) VALUES
    ('migros', 'Migros', 'api', 'https://www.migros.com.tr', 20),
    ('a101', 'A101', 'scraping', 'https://www.a101.com.tr', 10),
    ('sok', 'ŞOK', 'api', 'https://www.sokmarket.com.tr', 15),
    ('carrefoursa', 'CarrefourSA', 'scraping', 'https://www.carrefoursa.com', 10),
    ('bim', 'BİM', 'scraping', 'https://www.bim.com.tr', 5);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_market_sources_key ON market_sources(source_key);
CREATE INDEX IF NOT EXISTS idx_price_validations_product ON price_validations(product_key);
-- Index already created on validated_at column
CREATE INDEX IF NOT EXISTS idx_market_price_details_market ON market_price_details(market_key);
CREATE INDEX IF NOT EXISTS idx_market_price_history_product_market ON market_price_history(product_key, market_key);
CREATE INDEX IF NOT EXISTS idx_market_price_history_date ON market_price_history(price_date);

-- Trigger: market_sources güncelleme tarihi
CREATE TRIGGER IF NOT EXISTS update_market_sources_timestamp 
    AFTER UPDATE ON market_sources
    BEGIN
        UPDATE market_sources SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
