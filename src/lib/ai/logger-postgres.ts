/**
 * AI Logger - PostgreSQL Version
 * Logs AI operations to PostgreSQL instead of SQLite
 */

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

export class AILoggerPostgres {
  private static isInitialized = false;
  private static activeSessions = new Map<string, SessionData>();
  private static pool: any = null;

  private static async initDB() {
    if (this.isInitialized || !isServer) return;

    try {
      // Dynamic import PostgreSQL client
      const { getPool } = await import("@/lib/db/postgres-client");
      this.pool = await getPool();
      
      // Table already created in PostgreSQL
      this.isInitialized = true;
    } catch (err) {
      console.error("❌ Logger PostgreSQL initialization failed:", err);
    }
  }

  private static async saveToDB(level: LogLevel, message: string, data?: unknown) {
    // Skip DB operations on client-side
    if (!isServer) return;

    try {
      await this.initDB();
      
      if (this.pool) {
        await this.pool.query(
          "INSERT INTO ai_logs (level, message, context) VALUES ($1, $2, $3)",
          [level, message, JSON.stringify(data || {})]
        );
      }
    } catch (err) {
      console.error("❌ Log PostgreSQL'e kaydedilemedi:", err);
      // Fallback to console only
    }
  }

  static info(msg: string, data?: unknown) {
    const zaman = new Date().toLocaleTimeString('tr-TR');
    console.log(`\x1b[36mℹ️  [${zaman}] [BİLGİ]\x1b[0m ${msg}`, data || "");
    this.saveToDB("info", msg, data);
  }

  static success(msg: string, data?: unknown) {
    const zaman = new Date().toLocaleTimeString('tr-TR');
    console.log(`\x1b[32m✅ [${zaman}] [BAŞARI]\x1b[0m ${msg}`, data || "");
    this.saveToDB("success", msg, data);
  }

  static warn(msg: string, data?: unknown) {
    const zaman = new Date().toLocaleTimeString('tr-TR');
    console.warn(`\x1b[33m⚠️  [${zaman}] [UYARI]\x1b[0m ${msg}`, data || "");
    this.saveToDB("warn", msg, data);
  }

  static error(msg: string, err?: unknown) {
    let errorMsg: string;
    if (err instanceof Error) {
      errorMsg = err.message;
    } else if (typeof err === 'object' && err !== null) {
      // Serialize object to JSON for better logging
      try {
        errorMsg = JSON.stringify(err);
      } catch {
        errorMsg = String(err);
      }
    } else {
      errorMsg = String(err);
    }
    
    const zaman = new Date().toLocaleTimeString('tr-TR');
    console.error(`\x1b[31m❌ [${zaman}] [HATA]\x1b[0m ${msg}`, errorMsg);
    this.saveToDB("error", msg, { error: errorMsg });
  }

  static startSession(sessionId: string) {
    const sessionData: SessionData = {
      sessionId,
      status: "started",
      startTime: Date.now(),
    };
    
    this.activeSessions.set(sessionId, sessionData);
    this.info(`📊 Session başladı: ${sessionId}`);
  }

  static endSession(sessionId: string, status: "completed" | "failed" = "completed") {
    const session = this.activeSessions.get(sessionId);
    
    if (session) {
      session.status = status;
      session.endTime = Date.now();
      session.duration = session.endTime - session.startTime;
      
      const durationInSeconds = (session.duration / 1000).toFixed(2);
      
      if (status === "completed") {
        this.success(`✅ Session tamamlandı: ${sessionId}`, {
          duration: `${durationInSeconds} saniye`,
        });
      } else {
        this.error(`❌ Session başarısız: ${sessionId}`, {
          duration: `${durationInSeconds} saniye`,
        });
      }
      
      this.activeSessions.delete(sessionId);
    }
  }

  static getSessionDuration(sessionId: string): number | undefined {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      const currentTime = Date.now();
      return currentTime - session.startTime;
    }
    return undefined;
  }

  static logAPICall(provider: string, model: string, tokensUsed?: number, responseTime?: number) {
    this.info(`🤖 ${provider} API çağrısı`, {
      model,
      tokensUsed,
      responseTime: responseTime ? `${responseTime}ms` : undefined,
    });
  }

  static logCacheHit(query: string) {
    this.info("💾 Cache hit", { query: query.substring(0, 100) });
  }

  static logCacheMiss(query: string) {
    this.info("🔍 Cache miss", { query: query.substring(0, 100) });
  }

  static logAnalysisStart(analysisType: string, metadata?: unknown) {
    this.info(`🚀 ${analysisType} analizi başladı`, metadata);
  }

  static logAnalysisComplete(analysisType: string, duration: number, metadata?: unknown) {
    const metaObj = metadata && typeof metadata === 'object' ? metadata as Record<string, unknown> : {};
    this.success(`✅ ${analysisType} analizi tamamlandı`, {
      duration: `${(duration / 1000).toFixed(2)} saniye`,
      ...metaObj,
    });
  }

  static logAnalysisError(analysisType: string, error: unknown) {
    this.error(`❌ ${analysisType} analizi başarısız`, error);
  }

  static logDataExtraction(documentType: string, fieldsExtracted: number) {
    this.info(`📄 ${documentType} dokümanından veri çıkarıldı`, {
      fieldsExtracted,
    });
  }

  static logValidation(isValid: boolean, errors?: string[]) {
    if (isValid) {
      this.success("✅ Validasyon başarılı");
    } else {
      this.warn("⚠️ Validasyon hataları", { errors });
    }
  }

  static logPerformance(operation: string, duration: number) {
    const level = duration > 5000 ? "warn" : "info";
    const emoji = duration > 5000 ? "🐌" : "⚡";
    
    if (level === "warn") {
      this.warn(`${emoji} ${operation} yavaş çalışıyor`, {
        duration: `${(duration / 1000).toFixed(2)} saniye`,
      });
    } else {
      this.info(`${emoji} ${operation} performansı`, {
        duration: `${(duration / 1000).toFixed(2)} saniye`,
      });
    }
  }
}

// Export as default for easier migration
export { AILoggerPostgres as AILogger };
