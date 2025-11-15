/**
 * Market Database Migration
 * Yeni özellikler için tablo güncellemeleri
 */

import { getDatabase } from '@/lib/db/universal-client';
import { AILogger } from '@/lib/ai/logger';

/**
 * Market prices tablosunu genişlet (brand, packaging, vb.)
 */
export async function upgradeMarketPricesTable(): Promise<void> {
  try {
    const db = await getDatabase();

    // Yeni market_prices_v2 tablosu
    await db.execute(`
      CREATE TABLE IF NOT EXISTS market_prices_v2 (
        id SERIAL PRIMARY KEY,
        product_key VARCHAR(255) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        unit_price REAL NOT NULL,
        source VARCHAR(255) NOT NULL,

        -- Brand bilgileri (YENİ)
        brand VARCHAR(255),
        brand_tier VARCHAR(50) CHECK(brand_tier IN ('premium', 'standard', 'economy')),

        -- Packaging bilgileri (YENİ)
        packaging_size REAL,
        packaging_unit VARCHAR(50),
        packaging_type VARCHAR(50) CHECK(packaging_type IN ('bulk', 'retail', 'wholesale')),
        packaging_description TEXT,

        -- Güvenilirlik (YENİ)
        source_trust REAL,
        confidence_score REAL,

        -- Metadata
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        verified_at TIMESTAMP,
        verified_by VARCHAR(255),
        notes TEXT,
        meta TEXT
      );
    `);

    // İndeksler
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_market_prices_v2_product
        ON market_prices_v2(product_key, created_at DESC);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_market_prices_v2_brand
        ON market_prices_v2(product_key, brand);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_market_prices_v2_timeseries
        ON market_prices_v2(product_key, TO_CHAR(created_at, 'YYYY-MM'), created_at);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_market_prices_v2_source
        ON market_prices_v2(source, created_at);
    `);

    AILogger.info('[Migration] market_prices_v2 tablosu oluşturuldu');

    // Eski veriler varsa migrate et
    await migrateOldPrices();
  } catch (error) {
    AILogger.error('[Migration] market_prices_v2 oluşturma hatası', {
      error: error instanceof Error ? error.message : 'Unknown'
    });
  }
}

/**
 * Price validations tablosu
 */
export async function createPriceValidationsTable(): Promise<void> {
  try {
    const db = await getDatabase();

    await db.execute(`
      CREATE TABLE IF NOT EXISTS price_validations (
        id SERIAL PRIMARY KEY,
        source VARCHAR(255) NOT NULL,
        product_key VARCHAR(255) NOT NULL,
        quoted_price REAL NOT NULL,
        actual_price REAL,
        was_accurate INTEGER NOT NULL,
        deviation REAL NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_price_validations_source
        ON price_validations(source, timestamp DESC);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_price_validations_product
        ON price_validations(product_key, timestamp DESC);
    `);

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
export async function createPriceHistoryTable(): Promise<void> {
  try {
    const db = await getDatabase();

    await db.execute(`
      CREATE TABLE IF NOT EXISTS price_history (
        id SERIAL PRIMARY KEY,
        product_key VARCHAR(255) NOT NULL,
        price REAL NOT NULL,
        source VARCHAR(255) NOT NULL,

        -- Change tracking (YENİ)
        previous_price REAL,
        price_change REAL,
        price_change_percent REAL,
        change_direction VARCHAR(10) CHECK(change_direction IN ('up', 'down', 'stable')),

        -- Volatility metrics (YENİ)
        volatility_score REAL,

        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_price_history_product
        ON price_history(product_key, timestamp DESC);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_price_history_date
        ON price_history(CAST(timestamp AS DATE), product_key);
    `);

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
export async function createProductCatalogTable(): Promise<void> {
  try {
    const db = await getDatabase();

    await db.execute(`
      CREATE TABLE IF NOT EXISTS product_catalog (
        id SERIAL PRIMARY KEY,
        product_key VARCHAR(255) NOT NULL UNIQUE,
        canonical_name VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,

        -- Variants (JSON array)
        variants TEXT,

        -- Aliases (JSON array)
        aliases TEXT,

        -- Tags (JSON array)
        tags TEXT,

        -- Stats
        search_count INTEGER DEFAULT 0,
        last_searched TIMESTAMP,

        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_product_catalog_key
        ON product_catalog(product_key);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_product_catalog_category
        ON product_catalog(category);
    `);

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
export async function createCurrentPricesView(): Promise<void> {
  try {
    const db = await getDatabase();

    // View oluştur
    await db.execute(`
      CREATE OR REPLACE VIEW market_prices_current AS
      SELECT
        product_key,
        AVG(unit_price) as avg_price,
        MIN(unit_price) as min_price,
        MAX(unit_price) as max_price,
        COUNT(*) as sample_size,
        COUNT(DISTINCT source) as source_count,
        MAX(created_at) as last_updated
      FROM market_prices_v2
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY product_key;
    `);

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
async function migrateOldPrices(): Promise<void> {
  try {
    const db = await getDatabase();

    // Eski tablo var mı kontrol et
    const tableCheck = await db.queryOne(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'market_prices'
    `) as { table_name: string } | undefined;

    if (!tableCheck) {
      AILogger.info('[Migration] Eski market_prices tablosu yok, migration atlanıyor');
      return;
    }

    // Veri taşı (PostgreSQL'de RETURNING değil, sadece INSERT)
    await db.execute(`
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
      WHERE NOT EXISTS (
        SELECT 1 FROM market_prices_v2
        WHERE market_prices_v2.product_key = market_prices.product_key
          AND market_prices_v2.created_at = market_prices.created_at
      )
    `);

    AILogger.info('[Migration] Eski veriler taşındı');
  } catch (error) {
    AILogger.warn('[Migration] Veri taşıma hatası (muhtemelen zaten taşınmış)', {
      error: error instanceof Error ? error.message : 'Unknown'
    });
  }
}

/**
 * Tüm migration'ları çalıştır
 */
export async function runAllMigrations(): Promise<void> {
  AILogger.info('[Migration] Tüm migration\'lar başlatılıyor...');

  try {
    await upgradeMarketPricesTable();
    await createPriceValidationsTable();
    await createPriceHistoryTable();
    await createProductCatalogTable();
    await createCurrentPricesView();

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
export async function checkMigrationStatus(): Promise<{
  market_prices_v2: boolean;
  price_validations: boolean;
  price_history: boolean;
  product_catalog: boolean;
  current_prices_view: boolean;
}> {
  try {
    const db = await getDatabase();

    const checkTable = async (name: string): Promise<boolean> => {
      const result = await db.queryOne(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      `, [name]) as { table_name: string } | undefined;
      return Boolean(result);
    };

    const checkView = async (name: string): Promise<boolean> => {
      const result = await db.queryOne(`
        SELECT table_name FROM information_schema.views
        WHERE table_schema = 'public' AND table_name = $1
      `, [name]) as { table_name: string } | undefined;
      return Boolean(result);
    };

    return {
      market_prices_v2: await checkTable('market_prices_v2'),
      price_validations: await checkTable('price_validations'),
      price_history: await checkTable('price_history'),
      product_catalog: await checkTable('product_catalog'),
      current_prices_view: await checkView('market_prices_current')
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
export async function rollbackMigrations(): Promise<void> {
  AILogger.warn('[Migration] ⚠️ Rollback başlatılıyor...');

  try {
    const db = await getDatabase();

    await db.execute(`DROP VIEW IF EXISTS market_prices_current CASCADE`);
    await db.execute(`DROP TABLE IF EXISTS product_catalog CASCADE`);
    await db.execute(`DROP TABLE IF EXISTS price_history CASCADE`);
    await db.execute(`DROP TABLE IF EXISTS price_validations CASCADE`);
    // market_prices_v2'yi silme, veri kaybı olabilir

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
export async function getMigrationReport(): Promise<string> {
  const status = await checkMigrationStatus();

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
