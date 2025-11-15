import { getDatabase } from '@/lib/db/universal-client';
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
  const metrics = await getAlertMetrics();
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
        const alreadyAlerted = await checkRecentAlert(rule.id);

        if (!alreadyAlerted) {
          const notificationId = await createNotification({
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
async function checkRecentAlert(ruleId: string): Promise<boolean> {
  const db = await getDatabase();

  const result = await db.queryOne(`
    SELECT id FROM notifications
    WHERE message LIKE $1
      AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
    LIMIT 1
  `, [`%${ruleId}%`]);

  return !!result;
}

/**
 * Get alert statistics
 */
export async function getAlertStats(): Promise<{
  totalNotifications: number;
  unreadNotifications: number;
  last24hNotifications: number;
  notificationsByLevel: { info: number; warn: number; error: number };
}> {
  const db = await getDatabase();

  const total = await db.queryOne(
    "SELECT COUNT(*) as count FROM notifications"
  ) as { count: number };

  const unread = await db.queryOne(
    "SELECT COUNT(*) as count FROM notifications WHERE is_read = 0"
  ) as { count: number };

  const last24h = await db.queryOne(`
    SELECT COUNT(*) as count FROM notifications
    WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
  `) as { count: number };

  const byLevel = await db.query(`
    SELECT
      level,
      COUNT(*) as count
    FROM notifications
    GROUP BY level
  `) as Array<{ level: string; count: number }>;

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
