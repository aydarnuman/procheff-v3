/**
 * Coverage Metrics
 * Tracks market coverage, product availability, and regional distribution
 */

import Database from 'better-sqlite3';
import { join } from 'path';

export interface MarketCoverage {
  market: string;
  totalProducts: number;
  availableProducts: number;
  coverageRate: number;
  lastUpdated: Date;
  categories: {
    [category: string]: {
      total: number;
      available: number;
      coverage: number;
    };
  };
}

export interface RegionalCoverage {
  region: string;
  city: string;
  marketCount: number;
  productCount: number;
  averagePrice: number;
  priceVariation: number;
}

export interface ProductAvailability {
  productId: string;
  productName: string;
  category: string;
  totalMarkets: number;
  availableInMarkets: number;
  availabilityRate: number;
  priceRange: {
    min: number;
    max: number;
    average: number;
    variation: number;
  };
  lastSeen: Date;
}

export interface CoverageReport {
  timestamp: Date;
  summary: {
    totalMarkets: number;
    activeMarkets: number;
    totalProducts: number;
    uniqueProducts: number;
    averageCoverage: number;
    dataFreshness: number; // Percentage of data updated in last 24h
  };
  marketCoverage: MarketCoverage[];
  regionalDistribution: RegionalCoverage[];
  categoryInsights: {
    [category: string]: {
      marketCount: number;
      productCount: number;
      averageCoverage: number;
      priceStability: number;
    };
  };
  gaps: {
    underservedCategories: string[];
    missingMarkets: string[];
    staleData: Array<{
      market: string;
      category: string;
      lastUpdate: Date;
    }>;
  };
}

export class CoverageMetrics {
  private static instance: CoverageMetrics;
  private db: Database | null = null;
  
  // Configuration
  private readonly STALE_DATA_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours
  private readonly LOW_COVERAGE_THRESHOLD = 0.5; // 50%
  private readonly HIGH_PRICE_VARIATION_THRESHOLD = 0.3; // 30%
  
  // Known markets and regions
  private readonly MARKETS = [
    'Migros', 'CarrefourSA', 'A101', 'BİM', 'ŞOK', 
    'Metro', 'Makro', 'File', 'Getir', 'Trendyol'
  ];
  
  private readonly REGIONS = [
    { region: 'Marmara', cities: ['İstanbul', 'Kocaeli', 'Bursa', 'Tekirdağ'] },
    { region: 'Ege', cities: ['İzmir', 'Manisa', 'Aydın', 'Muğla'] },
    { region: 'Akdeniz', cities: ['Antalya', 'Adana', 'Mersin', 'Hatay'] },
    { region: 'İç Anadolu', cities: ['Ankara', 'Konya', 'Kayseri', 'Eskişehir'] },
    { region: 'Karadeniz', cities: ['Trabzon', 'Samsun', 'Ordu', 'Giresun'] },
    { region: 'Doğu Anadolu', cities: ['Erzurum', 'Van', 'Malatya', 'Elazığ'] },
    { region: 'Güneydoğu', cities: ['Gaziantep', 'Şanlıurfa', 'Diyarbakır', 'Mardin'] }
  ];
  
  private constructor() {
    this.initializeDatabase();
  }
  
  static getInstance(): CoverageMetrics {
    if (!CoverageMetrics.instance) {
      CoverageMetrics.instance = new CoverageMetrics();
    }
    return CoverageMetrics.instance;
  }
  
  /**
   * Initialize database connection
   */
  private initializeDatabase(): void {
    try {
      const dbPath = join(process.cwd(), 'procheff.db');
      this.db = new Database(dbPath);
      
      // Create coverage tracking table if not exists
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS coverage_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          market TEXT NOT NULL,
          category TEXT NOT NULL,
          product_count INTEGER DEFAULT 0,
          available_count INTEGER DEFAULT 0,
          coverage_rate REAL DEFAULT 0.0,
          average_price REAL,
          price_variation REAL,
          last_updated INTEGER NOT NULL,
          UNIQUE(market, category)
        );
        
        CREATE INDEX IF NOT EXISTS idx_coverage_market ON coverage_metrics(market);
        CREATE INDEX IF NOT EXISTS idx_coverage_updated ON coverage_metrics(last_updated);
      `);
    } catch (error) {
      console.error('[CoverageMetrics] Database initialization failed:', error);
    }
  }
  
  /**
   * Update market coverage
   */
  async updateMarketCoverage(
    market: string,
    category: string,
    productData: Array<{
      productId: string;
      available: boolean;
      price?: number;
    }>
  ): Promise<void> {
    if (!this.db || productData.length === 0) return;
    
    const availableProducts = productData.filter(p => p.available);
    const prices = availableProducts
      .map(p => p.price)
      .filter(p => p !== undefined && p > 0) as number[];
    
    const averagePrice = prices.length > 0
      ? prices.reduce((sum, p) => sum + p, 0) / prices.length
      : 0;
    
    const priceVariation = this.calculatePriceVariation(prices);
    const coverageRate = productData.length > 0
      ? availableProducts.length / productData.length
      : 0;
    
    try {
      this.db.prepare(`
        INSERT OR REPLACE INTO coverage_metrics
        (market, category, product_count, available_count, coverage_rate, 
         average_price, price_variation, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        market,
        category,
        productData.length,
        availableProducts.length,
        coverageRate,
        averagePrice,
        priceVariation,
        Date.now()
      );
    } catch (error) {
      console.error('[CoverageMetrics] Failed to update coverage:', error);
    }
  }
  
  /**
   * Get market coverage
   */
  async getMarketCoverage(): Promise<MarketCoverage[]> {
    if (!this.db) return [];
    
    try {
      const markets = this.db.prepare(`
        SELECT 
          market,
          SUM(product_count) as totalProducts,
          SUM(available_count) as availableProducts,
          AVG(coverage_rate) as coverageRate,
          MAX(last_updated) as lastUpdated
        FROM coverage_metrics
        GROUP BY market
      `).all() as any[];
      
      const coverage: MarketCoverage[] = [];
      
      for (const market of markets) {
        const categories = this.db.prepare(`
          SELECT category, product_count, available_count, coverage_rate
          FROM coverage_metrics
          WHERE market = ?
        `).all(market.market) as any[];
        
        const categoryMap: MarketCoverage['categories'] = {};
        categories.forEach(cat => {
          categoryMap[cat.category] = {
            total: cat.product_count,
            available: cat.available_count,
            coverage: cat.coverage_rate
          };
        });
        
        coverage.push({
          market: market.market,
          totalProducts: market.totalProducts,
          availableProducts: market.availableProducts,
          coverageRate: market.coverageRate,
          lastUpdated: new Date(market.lastUpdated),
          categories: categoryMap
        });
      }
      
      return coverage;
    } catch (error) {
      console.error('[CoverageMetrics] Failed to get market coverage:', error);
      return [];
    }
  }
  
  /**
   * Get regional coverage
   */
  async getRegionalCoverage(): Promise<RegionalCoverage[]> {
    if (!this.db) return [];
    
    try {
      // Get user submissions by city
      const cityData = this.db.prepare(`
        SELECT 
          city,
          COUNT(DISTINCT market_name) as marketCount,
          COUNT(DISTINCT normalized_product_name) as productCount,
          AVG(price) as averagePrice,
          (MAX(price) - MIN(price)) / AVG(price) as priceVariation
        FROM user_price_submissions
        WHERE verification_status = 'verified'
        GROUP BY city
      `).all() as any[];
      
      const coverage: RegionalCoverage[] = [];
      
      cityData.forEach(city => {
        const region = this.REGIONS.find(r => 
          r.cities.includes(city.city)
        )?.region || 'Diğer';
        
        coverage.push({
          region,
          city: city.city,
          marketCount: city.marketCount,
          productCount: city.productCount,
          averagePrice: city.averagePrice,
          priceVariation: city.priceVariation
        });
      });
      
      return coverage;
    } catch (error) {
      console.error('[CoverageMetrics] Failed to get regional coverage:', error);
      return [];
    }
  }
  
  /**
   * Get product availability
   */
  async getProductAvailability(
    category?: string,
    limit: number = 100
  ): Promise<ProductAvailability[]> {
    if (!this.db) return [];
    
    try {
      const query = category
        ? `SELECT 
            p.id as productId,
            p.name as productName,
            p.category,
            COUNT(DISTINCT mp.source) as totalMarkets,
            SUM(CASE WHEN mp.in_stock THEN 1 ELSE 0 END) as availableInMarkets,
            MIN(mp.current_price) as minPrice,
            MAX(mp.current_price) as maxPrice,
            AVG(mp.current_price) as avgPrice,
            MAX(mp.updated_at) as lastSeen
          FROM product_cards p
          LEFT JOIN market_prices_v2 mp ON p.id = mp.product_id
          WHERE p.category = ?
          GROUP BY p.id
          LIMIT ?`
        : `SELECT 
            p.id as productId,
            p.name as productName,
            p.category,
            COUNT(DISTINCT mp.source) as totalMarkets,
            SUM(CASE WHEN mp.in_stock THEN 1 ELSE 0 END) as availableInMarkets,
            MIN(mp.current_price) as minPrice,
            MAX(mp.current_price) as maxPrice,
            AVG(mp.current_price) as avgPrice,
            MAX(mp.updated_at) as lastSeen
          FROM product_cards p
          LEFT JOIN market_prices_v2 mp ON p.id = mp.product_id
          GROUP BY p.id
          LIMIT ?`;
      
      const params = category ? [category, limit] : [limit];
      const products = this.db.prepare(query).all(...params) as any[];
      
      return products.map(p => ({
        productId: p.productId,
        productName: p.productName,
        category: p.category,
        totalMarkets: p.totalMarkets || 0,
        availableInMarkets: p.availableInMarkets || 0,
        availabilityRate: p.totalMarkets > 0 
          ? p.availableInMarkets / p.totalMarkets 
          : 0,
        priceRange: {
          min: p.minPrice || 0,
          max: p.maxPrice || 0,
          average: p.avgPrice || 0,
          variation: p.avgPrice > 0 
            ? (p.maxPrice - p.minPrice) / p.avgPrice 
            : 0
        },
        lastSeen: p.lastSeen ? new Date(p.lastSeen) : new Date()
      }));
    } catch (error) {
      console.error('[CoverageMetrics] Failed to get product availability:', error);
      return [];
    }
  }
  
  /**
   * Generate comprehensive coverage report
   */
  async generateReport(): Promise<CoverageReport> {
    const marketCoverage = await this.getMarketCoverage();
    const regionalDistribution = await this.getRegionalCoverage();
    const productAvailability = await this.getProductAvailability();
    
    // Calculate summary statistics
    const activeMarkets = marketCoverage.filter(m => 
      m.lastUpdated.getTime() > Date.now() - this.STALE_DATA_THRESHOLD
    );
    
    const totalProducts = new Set(productAvailability.map(p => p.productId)).size;
    const averageCoverage = marketCoverage.length > 0
      ? marketCoverage.reduce((sum, m) => sum + m.coverageRate, 0) / marketCoverage.length
      : 0;
    
    const recentData = marketCoverage.filter(m => 
      m.lastUpdated.getTime() > Date.now() - this.STALE_DATA_THRESHOLD
    );
    const dataFreshness = marketCoverage.length > 0
      ? recentData.length / marketCoverage.length
      : 0;
    
    // Calculate category insights
    const categoryInsights = this.calculateCategoryInsights(
      marketCoverage,
      productAvailability
    );
    
    // Identify gaps
    const gaps = this.identifyGaps(
      marketCoverage,
      categoryInsights,
      productAvailability
    );
    
    return {
      timestamp: new Date(),
      summary: {
        totalMarkets: this.MARKETS.length,
        activeMarkets: activeMarkets.length,
        totalProducts,
        uniqueProducts: productAvailability.length,
        averageCoverage,
        dataFreshness
      },
      marketCoverage,
      regionalDistribution,
      categoryInsights,
      gaps
    };
  }
  
  /**
   * Calculate category insights
   */
  private calculateCategoryInsights(
    marketCoverage: MarketCoverage[],
    productAvailability: ProductAvailability[]
  ): CoverageReport['categoryInsights'] {
    const insights: CoverageReport['categoryInsights'] = {};
    
    // Group products by category
    const productsByCategory = productAvailability.reduce((acc, product) => {
      if (!acc[product.category]) {
        acc[product.category] = [];
      }
      acc[product.category].push(product);
      return acc;
    }, {} as { [category: string]: ProductAvailability[] });
    
    Object.entries(productsByCategory).forEach(([category, products]) => {
      const marketsWithCategory = marketCoverage.filter(m => 
        m.categories[category] !== undefined
      );
      
      const averageCoverage = marketsWithCategory.length > 0
        ? marketsWithCategory.reduce((sum, m) => 
            sum + m.categories[category].coverage, 0
          ) / marketsWithCategory.length
        : 0;
      
      const priceStability = 1 - (
        products.reduce((sum, p) => sum + p.priceRange.variation, 0) / 
        products.length
      );
      
      insights[category] = {
        marketCount: marketsWithCategory.length,
        productCount: products.length,
        averageCoverage,
        priceStability: Math.max(0, Math.min(1, priceStability))
      };
    });
    
    return insights;
  }
  
  /**
   * Identify coverage gaps
   */
  private identifyGaps(
    marketCoverage: MarketCoverage[],
    categoryInsights: CoverageReport['categoryInsights'],
    productAvailability: ProductAvailability[]
  ): CoverageReport['gaps'] {
    const coveredMarkets = new Set(marketCoverage.map(m => m.market));
    const missingMarkets = this.MARKETS.filter(m => !coveredMarkets.has(m));
    
    const underservedCategories = Object.entries(categoryInsights)
      .filter(([_, insights]) => insights.averageCoverage < this.LOW_COVERAGE_THRESHOLD)
      .map(([category]) => category);
    
    const staleData: CoverageReport['gaps']['staleData'] = [];
    const staleThreshold = Date.now() - this.STALE_DATA_THRESHOLD;
    
    marketCoverage.forEach(market => {
      Object.entries(market.categories).forEach(([category, data]) => {
        if (market.lastUpdated.getTime() < staleThreshold) {
          staleData.push({
            market: market.market,
            category,
            lastUpdate: market.lastUpdated
          });
        }
      });
    });
    
    return {
      underservedCategories,
      missingMarkets,
      staleData
    };
  }
  
  /**
   * Calculate price variation
   */
  private calculatePriceVariation(prices: number[]): number {
    if (prices.length < 2) return 0;
    
    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    
    return mean > 0 ? stdDev / mean : 0;
  }
  
  /**
   * Get coverage map data for visualization
   */
  async getCoverageMapData(): Promise<{
    [city: string]: {
      marketCount: number;
      productCount: number;
      averagePrice: number;
      dataPoints: number;
    };
  }> {
    if (!this.db) return {};
    
    try {
      const data = this.db.prepare(`
        SELECT 
          city,
          COUNT(DISTINCT market_name) as marketCount,
          COUNT(DISTINCT normalized_product_name) as productCount,
          AVG(price) as averagePrice,
          COUNT(*) as dataPoints
        FROM user_price_submissions
        WHERE verification_status = 'verified'
          AND submitted_at > datetime('now', '-30 days')
        GROUP BY city
      `).all() as any[];
      
      const mapData: { [city: string]: any } = {};
      
      data.forEach(row => {
        mapData[row.city] = {
          marketCount: row.marketCount,
          productCount: row.productCount,
          averagePrice: row.averagePrice,
          dataPoints: row.dataPoints
        };
      });
      
      return mapData;
    } catch (error) {
      console.error('[CoverageMetrics] Failed to get coverage map data:', error);
      return {};
    }
  }
}

// Export singleton instance
export const coverageMetrics = CoverageMetrics.getInstance();
