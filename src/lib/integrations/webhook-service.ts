/**
 * Webhook Service
 * Manages webhook CRUD operations and event triggering
 */

import { getDatabase } from "@/lib/db/universal-client";
import crypto from "crypto";

export interface Webhook {
  id?: number;
  name: string;
  url: string;
  events: string[]; // Array of event types
  headers?: Record<string, string>;
  secret?: string; // For HMAC signature
  active: boolean;
  retry_count: number;
  timeout_ms: number;
  last_triggered?: string;
  last_status?: number;
  failure_count?: number;
}

export interface WebhookLog {
  id?: number;
  webhook_id: number;
  event_type: string;
  payload: any;
  status_code?: number;
  response?: string;
  retry_count: number;
  success: boolean;
  created_at?: string;
}

export class WebhookService {
  private static instance: WebhookService;

  private constructor() {}

  static getInstance(): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  /**
   * Get all webhooks
   */
  async getAllWebhooks(): Promise<Webhook[]> {
    const db = await getDatabase();
    const webhooks = await db.query("SELECT * FROM webhooks ORDER BY created_at DESC");

    return webhooks.map((w: any) => ({
      ...w,
      events: JSON.parse(w.events || "[]"),
      headers: w.headers ? JSON.parse(w.headers) : undefined,
      active: w.active === 1,
    }));
  }

  /**
   * Get webhook by ID
   */
  async getWebhook(id: number): Promise<Webhook | null> {
    const db = await getDatabase();
    const webhook = await db.queryOne("SELECT * FROM webhooks WHERE id = $1", [id]) as any;

    if (!webhook) return null;

    return {
      ...webhook,
      events: JSON.parse(webhook.events || "[]"),
      headers: webhook.headers ? JSON.parse(webhook.headers) : undefined,
      active: webhook.active === 1,
    };
  }

  /**
   * Create new webhook
   */
  async createWebhook(webhook: Omit<Webhook, "id">): Promise<Webhook> {
    const db = await getDatabase();

    const result = await db.queryOne(
      `INSERT INTO webhooks (name, url, events, headers, secret, active, retry_count, timeout_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        webhook.name,
        webhook.url,
        JSON.stringify(webhook.events),
        webhook.headers ? JSON.stringify(webhook.headers) : null,
        webhook.secret || null,
        webhook.active ? 1 : 0,
        webhook.retry_count || 3,
        webhook.timeout_ms || 5000
      ]
    ) as any;

    return {
      id: result?.id,
      ...webhook,
    };
  }

  /**
   * Update webhook
   */
  async updateWebhook(id: number, updates: Partial<Webhook>): Promise<boolean> {
    const db = await getDatabase();

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      setClause.push(`name = $${paramIndex}`);
      values.push(updates.name);
      paramIndex++;
    }
    if (updates.url !== undefined) {
      setClause.push(`url = $${paramIndex}`);
      values.push(updates.url);
      paramIndex++;
    }
    if (updates.events !== undefined) {
      setClause.push(`events = $${paramIndex}`);
      values.push(JSON.stringify(updates.events));
      paramIndex++;
    }
    if (updates.headers !== undefined) {
      setClause.push(`headers = $${paramIndex}`);
      values.push(JSON.stringify(updates.headers));
      paramIndex++;
    }
    if (updates.secret !== undefined) {
      setClause.push(`secret = $${paramIndex}`);
      values.push(updates.secret);
      paramIndex++;
    }
    if (updates.active !== undefined) {
      setClause.push(`active = $${paramIndex}`);
      values.push(updates.active ? 1 : 0);
      paramIndex++;
    }
    if (updates.retry_count !== undefined) {
      setClause.push(`retry_count = $${paramIndex}`);
      values.push(updates.retry_count);
      paramIndex++;
    }
    if (updates.timeout_ms !== undefined) {
      setClause.push(`timeout_ms = $${paramIndex}`);
      values.push(updates.timeout_ms);
      paramIndex++;
    }

    setClause.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    await db.execute(
      `UPDATE webhooks SET ${setClause.join(", ")} WHERE id = $${paramIndex}`,
      values
    );

    return true;
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(id: number): Promise<boolean> {
    const db = await getDatabase();
    await db.execute("DELETE FROM webhooks WHERE id = $1", [id]);
    return true;
  }

  /**
   * Trigger webhook for an event
   */
  async triggerWebhook(eventType: string, payload: any): Promise<void> {
    const db = await getDatabase();

    // Get all active webhooks that listen to this event
    const webhooks = await db.query(
      "SELECT * FROM webhooks WHERE active = 1 AND events LIKE $1",
      [`%"${eventType}"%`]
    ) as any[];

    for (const webhook of webhooks) {
      await this.sendWebhook(webhook, eventType, payload);
    }
  }

  /**
   * Send webhook with retry logic
   */
  private async sendWebhook(
    webhook: any,
    eventType: string,
    payload: any,
    retryCount = 0
  ): Promise<void> {
    const db = await getDatabase();

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-ProCheff-Event": eventType,
        "X-ProCheff-Timestamp": new Date().toISOString(),
      };

      // Add custom headers
      if (webhook.headers) {
        const customHeaders = JSON.parse(webhook.headers);
        Object.assign(headers, customHeaders);
      }

      // Add HMAC signature if secret is configured
      if (webhook.secret) {
        const signature = crypto
          .createHmac("sha256", webhook.secret)
          .update(JSON.stringify(payload))
          .digest("hex");
        headers["X-ProCheff-Signature"] = `sha256=${signature}`;
      }

      // Send the webhook
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), webhook.timeout_ms);

      const response = await fetch(webhook.url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Update webhook status
      await db.execute(
        `UPDATE webhooks
         SET last_triggered = CURRENT_TIMESTAMP,
             last_status = $1,
             failure_count = 0
         WHERE id = $2`,
        [response.status, webhook.id]
      );

      // Log the webhook call
      await db.execute(
        `INSERT INTO webhook_logs (webhook_id, event_type, payload, status_code, response, retry_count, success)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          webhook.id,
          eventType,
          JSON.stringify(payload),
          response.status,
          await response.text(),
          retryCount,
          response.ok ? 1 : 0
        ]
      );

      // Retry if failed and retries remaining
      if (!response.ok && retryCount < webhook.retry_count) {
        setTimeout(() => {
          this.sendWebhook(webhook, eventType, payload, retryCount + 1);
        }, Math.pow(2, retryCount) * 1000); // Exponential backoff
      }
    } catch (error) {
      // Update failure count
      await db.execute(
        `UPDATE webhooks
         SET failure_count = failure_count + 1,
             last_triggered = CURRENT_TIMESTAMP,
             last_status = 0
         WHERE id = $1`,
        [webhook.id]
      );

      // Log the error
      await db.execute(
        `INSERT INTO webhook_logs (webhook_id, event_type, payload, status_code, response, retry_count, success)
         VALUES ($1, $2, $3, $4, $5, $6, 0)`,
        [
          webhook.id,
          eventType,
          JSON.stringify(payload),
          0,
          error instanceof Error ? error.message : "Unknown error",
          retryCount
        ]
      );

      // Retry if retries remaining
      if (retryCount < webhook.retry_count) {
        setTimeout(() => {
          this.sendWebhook(webhook, eventType, payload, retryCount + 1);
        }, Math.pow(2, retryCount) * 1000);
      }
    }
  }

  /**
   * Test a webhook
   */
  async testWebhook(webhookId: number): Promise<{
    success: boolean;
    statusCode?: number;
    message: string;
  }> {
    const webhook = await this.getWebhook(webhookId);
    if (!webhook) {
      return { success: false, message: "Webhook not found" };
    }

    const testPayload = {
      test: true,
      timestamp: new Date().toISOString(),
      message: "This is a test webhook from ProCheff",
    };

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-ProCheff-Event": "test",
        "X-ProCheff-Test": "true",
      };

      if (webhook.headers) {
        Object.assign(headers, webhook.headers);
      }

      if (webhook.secret) {
        const signature = crypto
          .createHmac("sha256", webhook.secret)
          .update(JSON.stringify(testPayload))
          .digest("hex");
        headers["X-ProCheff-Signature"] = `sha256=${signature}`;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), webhook.timeout_ms);

      const response = await fetch(webhook.url, {
        method: "POST",
        headers,
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      return {
        success: response.ok,
        statusCode: response.status,
        message: response.ok
          ? "Webhook test successful"
          : `Webhook test failed with status ${response.status}`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Test failed",
      };
    }
  }

  /**
   * Get webhook logs
   */
  async getWebhookLogs(webhookId?: number, limit = 50): Promise<WebhookLog[]> {
    const db = await getDatabase();

    let query = "SELECT * FROM webhook_logs";
    const params = [];
    let paramIndex = 1;

    if (webhookId) {
      query += ` WHERE webhook_id = $${paramIndex}`;
      params.push(webhookId);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const logs = await db.query(query, params);

    return logs.map((log: any) => ({
      ...log,
      payload: JSON.parse(log.payload || "{}"),
      success: log.success === 1,
    }));
  }
}

export const webhookService = WebhookService.getInstance();
