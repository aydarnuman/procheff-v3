/**
 * Brand Classifier
 * Marka sınıflandırma ve gruplama sistemi
 */

import Database from 'better-sqlite3';
import { join } from 'path';

export interface BrandInfo {
  name: string;
  tier: 'premium' | 'standard' | 'economy';
  category_focus?: string;
  parent_brand?: string;
  is_market_brand: boolean;
}

export interface BrandClassification {
  detected_brand: string | null;
  brand_tier: 'premium' | 'standard' | 'economy' | 'unknown';
  confidence: number;
  alternatives: string[];
}

export class BrandClassifier {
  private static db: Database | null = null;
  
  // In-memory brand cache
  private static brandCache: Map<string, BrandInfo> = new Map([
    // Premium brands
    ['tariş', { name: 'Tariş', tier: 'premium', category_focus: 'Bakliyat', is_market_brand: false }],
    ['duru', { name: 'Duru', tier: 'premium', category_focus: 'Bakliyat', is_market_brand: false }],
    ['ülker', { name: 'Ülker', tier: 'premium', category_focus: 'Bisküvi/Çikolata', is_market_brand: false }],
    ['pınar', { name: 'Pınar', tier: 'premium', category_focus: 'Süt Ürünleri', is_market_brand: false }],
    ['sütaş', { name: 'Sütaş', tier: 'premium', category_focus: 'Süt Ürünleri', is_market_brand: false }],
    ['sek', { name: 'SEK', tier: 'premium', category_focus: 'Süt Ürünleri', is_market_brand: false }],
    ['tat', { name: 'Tat', tier: 'premium', category_focus: 'Konserve/Sos', is_market_brand: false }],
    ['calve', { name: 'Calvé', tier: 'premium', category_focus: 'Sos/Mayonez', is_market_brand: false }],
    ['knorr', { name: 'Knorr', tier: 'premium', category_focus: 'Çorba/Sos', is_market_brand: false }],
    ['nescafe', { name: 'Nescafé', tier: 'premium', category_focus: 'Kahve', is_market_brand: false }],
    
    // Standard brands
    ['yayla', { name: 'Yayla', tier: 'standard', category_focus: 'Bakliyat', is_market_brand: false }],
    ['sezer', { name: 'Sezer', tier: 'standard', category_focus: 'Bakliyat', is_market_brand: false }],
    ['içim', { name: 'İçim', tier: 'standard', category_focus: 'Süt Ürünleri', is_market_brand: false }],
    ['torku', { name: 'Torku', tier: 'standard', category_focus: 'Genel', is_market_brand: false }],
    ['eker', { name: 'Eker', tier: 'standard', category_focus: 'Süt Ürünleri', is_market_brand: false }],
    ['filiz', { name: 'Filiz', tier: 'standard', category_focus: 'Makarna/Un', is_market_brand: false }],
    ['reis', { name: 'Reis', tier: 'standard', category_focus: 'Bakliyat', is_market_brand: false }],
    ['bağdat', { name: 'Bağdat', tier: 'standard', category_focus: 'Baharat', is_market_brand: false }],
    ['mis', { name: 'Mis', tier: 'standard', category_focus: 'Süt Ürünleri', is_market_brand: false }],
    
    // Economy/Market brands
    ['carrefour', { name: 'Carrefour', tier: 'economy', category_focus: 'Genel', is_market_brand: true }],
    ['migros', { name: 'Migros', tier: 'economy', category_focus: 'Genel', is_market_brand: true }],
    ['m life', { name: 'M Life', tier: 'economy', category_focus: 'Genel', parent_brand: 'Migros', is_market_brand: true }],
    ['m budget', { name: 'M Budget', tier: 'economy', category_focus: 'Genel', parent_brand: 'Migros', is_market_brand: true }],
    ['a101', { name: 'A101', tier: 'economy', category_focus: 'Genel', is_market_brand: true }],
    ['bim', { name: 'BİM', tier: 'economy', category_focus: 'Genel', is_market_brand: true }],
    ['dost', { name: 'Dost', tier: 'economy', category_focus: 'Genel', parent_brand: 'BİM', is_market_brand: true }],
    ['premium', { name: 'Premium', tier: 'economy', category_focus: 'Genel', parent_brand: 'BİM', is_market_brand: true }],
    ['şok', { name: 'ŞOK', tier: 'economy', category_focus: 'Genel', is_market_brand: true }],
    ['ucuzum', { name: 'Ucuzum', tier: 'economy', category_focus: 'Genel', parent_brand: 'ŞOK', is_market_brand: true }],
    ['file', { name: 'File', tier: 'economy', category_focus: 'Genel', is_market_brand: true }]
  ]);
  
  // Brand name variations and common misspellings
  private static brandVariations: Map<string, string> = new Map([
    // Tariş variations
    ['taris', 'tariş'],
    ['tariş', 'tariş'],
    ['tarış', 'tariş'],
    
    // Ülker variations
    ['ulker', 'ülker'],
    ['ülker', 'ülker'],
    
    // Pınar variations
    ['pinar', 'pınar'],
    ['pınar', 'pınar'],
    
    // Sütaş variations
    ['sutas', 'sütaş'],
    ['sütaş', 'sütaş'],
    ['sutaş', 'sütaş'],
    
    // İçim variations
    ['icim', 'içim'],
    ['içim', 'içim'],
    ['icem', 'içim'],
    
    // Market brand variations
    ['mlife', 'm life'],
    ['m-life', 'm life'],
    ['mbudget', 'm budget'],
    ['m-budget', 'm budget']
  ]);
  
  /**
   * Initialize database connection
   */
  private static getDb(): Database | null {
    if (!this.db) {
      try {
        const dbPath = join(process.cwd(), 'procheff.db');
        this.db = new Database(dbPath);
        this.loadBrandsFromDb();
      } catch (error) {
        console.error('[BrandClassifier] Database connection failed:', error);
      }
    }
    return this.db;
  }
  
  /**
   * Load brands from database
   */
  private static loadBrandsFromDb(): void {
    const db = this.getDb();
    if (!db) return;
    
    try {
      const brands = db.prepare(`
        SELECT brand_name, brand_tier, category_focus, parent_brand, is_market_brand
        FROM brand_mappings
      `).all() as any[];
      
      brands.forEach(brand => {
        this.brandCache.set(brand.brand_name.toLowerCase(), {
          name: brand.brand_name,
          tier: brand.brand_tier as any,
          category_focus: brand.category_focus,
          parent_brand: brand.parent_brand,
          is_market_brand: brand.is_market_brand
        });
      });
    } catch (error) {
      console.error('[BrandClassifier] Failed to load brands from DB:', error);
    }
  }
  
  /**
   * Classify brand from product name
   */
  static classifyBrand(productName: string): BrandClassification {
    const lowerName = productName.toLowerCase();
    const tokens = lowerName.split(/\s+/);
    
    // Direct brand detection
    let detectedBrand: BrandInfo | null = null;
    let matchedToken: string | null = null;
    
    // Check each token
    for (const token of tokens) {
      // Check variations first
      const normalizedToken = this.brandVariations.get(token) || token;
      
      if (this.brandCache.has(normalizedToken)) {
        detectedBrand = this.brandCache.get(normalizedToken)!;
        matchedToken = token;
        break;
      }
    }
    
    // Check multi-word brands
    if (!detectedBrand) {
      for (const [key, brand] of this.brandCache) {
        if (lowerName.includes(key)) {
          detectedBrand = brand;
          matchedToken = key;
          break;
        }
      }
    }
    
    // Find alternatives
    const alternatives = this.findAlternativeBrands(productName, detectedBrand);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(productName, matchedToken, detectedBrand);
    
    return {
      detected_brand: detectedBrand?.name || null,
      brand_tier: detectedBrand?.tier || 'unknown',
      confidence,
      alternatives
    };
  }
  
  /**
   * Find alternative brands for the same product category
   */
  private static findAlternativeBrands(
    productName: string, 
    currentBrand: BrandInfo | null
  ): string[] {
    const alternatives: string[] = [];
    const lowerName = productName.toLowerCase();
    
    // Determine product category
    const category = this.detectProductCategory(lowerName);
    
    // Find brands in the same category
    for (const [, brand] of this.brandCache) {
      if (brand.category_focus === category || 
          brand.category_focus === 'Genel' ||
          !brand.is_market_brand) {
        if (!currentBrand || brand.name !== currentBrand.name) {
          alternatives.push(brand.name);
        }
      }
    }
    
    // Sort by tier (premium first)
    return alternatives.sort((a, b) => {
      const brandA = this.brandCache.get(a.toLowerCase());
      const brandB = this.brandCache.get(b.toLowerCase());
      
      const tierOrder = { premium: 0, standard: 1, economy: 2 };
      const orderA = tierOrder[brandA?.tier || 'economy'];
      const orderB = tierOrder[brandB?.tier || 'economy'];
      
      return orderA - orderB;
    }).slice(0, 5);
  }
  
  /**
   * Calculate confidence score for brand detection
   */
  private static calculateConfidence(
    productName: string,
    matchedToken: string | null,
    brand: BrandInfo | null
  ): number {
    if (!brand || !matchedToken) return 0;
    
    let confidence = 0.7;
    const lowerName = productName.toLowerCase();
    const tokens = lowerName.split(/\s+/);
    
    // Higher confidence if brand is at the beginning
    if (tokens[0] === matchedToken || lowerName.startsWith(matchedToken)) {
      confidence += 0.2;
    }
    
    // Higher confidence for known premium brands
    if (brand.tier === 'premium') {
      confidence += 0.05;
    }
    
    // Lower confidence for generic market brands
    if (brand.is_market_brand && brand.category_focus === 'Genel') {
      confidence -= 0.1;
    }
    
    // Check if product category matches brand focus
    const category = this.detectProductCategory(lowerName);
    if (brand.category_focus && brand.category_focus !== 'Genel' && 
        brand.category_focus === category) {
      confidence += 0.05;
    }
    
    return Math.min(Math.max(confidence, 0), 1);
  }
  
  /**
   * Detect product category from name
   */
  private static detectProductCategory(productName: string): string {
    const categories: { [key: string]: string[] } = {
      'Bakliyat': ['mercimek', 'nohut', 'fasulye', 'bulgur', 'pirinç', 'barbunya', 'börülce'],
      'Süt Ürünleri': ['süt', 'yoğurt', 'ayran', 'peynir', 'tereyağı', 'kaymak', 'kefir'],
      'Bisküvi/Çikolata': ['bisküvi', 'çikolata', 'gofret', 'kraker', 'kek'],
      'Makarna/Un': ['makarna', 'spagetti', 'un', 'irmik'],
      'Konserve/Sos': ['konserve', 'salça', 'sos', 'ketçap', 'mayonez'],
      'Baharat': ['baharat', 'karabiber', 'kimyon', 'köri', 'tarçın', 'kekik'],
      'Kahve': ['kahve', 'nescafe', 'cappuccino', 'latte'],
      'Çorba/Sos': ['çorba', 'bulyon', 'harç']
    };
    
    const lowerName = productName.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerName.includes(keyword))) {
        return category;
      }
    }
    
    return 'Genel';
  }
  
  /**
   * Get brand tier distribution for a list of products
   */
  static getBrandTierDistribution(
    products: Array<{ name: string; brand?: string }>
  ): { premium: number; standard: number; economy: number; unknown: number } {
    const distribution = { premium: 0, standard: 0, economy: 0, unknown: 0 };
    
    products.forEach(product => {
      const classification = product.brand 
        ? this.classifyBrand(product.brand)
        : this.classifyBrand(product.name);
      
      distribution[classification.brand_tier]++;
    });
    
    return distribution;
  }
  
  /**
   * Add or update a brand in the database
   */
  static async addBrand(brand: BrandInfo): Promise<boolean> {
    const db = this.getDb();
    if (!db) return false;
    
    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO brand_mappings 
        (brand_name, brand_tier, category_focus, parent_brand, is_market_brand)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        brand.name,
        brand.tier,
        brand.category_focus,
        brand.parent_brand,
        brand.is_market_brand
      );
      
      // Update cache
      this.brandCache.set(brand.name.toLowerCase(), brand);
      
      return true;
    } catch (error) {
      console.error('[BrandClassifier] Failed to add brand:', error);
      return false;
    }
  }
}
