/**
 * Analysis Repository
 * Database operations for analysis results
 * 
 * Provides normalized, queryable access to analysis data
 */

import { getDB, transaction, validateJSON } from './sqlite-client';
import type { TenderAnalysisResult } from '@/lib/tender-analysis/types';
import type { DataPool } from '@/lib/document-processor/types';

export interface AnalysisResultRow {
  id: string;
  tender_id: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  institution: string | null;
  budget_amount: number | null;
  person_count: number | null;
  duration_days: number | null;
  tender_type: string | null;
  contextual_score: number | null;
  market_risk_level: 'low' | 'medium' | 'high' | null;
  data_quality_score: number | null;
  extracted_fields_json: string;
  contextual_analysis_json: string;
  market_analysis_json: string;
  validation_json: string;
  processing_time_ms: number | null;
  tokens_used: number | null;
  cost_usd: number | null;
  created_at: string;
  updated_at: string;
}

export interface DataPoolRow {
  analysis_id: string;
  data_pool_json: string;
  text_content: string | null;
  document_count: number;
  table_count: number;
  date_count: number;
  entity_count: number;
  total_size_bytes: number;
  expires_at: string;
  created_at: string;
}

export interface APIMetricRow {
  id: number;
  endpoint: string;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  cost_usd: number | null;
  duration_ms: number | null;
  success: number;
  error_message: string | null;
  created_at: string;
}

/**
 * Analysis Repository
 * Handles all database operations for analysis results
 */
export class AnalysisRepository {
  /**
   * Save analysis result to database
   * - Uses transaction for atomicity
   * - Validates JSON before storage
   * - Updates FTS index automatically
   */
  static save(result: TenderAnalysisResult): void {
    const db = getDB();

    try {
      // Validate JSON fields before storing
      const extractedFieldsJson = validateJSON(result.extracted_fields || {});
      const contextualAnalysisJson = validateJSON(result.contextual || {});
      const marketAnalysisJson = validateJSON(result.market || {});
      const validationJson = validateJSON(result.validation || {});

      // Use transaction for atomic operation
      const saveTransaction = transaction(() => {
        // Prepare statement (cached automatically by better-sqlite3)
        const insertStmt = db.prepare(`
          INSERT INTO analysis_results_v2 (
            id, tender_id, status, institution, budget_amount,
            person_count, duration_days, tender_type,
            contextual_score, market_risk_level, data_quality_score,
            extracted_fields_json, contextual_analysis_json,
            market_analysis_json, validation_json,
            processing_time_ms, tokens_used, cost_usd
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            status = excluded.status,
            updated_at = CURRENT_TIMESTAMP,
            contextual_score = excluded.contextual_score,
            market_risk_level = excluded.market_risk_level,
            data_quality_score = excluded.data_quality_score,
            contextual_analysis_json = excluded.contextual_analysis_json,
            market_analysis_json = excluded.market_analysis_json,
            validation_json = excluded.validation_json,
            processing_time_ms = excluded.processing_time_ms,
            tokens_used = excluded.tokens_used,
            cost_usd = excluded.cost_usd
        `);

        insertStmt.run(
          result.analysis_id,
          result.extracted_fields?.tender_id || null,
          result.status,
          result.extracted_fields?.institution || null,
          result.extracted_fields?.budget_amount || null,
          result.extracted_fields?.person_count || null,
          result.extracted_fields?.duration_days || null,
          result.extracted_fields?.tender_type || null,
          result.contextual?.genel_degerlendirme?.puan || null,
          result.market?.comparison?.risk_level || null,
          result.validation?.data_quality_score || null,
          extractedFieldsJson,
          contextualAnalysisJson,
          marketAnalysisJson,
          validationJson,
          result.processing_time_ms || null,
          result.tokens_used || null,
          result.cost_usd || null
        );

        // Update FTS index
        if (result.data_pool) {
          const textContent = result.data_pool.textBlocks
            ?.map(block => block.text)
            .join(' ') || '';
          
          const ftsStmt = db.prepare(`
            INSERT INTO analysis_fts (analysis_id, content)
            VALUES (?, ?)
            ON CONFLICT(analysis_id) DO UPDATE SET content = excluded.content
          `);
          
          ftsStmt.run(result.analysis_id, textContent);
        }
      });

      // Execute transaction
      saveTransaction();
    } catch (error) {
      console.error('[AnalysisRepository] Failed to save analysis:', error);
      throw error;
    }
  }

  /**
   * Find analysis by ID
   */
  static findById(id: string): AnalysisResultRow | null {
    const db = getDB();
    try {
      return db.prepare(`
        SELECT * FROM analysis_results_v2 WHERE id = ?
      `).get(id) as AnalysisResultRow | null;
    } catch (error) {
      console.error('[AnalysisRepository] Failed to find analysis:', error);
      return null;
    }
  }

  /**
   * Full-text search
   */
  static search(query: string, limit = 20): AnalysisResultRow[] {
    const db = getDB();
    try {
      return db.prepare(`
        SELECT a.* FROM analysis_results_v2 a
        INNER JOIN analysis_fts f ON a.id = f.analysis_id
        WHERE analysis_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `).all(query, limit) as AnalysisResultRow[];
    } catch (error) {
      console.error('[AnalysisRepository] Search failed:', error);
      return [];
    }
  }

  /**
   * Find by status
   */
  static findByStatus(
    status: 'pending' | 'processing' | 'completed' | 'failed',
    limit = 50
  ): AnalysisResultRow[] {
    const db = getDB();
    try {
      return db.prepare(`
        SELECT * FROM analysis_results_v2
        WHERE status = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(status, limit) as AnalysisResultRow[];
    } catch (error) {
      console.error('[AnalysisRepository] Failed to find by status:', error);
      return [];
    }
  }

  /**
   * Find by institution
   */
  static findByInstitution(institution: string, limit = 50): AnalysisResultRow[] {
    const db = getDB();
    try {
      return db.prepare(`
        SELECT * FROM analysis_results_v2
        WHERE institution LIKE ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(`%${institution}%`, limit) as AnalysisResultRow[];
    } catch (error) {
      console.error('[AnalysisRepository] Failed to find by institution:', error);
      return [];
    }
  }

  /**
   * Save DataPool with expiration
   * - Validates JSON before storage
   * - Atomic operation
   */
  static saveDataPool(
    analysisId: string,
    dataPool: DataPool,
    ttlHours = 24
  ): void {
    const db = getDB();
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + ttlHours);

      const textContent = dataPool.textBlocks
        ?.map(block => block.text)
        .join(' ') || '';

      // Validate JSON before storing
      const dataPoolJson = validateJSON(dataPool);
      const totalSize = new Blob([dataPoolJson]).size;

      // Prepared statement (cached automatically)
      const stmt = db.prepare(`
        INSERT INTO data_pools (
          analysis_id, data_pool_json, text_content,
          document_count, table_count, date_count, entity_count,
          total_size_bytes, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(analysis_id) DO UPDATE SET
          data_pool_json = excluded.data_pool_json,
          text_content = excluded.text_content,
          document_count = excluded.document_count,
          table_count = excluded.table_count,
          date_count = excluded.date_count,
          entity_count = excluded.entity_count,
          total_size_bytes = excluded.total_size_bytes,
          expires_at = excluded.expires_at
      `);

      stmt.run(
        analysisId,
        dataPoolJson,
        textContent,
        dataPool.documents?.length || 0,
        dataPool.tables?.length || 0,
        dataPool.dates?.length || 0,
        dataPool.entities?.length || 0,
        totalSize,
        expiresAt.toISOString()
      );
    } catch (error) {
      console.error('[AnalysisRepository] Failed to save DataPool:', error);
      throw error;
    }
  }

  /**
   * Get DataPool by analysis ID
   */
  static getDataPool(analysisId: string): DataPool | null {
    const db = getDB();
    try {
      const row = db.prepare(`
        SELECT data_pool_json, expires_at FROM data_pools
        WHERE analysis_id = ? AND expires_at > datetime('now')
      `).get(analysisId) as { data_pool_json: string; expires_at: string } | null;

      if (!row) return null;

      return JSON.parse(row.data_pool_json) as DataPool;
    } catch (error) {
      console.error('[AnalysisRepository] Failed to get DataPool:', error);
      return null;
    }
  }

  /**
   * Get analysis result by analysis ID
   * Returns contextual, market, and deep analysis results
   */
  static getByAnalysisId(analysisId: string): {
    contextual: any | null;
    market: any | null;
    deep: any | null;
  } | null {
    const db = getDB();
    try {
      // Fetch all stages for this analysis
      const rows = db.prepare(`
        SELECT stage, result_data
        FROM analysis_results
        WHERE analysis_id = ?
      `).all(analysisId) as Array<{
        stage: string;
        result_data: string;
      }>;

      if (!rows || rows.length === 0) return null;

      // Parse each stage
      const result = {
        contextual: null as any,
        market: null as any,
        deep: null as any
      };

      for (const row of rows) {
        try {
          const data = JSON.parse(row.result_data);
          
          if (row.stage === 'contextual') {
            result.contextual = data;
          } else if (row.stage === 'market') {
            result.market = data;
          } else if (row.stage === 'validation' || row.stage === 'deep') {
            result.deep = data;
          }
        } catch (parseError) {
          console.error(`[AnalysisRepository] Failed to parse ${row.stage} data:`, parseError);
        }
      }

      return result;
    } catch (error) {
      console.error('[AnalysisRepository] Failed to get analysis result:', error);
      return null;
    }
  }

  /**
   * Save API metric
   */
  static saveAPIMetric(metric: {
    endpoint: string;
    model?: string;
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    cost_usd?: number;
    duration_ms?: number;
    success?: boolean;
    error_message?: string;
  }): void {
    const db = getDB();
    try {
      db.prepare(`
        INSERT INTO api_metrics (
          endpoint, model, input_tokens, output_tokens, total_tokens,
          cost_usd, duration_ms, success, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        metric.endpoint,
        metric.model || null,
        metric.input_tokens || null,
        metric.output_tokens || null,
        metric.total_tokens || null,
        metric.cost_usd || null,
        metric.duration_ms || null,
        metric.success !== false ? 1 : 0,
        metric.error_message || null
      );
    } catch (error) {
      console.error('[AnalysisRepository] Failed to save API metric:', error);
      // Don't throw - metrics are non-critical
    }
  }

  /**
   * Get cost statistics
   */
  static getCostStats(days = 30): {
    total_cost: number;
    total_requests: number;
    avg_cost_per_request: number;
    by_endpoint: Record<string, { cost: number; requests: number }>;
    by_model: Record<string, { cost: number; requests: number }>;
  } {
    const db = getDB();
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const allMetrics = db.prepare(`
        SELECT endpoint, model, cost_usd, success
        FROM api_metrics
        WHERE created_at > ? AND success = 1
      `).all(since.toISOString()) as APIMetricRow[];

      const total_cost = allMetrics.reduce((sum, m) => sum + (m.cost_usd || 0), 0);
      const total_requests = allMetrics.length;
      const avg_cost_per_request = total_requests > 0 ? total_cost / total_requests : 0;

      const by_endpoint: Record<string, { cost: number; requests: number }> = {};
      const by_model: Record<string, { cost: number; requests: number }> = {};

      for (const metric of allMetrics) {
        // By endpoint
        if (!by_endpoint[metric.endpoint]) {
          by_endpoint[metric.endpoint] = { cost: 0, requests: 0 };
        }
        by_endpoint[metric.endpoint].cost += metric.cost_usd || 0;
        by_endpoint[metric.endpoint].requests += 1;

        // By model
        if (metric.model) {
          if (!by_model[metric.model]) {
            by_model[metric.model] = { cost: 0, requests: 0 };
          }
          by_model[metric.model].cost += metric.cost_usd || 0;
          by_model[metric.model].requests += 1;
        }
      }

      return {
        total_cost,
        total_requests,
        avg_cost_per_request,
        by_endpoint,
        by_model,
      };
    } catch (error) {
      console.error('[AnalysisRepository] Failed to get cost stats:', error);
      return {
        total_cost: 0,
        total_requests: 0,
        avg_cost_per_request: 0,
        by_endpoint: {},
        by_model: {},
      };
    }
  }

  /**
   * Cleanup expired DataPools
   */
  static cleanupExpiredDataPools(): number {
    const db = getDB();
    try {
      const result = db.prepare(`
        DELETE FROM data_pools WHERE expires_at < datetime('now')
      `).run();
      return result.changes || 0;
    } catch (error) {
      console.error('[AnalysisRepository] Failed to cleanup expired DataPools:', error);
      return 0;
    }
  }
}

