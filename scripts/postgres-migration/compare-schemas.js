#!/usr/bin/env node

/**
 * Schema Comparison Tool
 * Compares SQLite and PostgreSQL schemas
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const Database = require('better-sqlite3');
const { Pool } = require('pg');
const fs = require('fs');

const DATABASE_URL = process.env.DATABASE_URL;
const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || '../../procheff.db';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('sslmode=require') ? {
    rejectUnauthorized: false,
    require: true
  } : false
});

async function compareSchemas() {
  console.log('🔍 Schema Comparison Starting...\n');
  
  // Critical tables to compare
  const criticalTables = ['logs', 'market_prices', 'tenders', 'chat_analytics'];
  
  try {
    // Initialize SQLite
    const sqlite = new Database(SQLITE_DB_PATH);
    console.log('✅ SQLite connected\n');
    
    // Initialize PostgreSQL
    const pgClient = await pool.connect();
    console.log('✅ PostgreSQL connected\n');
    
    for (const tableName of criticalTables) {
      console.log(`📋 Comparing table: ${tableName}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Get SQLite columns
      const sqliteColumns = sqlite.prepare(`PRAGMA table_info(${tableName})`).all();
      console.log('📦 SQLite columns:');
      sqliteColumns.forEach(col => {
        console.log(`   ${col.name} (${col.type})`);
      });
      
      // Get PostgreSQL columns
      const pgResult = await pgClient.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = '${tableName}'
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
      
      console.log('\n🐘 PostgreSQL columns:');
      pgResult.rows.forEach(col => {
        console.log(`   ${col.column_name} (${col.data_type})`);
      });
      
      // Find differences
      const sqliteColNames = sqliteColumns.map(c => c.name);
      const pgColNames = pgResult.rows.map(c => c.column_name);
      
      const sqliteOnly = sqliteColNames.filter(c => !pgColNames.includes(c));
      const pgOnly = pgColNames.filter(c => !sqliteColNames.includes(c));
      
      if (sqliteOnly.length > 0) {
        console.log('\n⚠️  SQLite only columns:', sqliteOnly.join(', '));
      }
      
      if (pgOnly.length > 0) {
        console.log('\n⚠️  PostgreSQL only columns:', pgOnly.join(', '));
      }
      
      if (sqliteOnly.length === 0 && pgOnly.length === 0) {
        console.log('\n✅ Schemas match!');
      }
      
      console.log('\n');
    }
    
    pgClient.release();
    sqlite.close();
    
  } catch (error) {
    console.error('❌ Comparison failed:', error);
  } finally {
    await pool.end();
  }
}

compareSchemas();