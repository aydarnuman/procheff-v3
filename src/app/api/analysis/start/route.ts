/**
 * Start AI Analysis
 * Creates a real analysis ID and prepares for contextual/market analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { AILogger } from '@/lib/ai/logger';
import { DataPoolManager } from '@/lib/state/data-pool-manager';
import { createSSEResponse } from '@/lib/utils/sse-stream';
import type { SSEStream } from '@/lib/utils/sse-stream';
import type { DataPool } from '@/lib/document-processor/types';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const body = await request.json();
    const { dataPool, tempAnalysisId } = body;
    
    if (!dataPool) {
      return NextResponse.json(
        { error: 'DataPool is required' },
        { status: 400 }
      );
    }

    AILogger.info('Starting AI analysis', {
      analysisId,
      tempAnalysisId,
      documents: dataPool.documents?.length || 0,
      tables: dataPool.tables?.length || 0
    });

    // Save with real analysis ID
    await DataPoolManager.save(analysisId, dataPool, {
      status: 'ready',
      inputFiles: dataPool.documents?.map(d => ({
        filename: d.filename,
        type: d.type_guess
      }))
    });

    // Delete temporary ID if exists
    if (tempAnalysisId) {
      try {
        await DataPoolManager.delete(tempAnalysisId);
      } catch (e) {
        // Ignore deletion errors
      }
    }

    AILogger.success('Analysis started successfully', {
      analysisId,
      duration: Date.now() - startTime
    });

    return NextResponse.json({
      success: true,
      analysisId,
      dataPool,
      message: 'Analiz başlatıldı'
    });

  } catch (error) {
    AILogger.error('Failed to start analysis', { error });
    
    return NextResponse.json(
      {
        error: 'Failed to start analysis',
        message: error instanceof Error ? error.message : 'Bilinmeyen hata'
      },
      { status: 500 }
    );
  }
}
