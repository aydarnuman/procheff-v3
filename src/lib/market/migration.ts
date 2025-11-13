/**
 * Market Database Migration
 * Yeni özellikler için tablo güncellemeleri
 */

import { getDB } from '@/lib/db/sqlite-client';
import { AILogger } from '@/lib/ai/logger';

/**
 * Market prices tablosunu genişlet (brand, packaging, vb.)
 */
export function upgradeMarketPricesTable(): void {
  try {
    const db = getDB();
    
    // Yeni market_prices_v2 tablosu
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS market_prices_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_key TEXT NOT NULL,
        unit TEXT NOT NULL,
        unit_price REAL NOT NULL,
        source TEXT NOT NULL,
        
        -- Brand bilgileri (YENİ)
        brand TEXT,
        brand_tier TEXT CHECK(brand_tier IN ('premium', 'standard', 'economy')),
        
        -- Packaging bilgileri (YENİ)
        packaging_size REAL,
        packaging_unit TEXT,
        packaging_type TEXT CHECK(packaging_type IN ('bulk', 'retail', 'wholesale')),
        packaging_description TEXT,
        
        -- Güvenilirlik (YENİ)
        source_trust REAL,
        confidence_score REAL,
        
        -- Metadata
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        verified_at TEXT,
        verified_by TEXT,
        notes TEXT,
        meta TEXT,
        
        -- Computed column (partitioning için)
        year_month TEXT GENERATED ALWAYS AS (strftime('%Y-%m', created_at)) VIRTUAL
      );
      
      -- İndeksler
      CREATE INDEX IF NOT EXISTS idx_market_prices_v2_product
        ON market_prices_v2(product_key, created_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_market_prices_v2_brand
        ON market_prices_v2(product_key, brand);
      
      CREATE INDEX IF NOT EXISTS idx_market_prices_v2_timeseries
        ON market_prices_v2(product_key, year_month, created_at);
      
      CREATE INDEX IF NOT EXISTS idx_market_prices_v2_source
        ON market_prices_v2(source, created_at);
    `;
    
    db.exec(createTableQuery);
    AILogger.info('[Migration] market_prices_v2 tablosu oluşturuldu');
    
    // Eski veriler varsa migrate et
    migrateOldPrices();
  } catch (error) {
    AILogger.error('[Migration] market_prices_v2 oluşturma hatası', {
      error: error instanceof Error ? error.message : 'Unknown'
    });
  }
}

/**
 * Price validations tablosu
 */
export function createPriceValidationsTable(): void {
  try {
    const db = getDB();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS price_validations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        product_key TEXT NOT NULL,
        quoted_price REAL NOT NULL,
        actual_price REAL,
        was_accurate INTEGER NOT NULL,
        deviation REAL NOT NULL,
        timestamp TEXT NOT NULL DEFAULT (datetime('now'))
      );
      
      CREATE INDEX IF NOT EXISTS idx_price_validations_source
        ON price_validations(source, timestamp DESC);
      
      CREATE INDEX IF NOT EXISTS idx_price_validations_product
        ON price_validations(product_key, timestamp DESC);
    `;
    
    db.exec(createTableQuery);
    AILogger.info('[Migration] price_validations tablosu oluşturuldu');
  } catch (error) {
    AILogger.error('[Migration] price_validations oluşturma hatası', {
      error: error instanceof Error ? error.message : 'Unknown'
    });
  }
}

/**
 * Price history tablosu (volatility tracking için)
 */
export function createPriceHistoryTable(): void {
  try {
    const db = getDB();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_key TEXT NOT NULL,
        price REAL NOT NULL,
        source TEXT NOT NULL,
        
        -- Change tracking (YENİ)
        previous_price REAL,
        price_change REAL,
        price_change_percent REAL,
        change_direction TEXT CHECK(change_direction IN ('up', 'down', 'stable')),
        
        -- Volatility metrics (YENİ)
        volatility_score REAL,
        
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        
        -- Computed column
        date TEXT GENERATED ALWAYS AS (date(timestamp)) VIRTUAL
      );
      
      CREATE INDEX IF NOT EXISTS idx_price_history_product
        ON price_history(product_key, timestamp DESC);
      
      CREATE INDEX IF NOT EXISTS idx_price_history_date
        ON price_history(date, product_key);
    `;
    
    db.exec(createTableQuery);
    AILogger.info('[Migration] price_history tablosu oluşturuldu');
  } catch (error) {
    AILogger.error('[Migration] price_history oluşturma hatası', {
      error: error instanceof Error ? error.message : 'Unknown'
    });
  }
}

/**
 * Product catalog tablosu (normalization için)
 */
export function createProductCatalogTable(): void {
  try {
    const db = getDB();
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS product_catalog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_key TEXT NOT NULL UNIQUE,
        canonical_name TEXT NOT NULL,
        category TEXT NOT NULL,
        
        -- Variants (JSON array)
        variants TEXT,
        
        -- Aliases (JSON array)
        aliases TEXT,
        
        -- Tags (JSON array)
        tags TEXT,
        
        -- Stats
        search_count INTEGER DEFAULT 0,
        last_searched TEXT,
        
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      
      CREATE INDEX IF NOT EXISTS idx_product_catalog_key
        ON product_catalog(product_key);
      
      CREATE INDEX IF NOT EXISTS idx_product_catalog_category
        ON product_catalog(category);
      
      -- Full-text search index
      CREATE VIRTUAL TABLE IF NOT EXISTS product_catalog_fts USING fts5(
        product_key,
        canonical_name,
        aliases,
        tags,
        content=product_catalog,
        content_rowid=id
      );
    `;
    
    db.exec(createTableQuery);
    AILogger.info('[Migration] product_catalog tablosu oluşturuldu');
  } catch (error) {
    AILogger.error('[Migration] product_catalog oluşturma hatası', {
      error: error instanceof Error ? error.message : 'Unknown'
    });
  }
}

/**
 * Materialized view: Current prices (hızlı erişim)
 */
export function createCurrentPricesView(): void {
  try {
    const db = getDB();
    
    // View oluştur (gerçek materialize için trigger eklenebilir)
    const createViewQuery = `
      CREATE VIEW IF NOT EXISTS market_prices_current AS
      SELECT 
        product_key,
        AVG(unit_price) as avg_price,
        MIN(unit_price) as min_price,
        MAX(unit_price) as max_price,
        COUNT(*) as sample_size,
        COUNT(DISTINCT source) as source_count,
        MAX(created_at) as last_updated
      FROM market_prices_v2
      WHERE created_at >= date('now', '-7 days')
      GROUP BY product_key;
    `;
    
    db.exec(createViewQuery);
    AILogger.info('[Migration] market_prices_current view oluşturuldu');
  } catch (error) {
    AILogger.error('[Migration] View oluşturma hatası', {
      error: error instanceof Error ? error.message : 'Unknown'
    });
  }
}

/**
 * Eski market_prices'dan yeni tabloya veri taşı
 */
function migrateOldPrices(): void {
  try {
    const db = getDB();
    
    // Eski tablo var mı kontrol et
    const tableCheck = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='market_prices'
    `).get();
    
    if (!tableCheck) {
      AILogger.info('[Migration] Eski market_prices tablosu yok, migration atlanıyor');
      return;
    }
    
    // Veri taşı
    const migrateQuery = `
      INSERT INTO market_prices_v2 
        (product_key, unit, unit_price, source, created_at, meta)
      SELECT 
        product_key,
        unit,
        unit_price,
        source,
        created_at,
        meta
      FROM market_prices
      WHERE id NOT IN (
        SELECT id FROM market_prices_v2
      );
    `;
    
    const result = db.prepare(migrateQuery).run();
    AILogger.info('[Migration] Eski veriler taşındı', {
      migrated: result.changes
    });
  } catch (error) {
    AILogger.warn('[Migration] Veri taşıma hatası (muhtemelen zaten taşınmış)', {
      error: error instanceof Error ? error.message : 'Unknown'
    });
  }
}

/**
 * Tüm migration'ları çalıştır
 */
export function runAllMigrations(): void {
  AILogger.info('[Migration] Tüm migration\'lar başlatılıyor...');
  
  try {
    upgradeMarketPricesTable();
    createPriceValidationsTable();
    createPriceHistoryTable();
    createProductCatalogTable();
    createCurrentPricesView();
    
    AILogger.info('[Migration] ✅ Tüm migration\'lar tamamlandı');
  } catch (error) {
    AILogger.error('[Migration] ❌ Migration hatası', {
      error: error instanceof Error ? error.message : 'Unknown'
    });
    throw error;
  }
}

/**
 * Migration durumunu kontrol et
 */
export function checkMigrationStatus(): {
  market_prices_v2: boolean;
  price_validations: boolean;
  price_history: boolean;
  product_catalog: boolean;
  current_prices_view: boolean;
} {
  try {
    const db = getDB();
    
    const checkTable = (name: string): boolean => {
      const result = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name=?
      `).get(name);
      return Boolean(result);
    };
    
    const checkView = (name: string): boolean => {
      const result = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='view' AND name=?
      `).get(name);
      return Boolean(result);
    };
    
    return {
      market_prices_v2: checkTable('market_prices_v2'),
      price_validations: checkTable('price_validations'),
      price_history: checkTable('price_history'),
      product_catalog: checkTable('product_catalog'),
      current_prices_view: checkView('market_prices_current')
    };
  } catch (error) {
    AILogger.error('[Migration] Durum kontrolü hatası', {
      error: error instanceof Error ? error.message : 'Unknown'
    });
    return {
      market_prices_v2: false,
      price_validations: false,
      price_history: false,
      product_catalog: false,
      current_prices_view: false
    };
  }
}

/**
 * Migration rollback (gerekirse)
 */
export function rollbackMigrations(): void {
  AILogger.warn('[Migration] ⚠️ Rollback başlatılıyor...');
  
  try {
    const db = getDB();
    
    db.exec(`
      DROP VIEW IF EXISTS market_prices_current;
      DROP TABLE IF EXISTS product_catalog_fts;
      DROP TABLE IF EXISTS product_catalog;
      DROP TABLE IF EXISTS price_history;
      DROP TABLE IF EXISTS price_validations;
      -- market_prices_v2'yi silme, veri kaybı olabilir
    `);
    
    AILogger.info('[Migration] Rollback tamamlandı');
  } catch (error) {
    AILogger.error('[Migration] Rollback hatası', {
      error: error instanceof Error ? error.message : 'Unknown'
    });
  }
}

/**
 * Debug: Migration durumu raporu
 */
export function getMigrationReport(): string {
  const status = checkMigrationStatus();
  
  const lines = [
    'Migration Durum Raporu:',
    '',
    `market_prices_v2: ${status.market_prices_v2 ? '✅' : '❌'}`,
    `price_validations: ${status.price_validations ? '✅' : '❌'}`,
    `price_history: ${status.price_history ? '✅' : '❌'}`,
    `product_catalog: ${status.product_catalog ? '✅' : '❌'}`,
    `current_prices_view: ${status.current_prices_view ? '✅' : '❌'}`,
  ];
  
  const allComplete = Object.values(status).every(v => v);
  lines.push('');
  lines.push(allComplete ? '✅ Tüm migration\'lar tamamlanmış' : '⚠️ Bazı migration\'lar eksik');
  
  return lines.join('\n');
}

