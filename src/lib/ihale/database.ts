/**
 * Tender Database Helper
 * Handles saving AI-analyzed tender data to database
 */

import { getDB } from '@/lib/db/sqlite-client';
import { AILogger } from '@/lib/ai/logger';

export interface TenderAnalysisData {
  title?: string;
  organization?: string;
  details?: Record<string, string>;
  documents?: Array<{
    title: string;
    url: string;
    type: string;
  }>;
  fullText?: string;
  itemsList?: string | null; // CSV format
  [key: string]: any; // Allow additional fields
}

export interface FullContentData {
  rawHtml?: string;
  plainText?: string;
  screenshot?: string;
  documents?: Array<{
    title: string;
    url: string;
    type: string;
  }>;
  structuredData?: TenderAnalysisData;
}

export class TenderDatabase {
  /**
   * Update tender with AI analysis results
   */
  static async updateTenderWithAIAnalysis(
    tenderId: string,
    data: {
      raw_json?: TenderAnalysisData;
      announcement_text?: string;
      ai_analyzed?: boolean;
      ai_analyzed_at?: string;
    }
  ): Promise<void> {
    try {
      const db = getDB();

      // Check if tenders table exists and has the required columns
      // If not, we'll create a separate table for AI analysis
      const tableInfo = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='tenders'
      `).get() as { name: string } | undefined;

      if (tableInfo) {
        // Try to update tenders table if columns exist
        try {
          const updateStmt = db.prepare(`
            UPDATE tenders
            SET 
              title = COALESCE(?, title),
              organization = COALESCE(?, organization),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `);

          updateStmt.run(
            data.raw_json?.title || null,
            data.raw_json?.organization || null,
            tenderId
          );
        } catch (e) {
          // Columns might not exist, continue to separate table
          AILogger.warn('Could not update tenders table', { error: e });
        }
      }

      // Create/update tender_analysis table
      const createTableStmt = db.prepare(`
        CREATE TABLE IF NOT EXISTS tender_analysis (
          tender_id TEXT PRIMARY KEY,
          raw_json TEXT,
          announcement_text TEXT,
          ai_analyzed INTEGER DEFAULT 0,
          ai_analyzed_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      createTableStmt.run();

      // Insert or update analysis data
      const upsertStmt = db.prepare(`
        INSERT INTO tender_analysis (
          tender_id, raw_json, announcement_text, ai_analyzed, ai_analyzed_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(tender_id) DO UPDATE SET
          raw_json = excluded.raw_json,
          announcement_text = excluded.announcement_text,
          ai_analyzed = excluded.ai_analyzed,
          ai_analyzed_at = excluded.ai_analyzed_at,
          updated_at = CURRENT_TIMESTAMP
      `);

      upsertStmt.run(
        tenderId,
        data.raw_json ? JSON.stringify(data.raw_json) : null,
        data.announcement_text || null,
        data.ai_analyzed ? 1 : 0,
        data.ai_analyzed_at || null
      );

      AILogger.info('Tender analysis saved to database', { tenderId });
    } catch (error: any) {
      AILogger.error('Failed to save tender analysis', {
        tenderId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Save full tender analysis with all content
   */
  static async saveTenderAnalysis(
    tenderId: string,
    analysisResult: TenderAnalysisData,
    fullContent: FullContentData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const db = getDB();

      // Create tender_full_content table if not exists
      const createTableStmt = db.prepare(`
        CREATE TABLE IF NOT EXISTS tender_full_content (
          tender_id TEXT PRIMARY KEY,
          raw_html TEXT,
          plain_text TEXT,
          screenshot TEXT,
          documents TEXT,
          structured_data TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      createTableStmt.run();

      // Insert or update full content
      const upsertStmt = db.prepare(`
        INSERT INTO tender_full_content (
          tender_id, raw_html, plain_text, screenshot, documents, structured_data, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(tender_id) DO UPDATE SET
          raw_html = excluded.raw_html,
          plain_text = excluded.plain_text,
          screenshot = excluded.screenshot,
          documents = excluded.documents,
          structured_data = excluded.structured_data,
          updated_at = CURRENT_TIMESTAMP
      `);

      upsertStmt.run(
        tenderId,
        fullContent.rawHtml || null,
        fullContent.plainText || null,
        fullContent.screenshot || null,
        fullContent.documents ? JSON.stringify(fullContent.documents) : null,
        fullContent.structuredData ? JSON.stringify(fullContent.structuredData) : null
      );

      // Also update tender_analysis
      await this.updateTenderWithAIAnalysis(tenderId, {
        raw_json: analysisResult,
        announcement_text: analysisResult.fullText,
        ai_analyzed: true,
        ai_analyzed_at: new Date().toISOString()
      });

      AILogger.info('Full tender content saved to database', { tenderId });
      return { success: true };
    } catch (error: any) {
      AILogger.error('Failed to save full tender content', {
        tenderId,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }
}

