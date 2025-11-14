#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Fixed Data Migration Script
 * Imports SQLite data to PostgreSQL with proper error handling
 * and PostgreSQL-compatible syntax.
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const Database = require('better-sqlite3');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;
const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || '../../procheff.db';
const DATA_DIR = path.join(__dirname, 'data-export');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('sslmode=require') ? {
    rejectUnauthorized: false,
    require: true
  } : false
});

// Schema mappings for tables with different structures
const SCHEMA_MAPPINGS = {
  chat_analytics: {
    // Skip this table - too many schema differences
    skip: true,
    reason: 'Schema incompatible - needs manual mapping'
  }
};

// Tables to migrate (excluding problematic ones)
const TABLES_TO_MIGRATE = [
  // Already exists in PostgreSQL - just import data
  'data_pools', 
  'gramaj_standards',
  'menu_categories',
  'menu_items',
  'recipes',
  
  // Missing in PostgreSQL - create table first
  'analysis_fts_config',
  'analysis_fts_data', 
  'api_provider_health',
  'brand_mappings',
  'integration_configs',
  'market_sources',
  'markets',
  'migrations',
  'notification_templates',
  'performance_profiles',
  'performance_settings',
  'proactive_triggers',
  'product_cards',
  'product_catalog_fts_config',
  'product_catalog_fts_data',
  'webhooks'
];

async function fixedMigration() {
  console.log('🚀 Fixed Complete Migration Starting...\n');
  
  try {
    const sqlite = new Database(SQLITE_DB_PATH);
    const pgClient = await pool.connect();
    
    console.log('✅ Database connections established\n');
    
    // Get existing PostgreSQL tables
    const pgTablesResult = await pgClient.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    const existingPgTables = pgTablesResult.rows.map(r => r.table_name);
    
    let imported = 0;
    let created = 0;
    let skipped = 0;
    
    for (const tableName of TABLES_TO_MIGRATE) {
      console.log(`📋 Processing: ${tableName}`);
      
      // Check if table should be skipped
      if (SCHEMA_MAPPINGS[tableName]?.skip) {
        console.log(`   ⚠️  Skipping: ${SCHEMA_MAPPINGS[tableName].reason}\n`);
        skipped++;
        continue;
      }
      
      // Check if JSON export exists
      const jsonFile = path.join(DATA_DIR, `${tableName}.json`);
      if (!fs.existsSync(jsonFile)) {
        console.log(`   ⚠️  No export file found, skipping\n`);
        skipped++;
        continue;
      }
      
      // Load data
      const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
      if (!data || data.length === 0) {
        console.log(`   📭 No data to import\n`);
        skipped++;
        continue;
      }
      
      console.log(`   📊 Found ${data.length} rows`);
      
      // Check if table exists in PostgreSQL
      if (!existingPgTables.includes(tableName)) {
        console.log(`   🔨 Creating table schema...`);
        try {
          await createTableFromDataFixed(pgClient, sqlite, tableName);
          created++;
        } catch (createError) {
          console.log(`   ❌ Failed to create table: ${createError.message}`);
          console.log(`   ⚠️  Skipping ${tableName}\n`);
          skipped++;
          continue;
        }
      }
      
      // Import data
      try {
        await importTableData(pgClient, tableName, data);
        imported++;
        console.log(`   ✅ ${tableName} completed\n`);
      } catch (importError) {
        console.log(`   ❌ Import failed: ${importError.message}`);
        console.log(`   ⚠️  Skipping data import for ${tableName}\n`);
        skipped++;
      }
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 FIXED MIGRATION SUMMARY');
    console.log(`   📤 Tables imported: ${imported}`);
    console.log(`   🔨 Tables created: ${created}`);
    console.log(`   ⚠️  Tables skipped: ${skipped}`);
    console.log('✅ Migration completed!');
    
    pgClient.release();
    sqlite.close();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

async function createTableFromDataFixed(pgClient, sqlite, tableName) {
  try {
    // Get SQLite schema
    const schemaInfo = sqlite.prepare(`PRAGMA table_info(${tableName})`).all();
    
    const columns = schemaInfo.map(col => {
      let pgType = 'TEXT'; // Default fallback
      
      // Convert SQLite types to PostgreSQL types
      switch (col.type.toUpperCase()) {
        case 'INTEGER':
          if (col.pk) {
            pgType = 'SERIAL PRIMARY KEY';
          } else {
            pgType = 'INTEGER';
          }
          break;
        case 'REAL':
        case 'NUMERIC':
          pgType = 'REAL';
          break;
        case 'TEXT':
        case 'VARCHAR':
          pgType = 'TEXT';
          break;
        case 'DATETIME':
        case 'TIMESTAMP':
          pgType = 'TIMESTAMP';
          break;
        case 'BOOLEAN':
          pgType = 'BOOLEAN';
          break;
        default:
          pgType = 'TEXT';
      }
      
      // Handle NOT NULL
      const nullable = col.notnull ? 'NOT NULL' : '';
      
      // Handle default values - fix boolean defaults
      let defaultVal = '';
      if (col.dflt_value !== null && col.dflt_value !== undefined) {
        if (col.type.toUpperCase() === 'BOOLEAN') {
          // Convert SQLite integer boolean defaults to PostgreSQL boolean
          if (col.dflt_value === '0') {
            defaultVal = 'DEFAULT false';
          } else if (col.dflt_value === '1') {
            defaultVal = 'DEFAULT true';
          }
        } else if (col.type.toUpperCase() === 'TEXT' || col.type.toUpperCase() === 'VARCHAR') {
          // Quote string defaults
          defaultVal = `DEFAULT '${col.dflt_value.replace(/'/g, "''")}'`;
        } else {
          defaultVal = `DEFAULT ${col.dflt_value}`;
        }
      }
      
      return `${col.name} ${pgType} ${nullable} ${defaultVal}`.trim();
    });
    
    const createQuery = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        ${columns.join(',\n        ')}
      )
    `;
    
    await pgClient.query(createQuery);
    console.log(`   ✅ Table ${tableName} created`);
    
  } catch (error) {
    console.log(`   ❌ Failed to create table ${tableName}:`, error.message);
    throw error;
  }
}

async function importTableData(pgClient, tableName, data) {
  try {
    // Clear existing data
    await pgClient.query(`TRUNCATE TABLE ${tableName} CASCADE`);
    
    // Get column names from first row
    const columns = Object.keys(data[0]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const insertQuery = `
      INSERT INTO ${tableName} (${columns.join(', ')}) 
      VALUES (${placeholders})
    `;
    
    // Insert all rows
    let insertedCount = 0;
    for (const row of data) {
      try {
        const values = columns.map(col => {
          let value = row[col];
          
          // Convert timestamps
          if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}.*T.*:.*:.*Z?$/)) {
            value = new Date(value).toISOString();
          }
          
          // Convert boolean strings to boolean
          if (typeof value === 'string' && (value === 'true' || value === 'false')) {
            value = value === 'true';
          }
          
          return value;
        });
        
        await pgClient.query(insertQuery, values);
        insertedCount++;
        
      } catch (rowError) {
        // Skip problematic rows but continue
        if (insertedCount === 0) {
          console.log(`   ⚠️  Row error: ${rowError.message}`);
        }
      }
    }
    
    console.log(`   📤 Imported ${insertedCount}/${data.length} rows`);
    
  } catch (error) {
    console.log(`   ❌ Import error: ${error.message}`);
    throw error;
  }
}

fixedMigration();