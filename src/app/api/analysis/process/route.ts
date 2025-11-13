/**
 * Process Orchestrator API Endpoint
 * Runs the complete analysis pipeline
 *
 * TWO MODES:
 * 1. background=true (default) - Returns immediately with 'pending' status, processes in background
 * 2. background=false - Synchronous, waits for completion (legacy mode)
 */

import { NextRequest, NextResponse } from 'next/server';
import { startTenderAnalysis } from '@/lib/tender-analysis/engine';
import type { DataPool } from '@/lib/document-processor/types';
import { AILogger } from '@/lib/ai/logger';
import { getDB } from '@/lib/db/sqlite-client';
import { errorHandler } from '@/lib/middleware/error-handler';
import { createErrorResponse } from '@/lib/utils/error-codes';
import { DataPoolManager } from '@/lib/state/data-pool-manager';

async function handleProcess(request: NextRequest) {
  const startTime = Date.now();

  const body = await request.json();
  const { analysisId, dataPool, options, background = true } = body;

  if (!analysisId || !dataPool) {
    return NextResponse.json(
      createErrorResponse('INVALID_REQUEST', 'Missing required fields: analysisId, dataPool'),
      { status: 400 }
    );
  }

  AILogger.info('Starting complete analysis process', {
    analysisId,
    documents: dataPool.documents?.length || 0,
    options,
    background
  });

  // Save DataPool using DataPoolManager (atomic operation - includes metadata)
  await DataPoolManager.save(analysisId, dataPool as DataPool, {
    status: background ? 'pending' : 'processing',
    inputFiles: dataPool.documents?.map((d: any) => ({
      name: d.name || d.filename || 'unknown',
      size: d.size || 0
    })) || []
  });

  // BACKGROUND MODE: Return immediately, process in background
  if (background) {
    // Fire and forget - don't await
    processAnalysisInBackground(analysisId, dataPool, options, startTime).catch(err => {
      AILogger.error('Background analysis failed', { analysisId, error: err });
    });

    return NextResponse.json({
      success: true,
      analysisId,
      status: 'pending',
      message: 'Analysis started in background. Check status at /api/analysis/' + analysisId
    });
  }

  // SYNCHRONOUS MODE (legacy): Wait for completion
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
}

/**
 * Process analysis in background (non-blocking)
 */
async function processAnalysisInBackground(
  analysisId: string,
  dataPool: DataPool,
  options: any,
  startTime: number
) {
  try {
    // Update status to processing
    await DataPoolManager.save(analysisId, dataPool, { status: 'processing' });

    AILogger.info('Background analysis started', { analysisId });

    // Run the complete analysis
    const result = await startTenderAnalysis(
      analysisId,
      dataPool,
      options || {}
    );

    const duration = Date.now() - startTime;

    // Update status to completed
    await DataPoolManager.save(analysisId, dataPool, {
      status: result.status,
      duration_ms: duration
    });

    AILogger.success('Background analysis completed', {
      analysisId,
      duration,
      status: result.status,
      contextualScore: result.contextual?.genel_degerlendirme.puan,
      marketRisk: result.market?.comparison.risk_level
    });

  } catch (error) {
    // Update status to failed
    await DataPoolManager.save(analysisId, dataPool, {
      status: 'failed'
    });

    AILogger.error('Background analysis failed', {
      analysisId,
      error
    });

    throw error;
  }
}

export const POST = errorHandler(handleProcess as any);