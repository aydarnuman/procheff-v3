import { AILogger } from "@/lib/ai/logger";
import { getDB } from "./sqlite-client";

/**
 * Ensures OAuth applications table exists
 * Stores registered OAuth applications with credentials
 */
export function ensureOAuthSchema(): void {
  try {
    const db = getDB();

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS oauth_apps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        homepage_url TEXT NOT NULL,
        callback_urls TEXT NOT NULL,
        client_id TEXT NOT NULL UNIQUE,
        client_secret TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `;

    db.exec(createTableSQL);

    // Create index for faster lookups
    const indexSQL = `
      CREATE INDEX IF NOT EXISTS idx_oauth_apps_client_id 
      ON oauth_apps(client_id)
    `;
    db.exec(indexSQL);

    AILogger.info("OAuth schema initialized successfully", {
      table: "oauth_apps",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    AILogger.error("Failed to initialize OAuth schema", { error: message });
    throw error;
  }
}

/**
 * Registers a new OAuth application
 */
export function registerOAuthApp(data: {
  name: string;
  description: string;
  homepage_url: string;
  callback_urls: string[];
}): {
  id: number;
  client_id: string;
  client_secret: string;
} {
  try {
    const db = getDB();

    // Generate cryptographically secure credentials
    const client_id = `oauth_${generateRandomString(40)}`;
    const client_secret = generateRandomString(64);
    const callback_urls_json = JSON.stringify(data.callback_urls);

    const stmt = db.prepare(`
      INSERT INTO oauth_apps (name, description, homepage_url, callback_urls, client_id, client_secret)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.name,
      data.description,
      data.homepage_url,
      callback_urls_json,
      client_id,
      client_secret
    );

    AILogger.info("OAuth app registered", {
      id: result.lastInsertRowid,
      name: data.name,
      client_id,
    });

    return {
      id: result.lastInsertRowid as number,
      client_id,
      client_secret,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    AILogger.error("Failed to register OAuth app", { error: message });
    throw error;
  }
}

/**
 * Retrieves OAuth app by client_id
 */
export function getOAuthAppByClientId(
  client_id: string
): Record<string, unknown>[] | null {
  try {
    const db = getDB();
    const stmt = db.prepare(`
      SELECT id, name, description, homepage_url, callback_urls, client_id, is_active, created_at
      FROM oauth_apps
      WHERE client_id = ? AND is_active = 1
    `);

    const result = stmt.all(client_id);
    return result && result.length > 0 ? result : null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    AILogger.error("Failed to retrieve OAuth app", { error: message });
    return null;
  }
}

/**
 * Lists all registered OAuth apps for a user/admin
 */
export function listOAuthApps(): Record<string, unknown>[] {
  try {
    const db = getDB();
    const stmt = db.prepare(`
      SELECT id, name, description, homepage_url, callback_urls, client_id, is_active, created_at
      FROM oauth_apps
      ORDER BY created_at DESC
    `);

    return stmt.all() as Record<string, unknown>[];
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    AILogger.error("Failed to list OAuth apps", { error: message });
    return [];
  }
}

/**
 * Deactivates an OAuth app
 */
export function deactivateOAuthApp(id: number): boolean {
  try {
    const db = getDB();
    const stmt = db.prepare(`
      UPDATE oauth_apps
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(id);
    AILogger.info("OAuth app deactivated", { id });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    AILogger.error("Failed to deactivate OAuth app", { error: message });
    return false;
  }
}

/**
 * Generates random string for credentials
 */
function generateRandomString(length: number): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
