/**
 * Category Predictor
 * Fallback pricing based on category averages and trends
 */

import Database from 'better-sqlite3';
import { join } from 'path';

export interface CategoryPriceData {
  category: string;
  subcategory?: string;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  medianPrice: number;
  priceRange: number;
  volatility: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  trendPercentage: number;
  seasonalFactor: number;
  lastUpdated: Date;
  sampleCount: number;
}

export interface PricePrediction {
  estimatedPrice: number;
  confidence: number;
  method: 'category_average' | 'subcategory_average' | 'seasonal_adjusted' | 'trend_adjusted' | 'similar_product';
  priceRange: {
    min: number;
    max: number;
  };
  factors: {
    category?: string;
    trend?: number;
    seasonality?: number;
    similarity?: number;
  };
}

export interface CategoryConfig {
  category: string;
  subcategories: string[];
  seasonalPattern?: 'summer_high' | 'winter_high' | 'stable' | 'harvest_dependent';
  volatilityLevel: 'high' | 'medium' | 'low';
  priceFactors: string[];
}

export class CategoryPredictor {
  private static db: Database.Database | null = null;
  
  // Category configurations
  private static readonly CATEGORY_CONFIGS: CategoryConfig[] = [
    {
      category: 'Sebze',
      subcategories: ['Salatalık', 'Domates', 'Patates', 'Soğan', 'Biber'],
      seasonalPattern: 'summer_high',
      volatilityLevel: 'high',
      priceFactors: ['weather', 'harvest', 'import']
    },
    {
      category: 'Meyve',
      subcategories: ['Elma', 'Portakal', 'Muz', 'Çilek', 'Karpuz'],
      seasonalPattern: 'harvest_dependent',
      volatilityLevel: 'high',
      priceFactors: ['season', 'import', 'weather']
    },
    {
      category: 'Bakliyat',
      subcategories: ['Mercimek', 'Nohut', 'Fasulye', 'Bulgur', 'Pirinç'],
      seasonalPattern: 'stable',
      volatilityLevel: 'low',
      priceFactors: ['import', 'exchange_rate', 'harvest']
    },
    {
      category: 'Süt Ürünleri',
      subcategories: ['Süt', 'Yoğurt', 'Peynir', 'Ayran', 'Tereyağı'],
      seasonalPattern: 'stable',
      volatilityLevel: 'medium',
      priceFactors: ['feed_cost', 'production', 'brand']
    },
    {
      category: 'Et ve Tavuk',
      subcategories: ['Dana eti', 'Kuzu eti', 'Tavuk', 'Kıyma', 'Sucuk'],
      seasonalPattern: 'winter_high',
      volatilityLevel: 'medium',
      priceFactors: ['feed_cost', 'demand', 'holiday']
    },
    {
      category: 'Temel Gıda',
      subcategories: ['Un', 'Şeker', 'Yağ', 'Tuz', 'Makarna'],
      seasonalPattern: 'stable',
      volatilityLevel: 'low',
      priceFactors: ['raw_material', 'production', 'regulation']
    }
  ];
  
  // Seasonal adjustment factors (monthly)
  private static readonly SEASONAL_FACTORS: { [month: number]: { [pattern: string]: number } } = {
    0: { summer_high: 0.9, winter_high: 1.1, stable: 1.0, harvest_dependent: 1.0 },  // January
    1: { summer_high: 0.9, winter_high: 1.1, stable: 1.0, harvest_dependent: 1.0 },  // February
    2: { summer_high: 0.95, winter_high: 1.05, stable: 1.0, harvest_dependent: 0.9 }, // March
    3: { summer_high: 1.0, winter_high: 1.0, stable: 1.0, harvest_dependent: 0.85 },  // April
    4: { summer_high: 1.05, winter_high: 0.95, stable: 1.0, harvest_dependent: 0.8 }, // May
    5: { summer_high: 1.1, winter_high: 0.9, stable: 1.0, harvest_dependent: 0.8 },   // June
    6: { summer_high: 1.15, winter_high: 0.85, stable: 1.0, harvest_dependent: 0.85 },// July
    7: { summer_high: 1.15, winter_high: 0.85, stable: 1.0, harvest_dependent: 0.9 }, // August
    8: { summer_high: 1.1, winter_high: 0.9, stable: 1.0, harvest_dependent: 0.95 },  // September
    9: { summer_high: 1.05, winter_high: 0.95, stable: 1.0, harvest_dependent: 1.0 }, // October
    10: { summer_high: 1.0, winter_high: 1.0, stable: 1.0, harvest_dependent: 1.05 }, // November
    11: { summer_high: 0.95, winter_high: 1.05, stable: 1.0, harvest_dependent: 1.1 } // December
  };
  
  /**
   * Initialize database connection
   */
  private static getDb(): Database.Database | null {
    if (!this.db) {
      try {
        const dbPath = join(process.cwd(), 'procheff.db');
        this.db = new Database(dbPath);
      } catch (error) {
        console.error('[CategoryPredictor] Database connection failed:', error);
      }
    }
    return this.db;
  }
  
  /**
   * Predict price based on category
   */
  static async predictPrice(
    productName: string,
    category?: string,
    subcategory?: string
  ): Promise<PricePrediction> {
    // Detect category if not provided
    const detectedCategory = category || this.detectCategory(productName);
    const detectedSubcategory = subcategory || this.detectSubcategory(productName, detectedCategory);
    
    // Get category data
    const categoryData = await this.getCategoryPriceData(detectedCategory, detectedSubcategory);
    
    if (!categoryData) {
      return this.getDefaultPrediction(productName);
    }
    
    // Calculate base price
    let estimatedPrice = categoryData.averagePrice;
    let confidence = 0.7;
    let method: PricePrediction['method'] = 'category_average';
    const factors: PricePrediction['factors'] = { category: detectedCategory };
    
    // Use subcategory if available
    if (detectedSubcategory && categoryData.subcategory === detectedSubcategory) {
      method = 'subcategory_average';
      confidence += 0.1;
    }
    
    // Apply seasonal adjustment
    const seasonalFactor = this.getSeasonalFactor(detectedCategory);
    if (seasonalFactor !== 1.0) {
      estimatedPrice *= seasonalFactor;
      method = 'seasonal_adjusted';
      factors.seasonality = seasonalFactor;
    }
    
    // Apply trend adjustment
    if (categoryData.trend !== 'stable' && Math.abs(categoryData.trendPercentage) > 0.05) {
      const trendFactor = 1 + (categoryData.trendPercentage / 100);
      estimatedPrice *= trendFactor;
      method = 'trend_adjusted';
      factors.trend = trendFactor;
      confidence -= 0.05; // Lower confidence for trending prices
    }
    
    // Adjust confidence based on sample size and volatility
    if (categoryData.sampleCount < 10) {
      confidence -= 0.2;
    } else if (categoryData.sampleCount > 100) {
      confidence += 0.1;
    }
    
    if (categoryData.volatility > 0.3) {
      confidence -= 0.1;
    }
    
    // Calculate price range
    const range = categoryData.priceRange * (1 + categoryData.volatility);
    const priceRange = {
      min: Math.max(categoryData.minPrice, estimatedPrice - range / 2),
      max: Math.min(categoryData.maxPrice, estimatedPrice + range / 2)
    };
    
    return {
      estimatedPrice: Math.round(estimatedPrice * 100) / 100,
      confidence: Math.max(0.3, Math.min(1.0, confidence)),
      method,
      priceRange,
      factors
    };
  }
  
  /**
   * Get category price data from database
   */
  private static async getCategoryPriceData(
    category: string,
    subcategory?: string
  ): Promise<CategoryPriceData | null> {
    const db = this.getDb();
    if (!db) return this.getInMemoryCategoryData(category);
    
    try {
      // Try to get from database
      const query = subcategory
        ? `SELECT * FROM market_category_averages WHERE category = ? AND subcategory = ? ORDER BY last_updated DESC LIMIT 1`
        : `SELECT * FROM market_category_averages WHERE category = ? ORDER BY last_updated DESC LIMIT 1`;
      
      const params = subcategory ? [category, subcategory] : [category];
      const row = db.prepare(query).get(...params) as any;
      
      if (row) {
        return {
          category: row.category,
          subcategory: row.subcategory,
          averagePrice: row.average_price,
          minPrice: row.min_price,
          maxPrice: row.max_price,
          medianPrice: row.median_price || row.average_price,
          priceRange: row.max_price - row.min_price,
          volatility: row.volatility || 0.1,
          trend: row.trend || 'stable',
          trendPercentage: row.trend_percentage || 0,
          seasonalFactor: row.seasonal_factor || 1.0,
          lastUpdated: new Date(row.last_updated),
          sampleCount: row.sample_count
        };
      }
    } catch (error) {
      console.error('[CategoryPredictor] Database query failed:', error);
    }
    
    // Fallback to in-memory data
    return this.getInMemoryCategoryData(category);
  }
  
  /**
   * Get in-memory category data (fallback)
   */
  private static getInMemoryCategoryData(category: string): CategoryPriceData {
    // Default category price ranges (in TL)
    const categoryDefaults: { [key: string]: Partial<CategoryPriceData> } = {
      'Sebze': { averagePrice: 25, minPrice: 10, maxPrice: 50, volatility: 0.4 },
      'Meyve': { averagePrice: 30, minPrice: 15, maxPrice: 60, volatility: 0.5 },
      'Bakliyat': { averagePrice: 45, minPrice: 30, maxPrice: 80, volatility: 0.2 },
      'Süt Ürünleri': { averagePrice: 35, minPrice: 20, maxPrice: 60, volatility: 0.3 },
      'Et ve Tavuk': { averagePrice: 150, minPrice: 80, maxPrice: 400, volatility: 0.3 },
      'Temel Gıda': { averagePrice: 25, minPrice: 10, maxPrice: 50, volatility: 0.1 },
      'Default': { averagePrice: 40, minPrice: 20, maxPrice: 80, volatility: 0.25 }
    };
    
    const defaults = categoryDefaults[category] || categoryDefaults['Default'];
    
    return {
      category,
      subcategory: undefined,
      averagePrice: defaults.averagePrice!,
      minPrice: defaults.minPrice!,
      maxPrice: defaults.maxPrice!,
      medianPrice: defaults.averagePrice!,
      priceRange: defaults.maxPrice! - defaults.minPrice!,
      volatility: defaults.volatility!,
      trend: 'stable',
      trendPercentage: 0,
      seasonalFactor: 1.0,
      lastUpdated: new Date(),
      sampleCount: 50 // Assumed
    };
  }
  
  /**
   * Detect category from product name
   */
  static detectCategory(productName: string): string {
    const lowerName = productName.toLowerCase();
    
    for (const config of this.CATEGORY_CONFIGS) {
      const categoryKeywords = config.subcategories.map(s => s.toLowerCase());
      
      if (categoryKeywords.some(keyword => lowerName.includes(keyword))) {
        return config.category;
      }
    }
    
    // Additional keyword matching
    const categoryKeywords: { [key: string]: string[] } = {
      'Sebze': ['salatalık', 'domates', 'patates', 'soğan', 'biber', 'patlıcan', 'kabak'],
      'Meyve': ['elma', 'portakal', 'muz', 'çilek', 'karpuz', 'üzüm', 'kiraz'],
      'Bakliyat': ['mercimek', 'nohut', 'fasulye', 'bulgur', 'pirinç', 'barbunya'],
      'Süt Ürünleri': ['süt', 'yoğurt', 'peynir', 'ayran', 'tereyağı', 'kaymak'],
      'Et ve Tavuk': ['et', 'kıyma', 'tavuk', 'balık', 'sucuk', 'sosis'],
      'Temel Gıda': ['un', 'şeker', 'yağ', 'tuz', 'makarna', 'salça']
    };
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerName.includes(keyword))) {
        return category;
      }
    }
    
    return 'Genel';
  }
  
  /**
   * Detect subcategory from product name
   */
  static detectSubcategory(productName: string, category: string): string | undefined {
    const config = this.CATEGORY_CONFIGS.find(c => c.category === category);
    if (!config) return undefined;
    
    const lowerName = productName.toLowerCase();
    
    for (const subcategory of config.subcategories) {
      if (lowerName.includes(subcategory.toLowerCase())) {
        return subcategory;
      }
    }
    
    return undefined;
  }
  
  /**
   * Get seasonal adjustment factor
   */
  private static getSeasonalFactor(category: string): number {
    const config = this.CATEGORY_CONFIGS.find(c => c.category === category);
    if (!config || !config.seasonalPattern) return 1.0;
    
    const month = new Date().getMonth();
    const factors = this.SEASONAL_FACTORS[month];
    
    return factors[config.seasonalPattern] || 1.0;
  }
  
  /**
   * Get default prediction when no category data available
   */
  private static getDefaultPrediction(productName: string): PricePrediction {
    return {
      estimatedPrice: 40,
      confidence: 0.3,
      method: 'category_average',
      priceRange: {
        min: 20,
        max: 80
      },
      factors: {
        category: 'Genel'
      }
    };
  }
  
  /**
   * Update category averages based on new price data
   */
  static async updateCategoryAverage(
    category: string,
    prices: number[],
    subcategory?: string
  ): Promise<boolean> {
    const db = this.getDb();
    if (!db || prices.length === 0) return false;
    
    try {
      // Calculate statistics
      const sorted = [...prices].sort((a, b) => a - b);
      const averagePrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      const minPrice = sorted[0];
      const maxPrice = sorted[sorted.length - 1];
      const medianPrice = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
      
      // Calculate volatility
      const variance = prices.reduce((sum, p) => sum + Math.pow(p - averagePrice, 2), 0) / prices.length;
      const stdDev = Math.sqrt(variance);
      const volatility = stdDev / averagePrice;
      
      // Insert or update
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO market_category_averages 
        (market_name, category, subcategory, average_price, min_price, max_price, median_price, volatility, sample_count, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      
      stmt.run(
        'ALL', // Aggregate for all markets
        category,
        subcategory || null,
        averagePrice,
        minPrice,
        maxPrice,
        medianPrice,
        volatility,
        prices.length
      );
      
      return true;
    } catch (error) {
      console.error('[CategoryPredictor] Failed to update category average:', error);
      return false;
    }
  }
}
