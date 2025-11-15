// Client/Server Universal AI Logger
// This logger works both on client and server without bundling issues

type LogData = Record<string, unknown> | string | number | boolean | null | undefined | unknown;

interface ServerLogger {
  info: (message: string, data?: LogData) => void | Promise<void>;
  success: (message: string, data?: LogData) => void | Promise<void>;
  error: (message: string, data?: LogData) => void | Promise<void>;
  warn: (message: string, data?: LogData) => void | Promise<void>;
  debug: (message: string, data?: LogData) => void | Promise<void>;
  sessionStart: (sessionId: string) => void | Promise<void>;
  startSession: (sessionId: string) => void | Promise<void>;
  sessionEnd: (sessionId: string, status?: "completed" | "failed") => void | Promise<void>;
  endSession: (sessionId: string, status?: "completed" | "failed") => void | Promise<void>;
  log: (message: string, data?: LogData) => void | Promise<void>;
  logAPICall?: (provider: string, model: string, tokensUsed?: number, responseTime?: number) => void | Promise<void>;
  logAnalysisStart?: (analysisType: string, metadata?: LogData) => void | Promise<void>;
  logAnalysisComplete?: (analysisType: string, duration: number, metadata?: LogData) => void | Promise<void>;
}

class UniversalAILogger {
  private isServer = typeof window === 'undefined';
  private serverLogger: ServerLogger | null = null;
  private initialized = false;

  private async initializeServerLogger(): Promise<void> {
    if (!this.isServer || this.initialized) return;
    
    try {
      // Check if we should use PostgreSQL
      const usePostgres = 
        process.env.USE_POSTGRES === "true" ||
        process.env.USE_POSTGRES_FOR_AI === "true" ||
        process.env.DB_MODE === "postgres" ||
        process.env.DB_MODE === "dual" ||
        Boolean(process.env.DATABASE_URL?.includes("postgres"));

      if (usePostgres) {
        // Completely dynamic import to prevent webpack bundling
        const loggerModule = await import('./logger-postgres');
        this.serverLogger = loggerModule.AILogger;
      } else {
        const loggerModule = await import('./logger-sqlite');
        this.serverLogger = loggerModule.AILogger;
      }
      
      this.initialized = true;
    } catch (error) {
      console.warn('Failed to load server logger, using console fallback:', error);
      this.serverLogger = this.getConsoleLogger();
      this.initialized = true;
    }
  }

  private getConsoleLogger(): ServerLogger {
    return {
      info: (message: string, data?: LogData) => console.log(`[AI] ${message}`, data),
      success: (message: string, data?: LogData) => console.log(`[AI SUCCESS] ${message}`, data),
      error: (message: string, data?: LogData) => console.error(`[AI ERROR] ${message}`, data),
      warn: (message: string, data?: LogData) => console.warn(`[AI WARN] ${message}`, data),
      debug: (message: string, data?: LogData) => console.debug(`[AI DEBUG] ${message}`, data),
      log: (message: string, data?: LogData) => console.log(`[AI LOG] ${message}`, data),
      sessionStart: (sessionId: string) => console.log(`[AI SESSION] ${sessionId} başladı`),
      startSession: (sessionId: string) => console.log(`[AI SESSION] ${sessionId} başladı`),
      sessionEnd: (sessionId: string, status?: "completed" | "failed") => console.log(`[AI SESSION] ${sessionId} ${status || 'completed'}`),
      endSession: (sessionId: string, status?: "completed" | "failed") => console.log(`[AI SESSION] ${sessionId} ${status || 'completed'}`),
      logAPICall: (provider: string, model: string) => console.log(`[AI API] ${provider}/${model}`),
      logAnalysisStart: (analysisType: string) => console.log(`[AI ANALYSIS] ${analysisType} başladı`),
      logAnalysisComplete: (analysisType: string, duration: number) => console.log(`[AI ANALYSIS] ${analysisType} tamamlandı (${duration}ms)`),
    };
  }

  async info(message: string, data?: LogData): Promise<void> {
    if (!this.isServer) {
      console.log(`[AI] ${message}`, data);
      return;
    }
    
    if (!this.initialized) await this.initializeServerLogger();
    
    if (this.serverLogger?.info) {
      await this.serverLogger.info(message, data);
    } else {
      console.log(`[AI] ${message}`, data);
    }
  }

  async success(message: string, data?: LogData): Promise<void> {
    if (!this.isServer) {
      console.log(`[AI SUCCESS] ${message}`, data);
      return;
    }
    
    if (!this.initialized) await this.initializeServerLogger();
    
    if (this.serverLogger?.success) {
      await this.serverLogger.success(message, data);
    } else {
      console.log(`[AI SUCCESS] ${message}`, data);
    }
  }

  async error(message: string, data?: LogData): Promise<void> {
    if (!this.isServer) {
      console.error(`[AI ERROR] ${message}`, data);
      return;
    }
    
    if (!this.initialized) await this.initializeServerLogger();
    
    if (this.serverLogger?.error) {
      await this.serverLogger.error(message, data);
    } else {
      console.error(`[AI ERROR] ${message}`, data);
    }
  }

  async warn(message: string, data?: LogData): Promise<void> {
    if (!this.isServer) {
      console.warn(`[AI WARN] ${message}`, data);
      return;
    }
    
    if (!this.initialized) await this.initializeServerLogger();
    
    if (this.serverLogger?.warn) {
      await this.serverLogger.warn(message, data);
    } else {
      console.warn(`[AI WARN] ${message}`, data);
    }
  }

  async debug(message: string, data?: LogData): Promise<void> {
    if (!this.isServer) {
      console.debug(`[AI DEBUG] ${message}`, data);
      return;
    }
    
    if (!this.initialized) await this.initializeServerLogger();
    
    if (this.serverLogger?.debug) {
      await this.serverLogger.debug(message, data);
    } else {
      console.debug(`[AI DEBUG] ${message}`, data);
    }
  }

  async sessionStart(sessionId: string): Promise<void> {
    return this.startSession(sessionId);
  }

  async startSession(sessionId: string): Promise<void> {
    if (!this.isServer) {
      console.log(`[AI SESSION] ${sessionId} başladı`);
      return;
    }
    
    if (!this.initialized) await this.initializeServerLogger();
    
    if (this.serverLogger?.startSession) {
      await this.serverLogger.startSession(sessionId);
    } else {
      console.log(`[AI SESSION] ${sessionId} başladı`);
    }
  }

  async sessionEnd(sessionId: string, status: "completed" | "failed" = "completed"): Promise<void> {
    return this.endSession(sessionId, status);
  }

  async endSession(sessionId: string, status: "completed" | "failed" = "completed"): Promise<void> {
    if (!this.isServer) {
      console.log(`[AI SESSION] ${sessionId} ${status}`);
      return;
    }
    
    if (!this.initialized) await this.initializeServerLogger();
    
    if (this.serverLogger?.endSession) {
      await this.serverLogger.endSession(sessionId, status);
    } else {
      console.log(`[AI SESSION] ${sessionId} ${status}`);
    }
  }

  async logAPICall(provider: string, model: string, tokensUsed?: number, responseTime?: number): Promise<void> {
    if (!this.isServer) {
      console.log(`[AI API] ${provider}/${model}`);
      return;
    }
    
    if (!this.initialized) await this.initializeServerLogger();
    
    if (this.serverLogger?.logAPICall) {
      await this.serverLogger.logAPICall(provider, model, tokensUsed, responseTime);
    } else {
      console.log(`[AI API] ${provider}/${model}`);
    }
  }

  async logAnalysisStart(analysisType: string, metadata?: LogData): Promise<void> {
    if (!this.isServer) {
      console.log(`[AI ANALYSIS] ${analysisType} başladı`);
      return;
    }
    
    if (!this.initialized) await this.initializeServerLogger();
    
    if (this.serverLogger?.logAnalysisStart) {
      await this.serverLogger.logAnalysisStart(analysisType, metadata);
    } else {
      console.log(`[AI ANALYSIS] ${analysisType} başladı`);
    }
  }

  async logAnalysisComplete(analysisType: string, duration: number, metadata?: LogData): Promise<void> {
    if (!this.isServer) {
      console.log(`[AI ANALYSIS] ${analysisType} tamamlandı (${duration}ms)`);
      return;
    }
    
    if (!this.initialized) await this.initializeServerLogger();
    
    if (this.serverLogger?.logAnalysisComplete) {
      await this.serverLogger.logAnalysisComplete(analysisType, duration, metadata);
    } else {
      console.log(`[AI ANALYSIS] ${analysisType} tamamlandı (${duration}ms)`);
    }
  }
}

// Export singleton instance
export const AILogger = new UniversalAILogger();