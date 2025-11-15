import { getDB } from './sqlite-client';

/**
 * Market Database Operations
 */

export function initMarketDB() {
  const db = getDB();
  const syntax = getSQLSyntax();
  
  try {
    // Market products table
    db.exec(`
      CREATE TABLE IF NOT EXISTS market_products_v2 (
        product_key TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        unit TEXT NOT NULL DEFAULT 'kg',
        brand TEXT,
        tags TEXT,
        has_variants INTEGER DEFAULT 0,
        variants TEXT,
        default_variant TEXT,
        nutrition_category TEXT,
        barcode TEXT,
        image_url TEXT,
        created_at ${syntax.timestampDefault},
        updated_at ${syntax.timestampDefault}
      )
    `);

    // Market prices table
    db.exec(`
      CREATE TABLE IF NOT EXISTS market_prices_v2 (
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
        is_promotion INTEGER DEFAULT 0,
        promotion_end_date ${syntax.timestamp},
        stock_status TEXT DEFAULT 'in_stock',
        confidence_score REAL DEFAULT 1.0,
        data_source TEXT DEFAULT 'web',
        last_verified ${syntax.timestampDefault},
        created_at ${syntax.timestampDefault},
        updated_at ${syntax.timestampDefault}
      )
    `);

    // Price history table
    db.exec(`
      CREATE TABLE IF NOT EXISTS price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_key TEXT NOT NULL,
        market_name TEXT NOT NULL,
        old_price REAL,
        new_price REAL NOT NULL,
        change_percent REAL,
        change_reason TEXT,
        detected_by TEXT DEFAULT 'system',
        changed_at ${syntax.timestampDefault}
      )
    `);

    console.log('✅ Market tables initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize market tables:', error);
    return false;
  }
}

// Product Card operations
export interface ProductCard {
  id: string;
  name: string;
  normalized_name: string;
  category: string;
  subcategory?: string;
  icon: string;
  brand?: string;
  tags?: string[];
  has_variants: boolean;
  variants?: string[];
  default_variant?: string;
  nutrition_category?: string;
  barcode?: string;
  image_url?: string;
  created_at?: Date;
  updated_at?: Date;
}

export function saveProductCard(card: ProductCard): boolean {
  const db = getDB();
  
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO product_cards (
        id, name, normalized_name, category, subcategory, icon,
        brand, tags, has_variants, variants, default_variant,
        nutrition_category, barcode, image_url
      ) VALUES (
        @id, @name, @normalized_name, @category, @subcategory, @icon,
        @brand, @tags, @has_variants, @variants, @default_variant,
        @nutrition_category, @barcode, @image_url
      )
    `);
    
    stmt.run({
      ...card,
      tags: card.tags ? JSON.stringify(card.tags) : null,
      variants: card.variants ? JSON.stringify(card.variants) : null,
      has_variants: card.has_variants ? 1 : 0
    });
    
    return true;
  } catch (error) {
    console.error('Failed to save product card:', error);
    return false;
  }
}

export function getProductCard(id: string): ProductCard | null {
  const db = getDB();
  
  try {
    const row = db.prepare('SELECT * FROM product_cards WHERE id = ?').get(id) as any;
    
    if (!row) return null;
    
    return {
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
      variants: row.variants ? JSON.parse(row.variants) : [],
      has_variants: row.has_variants === 1
    };
  } catch (error) {
    console.error('Failed to get product card:', error);
    return null;
  }
}

export function getAllProductCards(): ProductCard[] {
  const db = getDB();
  
  try {
    const rows = db.prepare('SELECT * FROM product_cards ORDER BY created_at DESC').all() as any[];
    
    return rows.map(row => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
      variants: row.variants ? JSON.parse(row.variants) : [],
      has_variants: row.has_variants === 1
    }));
  } catch (error) {
    console.error('Failed to get all product cards:', error);
    return [];
  }
}

// Market Price operations
export interface MarketPrice {
  id?: number;
  product_card_id: string;
  product_key: string;
  market_name: string;
  market_branch?: string;
  unit_price: number;
  discount_price?: number;
  package_size: number;
  unit: string;
  brand?: string;
  is_promotion: boolean;
  promotion_end_date?: Date;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  confidence_score: number;
  data_source: 'web' | 'api' | 'manual' | 'ai' | 'crowdsource';
  last_verified?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export function saveMarketPrice(price: MarketPrice): number | null {
  const db = getDB();
  
  try {
    // Check if price exists
    const existing = db.prepare(`
      SELECT id, unit_price FROM market_prices_v2 
      WHERE product_card_id = ? AND market_name = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(price.product_card_id, price.market_name) as any;
    
    // Save to history if price changed
    if (existing && existing.unit_price !== price.unit_price) {
      const changePercent = ((price.unit_price - existing.unit_price) / existing.unit_price) * 100;
      
      db.prepare(`
        INSERT INTO price_history (
          product_key, market_name, old_price, new_price, change_percent
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        price.product_key,
        price.market_name,
        existing.unit_price,
        price.unit_price,
        changePercent
      );
    }
    
    // Insert or update price
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO market_prices_v2 (
        product_card_id, product_key, market_name, market_branch,
        unit_price, discount_price, package_size, unit, brand,
        is_promotion, promotion_end_date, stock_status,
        confidence_score, data_source, last_verified
      ) VALUES (
        @product_card_id, @product_key, @market_name, @market_branch,
        @unit_price, @discount_price, @package_size, @unit, @brand,
        @is_promotion, @promotion_end_date, @stock_status,
        @confidence_score, @data_source, CURRENT_TIMESTAMP
      )
    `);
    
    const result = stmt.run({
      ...price,
      is_promotion: price.is_promotion ? 1 : 0,
      promotion_end_date: price.promotion_end_date ? price.promotion_end_date.toISOString() : null
    });
    
    return result.lastInsertRowid as number;
  } catch (error) {
    console.error('Failed to save market price:', error);
    return null;
  }
}

export function getProductPrices(productCardId: string): MarketPrice[] {
  const db = getDB();
  
  try {
    const rows = db.prepare(`
      SELECT * FROM market_prices_v2 
      WHERE product_card_id = ? 
      ORDER BY unit_price ASC
    `).all(productCardId) as any[];
    
    return rows.map(row => ({
      ...row,
      is_promotion: row.is_promotion === 1,
      promotion_end_date: row.promotion_end_date ? new Date(row.promotion_end_date) : undefined
    }));
  } catch (error) {
    console.error('Failed to get product prices:', error);
    return [];
  }
}

export function getPriceHistory(productKey: string, days: number = 30): any[] {
  const db = getDB();
  
  try {
    return db.prepare(`
      SELECT * FROM price_history 
      WHERE product_key = ? 
        AND changed_at >= datetime('now', '-${days} days')
      ORDER BY changed_at DESC
    `).all(productKey) as any[];
  } catch (error) {
    console.error('Failed to get price history:', error);
    return [];
  }
}

// Utility functions
export function calculateUnitPrice(packagePrice: number, packageSize: number): number {
  return packagePrice / packageSize;
}

export function getPriceLevel(price: number, allPrices: number[]): string {
  if (allPrices.length === 0) return 'normal';
  
  const sorted = [...allPrices].sort((a, b) => a - b);
  const avg = sorted.reduce((sum, p) => sum + p, 0) / sorted.length;
  const min = sorted[0];
  // const max = sorted[sorted.length - 1];  // Unused variable
  
  if (price === min) return 'best_price'; // 🏆
  if (price < avg * 0.9) return 'cheap'; // ✅
  if (price < avg * 1.1) return 'normal'; // 💰
  if (price < avg * 1.3) return 'expensive'; // ⭐
  return 'very_expensive'; // 🔴
}

export function formatPrice(price: number): string {
  return price.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' TL';
}
