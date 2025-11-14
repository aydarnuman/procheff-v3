/**
 * Cache Manager
 * Local caching strategy with SQLite persistence and in-memory layer
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import crypto from 'crypto';

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  expiresAt: Date;
  createdAt: Date;
  category: string;
  tags?: string[];
  hitCount: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  category?: string;
  tags?: string[];
  staleWhileRevalidate?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  expired: number;
  evicted: number;
  totalEntries: number;
  memoryUsage: number; // Approximate bytes
}

export class CacheManager {
  private static instance: CacheManager;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private db: Database | null = null;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    expired: 0,
    evicted: 0,
    totalEntries: 0,
    memoryUsage: 0
  };
  
  // Configuration
  private readonly MAX_MEMORY_ENTRIES = 1000;
  private readonly DEFAULT_TTL = 3600; // 1 hour
  
  // Category-specific TTLs (in seconds)
  private readonly CATEGORY_TTLS: { [category: string]: number } = {
    'fresh_produce': 7200,      // 2 hours for vegetables/fruits
    'stable_goods': 86400,      // 24 hours for stable products
    'price_fusion': 1800,       // 30 minutes for fused prices
    'api_response': 600,        // 10 minutes for API responses
    'scraper_data': 3600,       // 1 hour for scraped data
    'user_submission': 300,     // 5 minutes for user submissions
    'fuzzy_match': 86400,       // 24 hours for fuzzy matches
    'category_average': 43200   // 12 hours for category averages
  };
  
  private constructor() {
    this.initializeDatabase();
    this.startCleanupInterval();
  }
  
  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }
  
  /**
   * Initialize database connection
   */
  private initializeDatabase(): void {
    try {
      const dbPath = join(process.cwd(), 'procheff.db');
      this.db = new Database(dbPath);
      
      // Create cache table if not exists
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS cache_entries (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          category TEXT NOT NULL,
          tags TEXT,
          expires_at INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          hit_count INTEGER DEFAULT 0,
          last_accessed INTEGER
        );
        
        CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_entries(expires_at);
        CREATE INDEX IF NOT EXISTS idx_cache_category ON cache_entries(category);
      `);
      
      // Load frequently accessed entries into memory
      this.loadHotEntries();
    } catch (error) {
      console.error('[CacheManager] Database initialization failed:', error);
    }
  }
  
  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      if (this.isExpired(memoryEntry)) {
        this.memoryCache.delete(key);
        this.stats.expired++;
        this.stats.misses++;
        return null;
      }
      
      memoryEntry.hitCount++;
      this.stats.hits++;
      return memoryEntry.value as T;
    }
    
    // Check database
    if (this.db) {
      try {
        const row = this.db.prepare(`
          SELECT * FROM cache_entries WHERE key = ?
        `).get(key) as any;
        
        if (row) {
          const entry: CacheEntry = {
            key: row.key,
            value: JSON.parse(row.value),
            expiresAt: new Date(row.expires_at),
            createdAt: new Date(row.created_at),
            category: row.category,
            tags: row.tags ? JSON.parse(row.tags) : undefined,
            hitCount: row.hit_count
          };
          
          if (this.isExpired(entry)) {
            this.delete(key);
            this.stats.expired++;
            this.stats.misses++;
            return null;
          }
          
          // Update hit count and promote to memory cache
          this.db.prepare(`
            UPDATE cache_entries 
            SET hit_count = hit_count + 1, last_accessed = ? 
            WHERE key = ?
          `).run(Date.now(), key);
          
          this.promoteToMemory(entry);
          this.stats.hits++;
          return entry.value as T;
        }
      } catch (error) {
        console.error('[CacheManager] Get error:', error);
      }
    }
    
    this.stats.misses++;
    return null;
  }
  
  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || this.getCategoryTTL(options.category) || this.DEFAULT_TTL;
    const expiresAt = new Date(Date.now() + ttl * 1000);
    
    const entry: CacheEntry<T> = {
      key,
      value,
      expiresAt,
      createdAt: new Date(),
      category: options.category || 'default',
      tags: options.tags,
      hitCount: 0
    };
    
    // Add to memory cache
    this.memoryCache.set(key, entry);
    this.enforceMemoryLimit();
    
    // Persist to database
    if (this.db) {
      try {
        this.db.prepare(`
          INSERT OR REPLACE INTO cache_entries 
          (key, value, category, tags, expires_at, created_at, hit_count, last_accessed)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          key,
          JSON.stringify(value),
          entry.category,
          entry.tags ? JSON.stringify(entry.tags) : null,
          expiresAt.getTime(),
          entry.createdAt.getTime(),
          0,
          Date.now()
        );
      } catch (error) {
        console.error('[CacheManager] Set error:', error);
      }
    }
    
    this.updateStats();
  }
  
  /**
   * Delete entry from cache
   */
  async delete(key: string): Promise<boolean> {
    const deleted = this.memoryCache.delete(key);
    
    if (this.db) {
      try {
        const result = this.db.prepare('DELETE FROM cache_entries WHERE key = ?').run(key);
        return deleted || result.changes > 0;
      } catch (error) {
        console.error('[CacheManager] Delete error:', error);
      }
    }
    
    return deleted;
  }
  
  /**
   * Clear all cache entries
   */
  async clear(category?: string): Promise<void> {
    if (category) {
      // Clear specific category
      const keysToDelete: string[] = [];
      this.memoryCache.forEach((entry, key) => {
        if (entry.category === category) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.memoryCache.delete(key));
      
      if (this.db) {
        this.db.prepare('DELETE FROM cache_entries WHERE category = ?').run(category);
      }
    } else {
      // Clear all
      this.memoryCache.clear();
      if (this.db) {
        this.db.prepare('DELETE FROM cache_entries').run();
      }
    }
    
    this.updateStats();
  }
  
  /**
   * Get or set with factory function
   */
  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T>, 
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    // Check if stale-while-revalidate is enabled
    if (options.staleWhileRevalidate) {
      const staleEntry = await this.getStale<T>(key);
      if (staleEntry) {
        // Return stale value and revalidate in background
        this.revalidateInBackground(key, factory, options);
        return staleEntry.value;
      }
    }
    
    // Generate new value
    const value = await factory();
    await this.set(key, value, options);
    
    return value;
  }
  
  /**
   * Generate cache key from multiple parts
   */
  static generateKey(...parts: any[]): string {
    const normalized = parts.map(part => {
      if (typeof part === 'object') {
        return JSON.stringify(part, Object.keys(part).sort());
      }
      return String(part);
    }).join(':');
    
    return crypto.createHash('md5').update(normalized).digest('hex');
  }
  
  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return entry.expiresAt < new Date();
  }
  
  /**
   * Get category-specific TTL
   */
  private getCategoryTTL(category?: string): number | undefined {
    return category ? this.CATEGORY_TTLS[category] : undefined;
  }
  
  /**
   * Promote entry to memory cache
   */
  private promoteToMemory(entry: CacheEntry): void {
    if (this.memoryCache.size >= this.MAX_MEMORY_ENTRIES) {
      this.evictLRU();
    }
    this.memoryCache.set(entry.key, entry);
  }
  
  /**
   * Enforce memory limit using LRU eviction
   */
  private enforceMemoryLimit(): void {
    while (this.memoryCache.size > this.MAX_MEMORY_ENTRIES) {
      this.evictLRU();
    }
  }
  
  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruHitCount = Infinity;
    
    this.memoryCache.forEach((entry, key) => {
      if (entry.hitCount < lruHitCount) {
        lruHitCount = entry.hitCount;
        lruKey = key;
      }
    });
    
    if (lruKey) {
      this.memoryCache.delete(lruKey);
      this.stats.evicted++;
    }
  }
  
  /**
   * Load hot entries from database
   */
  private loadHotEntries(): void {
    if (!this.db) return;
    
    try {
      const rows = this.db.prepare(`
        SELECT * FROM cache_entries 
        WHERE expires_at > ? 
        ORDER BY hit_count DESC 
        LIMIT ?
      `).all(Date.now(), 100) as any[];
      
      rows.forEach(row => {
        const entry: CacheEntry = {
          key: row.key,
          value: JSON.parse(row.value),
          expiresAt: new Date(row.expires_at),
          createdAt: new Date(row.created_at),
          category: row.category,
          tags: row.tags ? JSON.parse(row.tags) : undefined,
          hitCount: row.hit_count
        };
        
        if (!this.isExpired(entry)) {
          this.memoryCache.set(entry.key, entry);
        }
      });
    } catch (error) {
      console.error('[CacheManager] Load hot entries error:', error);
    }
  }
  
  /**
   * Get stale entry (expired but still in cache)
   */
  private async getStale<T>(key: string): Promise<CacheEntry<T> | null> {
    const entry = this.memoryCache.get(key);
    if (entry) {
      return entry as CacheEntry<T>;
    }
    
    if (this.db) {
      try {
        const row = this.db.prepare(`
          SELECT * FROM cache_entries WHERE key = ?
        `).get(key) as any;
        
        if (row) {
          return {
            key: row.key,
            value: JSON.parse(row.value),
            expiresAt: new Date(row.expires_at),
            createdAt: new Date(row.created_at),
            category: row.category,
            tags: row.tags ? JSON.parse(row.tags) : undefined,
            hitCount: row.hit_count
          };
        }
      } catch (error) {
        console.error('[CacheManager] Get stale error:', error);
      }
    }
    
    return null;
  }
  
  /**
   * Revalidate cache entry in background
   */
  private async revalidateInBackground<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions
  ): Promise<void> {
    try {
      const value = await factory();
      await this.set(key, value, options);
    } catch (error) {
      console.error('[CacheManager] Background revalidation failed:', error);
    }
  }
  
  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Run every minute
  }
  
  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    // Clean memory cache
    const keysToDelete: string[] = [];
    this.memoryCache.forEach((entry, key) => {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.memoryCache.delete(key));
    
    // Clean database
    if (this.db) {
      try {
        const result = this.db.prepare('DELETE FROM cache_entries WHERE expires_at < ?').run(Date.now());
        if (result.changes > 0) {
          console.log(`[CacheManager] Cleaned ${result.changes} expired entries`);
        }
      } catch (error) {
        console.error('[CacheManager] Cleanup error:', error);
      }
    }
    
    this.updateStats();
  }
  
  /**
   * Update statistics
   */
  private updateStats(): void {
    this.stats.totalEntries = this.memoryCache.size;
    this.stats.memoryUsage = this.estimateMemoryUsage();
  }
  
  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    this.memoryCache.forEach((entry) => {
      totalSize += JSON.stringify(entry).length * 2; // Rough estimate (2 bytes per char)
    });
    
    return totalSize;
  }
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();
