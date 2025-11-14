import { NextRequest, NextResponse } from 'next/server';
import { accuracyTracker } from '@/lib/monitoring/accuracy-tracker';
import { coverageMetrics } from '@/lib/monitoring/coverage-metrics';
import { queueManager } from '@/lib/market/queue/queue-manager';
import { cacheManager } from '@/lib/market/cache/cache-manager';
import Database from 'better-sqlite3';
import { join } from 'path';

interface DashboardMetrics {
  timestamp: Date;
  accuracy: {
    overall: number;
    byProvider: { [key: string]: number };
    trend: 'improving' | 'stable' | 'declining';
  };
  coverage: {
    marketCoverage: number;
    productCount: number;
    dataFreshness: number;
    activeMarkets: number;
  };
  performance: {
    queueStats: {
      pending: number;
      processing: number;
      completed: number;
      failed: number;
    };
    cacheStats: {
      hitRate: number;
      entries: number;
      memoryUsage: string;
    };
    apiHealth: Array<{
      provider: string;
      status: 'healthy' | 'degraded' | 'down';
      successRate: number;
      avgResponseTime: number;
    }>;
  };
  alerts: Array<{
    level: 'info' | 'warning' | 'error';
    message: string;
    timestamp: Date;
  }>;
}

/**
 * Get monitoring dashboard metrics
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = parseInt(searchParams.get('period') || '7'); // Days
    
    // Get accuracy metrics
    const accuracyReport = await accuracyTracker.generateReport(period);
    
    // Get coverage metrics
    const coverageReport = await coverageMetrics.generateReport();
    
    // Get queue statistics
    const queueStats = await queueManager.getQueueStats();
    
    // Get cache statistics
    const cacheStats = cacheManager.getStats();
    const cacheHitRate = cacheStats.hits > 0 
      ? cacheStats.hits / (cacheStats.hits + cacheStats.misses)
      : 0;
    
    // Get API provider health
    const apiHealth = await getAPIProviderHealth();
    
    // Generate alerts
    const alerts = generateAlerts(
      accuracyReport,
      coverageReport,
      queueStats,
      apiHealth
    );
    
    // Determine accuracy trend
    const accuracyTrend = accuracyReport.trends.improving.length > accuracyReport.trends.declining.length
      ? 'improving'
      : accuracyReport.trends.declining.length > accuracyReport.trends.improving.length
      ? 'declining'
      : 'stable';
    
    // Build response
    const metrics: DashboardMetrics = {
      timestamp: new Date(),
      accuracy: {
        overall: accuracyReport.overall.accuracyRate,
        byProvider: Object.entries(accuracyReport.byProvider).reduce((acc, [provider, metrics]) => {
          const latest = metrics[metrics.length - 1];
          if (latest) {
            acc[provider] = latest.accuracyRate;
          }
          return acc;
        }, {} as { [key: string]: number }),
        trend: accuracyTrend
      },
      coverage: {
        marketCoverage: coverageReport.summary.averageCoverage,
        productCount: coverageReport.summary.uniqueProducts,
        dataFreshness: coverageReport.summary.dataFreshness,
        activeMarkets: coverageReport.summary.activeMarkets
      },
      performance: {
        queueStats,
        cacheStats: {
          hitRate: cacheHitRate,
          entries: cacheStats.totalEntries,
          memoryUsage: formatBytes(cacheStats.memoryUsage)
        },
        apiHealth
      },
      alerts
    };
    
    return NextResponse.json(metrics);
    
  } catch (error) {
    console.error('[Monitoring] Dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to generate dashboard metrics' },
      { status: 500 }
    );
  }
}

/**
 * Get API provider health status
 */
async function getAPIProviderHealth(): Promise<DashboardMetrics['performance']['apiHealth']> {
  const db = new Database(join(process.cwd(), 'procheff.db'));
  
  try {
    const providers = db.prepare(`
      SELECT * FROM api_provider_health
      ORDER BY provider_name
    `).all() as any[];
    
    return providers.map(provider => {
      const successRate = provider.total_requests > 0
        ? provider.successful_requests / provider.total_requests
        : 0;
      
      let status: 'healthy' | 'degraded' | 'down' = 'healthy';
      if (!provider.is_active || successRate < 0.5) {
        status = 'down';
      } else if (successRate < 0.9) {
        status = 'degraded';
      }
      
      return {
        provider: provider.provider_name,
        status,
        successRate,
        avgResponseTime: provider.average_response_time || 0
      };
    });
  } catch (error) {
    console.error('[Monitoring] Failed to get API health:', error);
    return [];
  } finally {
    db.close();
  }
}

/**
 * Generate alerts based on metrics
 */
function generateAlerts(
  accuracyReport: any,
  coverageReport: any,
  queueStats: any,
  apiHealth: any[]
): DashboardMetrics['alerts'] {
  const alerts: DashboardMetrics['alerts'] = [];
  
  // Accuracy alerts
  if (accuracyReport.overall.accuracyRate < 0.8) {
    alerts.push({
      level: 'warning',
      message: `Genel doğruluk oranı düşük: %${(accuracyReport.overall.accuracyRate * 100).toFixed(0)}`,
      timestamp: new Date()
    });
  }
  
  // Coverage alerts
  if (coverageReport.summary.dataFreshness < 0.7) {
    alerts.push({
      level: 'warning',
      message: 'Veri güncelliği düşük. Güncelleme gerekli.',
      timestamp: new Date()
    });
  }
  
  if (coverageReport.gaps.missingMarkets.length > 0) {
    alerts.push({
      level: 'info',
      message: `${coverageReport.gaps.missingMarkets.length} market eksik: ${coverageReport.gaps.missingMarkets.join(', ')}`,
      timestamp: new Date()
    });
  }
  
  // Queue alerts
  const queueValues = Object.values(queueStats) as number[];
  const totalJobs = queueValues.reduce((sum, count) => sum + count, 0);
  const failureRate = totalJobs > 0 ? queueStats.failed / totalJobs : 0;
  
  if (failureRate > 0.1) {
    alerts.push({
      level: 'error',
      message: `Yüksek iş hatası oranı: %${(failureRate * 100).toFixed(0)}`,
      timestamp: new Date()
    });
  }
  
  if (queueStats.pending > 100) {
    alerts.push({
      level: 'warning',
      message: `Bekleyen iş sayısı yüksek: ${queueStats.pending}`,
      timestamp: new Date()
    });
  }
  
  // API health alerts
  const downProviders = apiHealth.filter(p => p.status === 'down');
  if (downProviders.length > 0) {
    alerts.push({
      level: 'error',
      message: `${downProviders.length} API sağlayıcı çalışmıyor: ${downProviders.map(p => p.provider).join(', ')}`,
      timestamp: new Date()
    });
  }
  
  const degradedProviders = apiHealth.filter(p => p.status === 'degraded');
  if (degradedProviders.length > 0) {
    alerts.push({
      level: 'warning',
      message: `${degradedProviders.length} API sağlayıcı düşük performans gösteriyor`,
      timestamp: new Date()
    });
  }
  
  // Add recommendations
  accuracyReport.recommendations.forEach((rec: string) => {
    alerts.push({
      level: 'info',
      message: rec,
      timestamp: new Date()
    });
  });
  
  return alerts.sort((a, b) => {
    const levelOrder = { error: 0, warning: 1, info: 2 };
    return levelOrder[a.level] - levelOrder[b.level];
  }).slice(0, 10); // Limit to 10 most important alerts
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Get detailed metrics (for export)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, format = 'json', period = 30 } = body;
    
    let data: any;
    
    switch (type) {
      case 'accuracy':
        data = await accuracyTracker.generateReport(period);
        break;
      
      case 'coverage':
        data = await coverageMetrics.generateReport();
        break;
      
      case 'regional':
        data = await coverageMetrics.getCoverageMapData();
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid metric type' },
          { status: 400 }
        );
    }
    
    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(data);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${type}-metrics-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[Monitoring] Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export metrics' },
      { status: 500 }
    );
  }
}

/**
 * Convert data to CSV
 */
function convertToCSV(data: any): string {
  // Simple CSV conversion for flat data structures
  if (Array.isArray(data)) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const rows = data.map(item => 
      headers.map(header => {
        const value = item[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    );
    
    return [headers.join(','), ...rows].join('\n');
  }
  
  // For nested objects, flatten first
  const flattened = flattenObject(data);
  const headers = Object.keys(flattened);
  const values = headers.map(h => flattened[h]);
  
  return [headers.join(','), values.join(',')].join('\n');
}

/**
 * Flatten nested object
 */
function flattenObject(obj: any, prefix = ''): any {
  return Object.keys(obj).reduce((acc, key) => {
    const prefixedKey = prefix ? `${prefix}_${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(acc, flattenObject(obj[key], prefixedKey));
    } else {
      acc[prefixedKey] = obj[key];
    }
    return acc;
  }, {} as any);
}
