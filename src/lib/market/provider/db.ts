import { MarketQuote } from '../schema';
import { getDatabase } from '@/lib/db/universal-client';

/**
 * DB fiyat sağlayıcısı
 * Kendi geçmiş tekliflerimizden ortalama hesaplar
 */

/**
 * Son 90 günün ortalama fiyatını getir
 */
export async function dbQuote(product_key: string): Promise<MarketQuote | null> {
  try {
    const db = await getDatabase();

    // TODO: Gerçek market_prices tablosunu oluştur
    // Şimdilik mock query (tablo henüz yok)

    // Son 90 günün ortalamasını hesapla
    const query = `
      SELECT
        AVG(unit_price) as avg_price,
        unit,
        MAX(created_at) as latest_date,
        COUNT(*) as data_points
      FROM market_prices
      WHERE product_key = $1
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL '90 days'
        AND unit_price > 0
      GROUP BY product_key, unit
    `;

    try {
      const row = await db.queryOne(query, [product_key]) as any;

      if (!row || !row.avg_price) {
        return null;
      }

      return {
        product_key,
        raw_query: product_key,
        unit: row.unit || 'kg',
        unit_price: Number(row.avg_price.toFixed(2)),
        currency: 'TRY',
        asOf: row.latest_date || new Date().toISOString().slice(0, 10),
        source: 'DB',
        meta: {
          data_points: row.data_points,
          period: '90 days',
          reliability: 'high',
        }
      };
    } catch (error) {
      // Tablo henüz yoksa null dön
      console.warn('[DB Provider] market_prices tablosu bulunamadı, null dönüyor');
      return null;
    }
  } catch (error) {
    console.error('[DB Provider] Hata:', error);
    return null;
  }
}

/**
 * Son 12 ayın fiyat serisini getir (forecasting için)
 */
export async function last12Months(product_key: string): Promise<number[]> {
  try {
    const db = await getDatabase();

    const query = `
      SELECT
        AVG(unit_price) as avg_price,
        to_char(created_at, 'YYYY-MM') as month
      FROM market_prices
      WHERE product_key = $1
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL '12 months'
        AND unit_price > 0
      GROUP BY month
      ORDER BY month ASC
    `;

    try {
      const rows = await db.query(query, [product_key]) as any[];

      return rows.map(r => Number(r.avg_price.toFixed(2)));
    } catch (error) {
      // Tablo henüz yoksa boş array dön
      return [];
    }
  } catch (error) {
    console.error('[DB Provider] Geçmiş veri hatası:', error);
    return [];
  }
}

/**
 * Fiyat geçmişini getir (grafik için)
 */
export async function seriesOf(product_key: string, months = 12): Promise<Array<{ date: string; price: number }>> {
  try {
    const db = await getDatabase();

    const query = `
      SELECT
        AVG(unit_price) as avg_price,
        DATE(created_at) as date
      FROM market_prices
      WHERE product_key = $1
        AND created_at >= CURRENT_TIMESTAMP - make_interval(months => $2)
        AND unit_price > 0
      GROUP BY date
      ORDER BY date ASC
    `;

    try {
      const rows = await db.query(query, [product_key, months]) as any[];

      return rows.map(r => ({
        date: r.date,
        price: Number(r.avg_price.toFixed(2)),
      }));
    } catch (error) {
      return [];
    }
  } catch (error) {
    console.error('[DB Provider] Seri verisi hatası:', error);
    return [];
  }
}

/**
 * Yeni fiyat kaydı ekle (future use)
 */
export async function savePriceRecord(
  product_key: string,
  unit: string,
  unit_price: number,
  source: string
): Promise<boolean> {
  try {
    const db = await getDatabase();

    const query = `
      INSERT INTO market_prices (product_key, unit, unit_price, source, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `;

    try {
      await db.execute(query, [product_key, unit, unit_price, source]);
      return true;
    } catch (error) {
      console.warn('[DB Provider] market_prices tablosuna yazılamadı');
      return false;
    }
  } catch (error) {
    console.error('[DB Provider] Kayıt hatası:', error);
    return false;
  }
}

/**
 * market_prices tablosunu oluştur (migration)
 */
export async function initMarketPricesTable(): Promise<void> {
  try {
    const db = await getDatabase();

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS market_prices (
        id SERIAL PRIMARY KEY,
        product_key TEXT NOT NULL,
        unit TEXT NOT NULL,
        unit_price REAL NOT NULL,
        source TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        meta TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_market_prices_product
        ON market_prices(product_key);

      CREATE INDEX IF NOT EXISTS idx_market_prices_date
        ON market_prices(created_at);
    `;

    await db.execute(createTableQuery);
    console.log('[DB Provider] market_prices tablosu oluşturuldu');
  } catch (error) {
    console.error('[DB Provider] Tablo oluşturma hatası:', error);
  }
}
