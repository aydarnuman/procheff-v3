/**
 * Feedback Collection & Learning Service
 * Handles user feedback on AI responses and improves over time
 */

import { AILogger } from '@/lib/ai/logger';
import { getDatabase } from '@/lib/db/universal-client';
import { mcpIntegration } from './mcp-integration';

export interface FeedbackData {
  messageId: string;
  conversationId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  feedback?: string;
  improvements?: string[];
  tags?: string[];
  context?: {
    query: string;
    response: string;
    domain?: 'tender' | 'cost' | 'menu' | 'general';
    institution?: string;
  };
}

export interface FeedbackMetrics {
  averageRating: number;
  totalFeedbacks: number;
  satisfactionRate: number;
  improvementAreas: Array<{
    area: string;
    count: number;
    avgRating: number;
  }>;
  topIssues: Array<{
    issue: string;
    frequency: number;
  }>;
}

export class FeedbackService {
  constructor() {
    this.initDatabase();
  }

  private async initDatabase() {
    const db = await getDatabase();

    // Create feedback tables
    await db.execute(`
      CREATE TABLE IF NOT EXISTS chat_feedback (
        id SERIAL PRIMARY KEY,
        message_id TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        feedback TEXT,
        improvements TEXT,
        tags TEXT,
        context TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(message_id, conversation_id)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS feedback_patterns (
        id SERIAL PRIMARY KEY,
        pattern TEXT NOT NULL,
        category TEXT NOT NULL,
        frequency INTEGER DEFAULT 1,
        avg_rating REAL,
        suggested_improvement TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS improvement_actions (
        id SERIAL PRIMARY KEY,
        feedback_id INTEGER,
        action_type TEXT NOT NULL,
        action_details TEXT,
        status TEXT DEFAULT 'pending',
        applied_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (feedback_id) REFERENCES chat_feedback(id)
      )
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_feedback_rating 
      ON chat_feedback(rating)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_feedback_conversation 
      ON chat_feedback(conversation_id)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_patterns_category 
      ON feedback_patterns(category)
    `);
  }

  /**
   * Submit feedback for a message
   */
  async submitFeedback(data: FeedbackData): Promise<boolean> {
    try {
      const db = await getDatabase();

      // Store feedback
      await db.execute(`
        INSERT INTO chat_feedback
        (message_id, conversation_id, rating, feedback, improvements, tags, context)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (message_id, conversation_id)
        DO UPDATE SET
          rating = EXCLUDED.rating,
          feedback = EXCLUDED.feedback,
          improvements = EXCLUDED.improvements,
          tags = EXCLUDED.tags,
          context = EXCLUDED.context
      `, [
        data.messageId,
        data.conversationId,
        data.rating,
        data.feedback || null,
        data.improvements ? JSON.stringify(data.improvements) : null,
        data.tags ? JSON.stringify(data.tags) : null,
        data.context ? JSON.stringify(data.context) : null
      ]);

      // Analyze and learn from feedback
      await this.analyzeFeedback(data);

      // Update MCP knowledge graph if rating is high
      if (data.rating >= 4 && data.context) {
        await this.updateKnowledgeFromFeedback(data);
      }

      // Create improvement action if rating is low
      if (data.rating <= 2) {
        await this.createImprovementAction(data);
      }

      AILogger.info('Feedback submitted', {
        messageId: data.messageId,
        rating: data.rating
      });

      return true;
    } catch (error) {
      AILogger.error('Failed to submit feedback', { error });
      return false;
    }
  }

  /**
   * Analyze feedback for patterns
   */
  private async analyzeFeedback(data: FeedbackData): Promise<void> {
    if (!data.feedback) return;

    const db = await getDatabase();

    // Extract patterns from feedback text
    const patterns = this.extractPatterns(data.feedback);

    for (const pattern of patterns) {
      // Check if pattern exists
      const existing = await db.queryOne(
        'SELECT * FROM feedback_patterns WHERE pattern = $1 AND category = $2',
        [pattern.text, pattern.category]
      ) as any;

      if (existing) {
        // Update existing pattern
        const newAvgRating = (existing.avg_rating * existing.frequency + data.rating) / (existing.frequency + 1);

        await db.execute(`
          UPDATE feedback_patterns
          SET frequency = frequency + 1,
              avg_rating = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [newAvgRating, existing.id]);
      } else {
        // Create new pattern
        await db.execute(`
          INSERT INTO feedback_patterns (pattern, category, avg_rating, suggested_improvement)
          VALUES ($1, $2, $3, $4)
        `, [
          pattern.text,
          pattern.category,
          data.rating,
          pattern.suggestion || null
        ]);
      }
    }
  }

  /**
   * Extract patterns from feedback text
   */
  private extractPatterns(feedback: string): Array<{
    text: string;
    category: string;
    suggestion?: string;
  }> {
    const patterns = [];
    const lowerFeedback = feedback.toLowerCase();

    // Speed-related patterns
    if (lowerFeedback.includes('yavaş') || lowerFeedback.includes('hızlı')) {
      patterns.push({
        text: 'speed_issue',
        category: 'performance',
        suggestion: 'Optimize response time'
      });
    }

    // Accuracy-related patterns
    if (lowerFeedback.includes('yanlış') || lowerFeedback.includes('hatalı')) {
      patterns.push({
        text: 'accuracy_issue',
        category: 'quality',
        suggestion: 'Improve data validation and calculations'
      });
    }

    // Detail-related patterns
    if (lowerFeedback.includes('detay') || lowerFeedback.includes('ayrıntı')) {
      patterns.push({
        text: 'detail_request',
        category: 'content',
        suggestion: 'Provide more detailed information'
      });
    }

    // Cost-related patterns
    if (lowerFeedback.includes('maliyet') || lowerFeedback.includes('fiyat')) {
      patterns.push({
        text: 'cost_concern',
        category: 'domain',
        suggestion: 'Enhance cost calculation accuracy'
      });
    }

    // Tender-related patterns
    if (lowerFeedback.includes('ihale') || lowerFeedback.includes('teklif')) {
      patterns.push({
        text: 'tender_feedback',
        category: 'domain',
        suggestion: 'Improve tender analysis logic'
      });
    }

    return patterns;
  }

  /**
   * Update knowledge graph with positive feedback
   */
  private async updateKnowledgeFromFeedback(data: FeedbackData): Promise<void> {
    if (!data.context || data.rating < 4) return;

    try {
      // Create entity for successful interaction
      await mcpIntegration.createEntities([{
        name: `successful_${data.context.domain}_interaction`,
        entityType: 'learning',
        observations: [
          `Query: ${data.context.query}`,
          `Response rated ${data.rating}/5`,
          data.feedback || 'No additional feedback',
          `Institution: ${data.context.institution || 'general'}`
        ]
      }]);

      // Create relationships if domain-specific
      if (data.context.domain && data.context.institution) {
        await mcpIntegration.createRelations([{
          from: `successful_${data.context.domain}_interaction`,
          to: data.context.institution,
          relationType: 'improved_understanding'
        }]);
      }
    } catch (error) {
      AILogger.error('Failed to update knowledge from feedback', { error });
    }
  }

  /**
   * Create improvement action for low-rated feedback
   */
  private async createImprovementAction(data: FeedbackData): Promise<void> {
    const db = await getDatabase();

    // Get feedback ID
    const feedback = await db.queryOne(
      'SELECT id FROM chat_feedback WHERE message_id = $1 AND conversation_id = $2',
      [data.messageId, data.conversationId]
    ) as any;

    if (!feedback) return;

    // Determine action type based on feedback
    const actionType = 'review_required';
    const actionDetails = {
      priority: data.rating === 1 ? 'high' : 'medium',
      category: data.context?.domain || 'general',
      issue: data.feedback || 'Low rating without specific feedback',
      suggestions: data.improvements || []
    };

    await db.execute(`
      INSERT INTO improvement_actions (feedback_id, action_type, action_details)
      VALUES ($1, $2, $3)
    `, [feedback.id, actionType, JSON.stringify(actionDetails)]);
  }

  /**
   * Get feedback metrics
   */
  async getMetrics(timeRange?: { start: string; end: string }): Promise<FeedbackMetrics> {
    const db = await getDatabase();

    let query = 'SELECT * FROM chat_feedback WHERE 1=1';
    const params: any[] = [];

    if (timeRange) {
      query += ' AND created_at BETWEEN $1 AND $2';
      params.push(timeRange.start, timeRange.end);
    }

    const feedbacks = await db.query(query, params) as any[];

    // Calculate metrics
    const totalFeedbacks = feedbacks.length;
    const averageRating = totalFeedbacks > 0
      ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalFeedbacks
      : 0;
    const satisfactionRate = totalFeedbacks > 0
      ? (feedbacks.filter(f => f.rating >= 4).length / totalFeedbacks) * 100
      : 0;

    // Get improvement areas
    const improvementAreas = await db.query(`
      SELECT category as area, COUNT(*) as count, AVG(avg_rating) as avgRating
      FROM feedback_patterns
      GROUP BY category
      ORDER BY count DESC
      LIMIT 5
    `, []) as any[];

    // Get top issues
    const topIssues = await db.query(`
      SELECT pattern as issue, frequency
      FROM feedback_patterns
      WHERE avg_rating < 3
      ORDER BY frequency DESC
      LIMIT 5
    `, []) as any[];

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalFeedbacks,
      satisfactionRate: Math.round(satisfactionRate),
      improvementAreas: improvementAreas.map(a => ({
        area: a.area,
        count: a.count,
        avgRating: Math.round(a.avgrating * 10) / 10
      })),
      topIssues: topIssues.map(i => ({
        issue: i.issue,
        frequency: i.frequency
      }))
    };
  }

  /**
   * Get suggested improvements based on feedback patterns
   */
  async getSuggestedImprovements(): Promise<string[]> {
    const db = await getDatabase();

    const patterns = await db.query(`
      SELECT DISTINCT suggested_improvement
      FROM feedback_patterns
      WHERE avg_rating < 3.5 AND suggested_improvement IS NOT NULL
      ORDER BY frequency DESC
      LIMIT 10
    `, []) as any[];

    return patterns.map(p => p.suggested_improvement);
  }

  /**
   * Apply improvement action
   */
  async applyImprovement(actionId: number): Promise<boolean> {
    try {
      const db = await getDatabase();

      await db.execute(`
        UPDATE improvement_actions
        SET status = $1, applied_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, ['applied', actionId]);

      AILogger.info('Improvement action applied', { actionId });
      return true;
    } catch (error) {
      AILogger.error('Failed to apply improvement', { error, actionId });
      return false;
    }
  }
}

export const feedbackService = new FeedbackService();
