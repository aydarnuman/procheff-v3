/**
 * Chat Feedback API
 * Handles feedback submission and retrieval
 */

import { NextRequest, NextResponse } from 'next/server';
import { feedbackService } from '@/lib/chat/feedback-service';
import { AILogger } from '@/lib/ai/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate required fields
    if (!body.messageId || !body.conversationId || !body.rating) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Submit feedback
    const success = await feedbackService.submitFeedback({
      messageId: body.messageId,
      conversationId: body.conversationId,
      rating: body.rating,
      feedback: body.feedback,
      improvements: body.improvements,
      tags: body.tags,
      context: body.context
    });

    if (success) {
      AILogger.info('Feedback submitted successfully', {
        messageId: body.messageId,
        rating: body.rating
      });

      return NextResponse.json({
        success: true,
        message: 'Feedback submitted successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    AILogger.error('Feedback submission error', { error: errorMessage });

    return NextResponse.json(
      { error: 'Failed to submit feedback', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // Get suggested improvements
    if (action === 'improvements') {
      const improvements = await feedbackService.getSuggestedImprovements();

      return NextResponse.json({
        success: true,
        improvements
      });
    }

    // Get feedback metrics
    const timeRange = searchParams.get('timeRange');
    let range = undefined;

    if (timeRange) {
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
        default:
          start.setDate(start.getDate() - 7);
      }

      range = {
        start: start.toISOString(),
        end: now.toISOString()
      };
    }

    const metrics = await feedbackService.getMetrics(range);

    return NextResponse.json({
      success: true,
      metrics
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    AILogger.error('Feedback retrieval error', { error: errorMessage });

    return NextResponse.json(
      { error: 'Failed to get feedback data', details: errorMessage },
      { status: 500 }
    );
  }
}