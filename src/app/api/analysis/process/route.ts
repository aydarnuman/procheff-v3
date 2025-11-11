/**
 * Process Orchestrator API Endpoint
 * Runs the complete analysis pipeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { startTenderAnalysis } from '@/lib/tender-analysis/engine';
import type { DataPool } from '@/lib/document-processor/types';
import { AILogger } from '@/lib/ai/logger';
import { getDB } from '@/lib/db/sqlite-client';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { analysisId, dataPool, options } = body;

    if (!analysisId || !dataPool) {
      return NextResponse.json(
        { error: 'Missing required fields: analysisId, dataPool' },
        { status: 400 }
      );
    }

    AILogger.info('Starting complete analysis process', {
      analysisId,
      documents: dataPool.documents?.length || 0,
      options
    });

    // Get or create analysis record in DB
    try {
      const db = getDB();

      // Check if record exists
      const checkStmt = db.prepare('SELECT id FROM analysis_history WHERE id = ?');
      const exists = checkStmt.get(analysisId);

      if (!exists) {
        // Create new record
        const insertStmt = db.prepare(`
          INSERT INTO analysis_history (
            id, status, input_files, data_pool, created_at
          ) VALUES (?, ?, ?, ?, datetime('now'))
        `);

        insertStmt.run(
          analysisId,
          'processing',
          JSON.stringify(dataPool.documents?.map((d: any) => ({
            name: d.name,
            size: d.size
          })) || []),
          JSON.stringify(dataPool)
        );
      } else {
        // Update status
        const updateStmt = db.prepare(`
          UPDATE analysis_history
          SET status = 'processing', updated_at = datetime('now')
          WHERE id = ?
        `);
        updateStmt.run(analysisId);
      }
    } catch (dbError) {
      AILogger.error('Database operation failed', { dbError });
    }

    // Run the complete analysis
    const result = await startTenderAnalysis(
      analysisId,
      dataPool as DataPool,
      options || {}
    );

    const duration = Date.now() - startTime;

    AILogger.success('Complete analysis finished', {
      analysisId,
      duration,
      status: result.status,
      contextualScore: result.contextual?.genel_degerlendirme.puan,
      marketRisk: result.market?.comparison.risk_level
    });

    return NextResponse.json({
      success: result.status === 'completed',
      analysisId,
      result: {
        extracted_fields: result.extracted_fields,
        contextual: result.contextual,
        market: result.market,
        validation: result.validation
      },
      metadata: {
        duration_ms: duration,
        status: result.status,
        current_stage: result.current_stage,
        scores: {
          contextual: result.contextual?.genel_degerlendirme.puan,
          data_quality: result.validation?.data_quality_score
        }
      }
    });

  } catch (error) {
    AILogger.error('Process orchestrator endpoint error', { error });

    // Update status in DB
    try {
      const db = getDB();
      const updateStmt = db.prepare(`
        UPDATE analysis_history
        SET status = 'failed', updated_at = datetime('now')
        WHERE id = ?
      `);
      updateStmt.run(request.nextUrl.searchParams.get('analysisId'));
    } catch (dbError) {
      AILogger.error('Failed to update error status', { dbError });
    }

    return NextResponse.json(
      {
        error: 'Analysis process failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}