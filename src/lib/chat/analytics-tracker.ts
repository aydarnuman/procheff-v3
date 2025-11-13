/**
 * Chat Analytics Tracker
 * Tracks and analyzes chat usage metrics
 */

import { getDB } from '@/lib/db/sqlite-client';
import { AILogger } from '@/lib/ai/logger';

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

export class ChatAnalyticsTracker {
  private static instance: ChatAnalyticsTracker;
  private db = getDB();

  // Singleton
  public static getInstance(): ChatAnalyticsTracker {
    if (!ChatAnalyticsTracker.instance) {
      ChatAnalyticsTracker.instance = new ChatAnalyticsTracker();
      ChatAnalyticsTracker.instance.initDatabase();
    }
    return ChatAnalyticsTracker.instance;
  }

  /**
   * Initialize analytics tables
   */
  private initDatabase() {
    try {
      // Create chat_analytics table if not exists
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS chat_analytics (
          id TEXT PRIMARY KEY,
          conversation_id TEXT NOT NULL,
          user_id TEXT,
          timestamp TEXT NOT NULL,
          message_type TEXT NOT NULL,
          content TEXT NOT NULL,
          response_time INTEGER,
          tokens_used INTEGER,
          command TEXT,
          success INTEGER DEFAULT 1,
          error TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_chat_analytics_conversation
        ON chat_analytics(conversation_id);

        CREATE INDEX IF NOT EXISTS idx_chat_analytics_timestamp
        ON chat_analytics(timestamp);

        CREATE INDEX IF NOT EXISTS idx_chat_analytics_command
        ON chat_analytics(command);
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
      const stmt = this.db.prepare(`
        INSERT INTO chat_analytics (
          id, conversation_id, user_id, timestamp, message_type,
          content, response_time, tokens_used, command, success, error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        metadata.messageId,
        metadata.conversationId,
        metadata.userId || null,
        metadata.timestamp,
        metadata.messageType,
        metadata.content.substring(0, 1000), // Limit content length
        metadata.responseTime || null,
        metadata.tokensUsed || null,
        metadata.command || null,
        metadata.success ? 1 : 0,
        metadata.error || null
      );

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
      let whereClause = '';
      let params: any[] = [];

      if (timeRange) {
        whereClause = 'WHERE timestamp BETWEEN ? AND ?';
        params = [timeRange.start, timeRange.end];
      }

      // Total messages
      const totalMessagesStmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM chat_analytics ${whereClause}
      `);
      const totalMessages = (totalMessagesStmt.get(...params) as { count: number }).count;

      // Total conversations
      const totalConversationsStmt = this.db.prepare(`
        SELECT COUNT(DISTINCT conversation_id) as count
        FROM chat_analytics ${whereClause}
      `);
      const totalConversations = (totalConversationsStmt.get(...params) as { count: number }).count;

      // Average response time
      const avgResponseTimeStmt = this.db.prepare(`
        SELECT AVG(response_time) as avg
        FROM chat_analytics
        WHERE response_time IS NOT NULL ${whereClause ? 'AND ' + whereClause.substring(6) : ''}
      `);
      const avgResponseTime = (avgResponseTimeStmt.get(...params) as { avg: number | null }).avg || 0;

      // Average tokens per message
      const avgTokensStmt = this.db.prepare(`
        SELECT AVG(tokens_used) as avg
        FROM chat_analytics
        WHERE tokens_used IS NOT NULL ${whereClause ? 'AND ' + whereClause.substring(6) : ''}
      `);
      const avgTokensPerMessage = (avgTokensStmt.get(...params) as { avg: number | null }).avg || 0;

      // Command usage
      const commandUsageStmt = this.db.prepare(`
        SELECT command, COUNT(*) as count
        FROM chat_analytics
        WHERE command IS NOT NULL ${whereClause ? 'AND ' + whereClause.substring(6) : ''}
        GROUP BY command
        ORDER BY count DESC
      `);
      const commandUsageRows = commandUsageStmt.all(...params);
      const commandUsage: Record<string, number> = {};
      commandUsageRows.forEach((row: any) => {
        commandUsage[row.command] = row.count;
      });

      // Top keywords (simplified extraction)
      const topKeywords = await this.extractTopKeywords(whereClause, params);

      // Hourly distribution
      const hourlyStmt = this.db.prepare(`
        SELECT
          CAST(strftime('%H', timestamp) AS INTEGER) as hour,
          COUNT(*) as count
        FROM chat_analytics
        ${whereClause}
        GROUP BY hour
        ORDER BY hour
      `);
      const hourlyRows = hourlyStmt.all(...params);
      const hourlyDistribution: Record<number, number> = {};
      hourlyRows.forEach((row: any) => {
        hourlyDistribution[row.hour] = row.count;
      });

      // Success rate
      const successStmt = this.db.prepare(`
        SELECT
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count,
          COUNT(*) as total
        FROM chat_analytics
        WHERE message_type = 'assistant'
        ${whereClause ? 'AND ' + whereClause.substring(6) : ''}
      `);
      const successData = successStmt.get(...params) as { success_count: number; total: number };
      const successRate = successData.total > 0
        ? (successData.success_count / successData.total) * 100
        : 100;

      // Error rate
      const errorRate = 100 - successRate;

      // User satisfaction (mock for now - would need actual feedback data)
      const userSatisfaction = successRate * 0.9; // Simplified calculation

      return {
        totalMessages,
        totalConversations,
        avgResponseTime: Math.round(avgResponseTime),
        avgTokensPerMessage: Math.round(avgTokensPerMessage),
        commandUsage,
        topKeywords,
        hourlyDistribution,
        successRate: Math.round(successRate * 10) / 10,
        errorRate: Math.round(errorRate * 10) / 10,
        userSatisfaction: Math.round(userSatisfaction)
      };
    } catch (error) {
      AILogger.error('Failed to get metrics', { error });
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

  /**
   * Get conversation history
   */
  async getConversationHistory(conversationId: string): Promise<any[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM chat_analytics
        WHERE conversation_id = ?
        ORDER BY timestamp ASC
      `);

      return stmt.all(conversationId);
    } catch (error) {
      AILogger.error('Failed to get conversation history', { error });
      return [];
    }
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(userId: string): Promise<any> {
    try {
      const stats = {
        totalMessages: 0,
        totalConversations: 0,
        favoriteCommands: [] as any[],
        avgSessionLength: 0,
        lastActive: null as string | null
      };

      // Total messages
      const totalStmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM chat_analytics
        WHERE user_id = ? AND message_type = 'user'
      `);
      stats.totalMessages = (totalStmt.get(userId) as { count: number }).count;

      // Total conversations
      const convStmt = this.db.prepare(`
        SELECT COUNT(DISTINCT conversation_id) as count
        FROM chat_analytics
        WHERE user_id = ?
      `);
      stats.totalConversations = (convStmt.get(userId) as { count: number }).count;

      // Favorite commands
      const cmdStmt = this.db.prepare(`
        SELECT command, COUNT(*) as count
        FROM chat_analytics
        WHERE user_id = ? AND command IS NOT NULL
        GROUP BY command
        ORDER BY count DESC
        LIMIT 5
      `);
      stats.favoriteCommands = cmdStmt.all(userId);

      // Last active
      const lastStmt = this.db.prepare(`
        SELECT MAX(timestamp) as last_active
        FROM chat_analytics
        WHERE user_id = ?
      `);
      stats.lastActive = (lastStmt.get(userId) as { last_active: string }).last_active;

      return stats;
    } catch (error) {
      AILogger.error('Failed to get user statistics', { error });
      return null;
    }
  }

  /**
   * Clean up old analytics data
   */
  async cleanup(daysToKeep: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const stmt = this.db.prepare(`
        DELETE FROM chat_analytics
        WHERE timestamp < ?
      `);

      const result = stmt.run(cutoffDate.toISOString());

      AILogger.info('Analytics cleanup completed', {
        deletedRows: result.changes,
        daysKept: daysToKeep
      });
    } catch (error) {
      AILogger.error('Failed to cleanup analytics', { error });
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(format: 'json' | 'csv'): Promise<string> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM chat_analytics
        ORDER BY timestamp DESC
      `);

      const data = stmt.all() as Record<string, any>[];

      if (format === 'json') {
        return JSON.stringify(data, null, 2);
      } else {
        // CSV format
        const headers = Object.keys(data[0] || {}).join(',');
        const rows = data.map((row: Record<string, any>) =>
          Object.values(row).map(v =>
            typeof v === 'string' && v.includes(',') ? `"${v}"` : String(v)
          ).join(',')
        );
        return [headers, ...rows].join('\n');
      }
    } catch (error) {
      AILogger.error('Failed to export analytics', { error });
      return '';
    }
  }

  // =========================================
  // Private Helper Methods
  // =========================================

  /**
   * Extract top keywords from messages
   */
  private async extractTopKeywords(
    whereClause: string,
    params: any[]
  ): Promise<Array<{ keyword: string; count: number }>> {
    try {
      // Get sample of messages for keyword extraction
      const stmt = this.db.prepare(`
        SELECT content FROM chat_analytics
        WHERE message_type = 'user'
        ${whereClause ? 'AND ' + whereClause.substring(6) : ''}
        LIMIT 1000
      `);

      const messages = stmt.all(...params);

      // Count keyword frequencies
      const keywordCounts = new Map<string, number>();
      const domainKeywords = [
        'ihale', 'maliyet', 'bütçe', 'analiz', 'karar', 'risk',
        'teklif', 'katıl', 'fiyat', 'menü', 'yemek', 'personel'
      ];

      messages.forEach((msg: any) => {
        const content = msg.content.toLowerCase();
        domainKeywords.forEach(keyword => {
          if (content.includes(keyword)) {
            keywordCounts.set(
              keyword,
              (keywordCounts.get(keyword) || 0) + 1
            );
          }
        });
      });

      // Sort and return top 10
      const sorted = Array.from(keywordCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([keyword, count]) => ({ keyword, count }));

      return sorted;
    } catch (error) {
      return [];
    }
  }

  /**
   * Calculate session metrics
   */
  async calculateSessionMetrics(conversationId: string): Promise<any> {
    try {
      const stmt = this.db.prepare(`
        SELECT
          MIN(timestamp) as start_time,
          MAX(timestamp) as end_time,
          COUNT(*) as message_count,
          SUM(tokens_used) as total_tokens,
          AVG(response_time) as avg_response_time
        FROM chat_analytics
        WHERE conversation_id = ?
      `);

      const metrics = stmt.get(conversationId) as {
        start_time: string;
        end_time: string | null;
        message_count: number;
        avg_response_time: number | null;
        duration_ms?: number;
        duration_minutes?: number;
      };

      if (metrics.start_time && metrics.end_time) {
        const duration = new Date(metrics.end_time).getTime() -
                        new Date(metrics.start_time).getTime();
        metrics.duration_ms = duration;
        metrics.duration_minutes = Math.round(duration / 60000);
      }

      return metrics;
    } catch (error) {
      AILogger.error('Failed to calculate session metrics', { error });
      return null;
    }
  }
}

// Export singleton instance
export const chatAnalytics = ChatAnalyticsTracker.getInstance();