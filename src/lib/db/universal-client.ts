/**
 * Universal Database Client
 *
 * This module provides a unified interface for database operations
 * that works seamlessly with both SQLite and PostgreSQL.
 *
 * The actual database mode is controlled by the DB_MODE environment variable
 * in db-adapter.ts:
 * - 'sqlite': Use SQLite (default)
 * - 'postgres': Use PostgreSQL only
 * - 'dual': Use PostgreSQL with SQLite fallback
 *
 * Usage:
 * ```typescript
 * import { getDatabase } from '@/lib/db/universal-client';
 *
 * const db = await getDatabase();
 * const users = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
 * const user = await db.queryOne('SELECT * FROM users WHERE id = $1', [userId]);
 * await db.execute('INSERT INTO users (name, email) VALUES ($1, $2)', [name, email]);
 * ```
 *
 * Note: For PostgreSQL, use $1, $2, $3 placeholders instead of ?
 */

// Core database adapter
export { getDBAdapter as getDatabase } from './db-adapter';
export type { UniversalDB } from './db-adapter';
export { getDBMode, isAsyncMode } from './db-adapter';

// PostgreSQL-specific utilities (will use DB_MODE from environment)
export { transaction, validateJSON } from './postgres-client';
