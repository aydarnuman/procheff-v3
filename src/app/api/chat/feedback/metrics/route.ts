/**
 * Feedback Metrics API
 * Returns detailed feedback analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { feedbackService } from '@/lib/chat/feedback-service';
import { AILogger } from '@/lib/ai/logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get('timeRange') || 'week';

    // Calculate date range
    const now = new Date();
    const start = new Date();

    switch (timeRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start.setDate(start.getDate() - 7);
    }

    const range = {
      start: start.toISOString(),
      end: now.toISOString()
    };

    // Get metrics
    const metrics = await feedbackService.getMetrics(range);

    // Get suggested improvements
    const improvements = await feedbackService.getSuggestedImprovements();

    AILogger.info('Feedback metrics retrieved', {
      timeRange,
      totalFeedbacks: metrics.totalFeedbacks
    });

    return NextResponse.json({
      success: true,
      metrics,
      improvements,
      timeRange
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    AILogger.error('Feedback metrics error', { error: errorMessage });

    return NextResponse.json(
      { error: 'Failed to get feedback metrics', details: errorMessage },
      { status: 500 }
    );
  }
}