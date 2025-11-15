/**
 * Contextual Analysis API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractBasicFields, performContextualAnalysis } from '@/lib/tender-analysis/contextual';
import type { DataPool } from '@/lib/document-processor/types';
import { AILogger } from '@/lib/ai/logger';
import { getDatabase } from '@/lib/db/universal-client';
import { errorHandler } from '@/lib/middleware/error-handler';
import { createErrorResponse } from '@/lib/utils/error-codes';

async function handleContextualAnalysis(request: NextRequest) {
  const startTime = Date.now();

  const body = await request.json();
  const { analysisId, dataPool } = body;

  if (!analysisId || !dataPool) {
    return NextResponse.json(
      createErrorResponse('INVALID_REQUEST', 'Missing required fields: analysisId, dataPool'),
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
      const db = await getDatabase();
      await db.execute(`
        INSERT INTO analysis_results (
          id, analysis_id, stage, result_data, created_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET
          analysis_id = EXCLUDED.analysis_id,
          stage = EXCLUDED.stage,
          result_data = EXCLUDED.result_data,
          created_at = EXCLUDED.created_at
      `, [
        `${analysisId}_contextual`,
        analysisId,
        'contextual',
        JSON.stringify({
          extracted_fields: extractedFields,
          analysis: contextualAnalysis
        })
      ]);
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
}

export const POST = errorHandler(handleContextualAnalysis as any);