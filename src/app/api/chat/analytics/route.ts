/**
 * Chat Analytics API
 * Returns chat usage metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { chatAnalytics } from '@/lib/chat/analytics-tracker';
import { AILogger } from '@/lib/ai/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { timeRange, action } = body;

    // Get metrics for specified time range
    if (timeRange) {
      const metrics = await chatAnalytics.getMetrics(timeRange);

      AILogger.info('Chat metrics retrieved', {
        timeRange,
        messageCount: metrics.totalMessages
      });

      return NextResponse.json({
        success: true,
        metrics
      });
    }

    // Handle specific actions
    if (action) {
      switch (action) {
        case 'cleanup':
          await chatAnalytics.cleanup(body.daysToKeep || 90);
          return NextResponse.json({
            success: true,
            message: 'Analytics cleanup completed'
          });

        case 'export':
          const format = body.format || 'json';
          const data = await chatAnalytics.exportAnalytics(format);

          return new Response(data, {
            headers: {
              'Content-Type': format === 'json' ? 'application/json' : 'text/csv',
              'Content-Disposition': `attachment; filename="chat_analytics_${Date.now()}.${format}"`
            }
          });

        default:
          return NextResponse.json(
            { error: 'Unknown action' },
            { status: 400 }
          );
      }
    }

    // Default: return metrics for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    const metrics = await chatAnalytics.getMetrics({
      start: today.toISOString(),
      end: now.toISOString()
    });

    return NextResponse.json({
      success: true,
      metrics
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    AILogger.error('Chat analytics error', { error: errorMessage });

    return NextResponse.json(
      { error: 'Failed to get analytics', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');
    const userId = searchParams.get('userId');

    // Get conversation history
    if (conversationId) {
      const history = await chatAnalytics.getConversationHistory(conversationId);

      return NextResponse.json({
        success: true,
        history
      });
    }

    // Get user statistics
    if (userId) {
      const stats = await chatAnalytics.getUserStatistics(userId);

      return NextResponse.json({
        success: true,
        stats
      });
    }

    // Default: return summary metrics
    const metrics = await chatAnalytics.getMetrics();

    return NextResponse.json({
      success: true,
      metrics
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    AILogger.error('Chat analytics GET error', { error: errorMessage });

    return NextResponse.json(
      { error: 'Failed to get analytics', details: errorMessage },
      { status: 500 }
    );
  }
}