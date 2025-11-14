#!/usr/bin/env node

/**
 * PostgreSQL Schema Migration Script
 * Converts SQLite SQL to PostgreSQL and creates tables
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration
const DATABASE_URL = process.env.DATABASE_URL;
const MIGRATIONS_DIR = path.join(__dirname, '../../src/lib/db/migrations');

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('sslmode=require') ? {
    rejectUnauthorized: false,
    require: true
  } : false
});

/**
 * Convert SQLite SQL to PostgreSQL SQL
 */
function convertSQLiteToPostgres(sql) {
  let converted = sql;
  
  // INTEGER PRIMARY KEY AUTOINCREMENT -> SERIAL PRIMARY KEY
  converted = converted.replace(
    /INTEGER PRIMARY KEY AUTOINCREMENT/gi,
    'SERIAL PRIMARY KEY'
  );
  
  // TEXT DEFAULT CURRENT_TIMESTAMP -> TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  converted = converted.replace(
    /(\w+)\s+TEXT\s+DEFAULT\s+CURRENT_TIMESTAMP/gi,
    '$1 TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
  );
  
  // created_at TEXT -> created_at TIMESTAMP
  converted = converted.replace(
    /(\w+_at)\s+TEXT(?!\s+DEFAULT)/gi,
    '$1 TIMESTAMP'
  );
  
  // DATETIME -> TIMESTAMP
  converted = converted.replace(/DATETIME/gi, 'TIMESTAMP');
  
  // INTEGER DEFAULT 0 (for booleans) -> BOOLEAN DEFAULT FALSE
  converted = converted.replace(
    /(is_\w+|active|enabled)\s+INTEGER\s+DEFAULT\s+0/gi,
    '$1 BOOLEAN DEFAULT FALSE'
  );
  
  converted = converted.replace(
    /(is_\w+|active|enabled)\s+INTEGER\s+DEFAULT\s+1/gi,
    '$1 BOOLEAN DEFAULT TRUE'
  );
  
  // Remove SQLite-specific CHECK constraints
  converted = converted.replace(/CHECK\s*\([^)]*\)/gi, '');
  
  // Fix CREATE OR REPLACE (not supported in PostgreSQL for tables)
  converted = converted.replace(/CREATE OR REPLACE TABLE/gi, 'CREATE TABLE');
  
  // Fix INSERT OR REPLACE/INSERT OR IGNORE
  converted = converted.replace(/INSERT OR REPLACE INTO/gi, 'INSERT INTO');
  converted = converted.replace(/INSERT OR IGNORE INTO/gi, 'INSERT INTO');
  
  // Fix strftime function calls
  converted = converted.replace(/strftime\s*\(\s*'[^']*'\s*,\s*'now'\s*\)/gi, 'NOW()');
  converted = converted.replace(/strftime\s*\(\s*'[^']*'\s*,\s*CURRENT_TIMESTAMP\s*\)/gi, 'NOW()');
  
  // Fix DEFAULT 'now' to DEFAULT NOW()
  converted = converted.replace(/DEFAULT\s+'now'/gi, 'DEFAULT NOW()');
  
  // sqlite_master -> information_schema.tables
  converted = converted.replace(/sqlite_master/gi, 'information_schema.tables');
  
  // Remove SQLite pragmas
  converted = converted.replace(/PRAGMA\s+[^;]+;/gi, '');
  
  // Fix AUTOINCREMENT without PRIMARY KEY
  converted = converted.replace(/\bAUTOINCREMENT\b/gi, '');
  
  // Fix INTEGER to BOOLEAN for is_ columns without DEFAULT
  converted = converted.replace(/(is_\w+)\s+INTEGER(?!\s+DEFAULT)/gi, '$1 BOOLEAN');
  
  return converted;
}

/**
 * Migrate database schema
 */
async function migrateSchema() {
  console.log('🚀 PostgreSQL Schema Migration Starting...\n');
  console.log(`🗄️  Database: ${DATABASE_URL.split('@')[1]}\n`);
  
  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL\n');
    client.release();
    
    // Get migration files
    const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    console.log(`📋 Found ${migrationFiles.length} migration files\n`);
    
    const stats = {
      total: migrationFiles.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
    
    // Create migrations tracking table
    console.log('📝 Creating migrations tracking table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ Migrations table ready\n');
    
    // Run each migration
    for (const file of migrationFiles) {
      try {
        // Check if already applied
        const checkResult = await pool.query(
          'SELECT name FROM _migrations WHERE name = $1',
          [file]
        );
        
        if (checkResult.rows.length > 0) {
          console.log(`⏭️  ${file} - Already applied`);
          stats.skipped++;
          continue;
        }
        
        console.log(`📄 Migrating: ${file}`);
        
        // Read migration file
        const sqliteSql = fs.readFileSync(
          path.join(MIGRATIONS_DIR, file),
          'utf-8'
        );
        
        // Convert to PostgreSQL
        const postgresSql = convertSQLiteToPostgres(sqliteSql);
        
        // Execute migration
        await pool.query('BEGIN');
        await pool.query(postgresSql);
        await pool.query(
          'INSERT INTO _migrations (name) VALUES ($1)',
          [file]
        );
        await pool.query('COMMIT');
        
        console.log(`   ✅ Successfully applied\n`);
        stats.successful++;
        
      } catch (error) {
        await pool.query('ROLLBACK');
        
        // Check if error is ignorable (table already exists, etc.)
        const ignorableErrors = [
          'already exists',
          'duplicate',
          'does not exist' // Some migrations reference tables that don't exist yet
        ];
        
        const isIgnorable = ignorableErrors.some(msg =>
          error.message.toLowerCase().includes(msg.toLowerCase())
        );
        
        if (isIgnorable) {
          console.log(`   ⚠️  ${error.message} (ignorable)\n`);
          stats.skipped++;
        } else {
          console.log(`   ❌ Failed: ${error.message}\n`);
          stats.failed++;
          stats.errors.push({ file, error: error.message });
        }
      }
    }
    
    // Summary
    console.log('━'.repeat(60));
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successful: ${stats.successful}`);
    console.log(`   ⏭️  Skipped: ${stats.skipped}`);
    console.log(`   ❌ Failed: ${stats.failed}`);
    
    if (stats.errors.length > 0) {
      console.log('\n❌ Errors:');
      stats.errors.forEach(err => {
        console.log(`   - ${err.file}: ${err.error}`);
      });
    }
    
    // Verify tables
    console.log('\n🔍 Verifying tables...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`   ✅ Found ${tablesResult.rows.length} tables:`);
    tablesResult.rows.forEach(row => {
      console.log(`      - ${row.table_name}`);
    });
    
    console.log('\n✅ Schema migration completed!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
migrateSchema().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

