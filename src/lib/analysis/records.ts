/**
 * Analysis Records Helper Functions
 * Provides getAnalysis and updateAnalysis functions for managing analysis records
 */

import { getDatabase } from '@/lib/db/universal-client';
import { AILogger } from '@/lib/ai/logger';

export interface AnalysisRecord {
  id: string;
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
  storagePath?: string;
  filename?: string;
  fileSize?: number;
  progress?: number;
  input_files?: string; // JSON string
  data_pool?: string; // JSON string
  created_at?: string;
  updated_at?: string;
  duration_ms?: number;
}

/**
 * Get analysis record by ID
 */
export async function getAnalysis(analysisId: string): Promise<AnalysisRecord | null> {
  try {
    const db = await getDatabase();

    const row = await db.queryOne(`
      SELECT
        id,
        status,
        storage_path,
        input_files,
        data_pool,
        created_at,
        updated_at,
        duration_ms
      FROM analysis_history
      WHERE id = $1
    `, [analysisId]) as any;

    if (!row) {
      AILogger.warn('Analysis not found', { analysisId });
      return null;
    }

    // Parse JSON fields
    let inputFiles: any = null;
    let dataPool: any = null;

    try {
      if (row.input_files) {
        inputFiles = typeof row.input_files === 'string'
          ? JSON.parse(row.input_files)
          : row.input_files;
      }
    } catch (error) {
      AILogger.warn('Failed to parse input_files', { analysisId });
    }

    try {
      if (row.data_pool) {
        dataPool = typeof row.data_pool === 'string'
          ? JSON.parse(row.data_pool)
          : row.data_pool;
      }
    } catch (error) {
      AILogger.warn('Failed to parse data_pool', { analysisId });
    }

    // Extract filename from input_files if available
    let filename: string | undefined;
    let fileSize: number | undefined;

    if (inputFiles && Array.isArray(inputFiles) && inputFiles.length > 0) {
      filename = inputFiles[0]?.name;
      fileSize = inputFiles[0]?.size;
    } else if (dataPool?.documents && dataPool.documents.length > 0) {
      filename = dataPool.documents[0]?.name;
      fileSize = dataPool.documents[0]?.size;
    }

    return {
      id: row.id,
      status: row.status as AnalysisRecord['status'],
      storagePath: row.storage_path || undefined,
      filename,
      fileSize,
      progress: row.progress || undefined,
      input_files: row.input_files,
      data_pool: row.data_pool,
      created_at: row.created_at,
      updated_at: row.updated_at,
      duration_ms: row.duration_ms
    };
  } catch (error) {
    AILogger.error('Failed to get analysis', {
      analysisId,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Update analysis record
 */
export async function updateAnalysis(
  analysisId: string,
  updates: Partial<Omit<AnalysisRecord, 'id'>>
): Promise<boolean> {
  try {
    const db = await getDatabase();

    // Build update query dynamically
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex}`);
      values.push(updates.status);
      paramIndex++;
    }

    if (updates.storagePath !== undefined) {
      fields.push(`storage_path = $${paramIndex}`);
      values.push(updates.storagePath);
      paramIndex++;
    }

    if (updates.progress !== undefined) {
      fields.push(`progress = $${paramIndex}`);
      values.push(updates.progress);
      paramIndex++;
    }

    if (updates.input_files !== undefined) {
      fields.push(`input_files = $${paramIndex}`);
      values.push(
        typeof updates.input_files === 'string'
          ? updates.input_files
          : JSON.stringify(updates.input_files)
      );
      paramIndex++;
    }

    if (updates.data_pool !== undefined) {
      fields.push(`data_pool = $${paramIndex}`);
      values.push(
        typeof updates.data_pool === 'string'
          ? updates.data_pool
          : JSON.stringify(updates.data_pool)
      );
      paramIndex++;
    }

    if (updates.duration_ms !== undefined) {
      fields.push(`duration_ms = $${paramIndex}`);
      values.push(updates.duration_ms);
      paramIndex++;
    }

    // Always update updated_at
    fields.push('updated_at = CURRENT_TIMESTAMP');

    if (fields.length === 0) {
      AILogger.warn('No fields to update', { analysisId });
      return false;
    }

    values.push(analysisId);

    await db.execute(`
      UPDATE analysis_history
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
    `, values);

    AILogger.info('Analysis updated', {
      analysisId,
      updates: Object.keys(updates)
    });

    return true;
  } catch (error) {
    AILogger.error('Failed to update analysis', {
      analysisId,
      error: error instanceof Error ? error.message : String(error),
      updates
    });
    return false;
  }
}
