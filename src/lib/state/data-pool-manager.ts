/**
 * 🆕 DataPool Manager
 * Single source of truth for DataPool - manages memory cache and DB persistence
 * SERVER-ONLY: Uses database adapter, cannot be imported in client components
 */

import { getDatabase } from '@/lib/db/universal-client';
import { AILogger } from '@/lib/ai/logger';
import type { DataPool } from '@/lib/document-processor/types';
import { DataPoolEventEmitter } from './data-pool-event-emitter';

interface CacheEntry {
  dataPool: DataPool;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class DataPoolManager {
  private static cache: Map<string, CacheEntry> = new Map();
  private static readonly DEFAULT_TTL = 60 * 60 * 1000; // 1 hour
  private static readonly MAX_CACHE_SIZE = 50; // Max 50 DataPools in cache

  /**
   * Get DataPool by analysis ID
   * Checks cache first, then DB
   */
  static async get(analysisId: string): Promise<DataPool | null> {
    // 1. Check cache
    const cached = this.cache.get(analysisId);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < cached.ttl) {
        AILogger.info('DataPool cache hit', { analysisId });
        return cached.dataPool;
      } else {
        // Expired, remove from cache
        this.cache.delete(analysisId);
      }
    }

    // 2. Check new data_pools table via AnalysisRepository
    try {
      const { AnalysisRepository } = await import('@/lib/db/analysis-repository');
      const dataPool = AnalysisRepository.getDataPool(analysisId);

      if (dataPool) {
        // Add to cache
        this.setCache(analysisId, dataPool);
        AILogger.info('DataPool loaded from new repository', { analysisId });
        return dataPool;
      }
    } catch (error) {
      AILogger.warn('Failed to load from new repository, trying legacy', { analysisId, error });
    }

    // 3. Fallback to legacy analysis_history table
    try {
      const db = await getDatabase();
      const row = await db.queryOne(`
        SELECT data_pool FROM analysis_history
        WHERE id = $1
      `, [analysisId]) as { data_pool: string } | undefined;

      if (row?.data_pool) {
        const dataPool = JSON.parse(row.data_pool) as DataPool;

        // Add to cache
        this.setCache(analysisId, dataPool);

        AILogger.info('DataPool loaded from legacy DB', { analysisId });
        return dataPool;
      }
    } catch (error) {
      AILogger.error('Failed to load DataPool from DB', {
        analysisId,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return null;
  }

  /**
   * Save DataPool to DB and cache
   * Now uses AnalysisRepository for persistence
   */
  static async save(
    analysisId: string,
    dataPool: DataPool,
    metadata?: {
      status?: string;
      inputFiles?: Array<{ name: string; size: number }>;
      duration_ms?: number;
    }
  ): Promise<void> {
    try {
      // 1. Save to new data_pools table via AnalysisRepository
      const { AnalysisRepository } = await import('@/lib/db/analysis-repository');
      AnalysisRepository.saveDataPool(analysisId, dataPool, 24); // 24 hour TTL

      // 2. Also save to legacy analysis_history table for backward compatibility (optional)
      try {
        const db = await getDatabase();

        // Check if table exists first
        const tableExists = await db.queryOne(`
          SELECT table_name FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'analysis_history'
        `) as any;

        if (!tableExists) {
          // Table doesn't exist, skip legacy save
          AILogger.info('analysis_history table not found, skipping legacy save', { analysisId });
          return;
        }

        // Check if record exists
        const exists = await db.queryOne('SELECT id FROM analysis_history WHERE id = $1', [analysisId]);

      const status = metadata?.status || 'processing';
      const inputFilesJson = metadata?.inputFiles ? JSON.stringify(metadata.inputFiles) : null;

      if (exists) {
        // Update existing - atomic operation
        const updateFields: string[] = ['data_pool = $1', 'status = $2'];
        const values: any[] = [JSON.stringify(dataPool), status];
        let paramCount = 3;

        if (inputFilesJson) {
          updateFields.push(`input_files = $${paramCount++}`);
          values.push(inputFilesJson);
        }
        if (metadata?.duration_ms) {
          updateFields.push(`duration_ms = $${paramCount++}`);
          values.push(metadata.duration_ms);
        }
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(analysisId);

        await db.execute(`
          UPDATE analysis_history
          SET ${updateFields.join(', ')}
          WHERE id = $${paramCount}
        `, values);
      } else {
        // Insert new - atomic operation
        const fields: string[] = ['id', 'file_name', 'data_pool', 'status'];
        const placeholders: string[] = ['$1', '$2', '$3', '$4'];
        const values: any[] = [
          analysisId,
          dataPool.documents?.[0]?.name || 'Auto-generated',
          JSON.stringify(dataPool),
          status
        ];
        let paramCount = 5;

        if (inputFilesJson) {
          fields.push('input_files');
          placeholders.push(`$${paramCount++}`);
          values.push(inputFilesJson);
        }
        if (metadata?.duration_ms) {
          fields.push('duration_ms');
          placeholders.push(`$${paramCount++}`);
          values.push(metadata.duration_ms);
        }

        await db.execute(`
          INSERT INTO analysis_history (${fields.join(', ')}, created_at)
          VALUES (${placeholders.join(', ')}, CURRENT_TIMESTAMP)
        `, values);
      }
      } catch (legacyError) {
        // Legacy table operations are optional, log but don't fail
        AILogger.warn('Failed to save to legacy analysis_history table', {
          error: legacyError instanceof Error ? legacyError.message : String(legacyError),
          analysisId
        });
      }

      // 2. Update cache
      this.setCache(analysisId, dataPool);

      // 3. Emit event for frontend sync
      DataPoolEventEmitter.emit(analysisId, dataPool);

      AILogger.info('DataPool saved', {
        analysisId,
        documents: dataPool.documents.length,
        textBlocks: dataPool.textBlocks.length,
        tables: dataPool.tables.length,
        status: metadata?.status || 'completed'
      });
    } catch (error) {
      AILogger.error('Failed to save DataPool', {
        analysisId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Update DataPool (partial update)
   */
  static async update(
    analysisId: string,
    updates: Partial<DataPool>
  ): Promise<void> {
    const existing = await this.get(analysisId);

    if (!existing) {
      throw new Error(`DataPool not found: ${analysisId}`);
    }

    const updated: DataPool = {
      ...existing,
      ...updates,
      // Merge arrays
      documents: updates.documents || existing.documents,
      textBlocks: updates.textBlocks || existing.textBlocks,
      tables: updates.tables || existing.tables,
      dates: updates.dates || existing.dates,
      amounts: updates.amounts || existing.amounts,
      entities: updates.entities || existing.entities,
      metadata: {
        ...existing.metadata,
        ...updates.metadata
      }
    };

    await this.save(analysisId, updated);
  }

  /**
   * Delete DataPool from cache and DB
   */
  static async delete(analysisId: string): Promise<void> {
    // Remove from cache
    this.cache.delete(analysisId);

    // Remove from DB (soft delete - just mark as deleted)
    try {
      const db = await getDatabase();
      await db.execute(`
        UPDATE analysis_history
        SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [analysisId]);

      AILogger.info('DataPool deleted', { analysisId });
    } catch (error) {
      AILogger.error('Failed to delete DataPool', {
        analysisId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Check if DataPool exists
   */
  static async exists(analysisId: string): Promise<boolean> {
    // Check cache first
    if (this.cache.has(analysisId)) {
      return true;
    }

    // Check DB
    try {
      const db = await getDatabase();
      const row = await db.queryOne(`
        SELECT id FROM analysis_history
        WHERE id = $1 AND status != 'deleted'
      `, [analysisId]);

      return !!row;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): {
    size: number;
    entries: Array<{ id: string; age: number; ttl: number }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([id, entry]) => ({
      id,
      age: Date.now() - entry.timestamp,
      ttl: entry.ttl
    }));

    return {
      size: this.cache.size,
      entries
    };
  }

  /**
   * Clear expired cache entries
   */
  static cleanupCache(): number {
    const now = Date.now();
    let removed = 0;

    for (const [id, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age >= entry.ttl) {
        this.cache.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      AILogger.info('Cache cleanup', { removed });
    }

    return removed;
  }

  /**
   * Initialize automatic cache cleanup (call once at server startup)
   */
  static initializeAutoCleanup(): void {
    // Cleanup every 5 minutes
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        const removed = this.cleanupCache();
        if (removed > 0) {
          AILogger.info('Automatic cache cleanup', { removed });
        }
      }, 5 * 60 * 1000); // 5 minutes
    }
  }

  /**
   * Clear all cache
   */
  static clearCache(): void {
    this.cache.clear();
    AILogger.info('Cache cleared');
  }

  /**
   * Set cache entry (with size limit)
   */
  private static setCache(analysisId: string, dataPool: DataPool, ttl?: number): void {
    // If cache is full, remove oldest entry
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldest = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];

      if (oldest) {
        this.cache.delete(oldest[0]);
      }
    }

    this.cache.set(analysisId, {
      dataPool,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL
    });
  }
}


