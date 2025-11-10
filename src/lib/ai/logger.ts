import { getDB } from "@/lib/db/sqlite-client";

type LogLevel = "info" | "success" | "warn" | "error";

export class AILogger {
  private static isInitialized = false;

  private static initDB() {
    if (this.isInitialized) return;
    
    try {
      const db = getDB();
      db.prepare(`
        CREATE TABLE IF NOT EXISTS logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          level TEXT NOT NULL,
          message TEXT NOT NULL,
          data TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      this.isInitialized = true;
    } catch (err) {
      console.error("❌ Logger DB initialization failed:", err);
    }
  }

  private static saveToDB(level: LogLevel, message: string, data?: unknown) {
    try {
      this.initDB();
      const db = getDB();
      db.prepare("INSERT INTO logs (level, message, data) VALUES (?, ?, ?)")
        .run(level, message, JSON.stringify(data || {}));
    } catch (err) {
      console.error("❌ Failed to save log to DB:", err);
    }
  }

  static info(msg: string, data?: unknown) {
    console.log(`\x1b[36mℹ️  [INFO]\x1b[0m ${msg}`, data || "");
    this.saveToDB("info", msg, data);
  }

  static success(msg: string, data?: unknown) {
    console.log(`\x1b[32m✅ [SUCCESS]\x1b[0m ${msg}`, data || "");
    this.saveToDB("success", msg, data);
  }

  static warn(msg: string, data?: unknown) {
    console.warn(`\x1b[33m⚠️  [WARN]\x1b[0m ${msg}`, data || "");
    this.saveToDB("warn", msg, data);
  }

  static error(msg: string, err?: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err || "");
    console.error(`\x1b[31m❌ [ERROR]\x1b[0m ${msg}`, errorMsg);
    this.saveToDB("error", msg, { error: errorMsg });
  }
}
