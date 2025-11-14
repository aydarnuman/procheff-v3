/**
 * Outlier Detector
 * Detects and filters price outliers using statistical methods
 */

export interface PriceDataPoint {
  price: number;
  source: string;
  confidence?: number;
  metadata?: any;
}

export interface OutlierDetectionResult {
  cleanData: PriceDataPoint[];
  outliers: PriceDataPoint[];
  statistics: {
    mean: number;
    median: number;
    stdDev: number;
    iqr: number;
    lowerBound: number;
    upperBound: number;
    outlierCount: number;
    outlierPercentage: number;
  };
}

export interface OutlierDetectionOptions {
  method?: 'iqr' | 'zscore' | 'hybrid';
  iqrMultiplier?: number;
  zscoreThreshold?: number;
  minSampleSize?: number;
  categoryBasedThreshold?: boolean;
}

export class OutlierDetector {
  private static readonly DEFAULT_OPTIONS: OutlierDetectionOptions = {
    method: 'hybrid',
    iqrMultiplier: 1.5,
    zscoreThreshold: 3,
    minSampleSize: 3,
    categoryBasedThreshold: true
  };
  
  // Category-specific thresholds (percentage deviation allowed)
  private static readonly CATEGORY_THRESHOLDS: { [category: string]: number } = {
    'luxury': 0.5,      // Luxury items can vary 50%
    'fresh': 0.4,       // Fresh produce varies 40%
    'standard': 0.25,   // Standard groceries vary 25%
    'stable': 0.15,     // Stable commodities vary 15%
    'regulated': 0.1    // Regulated items vary 10%
  };
  
  /**
   * Detect outliers in price data
   */
  static detectOutliers(
    data: PriceDataPoint[],
    options: OutlierDetectionOptions = {}
  ): OutlierDetectionResult {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    // Need minimum sample size
    if (data.length < opts.minSampleSize!) {
      return {
        cleanData: data,
        outliers: [],
        statistics: this.calculateStatistics(data, [], 0, 0)
      };
    }
    
    const prices = data.map(d => d.price);
    const statistics = this.calculateBasicStatistics(prices);
    
    let lowerBound: number;
    let upperBound: number;
    
    switch (opts.method) {
      case 'iqr':
        ({ lowerBound, upperBound } = this.calculateIQRBounds(prices, opts.iqrMultiplier!));
        break;
      case 'zscore':
        ({ lowerBound, upperBound } = this.calculateZScoreBounds(
          prices, 
          statistics.mean, 
          statistics.stdDev, 
          opts.zscoreThreshold!
        ));
        break;
      case 'hybrid':
      default:
        ({ lowerBound, upperBound } = this.calculateHybridBounds(
          prices, 
          statistics, 
          opts
        ));
    }
    
    // Filter data
    const cleanData: PriceDataPoint[] = [];
    const outliers: PriceDataPoint[] = [];
    
    data.forEach(point => {
      if (point.price >= lowerBound && point.price <= upperBound) {
        cleanData.push(point);
      } else {
        outliers.push(point);
      }
    });
    
    return {
      cleanData,
      outliers,
      statistics: this.calculateStatistics(cleanData, outliers, lowerBound, upperBound)
    };
  }
  
  /**
   * Calculate basic statistics
   */
  private static calculateBasicStatistics(prices: number[]): {
    mean: number;
    median: number;
    stdDev: number;
    q1: number;
    q3: number;
    iqr: number;
  } {
    const sorted = [...prices].sort((a, b) => a - b);
    const n = sorted.length;
    
    // Mean
    const mean = prices.reduce((sum, p) => sum + p, 0) / n;
    
    // Median
    const median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];
    
    // Standard deviation
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    // Quartiles
    const q1 = this.percentile(sorted, 0.25);
    const q3 = this.percentile(sorted, 0.75);
    const iqr = q3 - q1;
    
    return { mean, median, stdDev, q1, q3, iqr };
  }
  
  /**
   * Calculate percentile
   */
  private static percentile(sorted: number[], p: number): number {
    const index = p * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    if (lower === upper) {
      return sorted[lower];
    }
    
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
  
  /**
   * Calculate IQR-based bounds
   */
  private static calculateIQRBounds(
    prices: number[], 
    multiplier: number
  ): { lowerBound: number; upperBound: number } {
    const stats = this.calculateBasicStatistics(prices);
    const iqrRange = stats.iqr * multiplier;
    
    return {
      lowerBound: Math.max(0, stats.q1 - iqrRange),
      upperBound: stats.q3 + iqrRange
    };
  }
  
  /**
   * Calculate Z-score based bounds
   */
  private static calculateZScoreBounds(
    prices: number[],
    mean: number,
    stdDev: number,
    threshold: number
  ): { lowerBound: number; upperBound: number } {
    const range = stdDev * threshold;
    
    return {
      lowerBound: Math.max(0, mean - range),
      upperBound: mean + range
    };
  }
  
  /**
   * Calculate hybrid bounds (IQR + Z-score)
   */
  private static calculateHybridBounds(
    prices: number[],
    stats: any,
    options: OutlierDetectionOptions
  ): { lowerBound: number; upperBound: number } {
    // Calculate both methods
    const iqrBounds = this.calculateIQRBounds(prices, options.iqrMultiplier!);
    const zscoreBounds = this.calculateZScoreBounds(
      prices, 
      stats.mean, 
      stats.stdDev, 
      options.zscoreThreshold!
    );
    
    // Use the more conservative bounds (wider range)
    return {
      lowerBound: Math.min(iqrBounds.lowerBound, zscoreBounds.lowerBound),
      upperBound: Math.max(iqrBounds.upperBound, zscoreBounds.upperBound)
    };
  }
  
  /**
   * Calculate detailed statistics for result
   */
  private static calculateStatistics(
    cleanData: PriceDataPoint[],
    outliers: PriceDataPoint[],
    lowerBound: number,
    upperBound: number
  ): OutlierDetectionResult['statistics'] {
    const allData = [...cleanData, ...outliers];
    const cleanPrices = cleanData.map(d => d.price);
    
    if (cleanPrices.length === 0) {
      return {
        mean: 0,
        median: 0,
        stdDev: 0,
        iqr: 0,
        lowerBound: 0,
        upperBound: 0,
        outlierCount: 0,
        outlierPercentage: 0
      };
    }
    
    const stats = this.calculateBasicStatistics(cleanPrices);
    
    return {
      mean: stats.mean,
      median: stats.median,
      stdDev: stats.stdDev,
      iqr: stats.iqr,
      lowerBound,
      upperBound,
      outlierCount: outliers.length,
      outlierPercentage: (outliers.length / allData.length) * 100
    };
  }
  
  /**
   * Detect outliers with category-based thresholds
   */
  static detectOutliersByCategory(
    data: PriceDataPoint[],
    category: string,
    options: OutlierDetectionOptions = {}
  ): OutlierDetectionResult {
    const categoryThreshold = this.CATEGORY_THRESHOLDS[category] || 
                            this.CATEGORY_THRESHOLDS['standard'];
    
    if (options.categoryBasedThreshold) {
      // Adjust thresholds based on category
      const adjustedOptions = {
        ...options,
        iqrMultiplier: 1.5 * (1 + categoryThreshold),
        zscoreThreshold: 3 * (1 + categoryThreshold)
      };
      
      return this.detectOutliers(data, adjustedOptions);
    }
    
    return this.detectOutliers(data, options);
  }
  
  /**
   * Check if a single price is an outlier
   */
  static isOutlier(
    price: number,
    referencePrices: number[],
    options: OutlierDetectionOptions = {}
  ): boolean {
    const data = referencePrices.map(p => ({ price: p, source: 'reference' }));
    data.push({ price, source: 'test' });
    
    const result = this.detectOutliers(data, options);
    
    return result.outliers.some(o => o.source === 'test');
  }
  
  /**
   * Get outlier reason
   */
  static getOutlierReason(
    price: number,
    statistics: OutlierDetectionResult['statistics']
  ): string {
    const deviation = ((price - statistics.mean) / statistics.mean) * 100;
    
    if (price < statistics.lowerBound) {
      return `Fiyat ortalamadan %${Math.abs(deviation).toFixed(0)} düşük`;
    } else if (price > statistics.upperBound) {
      return `Fiyat ortalamadan %${deviation.toFixed(0)} yüksek`;
    }
    
    return 'Normal aralıkta';
  }
  
  /**
   * Calculate confidence score for a price based on outlier analysis
   */
  static calculatePriceConfidence(
    price: number,
    referencePrices: number[],
    source: string = 'unknown'
  ): number {
    if (referencePrices.length < 3) {
      return 0.5; // Low confidence with few references
    }
    
    const stats = this.calculateBasicStatistics(referencePrices);
    const deviation = Math.abs(price - stats.mean) / stats.mean;
    
    // Base confidence on deviation
    let confidence = 1 - deviation;
    
    // Adjust for source reliability
    const sourceMultipliers: { [key: string]: number } = {
      'api': 1.0,
      'scraper': 0.9,
      'crowd': 0.8,
      'ai': 0.7,
      'unknown': 0.5
    };
    
    confidence *= sourceMultipliers[source] || 0.5;
    
    // Ensure bounds
    return Math.max(0, Math.min(1, confidence));
  }
}
