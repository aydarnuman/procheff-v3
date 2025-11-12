import Database from "better-sqlite3";
import { initAuthSchema } from "./init-auth";
import { runMigrations } from "./run-migration";

let db: Database.Database;
let isShuttingDown = false;

/**
 * Get database instance (Singleton Pattern)
 * - Single connection reused across application
 * - WAL mode enabled for better concurrency
 * - Prepared statements cached automatically
 */
export function getDB(): Database.Database {
  if (!db) {
    db = new Database("procheff.db");
    
    // Enable WAL mode for better concurrency
    db.pragma("journal_mode = WAL");
    
    // Performance optimizations
    db.pragma("synchronous = NORMAL"); // Faster writes, still safe
    db.pragma("cache_size = -64000"); // 64MB cache
    db.pragma("temp_store = MEMORY"); // Store temp tables in memory

    // Initialize auth schema on first connection
    try {
      initAuthSchema();
    } catch {
      // Tables may already exist, ignore errors
      console.log("Auth schema already initialized");
    }

    // Run migrations
    try {
      runMigrations();
    } catch {
      // Migrations may already be applied, ignore errors
      console.log("Migrations already applied");
    }

    // Initialize semantic cache
    try {
      // Dynamic import to avoid circular dependencies
      import("@/lib/ai/semantic-cache").then(({ initSemanticCache }) => {
        initSemanticCache();
      }).catch(() => {
        console.log("Semantic cache already initialized");
      });
    } catch {
      console.log("Semantic cache already initialized");
    }

    // Initialize DataPoolManager auto cleanup (only in Node.js environment)
    if (typeof setInterval !== 'undefined') {
      try {
        // Dynamic import to avoid circular dependencies
        import('@/lib/state/data-pool-manager').then(({ DataPoolManager }) => {
          DataPoolManager.initializeAutoCleanup();
        }).catch(() => {
          // Ignore if module not available or in browser
        });
      } catch {
        // Ignore if module not available or in browser
      }
    }
    
    // Register graceful shutdown handlers
    if (typeof process !== 'undefined') {
      setupGracefulShutdown();
    }
  }
  return db;
}

/**
 * Create a transaction wrapper for bulk operations
 * - Ensures atomicity
 * - Better performance for multiple inserts
 * 
 * @example
 * const insertMany = transaction((items: any[]) => {
 *   const stmt = db.prepare('INSERT INTO ...');
 *   items.forEach(item => stmt.run(item));
 * });
 * insertMany(items);
 */
export function transaction<T extends (...args: any[]) => any>(fn: T): T {
  const db = getDB();
  return db.transaction(fn) as T;
}

/**
 * Validate JSON before storing in database
 * - Prevents corruption
 * - Ensures parseability
 */
export function validateJSON(value: any): string {
  try {
    const jsonString = JSON.stringify(value);
    // Verify it can be parsed back
    JSON.parse(jsonString);
    return jsonString;
  } catch (error) {
    throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Graceful shutdown - closes database connection properly
 */
export function closeDB(): void {
  if (db && !isShuttingDown) {
    isShuttingDown = true;
    try {
      console.log('🔒 Closing database connection...');
      
      // Run checkpoint to ensure all WAL data is committed
      db.pragma('wal_checkpoint(TRUNCATE)');
      
      // Close the database
      db.close();
      console.log('✅ Database connection closed gracefully');
    } catch (error) {
      console.error('❌ Error closing database:', error);
    }
  }
}

/**
 * Setup graceful shutdown handlers for process termination
 */
function setupGracefulShutdown(): void {
  const shutdownSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];
  
  shutdownSignals.forEach((signal) => {
    process.on(signal, () => {
      console.log(`\n📡 Received ${signal}, shutting down gracefully...`);
      closeDB();
      process.exit(0);
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    closeDB();
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    closeDB();
    process.exit(1);
  });
}
