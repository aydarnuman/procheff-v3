/**
 * Proxy Manager
 * Handles proxy rotation and rate limiting for web scrapers
 */

interface ProxyConfig {
  url: string;
  username?: string;
  password?: string;
  location?: string;
  speed?: 'fast' | 'medium' | 'slow';
  lastUsed?: Date;
  failureCount?: number;
  successCount?: number;
}

interface RateLimitConfig {
  market: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  concurrentRequests: number;
}

class ProxyManager {
  private static instance: ProxyManager;
  private proxies: ProxyConfig[] = [];
  private currentProxyIndex = 0;
  private rateLimits: Map<string, RateLimitTracker> = new Map();
  private requestQueue: Map<string, number> = new Map();
  
  private constructor() {
    this.loadProxies();
    this.setupRateLimits();
  }
  
  static getInstance(): ProxyManager {
    if (!ProxyManager.instance) {
      ProxyManager.instance = new ProxyManager();
    }
    return ProxyManager.instance;
  }
  
  private loadProxies(): void {
    // Load from environment or config
    const proxyList = process.env.PROXY_LIST?.split(',') || [];
    
    this.proxies = proxyList.map(proxyUrl => ({
      url: proxyUrl.trim(),
      lastUsed: new Date(0),
      failureCount: 0,
      successCount: 0
    }));
    
    // Add free proxy option if no proxies configured
    if (this.proxies.length === 0) {
      this.proxies.push({
        url: 'direct', // No proxy
        lastUsed: new Date(0),
        failureCount: 0,
        successCount: 0
      });
    }
  }
  
  private setupRateLimits(): void {
    const limits: RateLimitConfig[] = [
      { market: 'A101', requestsPerMinute: 30, requestsPerHour: 500, concurrentRequests: 2 },
      { market: 'BİM', requestsPerMinute: 20, requestsPerHour: 300, concurrentRequests: 1 },
      { market: 'CarrefourSA', requestsPerMinute: 40, requestsPerHour: 600, concurrentRequests: 3 },
      { market: 'Migros', requestsPerMinute: 50, requestsPerHour: 800, concurrentRequests: 3 },
      { market: 'Getir', requestsPerMinute: 60, requestsPerHour: 1000, concurrentRequests: 5 },
      { market: 'Trendyol', requestsPerMinute: 60, requestsPerHour: 1000, concurrentRequests: 5 }
    ];
    
    limits.forEach(limit => {
      this.rateLimits.set(limit.market, new RateLimitTracker(limit));
    });
  }
  
  async getNextProxy(): Promise<ProxyConfig | null> {
    if (this.proxies.length === 0) return null;
    
    // Sort proxies by performance (success rate and last used)
    const sortedProxies = [...this.proxies].sort((a, b) => {
      const aScore = this.calculateProxyScore(a);
      const bScore = this.calculateProxyScore(b);
      return bScore - aScore;
    });
    
    // Get the best available proxy
    const proxy = sortedProxies[0];
    proxy.lastUsed = new Date();
    
    return proxy;
  }
  
  private calculateProxyScore(proxy: ProxyConfig): number {
    const totalRequests = (proxy.successCount || 0) + (proxy.failureCount || 0);
    const successRate = totalRequests > 0 ? (proxy.successCount || 0) / totalRequests : 0.5;
    const timeSinceLastUse = Date.now() - (proxy.lastUsed?.getTime() || 0);
    const freshnessScore = Math.min(timeSinceLastUse / (5 * 60 * 1000), 1); // 5 minutes = max freshness
    
    return successRate * 0.7 + freshnessScore * 0.3;
  }
  
  reportProxyResult(proxy: ProxyConfig, success: boolean): void {
    if (success) {
      proxy.successCount = (proxy.successCount || 0) + 1;
    } else {
      proxy.failureCount = (proxy.failureCount || 0) + 1;
    }
    
    // Remove proxy if too many failures
    if ((proxy.failureCount || 0) > 10 && this.calculateProxyScore(proxy) < 0.2) {
      const index = this.proxies.findIndex(p => p.url === proxy.url);
      if (index > -1 && this.proxies.length > 1) {
        this.proxies.splice(index, 1);
      }
    }
  }
  
  async checkRateLimit(market: string): Promise<boolean> {
    const tracker = this.rateLimits.get(market);
    if (!tracker) return true; // No limit configured
    
    return tracker.canMakeRequest();
  }
  
  async waitForRateLimit(market: string): Promise<void> {
    const tracker = this.rateLimits.get(market);
    if (!tracker) return;
    
    const waitTime = tracker.getWaitTime();
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    tracker.recordRequest();
  }
  
  getConcurrentLimit(market: string): number {
    const tracker = this.rateLimits.get(market);
    return tracker?.config.concurrentRequests || 1;
  }
}

class RateLimitTracker {
  config: RateLimitConfig;
  private minuteRequests: Date[] = [];
  private hourRequests: Date[] = [];
  
  constructor(config: RateLimitConfig) {
    this.config = config;
  }
  
  canMakeRequest(): boolean {
    this.cleanOldRequests();
    
    const minuteCount = this.minuteRequests.length;
    const hourCount = this.hourRequests.length;
    
    return minuteCount < this.config.requestsPerMinute && 
           hourCount < this.config.requestsPerHour;
  }
  
  getWaitTime(): number {
    this.cleanOldRequests();
    
    if (this.minuteRequests.length >= this.config.requestsPerMinute) {
      const oldestRequest = this.minuteRequests[0];
      const waitTime = 60000 - (Date.now() - oldestRequest.getTime());
      return Math.max(waitTime, 0);
    }
    
    if (this.hourRequests.length >= this.config.requestsPerHour) {
      const oldestRequest = this.hourRequests[0];
      const waitTime = 3600000 - (Date.now() - oldestRequest.getTime());
      return Math.max(waitTime, 0);
    }
    
    return 0;
  }
  
  recordRequest(): void {
    const now = new Date();
    this.minuteRequests.push(now);
    this.hourRequests.push(now);
  }
  
  private cleanOldRequests(): void {
    const now = Date.now();
    
    // Clean minute requests older than 1 minute
    this.minuteRequests = this.minuteRequests.filter(
      req => now - req.getTime() < 60000
    );
    
    // Clean hour requests older than 1 hour
    this.hourRequests = this.hourRequests.filter(
      req => now - req.getTime() < 3600000
    );
  }
}

export const proxyManager = ProxyManager.getInstance();
