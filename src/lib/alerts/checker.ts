import { getDB } from "@/lib/db/sqlite-client";
import { ALERT_RULES, getAlertMetrics } from "./rules";
import { createNotification } from "./notifier";

/**
 * Check all alert rules and create notifications if conditions are met
 */
export async function checkAlerts(): Promise<{
  checked: number;
  triggered: number;
  notifications: number[];
}> {
  const metrics = getAlertMetrics();
  const triggeredRules: string[] = [];
  const notificationIds: number[] = [];

  console.log("🔍 Checking alert rules...", {
    totalCalls: metrics.totalCalls,
    errorCount: metrics.errorCount,
    avgDuration: metrics.avgDuration,
    dailyTokens: metrics.dailyTokens
  });

  for (const rule of ALERT_RULES) {
    try {
      // Check if rule condition is met
      if (rule.condition(metrics)) {
        console.log(`✅ Rule triggered: ${rule.id}`);

        // Check if we already alerted for this rule in the last hour
        const alreadyAlerted = checkRecentAlert(rule.id);

        if (!alreadyAlerted) {
          const notificationId = createNotification({
            level: rule.level,
            message: `${rule.name}: ${rule.message(metrics)}`,
            action: rule.action
          });

          triggeredRules.push(rule.id);
          notificationIds.push(notificationId);

          console.log(`🔔 Notification created: ID ${notificationId}`);
        } else {
          console.log(`⏭️  Already alerted for ${rule.id} in last hour, skipping`);
        }
      }
    } catch (error) {
      console.error(`❌ Rule ${rule.id} failed:`, error);
    }
  }

  console.log(`✅ Alert check complete: ${triggeredRules.length}/${ALERT_RULES.length} rules triggered`);

  return {
    checked: ALERT_RULES.length,
    triggered: triggeredRules.length,
    notifications: notificationIds
  };
}

/**
 * Check if we already alerted for this rule in the last hour
 */
function checkRecentAlert(ruleId: string): boolean {
  const db = getDB();

  const result = db
    .prepare(
      `
    SELECT id FROM notifications
    WHERE message LIKE ?
      AND created_at >= datetime('now', '-1 hour')
    LIMIT 1
  `
    )
    .get(`%${ruleId}%`);

  return !!result;
}

/**
 * Get alert statistics
 */
export function getAlertStats(): {
  totalNotifications: number;
  unreadNotifications: number;
  last24hNotifications: number;
  notificationsByLevel: { info: number; warn: number; error: number };
} {
  const db = getDB();

  const total = db
    .prepare("SELECT COUNT(*) as count FROM notifications")
    .get() as { count: number };

  const unread = db
    .prepare("SELECT COUNT(*) as count FROM notifications WHERE is_read = 0")
    .get() as { count: number };

  const last24h = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM notifications
    WHERE created_at >= datetime('now', '-24 hours')
  `
    )
    .get() as { count: number };

  const byLevel = db
    .prepare(
      `
    SELECT
      level,
      COUNT(*) as count
    FROM notifications
    GROUP BY level
  `
    )
    .all() as Array<{ level: string; count: number }>;

  const levelCounts = {
    info: 0,
    warn: 0,
    error: 0
  };

  byLevel.forEach((item) => {
    if (item.level in levelCounts) {
      levelCounts[item.level as keyof typeof levelCounts] = item.count;
    }
  });

  return {
    totalNotifications: total.count,
    unreadNotifications: unread.count,
    last24hNotifications: last24h.count,
    notificationsByLevel: levelCounts
  };
}
