/**
 * 🗄️ IndexedDB Manager
 * Modern storage solution for large data (50-250MB limit vs 5MB localStorage)
 * 
 * Features:
 * - Async/non-blocking operations
 * - Much larger capacity (50-250MB)
 * - Supports binary data, Files, Blobs
 * - Transaction support
 * - Query and index support
 */

const DB_NAME = 'procheff_db';
const DB_VERSION = 1;

// Store names
const STORES = {
  TENDERS: 'tenders',           // Tender details (large objects)
  ANALYSES: 'analyses',         // Analysis results
  DOCUMENTS: 'documents',       // Document caches
  TEMP: 'temp',                 // Temporary data
} as const;

export type StoreName = typeof STORES[keyof typeof STORES];

interface StoredItem<T = unknown> {
  id: string;
  data: T;
  timestamp: number;
  lastAccessed: number;
  ttl: number;
  size?: number;
  tags?: string[];
}

export class IndexedDBManager {
  private static instance: IndexedDBManager | null = null;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  private constructor() {}

  /**
   * Singleton pattern - get instance
   */
  static getInstance(): IndexedDBManager {
    if (!IndexedDBManager.instance) {
      IndexedDBManager.instance = new IndexedDBManager();
    }
    return IndexedDBManager.instance;
  }

  /**
   * Initialize IndexedDB
   */
  private async init(): Promise<IDBDatabase> {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !window.indexedDB) {
      throw new Error('IndexedDB is not available (not in browser environment)');
    }

    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    // Return existing db if already initialized
    if (this.db) {
      return Promise.resolve(this.db);
    }

    this.initPromise = new Promise((resolve, reject) => {
      // Double-check indexedDB availability inside Promise
      if (!window.indexedDB) {
        reject(new Error('IndexedDB is not available'));
        this.initPromise = null;
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB failed to open:', request.error);
        this.initPromise = null;
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('🔧 IndexedDB upgrade needed, creating stores...');

        // Create tenders store
        if (!db.objectStoreNames.contains(STORES.TENDERS)) {
          const tenderStore = db.createObjectStore(STORES.TENDERS, { keyPath: 'id' });
          tenderStore.createIndex('timestamp', 'timestamp', { unique: false });
          tenderStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
          tenderStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
          console.log('📦 Created tenders store');
        }

        // Create analyses store
        if (!db.objectStoreNames.contains(STORES.ANALYSES)) {
          const analysisStore = db.createObjectStore(STORES.ANALYSES, { keyPath: 'id' });
          analysisStore.createIndex('timestamp', 'timestamp', { unique: false });
          analysisStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
          console.log('📊 Created analyses store');
        }

        // Create documents store
        if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
          const docStore = db.createObjectStore(STORES.DOCUMENTS, { keyPath: 'id' });
          docStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('📄 Created documents store');
        }

        // Create temp store
        if (!db.objectStoreNames.contains(STORES.TEMP)) {
          const tempStore = db.createObjectStore(STORES.TEMP, { keyPath: 'id' });
          tempStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('⏰ Created temp store');
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Set item in IndexedDB
   */
  async set<T>(
    storeName: StoreName,
    id: string,
    data: T,
    options: {
      ttl?: number;
      tags?: string[];
    } = {}
  ): Promise<boolean> {
    // Skip if not in browser
    if (typeof window === 'undefined') {
      console.warn('IndexedDB.set called on server-side, skipping');
      return false;
    }

    try {
      const db = await this.init();
      const now = Date.now();

      const item: StoredItem<T> = {
        id,
        data,
        timestamp: now,
        lastAccessed: now,
        ttl: options.ttl || 30 * 24 * 60 * 60 * 1000, // 30 days default
        size: JSON.stringify(data).length,
        tags: options.tags,
      };

      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(item);

        request.onsuccess = () => {
          console.log(`💾 IndexedDB: Stored ${id} in ${storeName} (${(item.size! / 1024).toFixed(2)}KB)`);
          resolve(true);
        };

        request.onerror = () => {
          console.error(`❌ IndexedDB: Failed to store ${id}:`, request.error);
          reject(request.error);
        };

        tx.onerror = () => {
          console.error('❌ IndexedDB transaction failed:', tx.error);
          reject(tx.error);
        };
      });
    } catch (error) {
      // Silently fail if IndexedDB not available (SSR)
      if (error instanceof Error && error.message.includes('not available')) {
        return false;
      }
      console.error('IndexedDB.set failed:', error);
      return false;
    }
  }

  /**
   * Get item from IndexedDB
   */
  async get<T>(storeName: StoreName, id: string): Promise<T | null> {
    // Skip if not in browser
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const db = await this.init();

      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite'); // readwrite for lastAccessed update
        const store = tx.objectStore(storeName);
        const request = store.get(id);

        request.onsuccess = () => {
          const item = request.result as StoredItem<T> | undefined;

          if (!item) {
            resolve(null);
            return;
          }

          // Check if expired
          const age = Date.now() - item.timestamp;
          if (age > item.ttl) {
            console.log(`🗑️ IndexedDB: Item ${id} expired, removing...`);
            store.delete(id);
            resolve(null);
            return;
          }

          // Update lastAccessed for LRU tracking
          item.lastAccessed = Date.now();
          store.put(item);

          console.log(`📖 IndexedDB: Retrieved ${id} from ${storeName}`);
          resolve(item.data);
        };

        request.onerror = () => {
          console.error(`❌ IndexedDB: Failed to get ${id}:`, request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      // Silently fail if IndexedDB not available (SSR)
      if (error instanceof Error && error.message.includes('not available')) {
        return null;
      }
      console.error('IndexedDB.get failed:', error);
      return null;
    }
  }

  /**
   * Check if item exists and is not expired
   */
  async has(storeName: StoreName, id: string): Promise<boolean> {
    // Skip if not in browser
    if (typeof window === 'undefined') {
      return false;
    }

    const item = await this.get(storeName, id);
    return item !== null;
  }

  /**
   * Remove item from IndexedDB
   */
  async remove(storeName: StoreName, id: string): Promise<boolean> {
    // Skip if not in browser
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const db = await this.init();

      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => {
          console.log(`🗑️ IndexedDB: Removed ${id} from ${storeName}`);
          resolve(true);
        };

        request.onerror = () => {
          console.error(`❌ IndexedDB: Failed to remove ${id}:`, request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      // Silently fail if IndexedDB not available (SSR)
      if (error instanceof Error && error.message.includes('not available')) {
        return false;
      }
      console.error('IndexedDB.remove failed:', error);
      return false;
    }
  }

  /**
   * Clear all items in a store
   */
  async clear(storeName: StoreName): Promise<boolean> {
    // Skip if not in browser
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const db = await this.init();

      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => {
          console.log(`🧹 IndexedDB: Cleared all items from ${storeName}`);
          resolve(true);
        };

        request.onerror = () => {
          console.error(`❌ IndexedDB: Failed to clear ${storeName}:`, request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      // Silently fail if IndexedDB not available (SSR)
      if (error instanceof Error && error.message.includes('not available')) {
        return false;
      }
      console.error('IndexedDB.clear failed:', error);
      return false;
    }
  }

  /**
   * Clear all stores
   */
  async clearAll(): Promise<boolean> {
    // Skip if not in browser
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      await Promise.all([
        this.clear(STORES.TENDERS),
        this.clear(STORES.ANALYSES),
        this.clear(STORES.DOCUMENTS),
        this.clear(STORES.TEMP),
      ]);
      console.log('🧹 IndexedDB: All stores cleared');
      return true;
    } catch (error) {
      // Silently fail if IndexedDB not available (SSR)
      if (error instanceof Error && error.message.includes('not available')) {
        return false;
      }
      console.error('IndexedDB.clearAll failed:', error);
      return false;
    }
  }

  /**
   * Get all items from a store
   */
  async getAll<T>(storeName: StoreName): Promise<StoredItem<T>[]> {
    // Skip if not in browser
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const db = await this.init();

      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result as StoredItem<T>[]);
        };

        request.onerror = () => {
          console.error('IndexedDB.getAll failed:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      // Silently fail if IndexedDB not available (SSR)
      if (error instanceof Error && error.message.includes('not available')) {
        return [];
      }
      console.error('IndexedDB.getAll failed:', error);
      return [];
    }
  }

  /**
   * Cleanup expired items
   */
  async cleanup(storeName?: StoreName): Promise<number> {
    // Skip if not in browser
    if (typeof window === 'undefined') {
      return 0;
    }

    try {
      const db = await this.init();
      const now = Date.now();
      const storesToClean = storeName ? [storeName] : Object.values(STORES);
      let totalRemoved = 0;

      for (const store of storesToClean) {
        const items = await this.getAll(store);
        const expired = items.filter(item => now - item.timestamp > item.ttl);

        for (const item of expired) {
          await this.remove(store, item.id);
          totalRemoved++;
        }
      }

      console.log(`🧹 IndexedDB: Cleaned up ${totalRemoved} expired items`);
      return totalRemoved;
    } catch (error) {
      // Silently fail if IndexedDB not available (SSR)
      if (error instanceof Error && error.message.includes('not available')) {
        return 0;
      }
      console.error('IndexedDB.cleanup failed:', error);
      return 0;
    }
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    stores: Record<StoreName, {
      itemCount: number;
      totalSize: number;
      oldestItem: number;
      newestItem: number;
    }>;
    totalItems: number;
    totalSize: number;
    totalSizeFormatted: string;
  }> {
    // Skip if not in browser
    if (typeof window === 'undefined') {
      return {
        stores: {} as any,
        totalItems: 0,
        totalSize: 0,
        totalSizeFormatted: '0MB',
      };
    }

    try {
      const storeStats: any = {};
      let totalItems = 0;
      let totalSize = 0;

      for (const storeName of Object.values(STORES)) {
        const items = await this.getAll(storeName);
        const sizes = items.map(item => item.size || 0);
        const timestamps = items.map(item => item.timestamp);

        const stats = {
          itemCount: items.length,
          totalSize: sizes.reduce((a, b) => a + b, 0),
          oldestItem: timestamps.length > 0 ? Math.min(...timestamps) : 0,
          newestItem: timestamps.length > 0 ? Math.max(...timestamps) : 0,
        };

        storeStats[storeName] = stats;
        totalItems += stats.itemCount;
        totalSize += stats.totalSize;
      }

      return {
        stores: storeStats,
        totalItems,
        totalSize,
        totalSizeFormatted: `${(totalSize / (1024 * 1024)).toFixed(2)}MB`,
      };
    } catch (error) {
      // Silently fail if IndexedDB not available (SSR)
      if (error instanceof Error && error.message.includes('not available')) {
        return {
          stores: {} as any,
          totalItems: 0,
          totalSize: 0,
          totalSizeFormatted: '0MB',
        };
      }
      console.error('IndexedDB.getStats failed:', error);
      return {
        stores: {} as any,
        totalItems: 0,
        totalSize: 0,
        totalSizeFormatted: '0MB',
      };
    }
  }

  /**
   * Print storage statistics to console
   */
  async printStats(): Promise<void> {
    const stats = await this.getStats();
    
    console.group('📊 IndexedDB Statistics');
    console.log(`Total Items: ${stats.totalItems}`);
    console.log(`Total Size: ${stats.totalSizeFormatted}`);
    console.log('\nPer Store:');
    
    for (const [storeName, storeStats] of Object.entries(stats.stores)) {
      console.log(`  ${storeName}:`);
      console.log(`    Items: ${storeStats.itemCount}`);
      console.log(`    Size: ${(storeStats.totalSize / 1024).toFixed(2)}KB`);
    }
    
    console.groupEnd();
  }

  /**
   * Evict least recently used items to free up space
   */
  async evictLRU(storeName: StoreName, count: number = 5): Promise<number> {
    // Skip if not in browser
    if (typeof window === 'undefined') {
      return 0;
    }

    try {
      const db = await this.init();
      const items = await this.getAll(storeName);

      // Sort by lastAccessed (oldest first)
      items.sort((a, b) => a.lastAccessed - b.lastAccessed);

      // Remove oldest items
      let removed = 0;
      for (let i = 0; i < Math.min(count, items.length); i++) {
        await this.remove(storeName, items[i].id);
        removed++;
      }

      console.log(`🔄 IndexedDB: Evicted ${removed} LRU items from ${storeName}`);
      return removed;
    } catch (error) {
      // Silently fail if IndexedDB not available (SSR)
      if (error instanceof Error && error.message.includes('not available')) {
        return 0;
      }
      console.error('IndexedDB.evictLRU failed:', error);
      return 0;
    }
  }
}

/**
 * Convenience exports
 */
export const idb = IndexedDBManager.getInstance();
export { STORES };

/**
 * Type-safe helper functions
 */
export const indexedDB = {
  // Tender operations
  setTender: (id: string, data: unknown) => 
    idb.set(STORES.TENDERS, id, data, { tags: ['tender'] }),
  getTender: <T = unknown>(id: string) => 
    idb.get<T>(STORES.TENDERS, id),
  removeTender: (id: string) => 
    idb.remove(STORES.TENDERS, id),

  // Analysis operations
  setAnalysis: (id: string, data: unknown) => 
    idb.set(STORES.ANALYSES, id, data, { tags: ['analysis'] }),
  getAnalysis: <T = unknown>(id: string) => 
    idb.get<T>(STORES.ANALYSES, id),
  removeAnalysis: (id: string) => 
    idb.remove(STORES.ANALYSES, id),

  // Document operations
  setDocument: (id: string, data: unknown) => 
    idb.set(STORES.DOCUMENTS, id, data),
  getDocument: <T = unknown>(id: string) => 
    idb.get<T>(STORES.DOCUMENTS, id),
  removeDocument: (id: string) => 
    idb.remove(STORES.DOCUMENTS, id),

  // Temporary data (short TTL)
  setTemp: (id: string, data: unknown) => 
    idb.set(STORES.TEMP, id, data, { ttl: 60 * 60 * 1000 }), // 1 hour
  getTemp: <T = unknown>(id: string) => 
    idb.get<T>(STORES.TEMP, id),
  removeTemp: (id: string) => 
    idb.remove(STORES.TEMP, id),

  // Utilities
  cleanup: () => idb.cleanup(),
  clearAll: () => idb.clearAll(),
  getStats: () => idb.getStats(),
  printStats: () => idb.printStats(),
};

