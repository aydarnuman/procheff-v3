/**
 * 🔄 LocalStorage to IndexedDB Migration Utility
 * 
 * MIGRATION STRATEGY:
 * ✅ IndexedDB (Large Data - 50-250MB):
 *    - Tender details (ihale detayları)
 *    - Analysis data pool (veri havuzu)
 *    - Document contents (doküman içerikleri)
 *    - Large cached data
 * 
 * ❌ LocalStorage (Small Data - <5MB):
 *    - Zustand store state
 *    - UI preferences (theme, layout)
 *    - Analysis history metadata (backend zaten kaydediyor)
 *    - Session tokens / auth
 *    - Small settings
 */

import { idb, STORES } from './indexeddb-manager';

const PREFIX = 'procheff_';

interface MigrationResult {
  migrated: number;
  skipped: number;
  failed: number;
  freedSpace: number;
  items: Array<{
    key: string;
    size: number;
    status: 'migrated' | 'skipped' | 'failed';
    reason?: string;
  }>;
}

/**
 * Check if a localStorage key should be migrated to IndexedDB
 */
function shouldMigrate(key: string, size: number): { migrate: boolean; reason: string } {
  const MIN_SIZE = 10 * 1024; // 10KB minimum (küçük datalar LocalStorage'da kalır)

  // Tender details → IndexedDB (genelde büyük)
  if (key.includes('tender_detail_')) {
    return { migrate: true, reason: 'Tender detail (large data)' };
  }

  // Analysis data pool → IndexedDB (veri havuzu büyük olabilir)
  if (key.includes('analysis:') || key.includes('dataPool')) {
    return { migrate: true, reason: 'Analysis data pool (potentially large)' };
  }

  // Document contents → IndexedDB
  if (key.includes('document_') || key.includes('files:')) {
    return { migrate: true, reason: 'Document content (large data)' };
  }

  // ❌ SKIP: Zustand store state
  if (key.includes('analysis-store') || key.includes('pipeline-store') || key.includes('-store-state')) {
    return { migrate: false, reason: 'Zustand store (keep in localStorage)' };
  }

  // ❌ SKIP: UI state
  if (key.includes('ui:') || key.includes('theme') || key.includes('layout') || key.includes('setting:')) {
    return { migrate: false, reason: 'UI state (keep in localStorage)' };
  }

  // ❌ SKIP: Auth / session
  if (key.includes('token') || key.includes('auth') || key.includes('session')) {
    return { migrate: false, reason: 'Auth/session (keep in localStorage)' };
  }

  // ❌ SKIP: Analysis history metadata (backend has it)
  if (key.includes('analysis_history')) {
    return { migrate: false, reason: 'History metadata (backend handles)' };
  }

  // ❌ SKIP: Small items (< 10KB)
  if (size < MIN_SIZE) {
    return { migrate: false, reason: `Small data (${(size / 1024).toFixed(2)}KB < 10KB)` };
  }

  // Large temp data → IndexedDB
  if (key.includes('temp:')) {
    return { migrate: true, reason: 'Large temp data' };
  }

  // By default: migrate large items, skip small ones
  return { 
    migrate: size >= MIN_SIZE, 
    reason: size >= MIN_SIZE ? 'Large data' : 'Small data (keep in localStorage)'
  };
}

/**
 * Determine which IndexedDB store to use
 */
function getTargetStore(key: string): typeof STORES[keyof typeof STORES] {
  if (key.includes('tender_detail_')) return STORES.TENDERS;
  if (key.includes('analysis:') || key.includes('dataPool')) return STORES.ANALYSES;
  if (key.includes('document_') || key.includes('files:')) return STORES.DOCUMENTS;
  return STORES.TEMP;
}

/**
 * Extract ID from localStorage key
 */
function extractId(key: string): string {
  // Remove prefix
  const withoutPrefix = key.replace(PREFIX, '');
  
  // For tender_detail_ID pattern
  if (withoutPrefix.startsWith('tender_detail_')) {
    return withoutPrefix.replace('tender_detail_', '');
  }
  
  // For analysis:ID pattern
  if (withoutPrefix.startsWith('analysis:')) {
    return withoutPrefix.replace('analysis:', '');
  }
  
  // Default: use the key without prefix
  return withoutPrefix;
}

/**
 * Migrate localStorage data to IndexedDB
 */
export async function migrateToIndexedDB(options: {
  dryRun?: boolean;
  clearAfterMigration?: boolean;
} = {}): Promise<MigrationResult> {
  const { dryRun = false, clearAfterMigration = false } = options;

  console.group('🔄 LocalStorage → IndexedDB Migration');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE MIGRATION'}`);

  const result: MigrationResult = {
    migrated: 0,
    skipped: 0,
    failed: 0,
    freedSpace: 0,
    items: [],
  };

  try {
    const keys = Object.keys(localStorage);
    const procheffKeys = keys.filter(k => k.startsWith(PREFIX));

    console.log(`Found ${procheffKeys.length} procheff items in localStorage`);

    for (const key of procheffKeys) {
      try {
        const item = localStorage.getItem(key);
        if (!item) continue;

        const size = item.length;
        const decision = shouldMigrate(key, size);

        if (!decision.migrate) {
          result.skipped++;
          result.items.push({
            key,
            size,
            status: 'skipped',
            reason: decision.reason,
          });
          console.log(`⏭️  SKIP: ${key} (${(size / 1024).toFixed(2)}KB) - ${decision.reason}`);
          continue;
        }

        // Parse the stored data
        let data: any;
        try {
          const parsed = JSON.parse(item);
          // Check if it's a StorageItem wrapper
          data = parsed.value !== undefined ? parsed.value : parsed;
        } catch {
          // Not JSON, store as-is
          data = item;
        }

        if (!dryRun) {
          // Migrate to IndexedDB
          const targetStore = getTargetStore(key);
          const id = extractId(key);

          const success = await idb.set(targetStore, id, data);

          if (success) {
            result.migrated++;
            result.freedSpace += size;
            result.items.push({
              key,
              size,
              status: 'migrated',
              reason: `${decision.reason} → ${targetStore}`,
            });

            // Remove from localStorage if migration successful and clearAfterMigration is true
            if (clearAfterMigration) {
              localStorage.removeItem(key);
            }

            console.log(`✅ MIGRATED: ${key} (${(size / 1024).toFixed(2)}KB) → ${targetStore}`);
          } else {
            throw new Error('Migration failed');
          }
        } else {
          // Dry run
          result.migrated++;
          result.freedSpace += size;
          result.items.push({
            key,
            size,
            status: 'migrated',
            reason: `[DRY RUN] ${decision.reason}`,
          });
          console.log(`🔍 WOULD MIGRATE: ${key} (${(size / 1024).toFixed(2)}KB) - ${decision.reason}`);
        }
      } catch (error) {
        result.failed++;
        result.items.push({
          key,
          size: 0,
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
        console.error(`❌ FAILED: ${key}`, error);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  ✅ Migrated: ${result.migrated}`);
    console.log(`  ⏭️  Skipped: ${result.skipped}`);
    console.log(`  ❌ Failed: ${result.failed}`);
    console.log(`  💾 Space freed: ${(result.freedSpace / 1024).toFixed(2)}KB`);

    if (dryRun) {
      console.log('\n⚠️  This was a DRY RUN - no changes were made');
    } else if (clearAfterMigration) {
      console.log('\n🧹 Migrated items removed from localStorage');
    }

    console.groupEnd();

    return result;
  } catch (error) {
    console.error('Migration failed:', error);
    console.groupEnd();
    throw error;
  }
}

/**
 * Get migration preview (dry run)
 */
export async function previewMigration(): Promise<MigrationResult> {
  return migrateToIndexedDB({ dryRun: true });
}

/**
 * Execute migration and clear localStorage
 */
export async function executeMigration(): Promise<MigrationResult> {
  return migrateToIndexedDB({ clearAfterMigration: true });
}

/**
 * Browser console helper
 */
if (typeof window !== 'undefined') {
  (window as any).migrateStorage = {
    preview: previewMigration,
    execute: executeMigration,
    help: () => {
      console.log(`
🔄 Storage Migration Helpers

Preview migration (dry run):
  migrateStorage.preview()

Execute migration:
  migrateStorage.execute()

What gets migrated:
  ✅ Tender details (large)
  ✅ Analysis data pools (large)
  ✅ Document contents (large)
  ✅ Large cached data (>10KB)

What stays in localStorage:
  ❌ Zustand stores
  ❌ UI state/preferences
  ❌ Auth tokens/session
  ❌ Small settings (<10KB)
      `);
    },
  };
}

