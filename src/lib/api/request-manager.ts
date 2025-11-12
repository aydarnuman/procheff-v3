/**
 * 🆕 Request Manager
 * Handles request deduplication, cancellation, and retry logic
 */

export class RequestManager {
  private static pendingRequests = new Map<string, AbortController>();
  private static requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private static readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Execute request with deduplication and cancellation
   */
  static async request<T>(
    key: string,
    fn: (signal: AbortSignal) => Promise<T>,
    options?: {
      cache?: boolean;
      cacheTTL?: number;
      cancelPrevious?: boolean;
    }
  ): Promise<T> {
    const {
      cache = false,
      cacheTTL = this.DEFAULT_CACHE_TTL,
      cancelPrevious = true
    } = options || {};
    
    // Check cache first
    if (cache) {
      const cached = this.requestCache.get(key);
      if (cached) {
        const age = Date.now() - cached.timestamp;
        if (age < cached.ttl) {
          return cached.data as T;
        } else {
          // Expired, remove from cache
          this.requestCache.delete(key);
        }
      }
    }
    
    // Cancel previous request with same key if requested
    if (cancelPrevious && this.pendingRequests.has(key)) {
      this.pendingRequests.get(key)?.abort();
    }
    
    // Create new abort controller
    const controller = new AbortController();
    this.pendingRequests.set(key, controller);
    
    try {
      const result = await fn(controller.signal);
      
      // Cache result if requested
      if (cache) {
        this.requestCache.set(key, {
          data: result,
          timestamp: Date.now(),
          ttl: cacheTTL
        });
      }
      
      return result;
    } catch (error) {
      // Don't throw if request was aborted
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request cancelled');
      }
      throw error;
    } finally {
      // Clean up
      this.pendingRequests.delete(key);
    }
  }
  
  /**
   * Cancel a pending request
   */
  static cancel(key: string): boolean {
    const controller = this.pendingRequests.get(key);
    if (controller) {
      controller.abort();
      this.pendingRequests.delete(key);
      return true;
    }
    return false;
  }
  
  /**
   * Cancel all pending requests
   */
  static cancelAll(): void {
    for (const controller of this.pendingRequests.values()) {
      controller.abort();
    }
    this.pendingRequests.clear();
  }
  
  /**
   * Check if a request is pending
   */
  static isPending(key: string): boolean {
    return this.pendingRequests.has(key);
  }
  
  /**
   * Clear request cache
   */
  static clearCache(): void {
    this.requestCache.clear();
  }
  
  /**
   * Clear expired cache entries
   */
  static cleanupCache(): number {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, entry] of this.requestCache.entries()) {
      const age = now - entry.timestamp;
      if (age >= entry.ttl) {
        this.requestCache.delete(key);
        removed++;
      }
    }
    
    return removed;
  }
  
  /**
   * Get statistics
   */
  static getStats(): {
    pendingRequests: number;
    cachedRequests: number;
  } {
    return {
      pendingRequests: this.pendingRequests.size,
      cachedRequests: this.requestCache.size
    };
  }
}

/**
 * Convenience function for fetch with request manager
 */
export async function managedFetch<T>(
  key: string,
  url: string,
  options?: RequestInit & {
    cache?: boolean;
    cacheTTL?: number;
    cancelPrevious?: boolean;
  }
): Promise<T> {
  const { cache, cacheTTL, cancelPrevious, ...fetchOptions } = options || {};
  
  return RequestManager.request(
    key,
    async (signal) => {
      const response = await fetch(url, {
        ...fetchOptions,
        signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json() as Promise<T>;
    },
    { cache, cacheTTL, cancelPrevious }
  );
}

