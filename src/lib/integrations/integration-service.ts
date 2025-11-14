/**
 * Integration Service
 * Manages third-party integrations (Google Sheets, Slack, Discord, etc.)
 */

import { getDB } from "@/lib/db/sqlite-client";

export type IntegrationType = "ihalebul" | "google_sheets" | "slack" | "discord" | "zapier";

export interface IntegrationConfig {
  id?: number;
  service: IntegrationType;
  config: any; // Service-specific configuration
  enabled: boolean;
  last_sync?: string;
  sync_status?: "success" | "failed" | "pending";
  error_message?: string;
}

export interface GoogleSheetsConfig {
  spreadsheet_id: string | null;
  credentials: any | null;
  sheet_name?: string;
  range?: string;
}

export interface SlackConfig {
  webhook_url: string | null;
  channel: string | null;
  username: string;
  icon_emoji?: string;
}

export interface DiscordConfig {
  webhook_url: string | null;
  username: string;
  avatar_url?: string;
}

export interface ZapierConfig {
  webhook_url: string | null;
  api_key: string | null;
}

export interface IhalebulConfig {
  auto_sync: boolean;
  sync_interval: number; // seconds
  session_id?: string;
  last_sync?: string;
}

export class IntegrationService {
  private static instance: IntegrationService;

  private constructor() {}

  static getInstance(): IntegrationService {
    if (!IntegrationService.instance) {
      IntegrationService.instance = new IntegrationService();
    }
    return IntegrationService.instance;
  }

  /**
   * Get all integrations
   */
  async getAllIntegrations(): Promise<IntegrationConfig[]> {
    const db = getDB();
    const integrations = db.prepare("SELECT * FROM integration_configs").all() as any[];

    return integrations.map((i) => ({
      ...i,
      config: JSON.parse(i.config || "{}"),
      enabled: i.enabled === 1,
    }));
  }

  /**
   * Get integration by service
   */
  async getIntegration(service: IntegrationType): Promise<IntegrationConfig | null> {
    const db = getDB();
    const integration = db
      .prepare("SELECT * FROM integration_configs WHERE service = ?")
      .get(service) as any;

    if (!integration) return null;

    return {
      ...integration,
      config: JSON.parse(integration.config || "{}"),
      enabled: integration.enabled === 1,
    };
  }

  /**
   * Update integration configuration
   */
  async updateIntegration(
    service: IntegrationType,
    config: any,
    enabled?: boolean
  ): Promise<boolean> {
    const db = getDB();

    const setClause = ["config = ?", "updated_at = CURRENT_TIMESTAMP"];
    const values: any[] = [JSON.stringify(config)];

    if (enabled !== undefined) {
      setClause.push("enabled = ?");
      values.push(enabled ? 1 : 0);
    }

    values.push(service);

    const result = db
      .prepare(`UPDATE integration_configs SET ${setClause.join(", ")} WHERE service = ?`)
      .run(...values);

    return result.changes > 0;
  }

  /**
   * Enable/disable integration
   */
  async toggleIntegration(service: IntegrationType, enabled: boolean): Promise<boolean> {
    const db = getDB();

    const result = db
      .prepare("UPDATE integration_configs SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE service = ?")
      .run(enabled ? 1 : 0, service);

    return result.changes > 0;
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(
    service: IntegrationType,
    status: "success" | "failed" | "pending",
    errorMessage?: string
  ): Promise<void> {
    const db = getDB();

    db.prepare(
      `UPDATE integration_configs
       SET sync_status = ?, error_message = ?, last_sync = CURRENT_TIMESTAMP
       WHERE service = ?`
    ).run(status, errorMessage || null, service);
  }

  /**
   * Send notification to Slack
   */
  async sendSlackNotification(message: string, attachments?: any[]): Promise<boolean> {
    const config = await this.getIntegration("slack");
    if (!config || !config.enabled || !config.config.webhook_url) {
      return false;
    }

    try {
      const slackConfig = config.config as SlackConfig;

      const payload: any = {
        text: message,
        username: slackConfig.username || "ProCheff",
        channel: slackConfig.channel || undefined,
      };

      if (slackConfig.icon_emoji) {
        payload.icon_emoji = slackConfig.icon_emoji;
      }

      if (attachments) {
        payload.attachments = attachments;
      }

      const response = await fetch(slackConfig.webhook_url!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await this.updateSyncStatus("slack", "success");
        return true;
      } else {
        await this.updateSyncStatus("slack", "failed", `HTTP ${response.status}`);
        return false;
      }
    } catch (error) {
      await this.updateSyncStatus(
        "slack",
        "failed",
        error instanceof Error ? error.message : "Unknown error"
      );
      return false;
    }
  }

  /**
   * Send notification to Discord
   */
  async sendDiscordNotification(
    content: string,
    embeds?: any[]
  ): Promise<boolean> {
    const config = await this.getIntegration("discord");
    if (!config || !config.enabled || !config.config.webhook_url) {
      return false;
    }

    try {
      const discordConfig = config.config as DiscordConfig;

      const payload: any = {
        content,
        username: discordConfig.username || "ProCheff",
      };

      if (discordConfig.avatar_url) {
        payload.avatar_url = discordConfig.avatar_url;
      }

      if (embeds) {
        payload.embeds = embeds;
      }

      const response = await fetch(discordConfig.webhook_url!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok || response.status === 204) {
        await this.updateSyncStatus("discord", "success");
        return true;
      } else {
        await this.updateSyncStatus("discord", "failed", `HTTP ${response.status}`);
        return false;
      }
    } catch (error) {
      await this.updateSyncStatus(
        "discord",
        "failed",
        error instanceof Error ? error.message : "Unknown error"
      );
      return false;
    }
  }

  /**
   * Test integration connection
   */
  async testIntegration(service: IntegrationType): Promise<{
    success: boolean;
    message: string;
  }> {
    const config = await this.getIntegration(service);
    if (!config) {
      return { success: false, message: "Integration not configured" };
    }

    switch (service) {
      case "slack":
        const slackSuccess = await this.sendSlackNotification(
          "🧪 ProCheff test connection successful!"
        );
        return {
          success: slackSuccess,
          message: slackSuccess ? "Slack connection successful" : "Failed to connect to Slack",
        };

      case "discord":
        const discordSuccess = await this.sendDiscordNotification(
          "🧪 ProCheff test connection successful!"
        );
        return {
          success: discordSuccess,
          message: discordSuccess ? "Discord connection successful" : "Failed to connect to Discord",
        };

      case "google_sheets":
        // TODO: Implement Google Sheets test
        return {
          success: false,
          message: "Google Sheets test not implemented yet",
        };

      case "zapier":
        if (!config.config.webhook_url) {
          return { success: false, message: "Zapier webhook URL not configured" };
        }

        try {
          const response = await fetch(config.config.webhook_url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(config.config.api_key && {
                "X-API-Key": config.config.api_key,
              }),
            },
            body: JSON.stringify({
              test: true,
              timestamp: new Date().toISOString(),
              source: "ProCheff",
            }),
          });

          return {
            success: response.ok,
            message: response.ok
              ? "Zapier connection successful"
              : `Zapier test failed with status ${response.status}`,
          };
        } catch (error) {
          return {
            success: false,
            message: error instanceof Error ? error.message : "Zapier test failed",
          };
        }

      case "ihalebul":
        return {
          success: config.enabled,
          message: config.enabled ? "İhalebul integration is active" : "İhalebul integration is disabled",
        };

      default:
        return {
          success: false,
          message: "Unknown integration type",
        };
    }
  }

  /**
   * Sync data to Google Sheets
   */
  async syncToGoogleSheets(data: any[]): Promise<boolean> {
    const config = await this.getIntegration("google_sheets");
    if (!config || !config.enabled) {
      return false;
    }

    // TODO: Implement Google Sheets sync using Google Sheets API
    // This would require OAuth2 setup and the googleapis package

    console.log("Google Sheets sync not implemented yet", data.length);
    return false;
  }

  /**
   * Send data to Zapier
   */
  async sendToZapier(data: any): Promise<boolean> {
    const config = await this.getIntegration("zapier");
    if (!config || !config.enabled || !config.config.webhook_url) {
      return false;
    }

    try {
      const zapierConfig = config.config as ZapierConfig;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (zapierConfig.api_key) {
        headers["X-API-Key"] = zapierConfig.api_key;
      }

      const response = await fetch(zapierConfig.webhook_url!, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await this.updateSyncStatus("zapier", "success");
        return true;
      } else {
        await this.updateSyncStatus("zapier", "failed", `HTTP ${response.status}`);
        return false;
      }
    } catch (error) {
      await this.updateSyncStatus(
        "zapier",
        "failed",
        error instanceof Error ? error.message : "Unknown error"
      );
      return false;
    }
  }
}

export const integrationService = IntegrationService.getInstance();