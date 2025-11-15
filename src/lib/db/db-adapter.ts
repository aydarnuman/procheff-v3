/**
 * Database Adapter - Dual Mode Support
 * Supports both SQLite and PostgreSQL with seamless switching
 * Controlled via DB_MODE environment variable
 *
 * Modes:
 * - sqlite: Use SQLite (default, production current)
 * - postgres: Use PostgreSQL only
 * - dual: Use PostgreSQL with SQLite fallback
 */

import type { DatabaseRow, QueryParams } from '@/types/database';
import type Database from 'better-sqlite3';

// Dynamic imports to avoid circular dependencies
let getSQLiteDB: (() => Database) | null = null;
let pgQuery: ((sql: string, params?: QueryParams) => Promise<{ rows: DatabaseRow[]; rowCount: number | null }>) | null = null;
let getClient: (() => Promise<{ query: (sql: string, params?: QueryParams) => Promise<unknown>; release: () => void }>) | null = null;

// Determine database mode based on available environment variables
const USE_POSTGRES = process.env.USE_POSTGRES === 'true';
const HAS_DATABASE_URL = !!process.env.DATABASE_URL;
const IS_BUILD_PHASE = process.env.NEXT_PHASE === 'phase-production-build' || process.env.SKIP_BUILD_DB_INIT === 'true';

// Build aşamasında her zaman SQLite kullan; runtime'da env'e göre belirle
const DB_MODE = IS_BUILD_PHASE
  ? 'sqlite'
  : (process.env.DB_MODE || ((USE_POSTGRES && HAS_DATABASE_URL) || HAS_DATABASE_URL ? 'postgres' : 'sqlite'));

/**
 * Universal Database Interface
 * Provides consistent API across SQLite and PostgreSQL
 */
export interface UniversalDB {
  /**
   * Execute query and return all rows
   */
  query: <T = DatabaseRow>(sql: string, params?: QueryParams) => Promise<T[]>;

  /**
   * Execute query and return first row
   */
  queryOne: <T = DatabaseRow>(sql: string, params?: QueryParams) => Promise<T | undefined>;

  /**
   * Execute statement (INSERT, UPDATE, DELETE)
   */
  execute: (sql: string, params?: QueryParams) => Promise<{ changes: number; lastID?: number }>;

  /**
   * Execute within transaction
   */
  transaction: <T>(callback: () => Promise<T>) => Promise<T>;

  /**
   * Get current mode
   */
  getMode: () => string;
}

/**
 * Get SQL syntax based on current database mode
 */
export function getSQLSyntax() {
  const isPostgres = DB_MODE === 'postgres' || DB_MODE === 'dual';
  
  return {
    // Primary key syntax
    textPrimaryKey: isPostgres ? 'TEXT PRIMARY KEY' : 'TEXT PRIMARY KEY',
    serialPrimaryKey: isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT',
    
    // Timestamp syntax  
    timestamp: isPostgres ? 'TIMESTAMPTZ' : 'TEXT',
    timestampDefault: isPostgres ? 'TIMESTAMPTZ DEFAULT NOW()' : 'TEXT DEFAULT (datetime(\'now\'))',
    
    // Date/time operations
    datetime: {
      now: isPostgres ? 'CURRENT_TIMESTAMP' : "datetime('now')",
      subtract24Hours: isPostgres ? "CURRENT_TIMESTAMP - INTERVAL '24 hours'" : "datetime('now', '-24 hours')"
    },
    
    // Boolean syntax
    boolean: isPostgres ? 'BOOLEAN' : 'INTEGER',
    booleanDefault: (value: boolean) => isPostgres ? `BOOLEAN DEFAULT ${value}` : `INTEGER DEFAULT ${value ? 1 : 0}`,
    
    // Text types
    text: 'TEXT',
    integer: 'INTEGER',
    
    isPostgres,
    isSQLite: !isPostgres
  };
}

/**
 * Initialize imports lazily
 */
async function initializeImports() {
  if (DB_MODE === 'postgres' || DB_MODE === 'dual') {
    const pgModule = await import('./postgres-client');
    pgQuery = pgModule.query;
    getClient = pgModule.getClient;
  }
  
  if (DB_MODE === 'sqlite' || DB_MODE === 'dual') {
    const sqliteModule = await import('./sqlite-client');
    getSQLiteDB = sqliteModule.getDB;
  }
}

/**
 * Get database adapter based on current mode
 */
export async function getDBAdapter(): Promise<UniversalDB> {
  await initializeImports();
  
  if (DB_MODE === 'postgres') {
    return getPostgresAdapter();
  } else if (DB_MODE === 'dual') {
    return getDualAdapter();
  }
  
  return getSQLiteAdapter();
}

/**
 * SQLite Adapter (Sync → Async wrapper)
 * Wraps synchronous better-sqlite3 API with async interface
 */
function getSQLiteAdapter(): UniversalDB {
  if (!getSQLiteDB) {
    throw new Error('SQLite not initialized');
  }
  
  const db = getSQLiteDB();
  
  return {
    async query<T = DatabaseRow>(sql: string, params: QueryParams = []): Promise<T[]> {
      try {
        return db.prepare(sql).all(...params) as T[];
      } catch (error) {
        console.error('[SQLite] Query error:', error);
        throw error;
      }
    },

    async queryOne<T = DatabaseRow>(sql: string, params: QueryParams = []): Promise<T | undefined> {
      try {
        return db.prepare(sql).get(...params) as T | undefined;
      } catch (error) {
        console.error('[SQLite] QueryOne error:', error);
        throw error;
      }
    },

    async execute(sql: string, params: QueryParams = []): Promise<{ changes: number; lastID?: number }> {
      try {
        const info = db.prepare(sql).run(...params);
        return {
          changes: info.changes,
          lastID: typeof info.lastInsertRowid === 'number' ? info.lastInsertRowid : undefined
        };
      } catch (error) {
        console.error('[SQLite] Execute error:', error);
        throw error;
      }
    },
    
    async transaction<T>(callback: () => Promise<T>): Promise<T> {
      const txn = db.transaction(callback);
      return txn();
    },
    
    getMode: () => 'sqlite'
  };
}

/**
 * PostgreSQL Adapter
 * Native async PostgreSQL implementation
 */
function getPostgresAdapter(): UniversalDB {
  if (!pgQuery || !getClient) {
    throw new Error('PostgreSQL not initialized');
  }
  
  return {
    async query<T = DatabaseRow>(sql: string, params: QueryParams = []): Promise<T[]> {
      try {
        if (!pgQuery) throw new Error('PostgreSQL not initialized');
        const result = await pgQuery(sql, params);
        return result.rows as T[];
      } catch (error) {
        console.error('[PostgreSQL] Query error:', error);
        throw error;
      }
    },

    async queryOne<T = DatabaseRow>(sql: string, params: QueryParams = []): Promise<T | undefined> {
      try {
        if (!pgQuery) throw new Error('PostgreSQL not initialized');
        const result = await pgQuery(sql, params);
        return result.rows[0] as T | undefined;
      } catch (error) {
        console.error('[PostgreSQL] QueryOne error:', error);
        throw error;
      }
    },

    async execute(sql: string, params: QueryParams = []): Promise<{ changes: number; lastID?: number }> {
      try {
        if (!pgQuery) throw new Error('PostgreSQL not initialized');
        const result = await pgQuery(sql, params);
        return {
          changes: result.rowCount || 0,
          lastID: undefined // PostgreSQL doesn't have lastID
        };
      } catch (error) {
        console.error('[PostgreSQL] Execute error:', error);
        throw error;
      }
    },
    
    async transaction<T>(callback: () => Promise<T>): Promise<T> {
      if (!getClient) throw new Error('PostgreSQL not initialized');
      
      const client = await getClient();
      try {
        await client.query('BEGIN');
        const result = await callback();
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    
    getMode: () => 'postgres'
  };
}

/**
 * Dual Adapter - PostgreSQL with SQLite fallback
 * Writes to PostgreSQL, falls back to SQLite on error
 */
function getDualAdapter(): UniversalDB {
  if (!pgQuery || !getClient || !getSQLiteDB) {
    throw new Error('Dual mode requires both databases');
  }
  
  const pgAdapter = getPostgresAdapter();
  const sqliteAdapter = getSQLiteAdapter();
  
  return {
    async query<T = DatabaseRow>(sql: string, params: QueryParams = []): Promise<T[]> {
      try {
        return await pgAdapter.query<T>(sql, params);
      } catch (error) {
        console.warn('[Dual] PostgreSQL query failed, falling back to SQLite:', error);
        return await sqliteAdapter.query<T>(sql, params);
      }
    },

    async queryOne<T = DatabaseRow>(sql: string, params: QueryParams = []): Promise<T | undefined> {
      try {
        return await pgAdapter.queryOne<T>(sql, params);
      } catch (error) {
        console.warn('[Dual] PostgreSQL queryOne failed, falling back to SQLite:', error);
        return await sqliteAdapter.queryOne<T>(sql, params);
      }
    },

    async execute(sql: string, params: QueryParams = []): Promise<{ changes: number; lastID?: number }> {
      try {
        const result = await pgAdapter.execute(sql, params);
        // Also execute on SQLite for consistency
        await sqliteAdapter.execute(sql, params).catch(() => {});
        return result;
      } catch (error) {
        console.warn('[Dual] PostgreSQL execute failed, falling back to SQLite:', error);
        return await sqliteAdapter.execute(sql, params);
      }
    },
    
    async transaction<T>(callback: () => Promise<T>): Promise<T> {
      try {
        return await pgAdapter.transaction(callback);
      } catch (error) {
        console.warn('[Dual] PostgreSQL transaction failed, falling back to SQLite:', error);
        return await sqliteAdapter.transaction(callback);
      }
    },
    
    getMode: () => 'dual'
  };
}

/**
 * Legacy getDB() compatibility wrapper
 * ⚠️ This function is now async and returns UniversalDB interface
 * 
 * @deprecated Use getDBAdapter() directly instead
 */
export async function getDB(): Promise<UniversalDB> {
  return getDBAdapter();
}

/**
 * Sync version of getDB for backward compatibility
 * ⚠️ Only works with SQLite mode
 * 
 * @deprecated This will be removed in future versions
 */
export function getDBSync(): Database {
  if (DB_MODE !== 'sqlite') {
    throw new Error('getDBSync() only works with SQLite mode. Use getDBAdapter() for async operations.');
  }
  
  const sqliteModule = require('./sqlite-client');
  return sqliteModule.getDB();
}

/**
 * Check if database is in async mode (PostgreSQL or Dual)
 */
export function isAsyncMode(): boolean {
  return DB_MODE === 'postgres' || DB_MODE === 'dual';
}

/**
 * Get current database mode
 */
export function getDBMode(): string {
  return DB_MODE;
}

// Build aşamasında loglama yapma
if (!IS_BUILD_PHASE) {
  console.log(`🗄️  Database mode: ${DB_MODE.toUpperCase()}`);
}



