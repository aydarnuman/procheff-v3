/**
 * Contextual Analysis API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractBasicFields, performContextualAnalysis } from '@/lib/tender-analysis/contextual';
import type { DataPool } from '@/lib/document-processor/types';
import { AILogger } from '@/lib/ai/logger';
import { getDB } from '@/lib/db/sqlite-client';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { analysisId, dataPool } = body;

    if (!analysisId || !dataPool) {
      return NextResponse.json(
        { error: 'Missing required fields: analysisId, dataPool' },
        { status: 400 }
      );
    }

    AILogger.info('Starting contextual analysis', {
      analysisId,
      documents: dataPool.documents?.length || 0
    });

    // Extract basic fields
    const extractedFields = await extractBasicFields(dataPool as DataPool);

    // Perform contextual analysis
    const contextualAnalysis = await performContextualAnalysis(
      dataPool as DataPool,
      extractedFields
    );

    // Save to database
    try {
      const db = getDB();
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO analysis_results (
          id, analysis_id, stage, result_data, created_at
        ) VALUES (?, ?, ?, ?, datetime('now'))
      `);

      stmt.run(
        `${analysisId}_contextual`,
        analysisId,
        'contextual',
        JSON.stringify({
          extracted_fields: extractedFields,
          analysis: contextualAnalysis
        })
      );
    } catch (dbError) {
      AILogger.error('Failed to save contextual analysis to DB', { dbError });
    }

    const duration = Date.now() - startTime;

    AILogger.success('Contextual analysis completed', {
      analysisId,
      duration,
      riskLevel: contextualAnalysis.operasyonel_riskler.seviye,
      score: contextualAnalysis.genel_degerlendirme.puan
    });

    return NextResponse.json({
      success: true,
      analysisId,
      extractedFields,
      contextualAnalysis,
      metadata: {
        duration_ms: duration,
        risk_level: contextualAnalysis.operasyonel_riskler.seviye,
        overall_score: contextualAnalysis.genel_degerlendirme.puan
      }
    });

  } catch (error) {
    AILogger.error('Contextual analysis endpoint error', { error });

    return NextResponse.json(
      {
        error: 'Contextual analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}