import { getDatabase } from '@/lib/db/universal-client';
import { emailService, EmailService } from "./email-service";

export interface NotificationChannel {
  id?: number;
  user_id: string;
  type: "email" | "sms" | "push" | "in_app";
  destination: string;
  verified: boolean;
  verification_token?: string;
  verification_expires?: string;
  settings?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationPreference {
  user_id: string;
  event: string;
  channels: string[]; // Array of channel types
}

export interface NotificationQueue {
  id?: number;
  user_id: string;
  channel_id: number;
  template_id?: number;
  data: Record<string, any>;
  status: "pending" | "sending" | "sent" | "failed";
  error_message?: string;
  retry_count: number;
  max_retries: number;
  scheduled_for?: string;
  sent_at?: string;
  created_at?: string;
}

class NotificationService {
  /**
   * Get user's notification channels
   */
  async getChannels(userId: string): Promise<NotificationChannel[]> {
    try {
      const db = await getDatabase();
      const channels = await db.query(
        "SELECT * FROM notification_channels WHERE user_id = $1 ORDER BY created_at DESC",
        [userId]
      ) as any[];

      return channels.map(channel => ({
        ...channel,
        verified: Boolean(channel.verified),
        settings: channel.settings ? JSON.parse(channel.settings) : {},
      }));
    } catch (error) {
      console.error("Failed to get channels:", error);
      throw error;
    }
  }

  /**
   * Add a new notification channel
   */
  async addChannel(channel: NotificationChannel): Promise<number> {
    try {
      const db = await getDatabase();
      // Generate verification token
      const verificationToken = this.generateToken();
      const verificationExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      const result = await db.queryOne(`
        INSERT INTO notification_channels (
          user_id, type, destination, verified,
          verification_token, verification_expires, settings
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        channel.user_id,
        channel.type,
        channel.destination,
        false, // Not verified initially
        verificationToken,
        verificationExpires,
        JSON.stringify(channel.settings || {})
      ]);

      const channelId = result.id as number;

      // Send verification if email
      if (channel.type === "email") {
        await this.sendVerification(channelId);
      }

      return channelId;
    } catch (error) {
      console.error("Failed to add channel:", error);
      throw error;
    }
  }

  /**
   * Update a notification channel
   */
  async updateChannel(channelId: number, updates: Partial<NotificationChannel>): Promise<void> {
    try {
      const db = await getDatabase();
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updates.destination !== undefined) {
        updateFields.push(`destination = $${paramCount++}`);
        values.push(updates.destination);
        // Reset verification if destination changed
        updateFields.push(`verified = $${paramCount++}`);
        values.push(false);
        updateFields.push(`verification_token = $${paramCount++}`);
        values.push(this.generateToken());
        updateFields.push(`verification_expires = $${paramCount++}`);
        values.push(new Date(Date.now() + 10 * 60 * 1000).toISOString());
      }

      if (updates.settings !== undefined) {
        updateFields.push(`settings = $${paramCount++}`);
        values.push(JSON.stringify(updates.settings));
      }

      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      values.push(channelId);

      await db.execute(
        `UPDATE notification_channels SET ${updateFields.join(", ")} WHERE id = $${paramCount}`,
        values
      );

      // Send new verification if destination changed
      if (updates.destination !== undefined) {
        const channel = await db.queryOne(
          "SELECT type FROM notification_channels WHERE id = $1",
          [channelId]
        ) as any;

        if (channel?.type === "email") {
          await this.sendVerification(channelId);
        }
      }
    } catch (error) {
      console.error("Failed to update channel:", error);
      throw error;
    }
  }

  /**
   * Delete a notification channel
   */
  async deleteChannel(channelId: number): Promise<void> {
    try {
      const db = await getDatabase();
      await db.execute("DELETE FROM notification_channels WHERE id = $1", [channelId]);
    } catch (error) {
      console.error("Failed to delete channel:", error);
      throw error;
    }
  }

  /**
   * Send verification code
   */
  async sendVerification(channelId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const db = await getDatabase();
      const channel = await db.queryOne(
        "SELECT * FROM notification_channels WHERE id = $1",
        [channelId]
      ) as any;

      if (!channel) {
        return { success: false, error: "Channel not found" };
      }

      if (channel.type === "email") {
        // Generate 6-digit code
        const code = EmailService.generateVerificationCode();

        // Update database with new code
        await db.execute(`
          UPDATE notification_channels
          SET verification_token = $1,
              verification_expires = $2
          WHERE id = $3
        `, [
          code,
          new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
          channelId
        ]);

        // Send email
        const result = await emailService.sendVerificationEmail(channel.destination, code);
        return result;
      }

      // Add SMS verification here when implemented
      return { success: false, error: "Verification not supported for this channel type" };
    } catch (error) {
      console.error("Failed to send verification:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Verify channel with code
   */
  async verifyChannel(channelId: number, code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const db = await getDatabase();
      const channel = await db.queryOne(`
        SELECT * FROM notification_channels
        WHERE id = $1 AND verification_token = $2
      `, [channelId, code]) as any;

      if (!channel) {
        return { success: false, error: "Invalid verification code" };
      }

      // Check if expired
      if (new Date(channel.verification_expires) < new Date()) {
        return { success: false, error: "Verification code expired" };
      }

      // Mark as verified
      await db.execute(`
        UPDATE notification_channels
        SET verified = true,
            verification_token = NULL,
            verification_expires = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [channelId]);

      return { success: true };
    } catch (error) {
      console.error("Failed to verify channel:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get user preferences
   */
  async getPreferences(userId: string): Promise<Record<string, string[]>> {
    try {
      // For now, return default preferences
      // This should be stored in a separate table in production
      return {
        pipeline_complete: ["email"],
        pipeline_failed: ["email"],
        report_ready: ["email"],
        security_alert: ["email", "in_app"],
      };
    } catch (error) {
      console.error("Failed to get preferences:", error);
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId: string, preferences: Record<string, string[]>): Promise<void> {
    try {
      const db = await getDatabase();

      await db.execute(`
        INSERT INTO user_settings (user_id, category, settings_json)
        VALUES ($1, 'notification_preferences', $2)
        ON CONFLICT(user_id, category) DO UPDATE SET
          settings_json = EXCLUDED.settings_json,
          updated_at = CURRENT_TIMESTAMP
      `, [userId, JSON.stringify(preferences)]);
    } catch (error) {
      console.error("Failed to update preferences:", error);
      throw error;
    }
  }

  /**
   * Queue a notification
   */
  async queueNotification(
    userId: string,
    channelType: string,
    templateName: string,
    data: Record<string, any>
  ): Promise<void> {
    try {
      const db = await getDatabase();
      // Get user's channel for this type
      const channel = await db.queryOne(`
        SELECT id FROM notification_channels
        WHERE user_id = $1 AND type = $2 AND verified = true
        LIMIT 1
      `, [userId, channelType]) as any;

      if (!channel) {
        console.warn(`No verified ${channelType} channel for user ${userId}`);
        return;
      }

      // Get template ID (assuming templates are pre-loaded)
      const template = await db.queryOne(
        "SELECT id FROM notification_templates WHERE code = $1",
        [templateName]
      ) as any;

      // Add to queue
      await db.execute(`
        INSERT INTO notification_queue (
          user_id, channel_id, template_id, data,
          status, retry_count, max_retries
        ) VALUES ($1, $2, $3, $4, 'pending', 0, 3)
      `, [
        userId,
        channel.id,
        template?.id || null,
        JSON.stringify(data)
      ]);
    } catch (error) {
      console.error("Failed to queue notification:", error);
      throw error;
    }
  }

  /**
   * Process notification queue
   */
  async processQueue(): Promise<void> {
    try {
      const db = await getDatabase();
      // Get pending notifications
      const pending = await db.query(`
        SELECT q.*, c.type, c.destination, t.code as template_code
        FROM notification_queue q
        JOIN notification_channels c ON q.channel_id = c.id
        LEFT JOIN notification_templates t ON q.template_id = t.id
        WHERE q.status = 'pending'
          AND (q.scheduled_for IS NULL OR q.scheduled_for <= CURRENT_TIMESTAMP)
        ORDER BY q.created_at ASC
        LIMIT 10
      `) as any[];

      for (const notification of pending) {
        await this.processNotification(notification);
      }
    } catch (error) {
      console.error("Failed to process queue:", error);
    }
  }

  /**
   * Process a single notification
   */
  private async processNotification(notification: any): Promise<void> {
    try {
      const db = await getDatabase();
      // Update status to sending
      await db.execute(
        "UPDATE notification_queue SET status = 'sending' WHERE id = $1",
        [notification.id]
      );

      let success = false;
      let error: string | undefined;

      // Send based on channel type
      if (notification.type === "email") {
        const data = JSON.parse(notification.data);
        const result = await emailService.sendEmail({
          to: notification.destination,
          subject: data.subject || "ProCheff Bildirimi",
          template: notification.template_code || "notification",
          variables: data,
        });

        success = result.success;
        error = result.error;
      }

      // Update status
      if (success) {
        await db.execute(`
          UPDATE notification_queue
          SET status = 'sent', sent_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [notification.id]);
      } else {
        const retryCount = notification.retry_count + 1;
        const status = retryCount >= notification.max_retries ? "failed" : "pending";

        await db.execute(`
          UPDATE notification_queue
          SET status = $1, retry_count = $2, error_message = $3
          WHERE id = $4
        `, [status, retryCount, error, notification.id]);
      }
    } catch (error) {
      console.error("Failed to process notification:", error);

      const db = await getDatabase();
      // Update as failed
      await db.execute(`
        UPDATE notification_queue
        SET status = 'failed',
            error_message = $1
        WHERE id = $2
      `, [
        error instanceof Error ? error.message : "Unknown error",
        notification.id
      ]);
    }
  }

  /**
   * Send test notification
   */
  async sendTestNotification(userId: string, channelId: number): Promise<{ success: boolean; previewUrl?: string; error?: string }> {
    try {
      const db = await getDatabase();
      const channel = await db.queryOne(
        "SELECT * FROM notification_channels WHERE id = $1 AND user_id = $2",
        [channelId, userId]
      ) as any;

      if (!channel) {
        return { success: false, error: "Channel not found" };
      }

      if (channel.type === "email") {
        const result = await emailService.sendTestEmail(channel.destination);
        return result;
      }

      return { success: false, error: "Test not supported for this channel type" };
    } catch (error) {
      console.error("Failed to send test notification:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Generate random token
   */
  private generateToken(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
