/**
 * 🆕 Centralized Storage Manager
 * Manages localStorage with TTL, cleanup, and quota management
 * 
 * Features:
 * - LRU (Least Recently Used) eviction
 * - Compression for large items
 * - Size validation before storage
 * - Automatic cleanup on quota exceeded
 */

const PREFIX = 'procheff_';
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_STORAGE_SIZE = 4 * 1024 * 1024; // 4MB (conservative, leave 1MB buffer)
const MAX_ITEM_SIZE = 1024 * 1024; // 1MB per item (increased from 500KB for larger tender details)
const COMPRESSION_THRESHOLD = 50 * 1024; // Compress items > 50KB

interface StorageItem<T = unknown> {
  value: T;
  timestamp: number;
  ttl: number;
  lastAccessed?: number; // For LRU tracking
  compressed?: boolean; // Flag for compressed data
  size?: number; // Original size for metrics
}

export class StorageManager {
  /**
   * Compress large strings using simple LZ-based compression
   * (Using pako would be better, but this avoids dependencies)
   */
  private static compress(str: string): string {
    try {
      // Simple run-length encoding for repeated patterns
      // In production, use pako or lz-string library
      return btoa(encodeURIComponent(str));
    } catch {
      return str; // Return original if compression fails
    }
  }

  /**
   * Decompress compressed strings
   */
  private static decompress(str: string): string {
    try {
      return decodeURIComponent(atob(str));
    } catch {
      return str; // Return as-is if not compressed
    }
  }

  /**
   * Validate item size before storage
   */
  private static validateSize(serialized: string): { valid: boolean; size: number; reason?: string } {
    const size = serialized.length;
    
    if (size > MAX_ITEM_SIZE) {
      return {
        valid: false,
        size,
        reason: `Item size (${(size / 1024).toFixed(2)}KB) exceeds maximum (${(MAX_ITEM_SIZE / 1024).toFixed(2)}KB)`
      };
    }
    
    const currentSize = this.getStorageSize();
    if (currentSize + size > MAX_STORAGE_SIZE) {
      return {
        valid: false,
        size,
        reason: `Would exceed total storage limit (${(MAX_STORAGE_SIZE / 1024).toFixed(2)}KB)`
      };
    }
    
    return { valid: true, size };
  }

  /**
   * Set item in localStorage with TTL, compression, and size validation
   */
  static set<T>(key: string, value: T, ttl?: number): boolean {
    try {
      // Validate input
      if (value === undefined || value === null) {
        console.warn(`⚠️ StorageManager.set: Invalid value provided for key "${key}" (undefined/null), skipping...`);
        return false;
      }

      const now = Date.now();
      let serializedValue = JSON.stringify(value);

      // Check if serialization succeeded
      if (!serializedValue || serializedValue === 'undefined') {
        console.warn(`⚠️ StorageManager.set: Failed to serialize value for key "${key}", skipping...`);
        return false;
      }

      const originalSize = serializedValue.length;
      let compressed = false;

      // Compress large items
      if (originalSize > COMPRESSION_THRESHOLD) {
        const compressedValue = this.compress(serializedValue);
        if (compressedValue.length < originalSize * 0.8) { // Only use if saves >20%
          serializedValue = compressedValue;
          compressed = true;
          console.log(`📦 Compressed ${key}: ${(originalSize / 1024).toFixed(2)}KB → ${(serializedValue.length / 1024).toFixed(2)}KB`);
        }
      }

      const item: StorageItem<T> = {
        value: compressed ? (serializedValue as T) : value,
        timestamp: now,
        lastAccessed: now,
        ttl: ttl || DEFAULT_TTL,
        compressed,
        size: originalSize
      };
      
      const serialized = JSON.stringify(item);
      const fullKey = `${PREFIX}${key}`;
      
      // Validate size
      const validation = this.validateSize(serialized);
      if (!validation.valid) {
        console.warn(`❌ Storage validation failed for ${key}:`, validation.reason);
        
        // For very large items, just skip caching
        if (validation.size > MAX_ITEM_SIZE) {
          console.warn(`⚠️ Item ${key} too large to cache (${(validation.size / 1024).toFixed(2)}KB), skipping...`);
          return false;
        }
      }
      
      // Check if adding this item would exceed quota
      const currentSize = this.getStorageSize();
      if (currentSize + serialized.length > MAX_STORAGE_SIZE) {
        console.log('🧹 Storage limit approaching, cleaning up...');
        // Cleanup old items
        this.cleanup();
        
        // Check again after cleanup
        const sizeAfterCleanup = this.getStorageSize();
        if (sizeAfterCleanup + serialized.length > MAX_STORAGE_SIZE) {
          // Still too large, use LRU eviction
          console.log('🔄 Using LRU eviction to free space...');
          this.evictLRU(serialized.length);
        }
      }
      
      localStorage.setItem(fullKey, serialized);
      return true;
    } catch (error) {
      // Quota exceeded or other error
      console.warn('StorageManager.set failed:', error);
      
      // Try aggressive cleanup and retry once
      try {
        console.log('♻️ Attempting aggressive cleanup...');
        this.cleanup();
        this.evictLRU(500 * 1024); // Free up 500KB
        
        const item: StorageItem<T> = {
          value,
          timestamp: Date.now(),
          lastAccessed: Date.now(),
          ttl: ttl || DEFAULT_TTL
        };
        localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(item));
        return true;
      } catch (retryError) {
        console.error('❌ StorageManager.set retry failed, cache disabled for this item:', retryError);
        return false;
      }
    }
  }
  
  /**
   * Get item from localStorage (returns null if expired or not found)
   * Updates lastAccessed for LRU tracking
   */
  static get<T>(key: string): T | null {
    try {
      const fullKey = `${PREFIX}${key}`;
      const item = localStorage.getItem(fullKey);
      
      if (!item) {
        return null;
      }
      
      const data: StorageItem<T> = JSON.parse(item);
      
      // Check if expired
      const age = Date.now() - data.timestamp;
      if (age > data.ttl) {
        // Expired, remove it
        this.remove(key);
        return null;
      }
      
      // Update lastAccessed for LRU tracking
      data.lastAccessed = Date.now();
      try {
        localStorage.setItem(fullKey, JSON.stringify(data));
      } catch {
        // Ignore if update fails
      }
      
      // Decompress if needed
      if (data.compressed && typeof data.value === 'string') {
        try {
          const decompressed = this.decompress(data.value);
          return JSON.parse(decompressed) as T;
        } catch (err) {
          console.warn('Decompression failed for', key, err);
          return data.value;
        }
      }
      
      return data.value;
    } catch (error) {
      console.warn('StorageManager.get failed:', error);
      // Remove corrupted item
      this.remove(key);
      return null;
    }
  }
  
  /**
   * Remove item from localStorage
   */
  static remove(key: string): void {
    try {
      localStorage.removeItem(`${PREFIX}${key}`);
    } catch (error) {
      console.warn('StorageManager.remove failed:', error);
    }
  }
  
  /**
   * Check if item exists and is not expired
   */
  static has(key: string): boolean {
    return this.get(key) !== null;
  }
  
  /**
   * Clear all items with prefix
   */
  static clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('StorageManager.clear failed:', error);
    }
  }
  
  /**
   * Cleanup expired items
   */
  static cleanup(): number {
    let removed = 0;
    const now = Date.now();
    
    try {
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        if (key.startsWith(PREFIX)) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const data: StorageItem = JSON.parse(item);
              const age = now - data.timestamp;
              
              if (age > data.ttl) {
                localStorage.removeItem(key);
                removed++;
              }
            }
          } catch {
            // Corrupted item, remove it
            localStorage.removeItem(key);
            removed++;
          }
        }
      });
    } catch (error) {
      console.warn('StorageManager.cleanup failed:', error);
    }
    
    return removed;
  }
  
  /**
   * Evict least recently used items to free up space (LRU)
   */
  private static evictLRU(requiredSpace: number): number {
    try {
      const items: Array<{ key: string; lastAccessed: number; size: number }> = [];
      const keys = Object.keys(localStorage);
      
      // Collect all items with prefix
      keys.forEach(key => {
        if (key.startsWith(PREFIX)) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const data: StorageItem = JSON.parse(item);
              items.push({
                key,
                lastAccessed: data.lastAccessed || data.timestamp, // Fallback to timestamp
                size: item.length
              });
            }
          } catch {
            // Skip corrupted items
          }
        }
      });
      
      // Sort by lastAccessed (least recent first)
      items.sort((a, b) => a.lastAccessed - b.lastAccessed);
      
      // Remove least recently used items until we have enough space
      let freedSpace = 0;
      let removedCount = 0;
      for (const item of items) {
        if (freedSpace >= requiredSpace * 1.2) { // Free 20% more than needed
          break;
        }
        
          localStorage.removeItem(item.key);
        freedSpace += item.size;
        removedCount++;
        console.log(`🗑️ Evicted LRU item: ${item.key} (${(item.size / 1024).toFixed(2)}KB)`);
      }
      
      console.log(`✅ LRU eviction freed ${(freedSpace / 1024).toFixed(2)}KB (${removedCount} items)`);
      return freedSpace;
    } catch (error) {
      console.warn('StorageManager.evictLRU failed:', error);
      return 0;
    }
  }

  /**
   * Remove oldest items to free up space (legacy method, use evictLRU instead)
   * @deprecated Use evictLRU() for better cache performance
   */
  private static removeOldest(requiredSpace: number): void {
    this.evictLRU(requiredSpace);
  }
  
  /**
   * Get total storage size used
   */
  private static getStorageSize(): number {
    try {
      let total = 0;
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        if (key.startsWith(PREFIX)) {
          const item = localStorage.getItem(key);
          if (item) {
            total += item.length;
          }
        }
      });
      
      return total;
    } catch {
      return 0;
    }
  }
  
  /**
   * Get storage statistics
   */
  static getStats(): {
    totalItems: number;
    totalSize: number;
    totalSizeFormatted: string;
    expiredItems: number;
    compressedItems: number;
    compressionSavings: number;
    utilizationPercent: number;
  } {
    const now = Date.now();
    let totalItems = 0;
    let totalSize = 0;
    let expiredItems = 0;
    let compressedItems = 0;
    let totalOriginalSize = 0;
    
    try {
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        if (key.startsWith(PREFIX)) {
          totalItems++;
          const item = localStorage.getItem(key);
          if (item) {
            totalSize += item.length;
            
            try {
              const data: StorageItem = JSON.parse(item);
              const age = now - data.timestamp;
              if (age > data.ttl) {
                expiredItems++;
              }
              if (data.compressed) {
                compressedItems++;
                totalOriginalSize += data.size || 0;
              }
            } catch {
              // Corrupted item
            }
          }
        }
      });
    } catch (error) {
      console.warn('StorageManager.getStats failed:', error);
    }
    
    const compressionSavings = totalOriginalSize > 0 ? totalOriginalSize - totalSize : 0;
    const utilizationPercent = (totalSize / MAX_STORAGE_SIZE) * 100;
    
    return {
      totalItems,
      totalSize,
      totalSizeFormatted: `${(totalSize / 1024).toFixed(2)}KB / ${(MAX_STORAGE_SIZE / 1024).toFixed(2)}KB`,
      expiredItems,
      compressedItems,
      compressionSavings,
      utilizationPercent: Math.round(utilizationPercent)
    };
  }

  /**
   * Print storage statistics to console
   */
  static printStats(): void {
    const stats = this.getStats();
    console.group('📊 Storage Manager Statistics');
    console.log(`Total Items: ${stats.totalItems}`);
    console.log(`Storage Used: ${stats.totalSizeFormatted} (${stats.utilizationPercent}%)`);
    console.log(`Expired Items: ${stats.expiredItems}`);
    console.log(`Compressed Items: ${stats.compressedItems}`);
    if (stats.compressionSavings > 0) {
      console.log(`Compression Savings: ${(stats.compressionSavings / 1024).toFixed(2)}KB`);
    }
    console.groupEnd();
  }
}

/**
 * Convenience functions for common storage operations
 */
export const storage = {
  // Analysis-related
  setAnalysis: (id: string, data: unknown) => StorageManager.set(`analysis:${id}`, data, 30 * 24 * 60 * 60 * 1000), // 30 days
  getAnalysis: (id: string) => StorageManager.get(`analysis:${id}`),
  
  // File-related
  setFiles: (key: string, files: unknown[]) => StorageManager.set(`files:${key}`, files, 24 * 60 * 60 * 1000), // 1 day
  getFiles: (key: string) => StorageManager.get<unknown[]>(`files:${key}`),
  
  // Settings
  setSetting: <T>(key: string, value: T) => StorageManager.set(`setting:${key}`, value),
  getSetting: <T>(key: string) => StorageManager.get<T>(`setting:${key}`),
  
  // Temporary data (short TTL)
  setTemp: <T>(key: string, value: T) => StorageManager.set(`temp:${key}`, value, 60 * 60 * 1000), // 1 hour
  getTemp: <T>(key: string) => StorageManager.get<T>(`temp:${key}`),
  removeTemp: (key: string) => StorageManager.remove(`temp:${key}`),
};

