type LogLevel = "info" | "success" | "warn" | "error";
type SessionStatus = "started" | "completed" | "failed";

interface SessionData {
  sessionId: string;
  status: SessionStatus;
  startTime: number;
  endTime?: number;
  duration?: number;
}

// Check if running on server-side
const isServer = typeof window === 'undefined';

export class AILogger {
  private static isInitialized = false;
  private static activeSessions = new Map<string, SessionData>();

  private static async initDB() {
    if (this.isInitialized || !isServer) return;

    try {
      // Dynamic import only on server-side
      const { getDB } = await import("@/lib/db/sqlite-client");
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

  private static async saveToDB(level: LogLevel, message: string, data?: unknown) {
    // Skip DB operations on client-side
    if (!isServer) return;

    try {
      await this.initDB();
      const { getDB } = await import("@/lib/db/sqlite-client");
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
    let errorMsg: string;
    if (err instanceof Error) {
      errorMsg = err.message;
    } else if (typeof err === 'object' && err !== null) {
      // Serialize object to JSON for better logging
      try {
        errorMsg = JSON.stringify(err, null, 2);
      } catch {
        errorMsg = String(err);
      }
    } else {
      errorMsg = String(err || "");
    }
    console.error(`\x1b[31m❌ [ERROR]\x1b[0m ${msg}`, err && typeof err === 'object' ? err : errorMsg);
    this.saveToDB("error", msg, { error: errorMsg });
  }

  /**
   * Start a new session for tracking operations
   */
  static sessionStart(sessionId: string): void {
    const session: SessionData = {
      sessionId,
      status: "started",
      startTime: Date.now()
    };
    this.activeSessions.set(sessionId, session);
    this.info(`Session started: ${sessionId}`, { sessionId });
  }

  /**
   * End a session with status
   */
  static sessionEnd(sessionId: string, status: SessionStatus = "completed"): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      this.warn(`Session not found: ${sessionId}`);
      return;
    }

    const endTime = Date.now();
    const duration = endTime - session.startTime;

    session.endTime = endTime;
    session.duration = duration;
    session.status = status;

    this.activeSessions.delete(sessionId);

    const statusEmoji = status === "completed" ? "✅" : status === "failed" ? "❌" : "⚠️";
    this.info(`${statusEmoji} Session ended: ${sessionId} (${duration}ms)`, {
      sessionId,
      status,
      duration
    });
  }

  /**
   * Get active session count
   */
  static getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Get session data
   */
  static getSession(sessionId: string): SessionData | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Token usage tracking
   */
  static tokenUsage(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    cost: number,
    duration: number
  ): void {
    const totalTokens = inputTokens + outputTokens;
    const costFormatted = cost.toFixed(4);
    
    console.log(
      `🤖 [${provider.toUpperCase()}] ${totalTokens} tokens | $${costFormatted} | ${duration}ms`
    );
    
    this.saveToDB('info', `Token usage: ${provider}`, {
      provider,
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      cost,
      duration
    });
  }

  /**
   * 🆕 API key status check
   */
  static apiKeyStatus(provider: string, valid: boolean, details?: string): void {
    const status = valid ? '✅' : '❌';
    const message = `${status} [${provider.toUpperCase()}] API Key: ${details || (valid ? 'OK' : 'Invalid')}`;
    
    if (valid) {
      console.log(message);
      this.saveToDB('success', `API key valid: ${provider}`, { provider, valid });
    } else {
      console.error(message);
      this.saveToDB('error', `API key invalid: ${provider}`, { provider, valid, details });
    }
  }

  /**
   * 🆕 Rate limit warning
   */
  static rateLimitWarning(provider: string, retryAfter: number): void {
    const message = `⏱️ [${provider.toUpperCase()}] Rate limit hit, retrying in ${retryAfter}s`;
    console.warn(message);
    this.saveToDB('warn', `Rate limit: ${provider}`, { provider, retryAfter });
  }
}
