// Type-only imports to prevent client-side bundling
import type { QueryParams, DatabaseRow } from '@/types/database';

// Use 'any' for pg types to prevent client-side issues
type Pool = any;
type QueryResult<T = any> = any;
type QueryResultRow = any;
type PoolClient = any;

// PostgreSQL connection pool
let pool: Pool | null = null;
let isInitialized = false;
let isInitializing = false;
let isShuttingDown = false;

/**
 * PostgreSQL Pool Configuration
 */
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  // Connection pool settings
  max: 20,                    // Maximum number of clients in pool
  min: 2,                     // Minimum number of clients in pool
  idleTimeoutMillis: 30000,   // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
  
  // SSL configuration - check if connection string requires SSL
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? {
    rejectUnauthorized: false,
    require: true
  } : process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
};

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
    // Dynamically import pg only on server-side
    const { Pool } = await import('pg');

    // Create connection pool
    pool = new Pool(poolConfig);

    // Test connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    console.log("✅ PostgreSQL connection established");

    // Initialize auth schema - only if not exists
    try {
      const userTableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'users'
        );
      `);
      
      if (!userTableExists.rows[0].exists) {
        await initAuthSchemaPostgres();
        console.log("✅ Auth schema initialized");
      }
    } catch (error) {
      console.error("❌ Auth schema initialization error:", error);
    }

    // Run migrations - only once
    try {
      const migrationTableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = '_migrations'
        );
      `);
      
      if (!migrationTableExists.rows[0].exists) {
        // Create migration tracking table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS _migrations (
            name TEXT PRIMARY KEY,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
      }
      
      await runMigrationsPostgres();
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
    console.log("✅ PostgreSQL fully initialized");
  } catch (error) {
    console.error("❌ PostgreSQL initialization failed:", error);
    throw error;
  } finally {
    isInitializing = false;
  }
}

/**
 * Get PostgreSQL pool instance (Singleton Pattern)
 */
export async function getPool(): Promise<Pool> {
  if (pool && isInitialized) {
    return pool;
  }

  if (!isInitialized) {
    await initializeDatabase();
  }

  if (!pool) {
    throw new Error("PostgreSQL pool initialization failed");
  }

  return pool;
}

/**
 * Execute a query using the pool
 */
export async function query<T extends QueryResultRow = DatabaseRow>(
  text: string,
  params?: QueryParams
): Promise<QueryResult<T>> {
  const pool = await getPool();
  return pool.query<T>(text, params);
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<PoolClient> {
  const pool = await getPool();
  return pool.connect();
}

/**
 * Transaction wrapper for PostgreSQL
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Validate JSON before storing in database
 */
export function validateJSON(value: unknown): string {
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
export async function closePool(): Promise<void> {
  if (pool && !isShuttingDown) {
    isShuttingDown = true;
    try {
      console.log('🔒 Closing PostgreSQL connections...');
      await pool.end();
      console.log('✅ PostgreSQL connections closed gracefully');
    } catch (error) {
      console.error('❌ Error closing PostgreSQL:', error);
    }
  }
}

/**
 * Setup graceful shutdown handlers for process termination
 */
function setupGracefulShutdown(): void {
  const shutdownSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];
  
  shutdownSignals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`\n📡 Received ${signal}, shutting down gracefully...`);
      await closePool();
      process.exit(0);
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('❌ Uncaught Exception:', error);
    await closePool();
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    await closePool();
    process.exit(1);
  });
}

// Initialize graceful shutdown on module load
if (typeof process !== 'undefined') {
  setupGracefulShutdown();
}

/**
 * Initialize auth schema for PostgreSQL
 */
async function initAuthSchemaPostgres(): Promise<void> {
  const pool = await getPool();
  
  // Create tables with PostgreSQL syntax
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS memberships (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(org_id, user_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orchestrations (
      id TEXT PRIMARY KEY,
      file_name TEXT,
      file_size INTEGER,
      mime_type TEXT,
      progress INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      current_step TEXT,
      steps_json TEXT,
      result TEXT,
      error TEXT,
      warnings TEXT,
      duration_ms INTEGER,
      user_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      started_at TIMESTAMP,
      completed_at TIMESTAMP
    );
  `);

  // Create indexes
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_orchestrations_created_at 
    ON orchestrations(created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_orchestrations_status 
    ON orchestrations(status, created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_orchestrations_user 
    ON orchestrations(user_id, created_at DESC);
  `);
}

/**
 * Run migrations for PostgreSQL
 */
async function runMigrationsPostgres(): Promise<void> {
  // This will be handled separately in the migration process
  console.log("✅ PostgreSQL migrations will be handled separately");
}

/**
 * SQLite compatibility layer
 * These functions provide a similar API to better-sqlite3
 * to minimize code changes during migration
 */
export const compatibilityLayer = {
  /**
   * Mimic better-sqlite3's prepare().get() pattern
   */
  async prepareGet<T extends QueryResultRow = DatabaseRow>(sql: string, ...params: QueryParams): Promise<T | undefined> {
    const result = await query<T>(sql, params);
    return result.rows[0];
  },

  /**
   * Mimic better-sqlite3's prepare().all() pattern
   */
  async prepareAll<T extends QueryResultRow = DatabaseRow>(sql: string, ...params: QueryParams): Promise<T[]> {
    const result = await query<T>(sql, params);
    return result.rows;
  },

  /**
   * Mimic better-sqlite3's prepare().run() pattern
   */
  async prepareRun(sql: string, ...params: QueryParams): Promise<{ changes: number; lastID: number }> {
    const result = await query(sql, params);
    return {
      changes: result.rowCount || 0,
      lastID: 0 // PostgreSQL doesn't have lastID like SQLite
    };
  },

  /**
   * Mimic better-sqlite3's exec() for running raw SQL
   */
  async exec(sql: string): Promise<void> {
    await query(sql);
  }
};

// Export for backward compatibility during migration
export const getDB = () => {
  console.warn('⚠️ getDB() is deprecated, use getPool() or query() instead');
  return {
    prepare: (sql: string) => ({
      get: async (...params: QueryParams) => compatibilityLayer.prepareGet(sql, ...params),
      all: async (...params: QueryParams) => compatibilityLayer.prepareAll(sql, ...params),
      run: async (...params: QueryParams) => compatibilityLayer.prepareRun(sql, ...params),
    }),
    exec: compatibilityLayer.exec,
    transaction: transaction
  };
};
