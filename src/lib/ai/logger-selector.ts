/**
 * Logger Selector - Chooses between SQLite and PostgreSQL logger
 * based on environment variable
 */

// Use PostgreSQL for AI operations if enabled
const USE_POSTGRES_FOR_AI = process.env.USE_POSTGRES_FOR_AI === 'true' || 
                            process.env.DATABASE_URL?.includes('postgresql') ||
                            process.env.DATABASE_URL?.includes('postgres');

// Dynamic import based on environment
let AILogger: any;

if (USE_POSTGRES_FOR_AI) {
  // Use PostgreSQL logger for AI operations
  import('./logger-postgres').then(module => {
    AILogger = module.AILogger;
    console.log('🐘 Using PostgreSQL for AI logging');
  });
} else {
  // Fallback to SQLite logger
  import('./logger').then(module => {
    AILogger = module.AILogger;
    console.log('📦 Using SQLite for AI logging');
  });
}

// Export a proxy that waits for the logger to be loaded
export const AILoggerProxy = new Proxy({}, {
  get(target, prop) {
    if (!AILogger) {
      // If logger not loaded yet, use console as fallback
      if (prop === 'info') return console.log;
      if (prop === 'error') return console.error;
      if (prop === 'warn') return console.warn;
      if (prop === 'success') return console.log;
      return () => {};
    }
    return AILogger[prop];
  }
});

export { AILoggerProxy as AILogger };
