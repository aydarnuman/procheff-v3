/**
 * Scraper Health Monitor
 * Tracks scraper performance, errors, and availability
 */

export interface ScraperHealth {
  scraperName: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: Date;
  successRate: number; // 0-100
  averageResponseTime: number; // ms
  consecutiveFailures: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastError?: string;
  lastSuccess?: Date;
  circuitState: 'closed' | 'open' | 'half-open';
}

export interface HealthCheckResult {
  success: boolean;
  responseTime: number;
  error?: string;
}

class HealthMonitor {
  private healthData: Map<string, ScraperHealth> = new Map();
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5; // consecutive failures
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute
  private readonly DEGRADED_THRESHOLD = 70; // success rate %
  private readonly DOWN_THRESHOLD = 30; // success rate %

  /**
   * Initialize health tracking for a scraper
   */
  initScraper(scraperName: string): void {
    if (!this.healthData.has(scraperName)) {
      this.healthData.set(scraperName, {
        scraperName,
        status: 'healthy',
        lastCheck: new Date(),
        successRate: 100,
        averageResponseTime: 0,
        consecutiveFailures: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        circuitState: 'closed',
      });
    }
  }

  /**
   * Record a successful scraping operation
   */
  recordSuccess(scraperName: string, responseTime: number): void {
    this.initScraper(scraperName);
    const health = this.healthData.get(scraperName)!;

    health.consecutiveFailures = 0;
    health.totalRequests++;
    health.successfulRequests++;
    health.lastSuccess = new Date();
    health.lastCheck = new Date();

    // Update average response time (rolling average)
    health.averageResponseTime =
      (health.averageResponseTime * (health.totalRequests - 1) + responseTime) / health.totalRequests;

    // Update success rate
    health.successRate = (health.successfulRequests / health.totalRequests) * 100;

    // Update status
    this.updateStatus(scraperName);

    // Reset circuit breaker if needed
    if (health.circuitState === 'half-open') {
      health.circuitState = 'closed';
      console.log(`[HealthMonitor] Circuit breaker closed for ${scraperName}`);
    }
  }

  /**
   * Record a failed scraping operation
   */
  recordFailure(scraperName: string, error: string, responseTime: number = 0): void {
    this.initScraper(scraperName);
    const health = this.healthData.get(scraperName)!;

    health.consecutiveFailures++;
    health.totalRequests++;
    health.failedRequests++;
    health.lastError = error;
    health.lastCheck = new Date();

    // Update average response time
    if (responseTime > 0) {
      health.averageResponseTime =
        (health.averageResponseTime * (health.totalRequests - 1) + responseTime) / health.totalRequests;
    }

    // Update success rate
    health.successRate = (health.successfulRequests / health.totalRequests) * 100;

    // Update status
    this.updateStatus(scraperName);

    // Check circuit breaker
    if (health.consecutiveFailures >= this.CIRCUIT_BREAKER_THRESHOLD && health.circuitState === 'closed') {
      health.circuitState = 'open';
      console.error(`[HealthMonitor] Circuit breaker OPENED for ${scraperName} (${health.consecutiveFailures} failures)`);

      // Auto-reset circuit breaker after timeout
      setTimeout(() => {
        if (this.healthData.get(scraperName)?.circuitState === 'open') {
          this.healthData.get(scraperName)!.circuitState = 'half-open';
          console.log(`[HealthMonitor] Circuit breaker HALF-OPEN for ${scraperName}`);
        }
      }, this.CIRCUIT_BREAKER_TIMEOUT);
    }
  }

  /**
   * Update scraper status based on metrics
   */
  private updateStatus(scraperName: string): void {
    const health = this.healthData.get(scraperName)!;

    if (health.circuitState === 'open') {
      health.status = 'down';
    } else if (health.successRate < this.DOWN_THRESHOLD) {
      health.status = 'down';
    } else if (health.successRate < this.DEGRADED_THRESHOLD) {
      health.status = 'degraded';
    } else {
      health.status = 'healthy';
    }
  }

  /**
   * Check if scraper is available (circuit breaker check)
   */
  isAvailable(scraperName: string): boolean {
    this.initScraper(scraperName);
    const health = this.healthData.get(scraperName)!;

    // Block requests if circuit is open
    if (health.circuitState === 'open') {
      return false;
    }

    return true;
  }

  /**
   * Get health status for a specific scraper
   */
  getHealth(scraperName: string): ScraperHealth | undefined {
    return this.healthData.get(scraperName);
  }

  /**
   * Get health status for all scrapers
   */
  getAllHealth(): ScraperHealth[] {
    return Array.from(this.healthData.values());
  }

  /**
   * Get healthy scrapers only
   */
  getHealthyScrapers(): string[] {
    return Array.from(this.healthData.entries())
      .filter(([_, health]) => health.status === 'healthy' && health.circuitState !== 'open')
      .map(([name, _]) => name);
  }

  /**
   * Reset health data for a scraper
   */
  reset(scraperName: string): void {
    this.healthData.delete(scraperName);
  }

  /**
   * Reset all health data
   */
  resetAll(): void {
    this.healthData.clear();
  }

  /**
   * Get overall system health
   */
  getSystemHealth(): {
    totalScrapers: number;
    healthyScrapers: number;
    degradedScrapers: number;
    downScrapers: number;
    overallSuccessRate: number;
  } {
    const all = this.getAllHealth();

    return {
      totalScrapers: all.length,
      healthyScrapers: all.filter(h => h.status === 'healthy').length,
      degradedScrapers: all.filter(h => h.status === 'degraded').length,
      downScrapers: all.filter(h => h.status === 'down').length,
      overallSuccessRate: all.reduce((sum, h) => sum + h.successRate, 0) / (all.length || 1),
    };
  }

  /**
   * Log health summary
   */
  logSummary(): void {
    const system = this.getSystemHealth();

    console.log('\n📊 Scraper Health Summary:');
    console.log(`  Total Scrapers: ${system.totalScrapers}`);
    console.log(`  ✅ Healthy: ${system.healthyScrapers}`);
    console.log(`  ⚠️  Degraded: ${system.degradedScrapers}`);
    console.log(`  ❌ Down: ${system.downScrapers}`);
    console.log(`  📈 Overall Success Rate: ${system.overallSuccessRate.toFixed(2)}%\n`);

    this.getAllHealth().forEach(health => {
      const statusIcon = health.status === 'healthy' ? '✅' : health.status === 'degraded' ? '⚠️' : '❌';
      const circuitIcon = health.circuitState === 'open' ? '🔴' : health.circuitState === 'half-open' ? '🟡' : '🟢';

      console.log(`  ${statusIcon} ${circuitIcon} ${health.scraperName}:`);
      console.log(`     Success Rate: ${health.successRate.toFixed(2)}%`);
      console.log(`     Avg Response: ${health.averageResponseTime.toFixed(0)}ms`);
      console.log(`     Requests: ${health.successfulRequests}/${health.totalRequests}`);

      if (health.lastError) {
        console.log(`     Last Error: ${health.lastError.substring(0, 50)}...`);
      }
    });
  }
}

// Singleton instance
export const scraperHealthMonitor = new HealthMonitor();
