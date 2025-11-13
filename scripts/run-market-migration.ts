#!/usr/bin/env ts-node

/**
 * Market Robot v2.0 Migration Script
 * Database tablolarını oluşturur ve sistemi başlatır
 */

import { runAllMigrations, getMigrationReport, checkMigrationStatus } from '../src/lib/market/migration.js';
import { initTrustScoreTable } from '../src/lib/market/trust-score.js';

async function main() {
  console.log('🚀 Market Robot v2.0 Migration Başlatılıyor...\n');

  try {
    // 1. Migration durumunu kontrol et
    console.log('📊 Mevcut durum kontrol ediliyor...');
    const beforeStatus = checkMigrationStatus();
    console.log('Önceki durum:', beforeStatus);
    console.log('');

    // 2. Tum migration'lari calistir
    console.log('🔧 Migration\'lar calistiriliyor...');
    runAllMigrations();
    console.log('✅ Migration\'lar tamamlandi!\n');

    // 3. Trust score tablosu
    console.log('🔐 Trust score tablosu olusturuluyor...');
    try {
      initTrustScoreTable();
      console.log('✅ Trust score tablosu hazir!\n');
    } catch (error) {
      console.log('⚠️  Trust score tablosu zaten mevcut\n');
    }

    // 4. Son durum raporu
    console.log('📋 Migration Raporu:');
    console.log(getMigrationReport());
    console.log('');

    // 5. Final kontrol
    const afterStatus = checkMigrationStatus();
    const allComplete = Object.values(afterStatus).every(v => v);

    if (allComplete) {
      console.log('✅ ✅ ✅ TUM MIGRATION\'LAR BASARILI! ✅ ✅ ✅\n');
      console.log('Sistem kullanima hazir! 🎉');
      process.exit(0);
    } else {
      console.log('⚠️  Bazi migration\'lar tamamlanamadi:');
      Object.entries(afterStatus).forEach(([key, value]) => {
        console.log(`  ${value ? '✅' : '❌'} ${key}`);
      });
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Migration hatası:', error);
    process.exit(1);
  }
}

main();

