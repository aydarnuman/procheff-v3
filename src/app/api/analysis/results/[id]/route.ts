/**
 * Fetch analysis results from database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db/sqlite-client';
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

    const db = getDB();

    // Fetch specific analysis result
    const stmt = db.prepare(`
      SELECT result_data, created_at
      FROM analysis_results
      WHERE analysis_id = ? AND stage = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const row = stmt.get(id, stage) as any;

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

export const GET = errorHandler(handleGetResults);