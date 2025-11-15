import { getDatabase } from '@/lib/db/universal-client';

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
export async function createNotification(input: NotificationInput): Promise<number> {
  const db = await getDatabase();

  const result = await db.queryOne(
    `INSERT INTO notifications (level, message, is_read)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [input.level, input.message, 0]
  );

  // Optional: Send to external services if configured
  if (process.env.SLACK_WEBHOOK_URL) {
    sendToSlack(input).catch((error) =>
      console.error("Failed to send Slack notification:", error)
    );
  }

  if (!result) {
    throw new Error("Failed to insert notification");
  }

  return Number((result as { id: number }).id);
}

/**
 * Get all notifications
 */
export async function getNotifications(options?: {
  limit?: number;
  unreadOnly?: boolean;
}): Promise<Notification[]> {
  try {
    const db = await getDatabase();
    const limit = options?.limit || 50;
    const unreadOnly = options?.unreadOnly || false;

    // Check if table exists
    const tableExists = await db.queryOne(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'notifications'
    `);

    if (!tableExists) {
      console.warn("Notifications table does not exist");
      return [];
    }

    let query = "SELECT * FROM notifications";
    const params: any[] = [];
    if (unreadOnly) {
      query += " WHERE is_read = 0";
    }
    query += " ORDER BY created_at DESC LIMIT $1";
    params.push(limit);

    return await db.query(query, params) as Notification[];
  } catch (error) {
    console.error("Error getting notifications:", error);
    return [];
  }
}

/**
 * Get unread count
 */
export async function getUnreadCount(): Promise<number> {
  try {
    const db = await getDatabase();

    // Check if table exists
    const tableExists = await db.queryOne(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'notifications'
    `);

    if (!tableExists) {
      return 0;
    }

    const result = await db.queryOne(
      "SELECT COUNT(*) as count FROM notifications WHERE is_read = 0"
    ) as { count: number };

    return result?.count || 0;
  } catch (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(id: number): Promise<void> {
  const db = await getDatabase();
  await db.execute("UPDATE notifications SET is_read = 1 WHERE id = $1", [id]);
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<void> {
  const db = await getDatabase();
  await db.execute("UPDATE notifications SET is_read = 1");
}

/**
 * Delete old notifications (older than 30 days)
 */
export async function cleanupOldNotifications(): Promise<void> {
  const db = await getDatabase();
  await db.execute(`
    DELETE FROM notifications
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
  `);
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
