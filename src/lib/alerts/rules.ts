import { getDB } from "@/lib/db/sqlite-client";

export type AlertRule = {
  id: string;
  name: string;
  condition: (metrics: AlertMetrics) => boolean;
  message: (metrics: AlertMetrics) => string;
  level: "info" | "warn" | "error";
  action?: string;
};

export type AlertMetrics = {
  totalCalls: number;
  errorCount: number;
  avgDuration: number;
  dailyTokens: number;
  recentErrors: Array<{ message: string; data: string }>;
  last24hCalls: number;
};

export const ALERT_RULES: AlertRule[] = [
  // Rule 1: High error rate (>5%)
  {
    id: "high-error-rate",
    name: "Yüksek Hata Oranı",
    condition: (m) => {
      if (m.totalCalls === 0) return false;
      const errorRate = (m.errorCount / m.totalCalls) * 100;
      return errorRate > 5;
    },
    message: (m) => {
      const rate = ((m.errorCount / m.totalCalls) * 100).toFixed(1);
      return `Son 24 saatte %${rate} hata oranı tespit edildi (${m.errorCount}/${m.totalCalls} çağrı)`;
    },
    level: "error",
    action: "/logs?level=error"
  },

  // Rule 2: Slow performance (>30 seconds average)
  {
    id: "slow-performance",
    name: "Yavaş Performans",
    condition: (m) => m.avgDuration > 30000,
    message: (m) =>
      `Ortalama analiz süresi ${(m.avgDuration / 1000).toFixed(1)} saniye (normal: 2-5s)`,
    level: "warn",
    action: "/monitor"
  },

  // Rule 3: High token usage (>100k daily)
  {
    id: "high-token-usage",
    name: "Yüksek Token Kullanımı",
    condition: (m) => m.dailyTokens > 100000,
    message: (m) =>
      `Bugün ${m.dailyTokens.toLocaleString()} token kullanıldı. Günlük limit yaklaşıyor.`,
    level: "warn",
    action: "/monitor"
  },

  // Rule 4: API authentication errors
  {
    id: "api-auth-error",
    name: "API Kimlik Doğrulama Hatası",
    condition: (m) =>
      m.recentErrors.some((e) =>
        e.message.includes("401") ||
        e.message.includes("Unauthorized") ||
        e.message.includes("Invalid API key")
      ),
    message: () =>
      "Claude API kimlik doğrulama hatası. API key'inizi kontrol edin.",
    level: "error",
    action: "/monitor"
  },

  // Rule 5: API server errors
  {
    id: "api-server-error",
    name: "API Sunucu Hatası",
    condition: (m) =>
      m.recentErrors.some((e) =>
        e.message.includes("500") ||
        e.message.includes("502") ||
        e.message.includes("503")
      ),
    message: () =>
      "Claude API sunucu hatası tespit edildi. Servis geçici olarak kullanılamayabilir.",
    level: "error",
    action: "/logs?level=error"
  },

  // Rule 6: Very high activity (>100 calls in 24h)
  {
    id: "high-activity",
    name: "Yüksek Aktivite",
    condition: (m) => m.last24hCalls > 100,
    message: (m) =>
      `Son 24 saatte ${m.last24hCalls} API çağrısı yapıldı. Olağandışı yüksek aktivite.`,
    level: "info",
    action: "/monitor"
  },

  // Rule 7: No activity (0 calls in last 24h)
  {
    id: "no-activity",
    name: "Aktivite Yok",
    condition: (m) => m.last24hCalls === 0 && m.totalCalls > 0,
    message: () =>
      "Son 24 saatte hiç API çağrısı yapılmadı. Sistem kullanılmıyor olabilir.",
    level: "info",
    action: "/monitor"
  },

  // Rule 8: Critical error spike
  {
    id: "error-spike",
    name: "Hata Artışı",
    condition: (m) => {
      if (m.totalCalls < 10) return false;
      return m.errorCount > 3 && m.last24hCalls > 0;
    },
    message: (m) =>
      `Son saatte ${m.errorCount} hata tespit edildi. Kritik sorun olabilir.`,
    level: "error",
    action: "/logs?level=error"
  },

  // Rule 9: Token efficiency warning
  {
    id: "token-efficiency",
    name: "Token Verimliliği Düşük",
    condition: (m) => {
      if (m.totalCalls === 0) return false;
      const avgTokensPerCall = m.dailyTokens / m.totalCalls;
      return avgTokensPerCall > 5000;
    },
    message: (m) => {
      const avg = Math.round(m.dailyTokens / m.totalCalls);
      return `Çağrı başına ortalama ${avg.toLocaleString()} token kullanılıyor. Prompt optimizasyonu gerekebilir.`;
    },
    level: "warn",
    action: "/monitor"
  }
];

/**
 * Get current system metrics for alert checking
 */
export function getAlertMetrics(): AlertMetrics {
  const db = getDB();

  // Get metrics from last 24 hours
  const metrics = db.prepare(`
    SELECT
      COUNT(*) as totalCalls,
      SUM(CASE WHEN level = 'error' THEN 1 ELSE 0 END) as errorCount,
      AVG(COALESCE(json_extract(data, '$.duration'), 0)) as avgDuration,
      SUM(COALESCE(json_extract(data, '$.tokens'), 0)) as dailyTokens
    FROM logs
    WHERE created_at >= datetime('now', '-24 hours')
  `).get() as any;

  // Get recent errors (last hour)
  const recentErrors = db.prepare(`
    SELECT message, data
    FROM logs
    WHERE level = 'error'
      AND created_at >= datetime('now', '-1 hour')
    ORDER BY created_at DESC
    LIMIT 10
  `).all() as Array<{ message: string; data: string }>;

  // Get calls in last 24 hours
  const last24h = db.prepare(`
    SELECT COUNT(*) as count
    FROM logs
    WHERE created_at >= datetime('now', '-24 hours')
  `).get() as any;

  return {
    totalCalls: metrics.totalCalls || 0,
    errorCount: metrics.errorCount || 0,
    avgDuration: metrics.avgDuration || 0,
    dailyTokens: metrics.dailyTokens || 0,
    recentErrors: recentErrors || [],
    last24hCalls: last24h.count || 0
  };
}
