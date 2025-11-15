/**
 * Market Analysis API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractBasicFields } from '@/lib/tender-analysis/contextual';
import { performMarketAnalysis, extractMenuItems } from '@/lib/tender-analysis/market-intel';
import type { DataPool } from '@/lib/document-processor/types';
import { AILogger } from '@/lib/ai/logger';
import { getDatabase } from '@/lib/db/universal-client';
import { errorHandler } from '@/lib/middleware/error-handler';
import { createErrorResponse } from '@/lib/utils/error-codes';

async function handleMarketAnalysis(request: NextRequest) {
  const startTime = Date.now();

  const body = await request.json();
  const { analysisId, dataPool, menuItems } = body;

  if (!analysisId || !dataPool) {
    return NextResponse.json(
      createErrorResponse('INVALID_REQUEST', 'Missing required fields: analysisId, dataPool'),
      { status: 400 }
    );
  }

    AILogger.info('Starting market analysis', {
      analysisId,
      providedMenuItems: menuItems?.length || 0
    });

    // Extract basic fields
    const extractedFields = await extractBasicFields(dataPool as DataPool);

    // Extract menu items if not provided
    const items = menuItems || extractMenuItems(dataPool as DataPool);

    AILogger.info('Menu items extracted', {
      analysisId,
      itemCount: items.length
    });

    // Perform market analysis
    const marketAnalysis = await performMarketAnalysis(
      dataPool as DataPool,
      extractedFields,
      items
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
        `${analysisId}_market`,
        analysisId,
        'market',
        JSON.stringify({
          menu_items: items,
          analysis: marketAnalysis
        })
      ]);

      // Cache price data for future use
      for (const item of marketAnalysis.cost_items) {
        await db.execute(`
          INSERT INTO market_prices (
            product_key, prices, last_updated, confidence
          ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
          ON CONFLICT (product_key) DO UPDATE SET
            prices = EXCLUDED.prices,
            last_updated = EXCLUDED.last_updated,
            confidence = EXCLUDED.confidence
        `, [
          item.product_key,
          JSON.stringify(item.prices),
          item.confidence
        ]);
      }

    } catch (dbError) {
      AILogger.error('Failed to save market analysis to DB', { dbError });
    }

    const duration = Date.now() - startTime;

    AILogger.success('Market analysis completed', {
      analysisId,
      duration,
      totalCost: marketAnalysis.total_cost,
      riskLevel: marketAnalysis.comparison.risk_level
    });

    return NextResponse.json({
      success: true,
      analysisId,
      menuItems: items,
      marketAnalysis,
      metadata: {
        duration_ms: duration,
        total_cost: marketAnalysis.total_cost,
        risk_level: marketAnalysis.comparison.risk_level,
        item_count: marketAnalysis.cost_items.length
      }
    });
}

export const POST = errorHandler(handleMarketAnalysis as any);