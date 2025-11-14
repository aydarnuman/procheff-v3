/**
 * Database Type Definitions
 * Universal types for database operations across SQLite and PostgreSQL
 */

import type { QueryResult as PgQueryResult, QueryResultRow } from 'pg';

/**
 * Query parameters - safe type for SQL parameters
 */
export type QueryParams = unknown[];

/**
 * Generic database row - flexible key-value structure
 * Compatible with PostgreSQL QueryResultRow and common database value types
 */
export type DatabaseRow = Record<string, unknown>;

/**
 * Query result wrapper
 */
export interface QueryResult<T = DatabaseRow> {
  rows: T[];
  rowCount: number | null;
  fields?: Array<{ name: string; dataTypeID: number }>;
}

/**
 * Query options
 */
export interface QueryOptions {
  timeout?: number;
  cache?: boolean;
  maxRows?: number;
}

/**
 * Transaction callback type
 */
export type TransactionCallback<T> = () => Promise<T>;

/**
 * Database connection info
 */
export interface DatabaseInfo {
  type: 'sqlite' | 'postgres';
  version: string;
  connected: boolean;
}

/**
 * Re-export PostgreSQL QueryResult for convenience
 */
export type PostgresQueryResult<T extends QueryResultRow = QueryResultRow> = PgQueryResult<T>;
