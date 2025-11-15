/**
 * API Statistics Service
 * Tracks API usage, generates statistics, and manages rate limiting
 */

import { getDatabase } from "@/lib/db/universal-client";

export interface ApiUsageLog {
  id?: number;
  endpoint: string;
  method: string;
  status_code?: number;
  response_time_ms?: number;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  request_body_size?: number;
  response_body_size?: number;
  error_message?: string;
  created_at?: string;
}

export interface ApiStats {
  endpoint: string;
  method: string;
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  errorRate: number;
  lastHour: number;
  last24Hours: number;
  last7Days: number;
  last30Days: number;
}

export interface ApiEndpoint {
  path: string;
  method: string;
  description: string;
  category: string;
  rateLimit: number; // requests per hour
  authentication: boolean;
  status: "active" | "maintenance" | "deprecated";
}

export class ApiStatsService {
  private static instance: ApiStatsService;

  // Define available API endpoints
  private readonly endpoints: ApiEndpoint[] = [
    // Parser endpoints
    {
      path: "/api/parser/menu",
      method: "POST",
      description: "Parse menu files (CSV, TXT, PDF)",
      category: "Parser",
      rateLimit: 100,
      authentication: true,
      status: "active",
    },
    // AI endpoints
    {
      path: "/api/ai/cost-analysis",
      method: "POST",
      description: "Analyze costs for tender",
      category: "AI Analysis",
      rateLimit: 50,
      authentication: true,
      status: "active",
    },
    {
      path: "/api/ai/decision",
      method: "POST",
      description: "Generate strategic decision",
      category: "AI Analysis",
      rateLimit: 50,
      authentication: true,
      status: "active",
    },
    // İhale endpoints
    {
      path: "/api/ihale/upload",
      method: "POST",
      description: "Upload and OCR tender documents",
      category: "Tender",
      rateLimit: 30,
      authentication: true,
      status: "active",
    },
    {
      path: "/api/ihale/list",
      method: "GET",
      description: "List tenders from İhalebul",
      category: "Tender",
      rateLimit: 100,
      authentication: true,
      status: "active",
    },
    {
      path: "/api/ihale/detail/:id",
      method: "GET",
      description: "Get tender details",
      category: "Tender",
      rateLimit: 200,
      authentication: true,
      status: "active",
    },
    // Export endpoints
    {
      path: "/api/export/pdf",
      method: "POST",
      description: "Export analysis as PDF",
      category: "Export",
      rateLimit: 50,
      authentication: true,
      status: "active",
    },
    {
      path: "/api/export/xlsx",
      method: "POST",
      description: "Export analysis as Excel",
      category: "Export",
      rateLimit: 50,
      authentication: true,
      status: "active",
    },
    // Settings endpoints
    {
      path: "/api/settings",
      method: "GET",
      description: "Get user settings",
      category: "Settings",
      rateLimit: 500,
      authentication: true,
      status: "active",
    },
    {
      path: "/api/settings",
      method: "POST",
      description: "Update user settings",
      category: "Settings",
      rateLimit: 100,
      authentication: true,
      status: "active",
    },
  ];

  private constructor() {}

  static getInstance(): ApiStatsService {
    if (!ApiStatsService.instance) {
      ApiStatsService.instance = new ApiStatsService();
    }
    return ApiStatsService.instance;
  }

  /**
   * Log API usage
   */
  async logApiUsage(log: ApiUsageLog): Promise<void> {
    const db = await getDatabase();

    await db.execute(
      `INSERT INTO api_usage_logs
       (endpoint, method, status_code, response_time_ms, user_id, ip_address,
        user_agent, request_body_size, response_body_size, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        log.endpoint,
        log.method,
        log.status_code || null,
        log.response_time_ms || null,
        log.user_id || null,
        log.ip_address || null,
        log.user_agent || null,
        log.request_body_size || null,
        log.response_body_size || null,
        log.error_message || null
      ]
    );
  }

  /**
   * Get API endpoints
   */
  getApiEndpoints(): ApiEndpoint[] {
    return this.endpoints;
  }

  /**
   * Get API statistics
   */
  async getApiStats(timeRange?: "hour" | "day" | "week" | "month"): Promise<ApiStats[]> {
    const db = await getDatabase();

    // Calculate time boundaries
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Base query for aggregated stats
    const statsQuery = `
      SELECT
        endpoint,
        method,
        COUNT(*) as total_requests,
        SUM(CASE WHEN status_code BETWEEN 200 AND 299 THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count,
        AVG(response_time_ms) as avg_response_time,
        SUM(CASE WHEN created_at > $1 THEN 1 ELSE 0 END) as last_hour,
        SUM(CASE WHEN created_at > $2 THEN 1 ELSE 0 END) as last_24_hours,
        SUM(CASE WHEN created_at > $3 THEN 1 ELSE 0 END) as last_7_days,
        SUM(CASE WHEN created_at > $4 THEN 1 ELSE 0 END) as last_30_days
      FROM api_usage_logs
      WHERE created_at > $5
      GROUP BY endpoint, method
      ORDER BY total_requests DESC
    `;

    let cutoffTime = monthAgo;
    if (timeRange === "hour") cutoffTime = hourAgo;
    else if (timeRange === "day") cutoffTime = dayAgo;
    else if (timeRange === "week") cutoffTime = weekAgo;

    const stats = await db.query(statsQuery, [
      hourAgo.toISOString(),
      dayAgo.toISOString(),
      weekAgo.toISOString(),
      monthAgo.toISOString(),
      cutoffTime.toISOString()
    ]) as any[];

    return stats.map((stat) => ({
      endpoint: stat.endpoint,
      method: stat.method,
      totalRequests: stat.total_requests,
      successRate: stat.total_requests > 0
        ? (stat.success_count / stat.total_requests) * 100
        : 0,
      avgResponseTime: Math.round(stat.avg_response_time || 0),
      errorRate: stat.total_requests > 0
        ? (stat.error_count / stat.total_requests) * 100
        : 0,
      lastHour: stat.last_hour,
      last24Hours: stat.last_24_hours,
      last7Days: stat.last_7_days,
      last30Days: stat.last_30_days,
    }));
  }

  /**
   * Get usage timeline for charts
   */
  async getUsageTimeline(
    endpoint?: string,
    hours = 24
  ): Promise<{ time: string; requests: number; errors: number }[]> {
    const db = await getDatabase();

    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    let query = `
      SELECT
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:00:00') as hour,
        COUNT(*) as requests,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as errors
      FROM api_usage_logs
      WHERE created_at > $1
    `;

    const params: any[] = [cutoff.toISOString()];
    let paramIndex = 2;

    if (endpoint) {
      query += ` AND endpoint = $${paramIndex}`;
      params.push(endpoint);
      paramIndex++;
    }

    query += " GROUP BY hour ORDER BY hour ASC";

    const timeline = await db.query(query, params) as any[];

    return timeline.map((t) => ({
      time: t.hour,
      requests: t.requests,
      errors: t.errors,
    }));
  }

  /**
   * Get top errors
   */
  async getTopErrors(limit = 10): Promise<{
    endpoint: string;
    method: string;
    error_message: string;
    count: number;
    last_occurred: string;
  }[]> {
    const db = await getDatabase();

    const errors = await db.query(
      `SELECT
        endpoint,
        method,
        error_message,
        COUNT(*) as count,
        MAX(created_at) as last_occurred
      FROM api_usage_logs
      WHERE status_code >= 400 AND error_message IS NOT NULL
      GROUP BY endpoint, method, error_message
      ORDER BY count DESC
      LIMIT $1`,
      [limit]
    ) as any[];

    return errors;
  }

  /**
   * Check rate limit for user
   */
  async checkRateLimit(
    userId: string,
    endpoint: string,
    limit: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const db = await getDatabase();

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const count = await db.queryOne(
      `SELECT COUNT(*) as count
       FROM api_usage_logs
       WHERE user_id = $1 AND endpoint = $2 AND created_at > $3`,
      [userId, endpoint, hourAgo.toISOString()]
    ) as { count: number } | undefined;

    const remaining = Math.max(0, limit - (count?.count || 0));
    const resetAt = new Date(hourAgo.getTime() + 60 * 60 * 1000);

    return {
      allowed: (count?.count || 0) < limit,
      remaining,
      resetAt,
    };
  }

  /**
   * Get user's API usage
   */
  async getUserUsage(
    userId: string,
    days = 30
  ): Promise<{
    totalRequests: number;
    endpoints: { endpoint: string; count: number }[];
    dailyUsage: { date: string; requests: number }[];
  }> {
    const db = await getDatabase();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Total requests
    const total = await db.queryOne(
      "SELECT COUNT(*) as count FROM api_usage_logs WHERE user_id = $1 AND created_at > $2",
      [userId, cutoff.toISOString()]
    ) as { count: number } | undefined;

    // Endpoint breakdown
    const endpoints = await db.query(
      `SELECT endpoint, COUNT(*) as count
       FROM api_usage_logs
       WHERE user_id = $1 AND created_at > $2
       GROUP BY endpoint
       ORDER BY count DESC`,
      [userId, cutoff.toISOString()]
    ) as any[];

    // Daily usage
    const dailyUsage = await db.query(
      `SELECT
        TO_CHAR(created_at, 'YYYY-MM-DD') as date,
        COUNT(*) as requests
       FROM api_usage_logs
       WHERE user_id = $1 AND created_at > $2
       GROUP BY date
       ORDER BY date ASC`,
      [userId, cutoff.toISOString()]
    ) as any[];

    return {
      totalRequests: total?.count || 0,
      endpoints,
      dailyUsage,
    };
  }
}

export const apiStatsService = ApiStatsService.getInstance();
