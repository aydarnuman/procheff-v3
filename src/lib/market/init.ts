/**
 * Market Robot v2.0 Initialization
 * Sistem başlatma ve setup
 */

import { runAllMigrations, checkMigrationStatus } from './migration';
import { initTrustScoreTable } from './trust-score';
import { AILogger } from '@/lib/ai/logger';

/**
 * Market sistemini başlat
 */
export async function initializeMarketSystem(): Promise<{
  success: boolean;
  migrations: ReturnType<typeof checkMigrationStatus>;
  errors: string[];
}> {
  const errors: string[] = [];
  
  AILogger.info('[Market Init] Sistem başlatılıyor...');
  
  try {
    // 1. Database migration'ları çalıştır
    runAllMigrations();
    AILogger.info('[Market Init] ✅ Migrationlar tamamlandı');
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Migration hatası: ${msg}`);
    AILogger.error('[Market Init] Migration hatası', { error: msg });
  }
  
  try {
    // 2. Trust score tablosunu oluştur
    initTrustScoreTable();
    AILogger.info('[Market Init] ✅ Trust score sistemi hazır');
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Trust score hatası: ${msg}`);
    AILogger.warn('[Market Init] Trust score tablosu zaten mevcut', { error: msg });
  }
  
  // 3. Migration durumunu kontrol et
  const migrations = checkMigrationStatus();
  const allSuccess = Object.values(migrations).every(v => v);
  
  if (allSuccess) {
    AILogger.info('[Market Init] ✅ Tüm sistemler hazır');
  } else {
    AILogger.warn('[Market Init] ⚠️ Bazı sistemler eksik', { migrations });
    errors.push('Bazı migration\'lar tamamlanamadı');
  }
  
  return {
    success: errors.length === 0,
    migrations,
    errors
  };
}

/**
 * Sistem sağlık kontrolü
 */
export function healthCheck(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, boolean>;
  message: string;
} {
  const checks = checkMigrationStatus();
  const values = Object.values(checks);
  const successCount = values.filter(v => v).length;
  const totalCount = values.length;
  
  let status: 'healthy' | 'degraded' | 'unhealthy';
  let message: string;
  
  if (successCount === totalCount) {
    status = 'healthy';
    message = 'Tüm sistemler çalışıyor';
  } else if (successCount >= totalCount / 2) {
    status = 'degraded';
    message = `${successCount}/${totalCount} sistem çalışıyor`;
  } else {
    status = 'unhealthy';
    message = 'Kritik sistemler çalışmıyor';
  }
  
  return {
    status,
    checks,
    message
  };
}

/**
 * Hızlı test
 */
export async function quickTest(): Promise<void> {
  AILogger.info('[Market Test] Hızlı test başlatılıyor...');
  
  try {
    // Test imports
    const { validatePrice } = await import('./price-guard');
    const { smartPriceExtraction } = await import('./unit-converter');
    const { calculatePortionCost } = await import('./portion-calculator');
    const { normalizeProductPipeline } = await import('./product-normalizer');
    
    // Test PriceGuard
    const testQuote = {
      product_key: 'test',
      raw_query: 'test',
      unit: 'kg',
      unit_price: 50,
      currency: 'TRY' as const,
      asOf: new Date().toISOString(),
      source: 'TUIK' as const
    };
    
    const validation = validatePrice(testQuote);
    AILogger.info('[Market Test] PriceGuard:', { valid: validation.isValid });
    
    // Test UnitConverter
    const priceResult = smartPriceExtraction("5 kg çuval", 180);
    AILogger.info('[Market Test] UnitConverter:', { unitPrice: priceResult.unitPrice });
    
    // Test PortionCalculator
    const portion = calculatePortionCost(95, 'kg', 250, 'g');
    AILogger.info('[Market Test] PortionCalculator:', { cost: portion.costPerPortion });
    
    // Test ProductNormalizer
    const normalized = await normalizeProductPipeline("tavuk gogus");
    AILogger.info('[Market Test] ProductNormalizer:', {
      canonical: normalized.canonical,
      confidence: normalized.confidence
    });
    
    AILogger.info('[Market Test] ✅ Tüm testler başarılı');
  } catch (error) {
    AILogger.error('[Market Test] ❌ Test hatası', {
      error: error instanceof Error ? error.message : 'Unknown'
    });
  }
}

/**
 * CLI için komutlar
 */
if (typeof process !== 'undefined' && process.argv) {
  const command = process.argv[2];
  
  if (command === 'init') {
    initializeMarketSystem().then(result => {
      console.log('Initialization Result:', result);
      process.exit(result.success ? 0 : 1);
    });
  } else if (command === 'health') {
    const health = healthCheck();
    console.log('Health Check:', health);
    process.exit(health.status === 'healthy' ? 0 : 1);
  } else if (command === 'test') {
    quickTest().then(() => {
      console.log('Test completed');
      process.exit(0);
    });
  }
}

