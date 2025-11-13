-- Market prices storage
CREATE TABLE IF NOT EXISTS market_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_key TEXT NOT NULL,
    unit TEXT NOT NULL,
    unit_price REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'TRY',
    source TEXT NOT NULL,
    created_at TEXT NOT NULL,
    meta TEXT
);
CREATE INDEX IF NOT EXISTS idx_market_prices_product ON market_prices(product_key);
CREATE INDEX IF NOT EXISTS idx_market_prices_date ON market_prices(created_at);
CREATE INDEX IF NOT EXISTS idx_market_prices_source ON market_prices(source);