/**
 * Chat Analytics Tracker
 * Tracks and analyzes chat usage metrics with PostgreSQL/SQLite compatibility
 */

import { AILogger } from '@/lib/ai/logger-universal';
import type { UniversalDB } from '@/lib/db/db-adapter';
import { getDBAdapter } from '@/lib/db/db-adapter';
import type { DatabaseRow } from '@/types/database';

export interface ChatMetrics {
  totalMessages: number;
  totalConversations: number;
  avgResponseTime: number;
  avgTokensPerMessage: number;
  commandUsage: Record<string, number>;
  topKeywords: Array<{ keyword: string; count: number }>;
  hourlyDistribution: Record<number, number>;
  successRate: number;
  errorRate: number;
  userSatisfaction: number;
}

export interface MessageMetadata {
  messageId: string;
  conversationId: string;
  userId?: string;
  timestamp: string;
  messageType: 'user' | 'assistant';
  content: string;
  responseTime?: number;
  tokensUsed?: number;
  command?: string;
  success?: boolean;
  error?: string;
}

// Using DatabaseRow from @/types/database for consistency

export interface ConversationAnalysis {
  messageCount: number;
  avgResponseTime: number;
  totalTokens: number;
  commands: string[];
  errors: string[];
}

export interface AnalyticsSummary {
  totalMessages: number;
  totalConversations: number;
  recentActivity: number;
  lastUpdated: string;
}

export class ChatAnalyticsTracker {
  private static instance: ChatAnalyticsTracker;
  private dbAdapter: UniversalDB | null = null;

  // Get database adapter
  private async getDB(): Promise<UniversalDB> {
    if (!this.dbAdapter) {
      this.dbAdapter = await getDBAdapter();
    }
    return this.dbAdapter;
  }

  // Singleton
  public static getInstance(): ChatAnalyticsTracker {
    if (!ChatAnalyticsTracker.instance) {
      ChatAnalyticsTracker.instance = new ChatAnalyticsTracker();
      // Initialize database asynchronously
      ChatAnalyticsTracker.instance.initDatabase().catch((error) => {
        AILogger.error('Failed to initialize analytics database', { error });
      });
    }
    return ChatAnalyticsTracker.instance;
  }

  /**
   * Initialize analytics tables
   */
  private async initDatabase(): Promise<void> {
    try {
      const db = await this.getDB();
      
      // Create chat_analytics table if not exists
      await db.execute(`
        CREATE TABLE IF NOT EXISTS chat_analytics (
          id TEXT PRIMARY KEY,
          conversation_id TEXT NOT NULL,
          user_id TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          message_type TEXT NOT NULL,
          content TEXT NOT NULL,
          response_time INTEGER,
          tokens_used INTEGER,
          command TEXT,
          success INTEGER DEFAULT 1,
          error TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_chat_analytics_conversation
        ON chat_analytics(conversation_id)
      `);
      
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_chat_analytics_timestamp
        ON chat_analytics(timestamp)
      `);
      
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_chat_analytics_command
        ON chat_analytics(command)
      `);

      AILogger.info('Chat analytics database initialized');
    } catch (error) {
      AILogger.error('Failed to initialize chat analytics database', { error });
    }
  }

  /**
   * Track a message
   */
  async trackMessage(metadata: MessageMetadata): Promise<void> {
    try {
      const db = await this.getDB();
      
      await db.execute(`
        INSERT INTO chat_analytics (
          id, conversation_id, user_id, timestamp, message_type,
          content, response_time, tokens_used, command, success, error
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        metadata.messageId,
        metadata.conversationId,
        metadata.userId || null,
        metadata.timestamp,
        metadata.messageType,
        metadata.content.substring(0, 1000), // Limit content length
        metadata.responseTime || null,
        metadata.tokensUsed || null,
        metadata.command || null,
        metadata.success !== false ? 1 : 0,
        metadata.error || null
      ]);

      AILogger.info('Message tracked', {
        messageId: metadata.messageId,
        conversationId: metadata.conversationId,
        type: metadata.messageType
      });
    } catch (error) {
      AILogger.error('Failed to track message', { error });
    }
  }

  /**
   * Get comprehensive metrics
   */
  async getMetrics(timeRange?: { start: string; end: string }): Promise<ChatMetrics> {
    try {
      const db = await this.getDB();
      let whereClause = '';
      const params: (string | number)[] = [];

      if (timeRange) {
        whereClause = 'WHERE timestamp BETWEEN $1 AND $2';
        params.push(timeRange.start, timeRange.end);
      }

      // Total messages
      const totalMessagesResult = await db.query(`
        SELECT COUNT(*) as count FROM chat_analytics ${whereClause}
      `, params);
      const totalMessages = (totalMessagesResult[0] as DatabaseRow)?.count || 0;

      // Total conversations
      const totalConversationsResult = await db.query(`
        SELECT COUNT(DISTINCT conversation_id) as count
        FROM chat_analytics ${whereClause}
      `, params);
      const totalConversations = (totalConversationsResult[0] as DatabaseRow)?.count || 0;

      // Average response time
      const whereCondition = whereClause ? `AND ${whereClause.substring(6)}` : '';
      const avgResponseTimeResult = await db.query(`
        SELECT AVG(response_time) as avg
        FROM chat_analytics
        WHERE response_time IS NOT NULL ${whereCondition}
      `, params);
      const avgResponseTime = (avgResponseTimeResult[0] as DatabaseRow)?.avg || 0;

      // Average tokens per message
      const avgTokensResult = await db.query(`
        SELECT AVG(tokens_used) as avg
        FROM chat_analytics
        WHERE tokens_used IS NOT NULL ${whereCondition}
      `, params);
      const avgTokensPerMessage = (avgTokensResult[0] as DatabaseRow)?.avg || 0;

      // Command usage
      const commandUsageResult = await db.query(`
        SELECT command, COUNT(*) as count
        FROM chat_analytics
        WHERE command IS NOT NULL ${whereCondition}
        GROUP BY command
        ORDER BY count DESC
      `, params);
      
      const commandUsage: Record<string, number> = {};
      commandUsageResult.forEach((row) => {
        const qRow = row as DatabaseRow;
        if (qRow.command && typeof qRow.command === 'string') {
          commandUsage[qRow.command] = Number(qRow.count) || 0;
        }
      });

      // Hourly distribution
      const hourlyResult = await db.query(`
        SELECT EXTRACT(HOUR FROM timestamp) as hour, COUNT(*) as count
        FROM chat_analytics ${whereClause}
        GROUP BY EXTRACT(HOUR FROM timestamp)
        ORDER BY hour
      `, params);

      const hourlyDistribution: Record<number, number> = {};
      // Initialize all hours
      for (let i = 0; i < 24; i++) {
        hourlyDistribution[i] = 0;
      }
      hourlyResult.forEach((row) => {
        const qRow = row as DatabaseRow;
        const hour = Number(qRow.hour) || 0;
        hourlyDistribution[hour] = Number(qRow.count) || 0;
      });

      // Success rate
      const successResult = await db.query(`
        SELECT 
          COUNT(CASE WHEN success = 1 THEN 1 END) as success_count,
          COUNT(*) as total_count
        FROM chat_analytics ${whereClause}
      `, params);
      
      const successData = successResult[0] as DatabaseRow;
      const totalCount = Number(successData?.total_count || 0);
      const successCount = Number(successData?.success_count || 0);
      const successRate = totalCount > 0 
        ? (successCount / totalCount) * 100 
        : 0;
      const errorRate = 100 - successRate;

      // Top keywords (simplified)
      const topKeywords = await this.extractTopKeywords(whereClause, params);

      return {
        totalMessages: Number(totalMessages),
        totalConversations: Number(totalConversations),
        avgResponseTime: Number(avgResponseTime),
        avgTokensPerMessage: Number(avgTokensPerMessage),
        commandUsage,
        topKeywords,
        hourlyDistribution,
        successRate,
        errorRate,
        userSatisfaction: Math.min(successRate, 95) // Simplified calculation
      };
    } catch (error) {
      AILogger.error('Failed to get metrics', { error });
      return this.getEmptyMetrics();
    }
  }

  /**
   * Extract top keywords from content
   */
  private async extractTopKeywords(
    whereClause: string, 
    params: (string | number)[]
  ): Promise<Array<{ keyword: string; count: number }>> {
    try {
      const db = await this.getDB();
      
      // Simple keyword extraction - get most common words
      const result = await db.query(`
        SELECT content FROM chat_analytics ${whereClause}
        LIMIT 1000
      `, params);

      const wordCount: Record<string, number> = {};
      const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'are', 'was', 'were']);

      result.forEach((row) => {
        const qRow = row as DatabaseRow;
        if (qRow.content && typeof qRow.content === 'string') {
          const words = qRow.content.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter((word: string) => word.length > 3 && !stopWords.has(word));

          words.forEach((word: string) => {
            wordCount[word] = (wordCount[word] || 0) + 1;
          });
        }
      });

      return Object.entries(wordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([keyword, count]) => ({ keyword, count }));
    } catch (error) {
      AILogger.error('Failed to extract keywords', { error });
      return [];
    }
  }

  /**
   * Get conversation analysis
   */
  async getConversationAnalysis(conversationId: string): Promise<ConversationAnalysis | null> {
    try {
      const db = await this.getDB();
      
      const messages = await db.query(`
        SELECT * FROM chat_analytics
        WHERE conversation_id = $1
        ORDER BY timestamp ASC
      `, [conversationId]);

      const analysis = {
        messageCount: messages.length,
        avgResponseTime: 0,
        totalTokens: 0,
        commands: [] as string[],
        errors: [] as string[]
      };

      let totalResponseTime = 0;
      let responseTimeCount = 0;

      messages.forEach((msg) => {
        const qMsg = msg as DatabaseRow;
        if (qMsg.tokens_used) {
          analysis.totalTokens += Number(qMsg.tokens_used);
        }
        if (qMsg.response_time) {
          totalResponseTime += Number(qMsg.response_time);
          responseTimeCount++;
        }
        if (qMsg.command && typeof qMsg.command === 'string') {
          analysis.commands.push(qMsg.command);
        }
        if (qMsg.error && typeof qMsg.error === 'string') {
          analysis.errors.push(qMsg.error);
        }
      });

      analysis.avgResponseTime = responseTimeCount > 0 
        ? totalResponseTime / responseTimeCount 
        : 0;

      return analysis;
    } catch (error) {
      AILogger.error('Failed to get conversation analysis', { error });
      return null;
    }
  }

  /**
   * Get analytics summary
   */
  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    try {
      const db = await this.getDB();

      // Get basic counts
      const totalResult = await db.query(`
        SELECT COUNT(*) as total FROM chat_analytics
      `);
      const total = (totalResult[0] as DatabaseRow)?.total || 0;

      const conversationsResult = await db.query(`
        SELECT COUNT(DISTINCT conversation_id) as count FROM chat_analytics
      `);
      const totalConversations = (conversationsResult[0] as DatabaseRow)?.count || 0;

      // Recent activity (last 24 hours)
      const recentResult = await db.query(`
        SELECT COUNT(*) as count FROM chat_analytics 
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
      `);
      const recentActivity = (recentResult[0] as DatabaseRow)?.count || 0;

      return {
        totalMessages: Number(total),
        totalConversations: Number(totalConversations),
        recentActivity: Number(recentActivity),
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      AILogger.error('Failed to get analytics summary', { error });
      return {
        totalMessages: 0,
        totalConversations: 0,
        recentActivity: 0,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Cleanup old analytics data (alias for clearOldData)
   */
  async cleanup(daysToKeep: number = 30): Promise<void> {
    return this.clearOldData(daysToKeep);
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const db = await this.getDB();
      
      const data = await db.query(`
        SELECT * FROM chat_analytics 
        ORDER BY timestamp DESC 
        LIMIT 10000
      `);

      if (format === 'csv') {
        const headers = Object.keys(data[0] || {});
        const csvRows = [
          headers.join(','),
          ...data.map((row) => {
            const qRow = row as DatabaseRow;
            return headers.map(header => 
              JSON.stringify(qRow[header] || '')
            ).join(',');
          })
        ];
        return csvRows.join('\n');
      }

      return JSON.stringify(data, null, 2);
    } catch (error) {
      AILogger.error('Failed to export analytics', { error });
      return format === 'json' ? '[]' : '';
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(conversationId: string): Promise<DatabaseRow[]> {
    try {
      const db = await this.getDB();
      
      const history = await db.query(`
        SELECT * FROM chat_analytics
        WHERE conversation_id = $1
        ORDER BY timestamp ASC
      `, [conversationId]);

      return history as DatabaseRow[];
    } catch (error) {
      AILogger.error('Failed to get conversation history', { error });
      return [];
    }
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(userId: string): Promise<DatabaseRow> {
    try {
      const db = await this.getDB();
      
      const stats = await db.query(`
        SELECT
          COUNT(*) as total_messages,
          COUNT(DISTINCT conversation_id) as total_conversations,
          AVG(response_time) as avg_response_time,
          SUM(tokens_used) as total_tokens,
          COUNT(CASE WHEN success = 1 THEN 1 END) as successful_messages,
          COUNT(CASE WHEN success = 0 THEN 1 END) as failed_messages
        FROM chat_analytics
        WHERE user_id = $1
      `, [userId]);

      return (stats[0] as DatabaseRow) || {};
    } catch (error) {
      AILogger.error('Failed to get user statistics', { error });
      return {};
    }
  }

  /**
   * Clear old data
   */
  async clearOldData(daysOld: number = 30): Promise<void> {
    try {
      const db = await this.getDB();
      
      await db.execute(`
        DELETE FROM chat_analytics
        WHERE timestamp < NOW() - INTERVAL '$1 days'
      `, [daysOld]);

      AILogger.info('Old analytics data cleared', { daysOld });
    } catch (error) {
      AILogger.error('Failed to clear old data', { error });
    }
  }

  /**
   * Get empty metrics as fallback
   */
  private getEmptyMetrics(): ChatMetrics {
    return {
      totalMessages: 0,
      totalConversations: 0,
      avgResponseTime: 0,
      avgTokensPerMessage: 0,
      commandUsage: {},
      topKeywords: [],
      hourlyDistribution: {},
      successRate: 0,
      errorRate: 0,
      userSatisfaction: 0
    };
  }
}

// Export singleton instance
export const chatAnalyticsTracker = ChatAnalyticsTracker.getInstance();

// Export for backward compatibility
export const chatAnalytics = chatAnalyticsTracker;