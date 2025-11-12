import { getDB } from "@/lib/db/sqlite-client";

export type NotificationInput = {
  level: "info" | "warn" | "error";
  message: string;
  action?: string;
};

export type Notification = {
  id: number;
  level: "info" | "warn" | "error";
  message: string;
  is_read: number;
  created_at: string;
};

/**
 * Create a new notification
 */
export function createNotification(input: NotificationInput): number {
  const db = getDB();

  const result = db
    .prepare(
      `
    INSERT INTO notifications (level, message, is_read)
    VALUES (?, ?, 0)
  `
    )
    .run(input.level, input.message);

  // Optional: Send to external services if configured
  if (process.env.SLACK_WEBHOOK_URL) {
    sendToSlack(input).catch((err) =>
      console.error("Failed to send Slack notification:", err)
    );
  }

  return result.lastInsertRowid as number;
}

/**
 * Get all notifications
 */
export function getNotifications(options?: {
  limit?: number;
  unreadOnly?: boolean;
}): Notification[] {
  try {
    const db = getDB();
    const limit = options?.limit || 50;
    const unreadOnly = options?.unreadOnly || false;

    // Check if table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='notifications'
    `).get();
    
    if (!tableExists) {
      console.warn("Notifications table does not exist");
      return [];
    }

    let query = "SELECT * FROM notifications";
    if (unreadOnly) {
      query += " WHERE is_read = 0";
    }
    query += " ORDER BY created_at DESC LIMIT ?";

    return db.prepare(query).all(limit) as Notification[];
  } catch (error) {
    console.error("Error getting notifications:", error);
    return [];
  }
}

/**
 * Get unread count
 */
export function getUnreadCount(): number {
  try {
    const db = getDB();

    // Check if table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='notifications'
    `).get();
    
    if (!tableExists) {
      return 0;
    }

    const result = db
      .prepare("SELECT COUNT(*) as count FROM notifications WHERE is_read = 0")
      .get() as { count: number };

    return result?.count || 0;
  } catch (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }
}

/**
 * Mark notification as read
 */
export function markAsRead(id: number): void {
  const db = getDB();
  db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").run(id);
}

/**
 * Mark all notifications as read
 */
export function markAllAsRead(): void {
  const db = getDB();
  db.prepare("UPDATE notifications SET is_read = 1").run();
}

/**
 * Delete old notifications (older than 30 days)
 */
export function cleanupOldNotifications(): void {
  const db = getDB();
  db.prepare(`
    DELETE FROM notifications
    WHERE created_at < datetime('now', '-30 days')
  `).run();
}

/**
 * Send notification to Slack
 */
async function sendToSlack(notif: NotificationInput): Promise<void> {
  if (!process.env.SLACK_WEBHOOK_URL) return;

  const color = {
    info: "#3B82F6",
    warn: "#F59E0B",
    error: "#EF4444"
  }[notif.level];

  const emoji = {
    info: ":information_source:",
    warn: ":warning:",
    error: ":x:"
  }[notif.level];

  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      attachments: [
        {
          color,
          title: `${emoji} Procheff Alert`,
          text: notif.message,
          footer: "Procheff AI System",
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    })
  });
}

/**
 * Send email notification (placeholder for future implementation)
 */
export async function sendEmail(notif: NotificationInput): Promise<void> {
  // TODO: Implement with nodemailer or Resend
  console.log("Email notification:", notif);
}
