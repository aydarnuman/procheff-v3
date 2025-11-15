/**
 * Fetch analysis results from database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/universal-client';
import { errorHandler } from '@/lib/middleware/error-handler';
import { createErrorResponse } from '@/lib/utils/error-codes';

async function handleGetResults(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const stage = searchParams.get('stage');

  if (!stage) {
    return NextResponse.json(
      createErrorResponse('INVALID_REQUEST', 'Stage parameter is required'),
      { status: 400 }
    );
  }

    const db = await getDatabase();

    // Fetch specific analysis result
    const row = await db.queryOne(`
      SELECT result_data, created_at
      FROM analysis_results
      WHERE analysis_id = $1 AND stage = $2
      ORDER BY created_at DESC
      LIMIT 1
    `, [id, stage]) as any;

    if (!row) {
      return NextResponse.json({ analysis: null });
    }

    const resultData = JSON.parse(row.result_data);

    // Return analysis based on stage
    if (stage === 'contextual') {
      return NextResponse.json({
        analysis: resultData,
        created_at: row.created_at
      });
    } else if (stage === 'market') {
      return NextResponse.json({
        analysis: resultData.analysis || resultData,
        menuItems: resultData.menu_items,
        created_at: row.created_at
      });
    } else {
      return NextResponse.json({
        analysis: resultData,
        created_at: row.created_at
      });
    }
}

export const GET = errorHandler(handleGetResults as any);