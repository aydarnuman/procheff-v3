/**
 * Get analysis by ID
 * 
 * 🎯 DİYAGRAMA UYGUN İMPLEMENTASYON:
 * - analysis_history tablosundan metadata al
 * - data_pools tablosundan DataPool al
 * - İkisini merge et
 * - Frontend Zustand'a gönder (single source of truth)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/universal-client';
import { AILogger } from '@/lib/ai/logger';

import { createErrorResponse } from '@/lib/utils/error-codes';
import { DataPoolManager } from '@/lib/state/data-pool-manager';

async function handleGetAnalysis(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      createErrorResponse('INVALID_REQUEST', 'Analysis ID is required'),
      { status: 400 }
    );
  }

  AILogger.info('📊 Fetching analysis from TWO sources (diyagrama uygun)', { analysisId: id });

  const db = await getDatabase();

  // ======================================
  // 1️⃣ KAYNAK 1: analysis_history (metadata, status)
  // ======================================
  const historyStmt = db.prepare(`
    SELECT 
      id, 
      status, 
      input_files, 
      data_pool as legacy_datapool,
      created_at, 
      updated_at, 
      duration_ms
    FROM analysis_history
    WHERE id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `);

  const historyRow = historyStmt.get(id) as any;

  if (!historyRow) {
    AILogger.warn('Analysis not found in history', { analysisId: id });
    return NextResponse.json(
      createErrorResponse('INVALID_REQUEST', 'Analysis not found'),
      { status: 404 }
    );
  }

  // ======================================
  // 2️⃣ KAYNAK 2: data_pools (DataPool object)
  // ======================================
  
  // Try cache first
  let dataPool = await DataPoolManager.get(id);
  
  // If not in cache, try new data_pools table
  if (!dataPool) {
    try {
      const { AnalysisRepository } = await import('@/lib/db/analysis-repository');
      dataPool = AnalysisRepository.getDataPool(id);
      
      if (dataPool) {
        AILogger.info('💾 DataPool loaded from data_pools table', { analysisId: id });
      }
    } catch (error) {
      AILogger.warn('Failed to load from data_pools table', { analysisId: id, error });
    }
  }

  // Fallback: legacy data_pool column in analysis_history
  if (!dataPool && historyRow.legacy_datapool) {
    try {
      dataPool = typeof historyRow.legacy_datapool === 'string' 
        ? JSON.parse(historyRow.legacy_datapool) 
        : historyRow.legacy_datapool;
      
      AILogger.info('📦 DataPool loaded from legacy column', { analysisId: id });
      
      // Migrate to new table
      if (dataPool) {
        const { AnalysisRepository } = await import('@/lib/db/analysis-repository');
        AnalysisRepository.saveDataPool(id, dataPool, 24);
      }
    } catch (parseError) {
      AILogger.error('Failed to parse legacy data pool', { 
        analysisId: id, 
        error: parseError 
      });
    }
  }
  
  if (!dataPool) {
    return NextResponse.json(
      createErrorResponse('PROCESSING_ERROR', 'DataPool not found in any source'),
      { status: 404 }
    );
  }

  // Parse input files
  let inputFiles = [];
  try {
    inputFiles = typeof historyRow.input_files === 'string'
      ? JSON.parse(historyRow.input_files)
      : historyRow.input_files || [];
  } catch (_parseError) {
    AILogger.warn('Failed to parse input files', { analysisId: id });
  }

  // ======================================
  // 3️⃣ FETCH: analysis_results (contextual + market)
  // ======================================
  let contextual_analysis = null;
  let market_analysis = null;
  let deep_analysis = null;

  try {
    const { AnalysisRepository } = await import('@/lib/db/analysis-repository');
    const analysisResult = AnalysisRepository.getByAnalysisId(id);
    
    if (analysisResult) {
      contextual_analysis = analysisResult.contextual;
      market_analysis = analysisResult.market;
      deep_analysis = analysisResult.deep;
      
      AILogger.info('📊 Analysis results loaded', { 
        analysisId: id,
        hasContextual: !!contextual_analysis,
        hasMarket: !!market_analysis,
        hasDeep: !!deep_analysis
      });
    }
  } catch (error) {
    AILogger.warn('Failed to load analysis results', { analysisId: id, error });
  }

  // ======================================
  // 4️⃣ MERGE: analysis_history + data_pools + analysis_results
  // ======================================
  const mergedResponse = {
    // From analysis_history
    id: historyRow.id,
    status: historyRow.status,
    created_at: historyRow.created_at,
    updated_at: historyRow.updated_at,
    duration_ms: historyRow.duration_ms,
    
    // From data_pools
    dataPool,
    
    // From analysis_results
    contextual_analysis,
    market_analysis,
    deep_analysis,
    
    // Additional metadata
    inputFiles,
    
    // Stats for UI
    stats: {
      documents: dataPool?.documents?.length || 0,
      tables: dataPool?.tables?.length || 0,
      textBlocks: dataPool?.textBlocks?.length || 0,
      entities: dataPool?.entities?.length || 0,
      dates: dataPool?.dates?.length || 0,
      amounts: dataPool?.amounts?.length || 0
    }
  };

  AILogger.success('✅ Analysis merged from THREE sources', {
    analysisId: id,
    status: historyRow.status,
    sources: ['analysis_history', 'data_pools', 'analysis_results'],
    hasContextual: !!contextual_analysis,
    hasMarket: !!market_analysis,
    ...mergedResponse.stats
  });

  return NextResponse.json(mergedResponse);
}

export const GET = handleGetAnalysis;
