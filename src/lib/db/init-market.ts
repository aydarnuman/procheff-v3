import { getDB } from './sqlite-client';

/**
 * Market prices tablosunu initialize et
 */
export function initMarketSchema(): void {
  const db = getDB();

  try {
    // market_prices tablosu
    db.exec(`
      CREATE TABLE IF NOT EXISTS market_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_key TEXT NOT NULL,
        raw_query TEXT,
        unit TEXT NOT NULL,
        unit_price REAL NOT NULL,
        currency TEXT DEFAULT 'TRY',
        source TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        meta TEXT,

        CHECK (unit_price > 0)
      );

      CREATE INDEX IF NOT EXISTS idx_market_prices_product
        ON market_prices(product_key);

      CREATE INDEX IF NOT EXISTS idx_market_prices_date
        ON market_prices(created_at);

      CREATE INDEX IF NOT EXISTS idx_market_prices_source
        ON market_prices(source);

      CREATE INDEX IF NOT EXISTS idx_market_prices_product_date
        ON market_prices(product_key, created_at DESC);
    `);

    // market_cache tablosu (füzyon sonuçları için)
    db.exec(`
      CREATE TABLE IF NOT EXISTS market_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_key TEXT NOT NULL UNIQUE,
        fusion_data TEXT NOT NULL,
        confidence REAL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL,

        CHECK (confidence >= 0 AND confidence <= 1)
      );

      CREATE INDEX IF NOT EXISTS idx_market_cache_expires
        ON market_cache(expires_at);
    `);

    console.log('[Market DB] ✅ Market schema initialized');
  } catch (error) {
    console.error('[Market DB] ❌ Schema initialization failed:', error);
    throw error;
  }
}

/**
 * Örnek test verisi ekle
 */
export function seedMarketPrices(): void {
  const db = getDB();

  try {
    // Son 3 ay için örnek fiyat verisi
    const products = [
      { key: 'tavuk-eti', unit: 'kg', base: 95 },
      { key: 'zeytinyagi', unit: 'lt', base: 285 },
      { key: 'makarna', unit: 'kg', base: 38 },
      { key: 'sut', unit: 'lt', base: 24 },
      { key: 'yogurt', unit: 'kg', base: 45 },
      { key: 'beyaz-peynir', unit: 'kg', base: 182 },
      { key: 'domates', unit: 'kg', base: 28 },
    ];

    const sources = ['TUIK', 'WEB', 'DB'];
    const today = new Date();

    let insertCount = 0;

    // Son 90 gün için her ürüne veri ekle
    for (const product of products) {
      for (let i = 0; i < 90; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        // Her kaynak için fiyat ekle (günlük 1-3 kaynak)
        const numSources = Math.floor(Math.random() * 3) + 1;
        const usedSources = sources.slice(0, numSources);

        for (const source of usedSources) {
          // Fiyata rastgele varyasyon ekle (±10%)
          const variance = (Math.random() - 0.5) * 0.2;
          const price = product.base * (1 + variance);

          // Zaman içinde hafif trend ekle (aylık +2%)
          const monthlyIncrease = 0.02;
          const daysSinceStart = 90 - i;
          const trendFactor = 1 + (monthlyIncrease * daysSinceStart / 30);
          const finalPrice = price * trendFactor;

          const stmt = db.prepare(`
            INSERT INTO market_prices (product_key, unit, unit_price, source, created_at)
            VALUES (?, ?, ?, ?, ?)
          `);

          stmt.run(
            product.key,
            product.unit,
            Number(finalPrice.toFixed(2)),
            source,
            date.toISOString().split('T')[0]
          );

          insertCount++;
        }
      }
    }

    console.log(`[Market DB] ✅ Seeded ${insertCount} price records`);
  } catch (error) {
    console.error('[Market DB] ❌ Seeding failed:', error);
    throw error;
  }
}

/**
 * Veritabanı istatistikleri
 */
export function getMarketStats(): {
  totalRecords: number;
  uniqueProducts: number;
  dateRange: { oldest: string; newest: string } | null;
  sources: Array<{ source: string; count: number }>;
} {
  const db = getDB();

  try {
    // Toplam kayıt
    const totalRow = db.prepare('SELECT COUNT(*) as count FROM market_prices').get() as { count: number } | undefined;
    const totalRecords = totalRow?.count || 0;

    // Benzersiz ürün sayısı
    const productRow = db.prepare('SELECT COUNT(DISTINCT product_key) as count FROM market_prices').get() as { count: number } | undefined;
    const uniqueProducts = productRow?.count || 0;

    // Tarih aralığı
    let dateRange = null;
    if (totalRecords > 0) {
      const dateRow = db.prepare(`
        SELECT
          MIN(created_at) as oldest,
          MAX(created_at) as newest
        FROM market_prices
      `).get() as { oldest: string; newest: string } | undefined;

      dateRange = {
        oldest: dateRow?.oldest || '',
        newest: dateRow?.newest || '',
      };
    }

    // Kaynak dağılımı
    const sources = db.prepare(`
      SELECT source, COUNT(*) as count
      FROM market_prices
      GROUP BY source
      ORDER BY count DESC
    `).all() as Array<{ category: string; count: number }>;

    return {
      totalRecords,
      uniqueProducts,
      dateRange,
      sources,
    };
  } catch (error) {
    console.error('[Market DB] ❌ Stats query failed:', error);
    return {
      totalRecords: 0,
      uniqueProducts: 0,
      dateRange: null,
      sources: [],
    };
  }
}
