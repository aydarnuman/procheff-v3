/**
 * 🆕 DataPool Manager
 * Single source of truth for DataPool - manages memory cache and DB persistence
 * SERVER-ONLY: Uses better-sqlite3, cannot be imported in client components
 */

import { getDB } from '@/lib/db/sqlite-client';
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
      const db = getDB();
      const row = db.prepare(`
        SELECT data_pool FROM analysis_history
        WHERE id = ?
      `).get(analysisId) as { data_pool: string } | undefined;
      
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
        const db = getDB();
        
        // Check if table exists first
        const tableExists = db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name='analysis_history'
        `).get();
        
        if (!tableExists) {
          // Table doesn't exist, skip legacy save
          AILogger.info('analysis_history table not found, skipping legacy save', { analysisId });
          return;
        }
        
        // Check if record exists
        const exists = db.prepare('SELECT id FROM analysis_history WHERE id = ?').get(analysisId);
      
      const status = metadata?.status || 'processing';
      const inputFilesJson = metadata?.inputFiles ? JSON.stringify(metadata.inputFiles) : null;
      
      if (exists) {
        // Update existing - atomic operation
        const updateStmt = db.prepare(`
          UPDATE analysis_history
          SET data_pool = ?, 
              status = ?,
              ${inputFilesJson ? 'input_files = ?,' : ''}
              ${metadata?.duration_ms ? 'duration_ms = ?,' : ''}
              updated_at = datetime('now')
          WHERE id = ?
        `);
        
        const params: (string | number | undefined)[] = [JSON.stringify(dataPool), status];
        if (inputFilesJson) params.push(inputFilesJson);
        if (metadata?.duration_ms) params.push(metadata.duration_ms);
        params.push(analysisId);
        
        updateStmt.run(...params);
      } else {
        // Insert new - atomic operation
        const insertStmt = db.prepare(`
          INSERT INTO analysis_history (
            id,
            file_name,
            data_pool,
            status,
            ${inputFilesJson ? 'input_files,' : ''}
            ${metadata?.duration_ms ? 'duration_ms,' : ''}
            created_at
          ) VALUES (
            ?,
            ?,
            ?,
            ?,
            ${inputFilesJson ? '?,' : ''}
            ${metadata?.duration_ms ? '?,' : ''}
            datetime('now')
          )
        `);
        
        const fileName =
          dataPool.documents?.[0]?.name ||
          'Auto-generated';
        
        const params: (string | number | undefined)[] = [
          analysisId,
          fileName,
          JSON.stringify(dataPool),
          status
        ];
        if (inputFilesJson) params.push(inputFilesJson);
        if (metadata?.duration_ms) params.push(metadata.duration_ms);
        
        insertStmt.run(...params);
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
      const db = getDB();
      db.prepare(`
        UPDATE analysis_history
        SET status = 'deleted', updated_at = datetime('now')
        WHERE id = ?
      `).run(analysisId);
      
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
      const db = getDB();
      const row = db.prepare(`
        SELECT id FROM analysis_history
        WHERE id = ? AND status != 'deleted'
      `).get(analysisId);
      
      return !!row;
    } catch {
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


