/**
 * 🆕 Centralized Storage Manager
 * Manages localStorage with TTL, cleanup, and quota management
 */

const PREFIX = 'procheff_';
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB (conservative limit)

interface StorageItem<T = unknown> {
  value: T;
  timestamp: number;
  ttl: number;
}

export class StorageManager {
  /**
   * Set item in localStorage with TTL
   */
  static set<T>(key: string, value: T, ttl?: number): boolean {
    try {
      const item: StorageItem<T> = {
        value,
        timestamp: Date.now(),
        ttl: ttl || DEFAULT_TTL
      };
      
      const serialized = JSON.stringify(item);
      const fullKey = `${PREFIX}${key}`;
      
      // Check if adding this item would exceed quota
      const currentSize = this.getStorageSize();
      if (currentSize + serialized.length > MAX_STORAGE_SIZE) {
        // Cleanup old items
        this.cleanup();
        
        // Check again after cleanup
        const sizeAfterCleanup = this.getStorageSize();
        if (sizeAfterCleanup + serialized.length > MAX_STORAGE_SIZE) {
          // Still too large, remove oldest items
          this.removeOldest(serialized.length);
        }
      }
      
      localStorage.setItem(fullKey, serialized);
      return true;
    } catch (error) {
      // Quota exceeded or other error
      console.warn('StorageManager.set failed:', error);
      
      // Try cleanup and retry once
      try {
        this.cleanup();
        const item: StorageItem<T> = {
          value,
          timestamp: Date.now(),
          ttl: ttl || DEFAULT_TTL
        };
        localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(item));
        return true;
      } catch (retryError) {
        console.error('StorageManager.set retry failed:', retryError);
        return false;
      }
    }
  }
  
  /**
   * Get item from localStorage (returns null if expired or not found)
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
   * Remove oldest items to free up space
   */
  private static removeOldest(requiredSpace: number): void {
    try {
      const items: Array<{ key: string; timestamp: number }> = [];
      const keys = Object.keys(localStorage);
      
      // Collect all items with prefix
      keys.forEach(key => {
        if (key.startsWith(PREFIX)) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const data: StorageItem = JSON.parse(item);
              items.push({ key, timestamp: data.timestamp });
            }
          } catch {
            // Skip corrupted items
          }
        }
      });
      
      // Sort by timestamp (oldest first)
      items.sort((a, b) => a.timestamp - b.timestamp);
      
      // Remove oldest items until we have enough space
      let freedSpace = 0;
      for (const item of items) {
        if (freedSpace >= requiredSpace) {
          break;
        }
        
        const itemData = localStorage.getItem(item.key);
        if (itemData) {
          freedSpace += itemData.length;
          localStorage.removeItem(item.key);
        }
      }
    } catch (error) {
      console.warn('StorageManager.removeOldest failed:', error);
    }
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
    expiredItems: number;
  } {
    const now = Date.now();
    let totalItems = 0;
    let totalSize = 0;
    let expiredItems = 0;
    
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
            } catch {
              // Corrupted item
            }
          }
        }
      });
    } catch (error) {
      console.warn('StorageManager.getStats failed:', error);
    }
    
    return {
      totalItems,
      totalSize,
      expiredItems
    };
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

