import Database from "better-sqlite3";
import { initAuthSchema } from "./init-auth";
import { runMigrations } from "./run-migration";

let db: Database | null = null;
let isInitialized = false;
let isInitializing = false;
let isShuttingDown = false;

/**
 * Initialize database once and only once
 * Prevents race conditions and multiple initialization
 */
async function initializeDatabase(): Promise<void> {
  // Prevent multiple simultaneous initialization
  if (isInitialized || isInitializing) {
    // Wait for initialization to complete
    while (isInitializing && !isInitialized) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return;
  }

  isInitializing = true;

  try {
    // Create database connection
    db = new Database("procheff.db");
    
    // Enable WAL mode for better concurrency
    db.pragma("journal_mode = WAL");
    
    // Performance optimizations
    db.pragma("synchronous = NORMAL"); // Faster writes, still safe
    db.pragma("cache_size = -64000"); // 64MB cache
    db.pragma("temp_store = MEMORY"); // Store temp tables in memory

    // Initialize auth schema - only if not exists
    try {
      const userTableExists = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
      ).get();
      
      if (!userTableExists) {
        initAuthSchema();
        console.log("✅ Auth schema initialized");
      }
    } catch (error) {
      console.error("❌ Auth schema initialization error:", error);
    }

    // Run migrations - only once
    try {
      const migrationTableExists = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'"
      ).get();
      
      if (!migrationTableExists) {
        // Create migration tracking table
        db.prepare(`
          CREATE TABLE IF NOT EXISTS _migrations (
            name TEXT PRIMARY KEY,
            applied_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `).run();
      }
      
      runMigrations();
    } catch (error) {
      console.error("❌ Migration error:", error);
    }

    // Initialize semantic cache - async, don't block
    import("@/lib/ai/semantic-cache").then(({ initSemanticCache }) => {
      try {
        initSemanticCache();
      } catch (error) {
        // Already initialized, ignore
      }
    }).catch(() => {
      // Module not found or already initialized, ignore
    });

    isInitialized = true;
    console.log("✅ Database fully initialized");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  } finally {
    isInitializing = false;
  }
}

/**
 * Get database instance (Singleton Pattern)
 * - Single connection reused across application
 * - Thread-safe initialization
 * - Automatic retry on connection loss
 */
export function getDB(): Database {
  // Quick path for already initialized database
  if (db && isInitialized) {
    try {
      // Test connection is still alive
      db.prepare("SELECT 1").get();
      return db;
    } catch (error) {
      // Connection lost, reset and reinitialize
      console.log("⚠️ Database connection lost, reinitializing...");
      db = null;
      isInitialized = false;
    }
  }

  // Initialize if needed (synchronous wrapper)
  if (!isInitialized) {
    // Use sync initialization for compatibility
    const initSync = () => {
      if (isInitialized || isInitializing) return;
      
      isInitializing = true;
      try {
        // Create database connection
        db = new Database("procheff.db");
        
        // Enable WAL mode for better concurrency
        db.pragma("journal_mode = WAL");
        
        // Performance optimizations
        db.pragma("synchronous = NORMAL");
        db.pragma("cache_size = -64000");
        db.pragma("temp_store = MEMORY");

        // Check and init auth schema
        const userTableExists = db.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
        ).get();
        
        if (!userTableExists) {
          initAuthSchema();
        }

        // Check and run migrations
        const migrationTableExists = db.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'"
        ).get();
        
        if (!migrationTableExists) {
          db.prepare(`
            CREATE TABLE IF NOT EXISTS _migrations (
              name TEXT PRIMARY KEY,
              applied_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
          `).run();
        }
        
        try {
          runMigrations();
        } catch (error) {
          // Migrations already applied
        }

        isInitialized = true;
      } finally {
        isInitializing = false;
      }
    };
    
    initSync();
  }

  if (!db) {
    throw new Error("Database initialization failed");
  }

  return db;
}

/**
 * Initialize DataPoolManager auto cleanup (only in Node.js environment)
 */
function initializeAutoCleanup() {
  if (typeof setInterval !== 'undefined') {
    try {
      // Dynamic import to avoid circular dependencies
      import('@/lib/state/data-pool-manager').then(({ DataPoolManager }) => {
        DataPoolManager.initializeAutoCleanup();
      }).catch(() => {
        // Ignore if module not available or in browser
      });
    } catch (error) {
      // Ignore if module not available or in browser
    }
  }
  
  // Register graceful shutdown handlers
  if (typeof process !== 'undefined') {
    setupGracefulShutdown();
  }
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
  return db.transaction(fn) as unknown as T;
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
