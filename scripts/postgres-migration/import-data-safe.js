#!/usr/bin/env node

/**
 * Safe PostgreSQL Data Import Script
 * Imports data with better error handling and type conversion
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;
const DATA_DIR = path.join(__dirname, 'data-export');

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

// Tables that exist in PostgreSQL
const EXISTING_TABLES = [
  'users',
  'organizations',
  'memberships',
  'notifications',
  'orchestrations',
  'analysis_history',
  'data_pools',
  'ai_logs',
  'logs',
  'tenders',
  'chat_analytics',
  'market_prices',
  'menu_categories',
  'menu_items',
  'recipe_ingredients',
  'recipes',
  'user_menus',
  'gramaj_standards'
];

/**
 * Convert SQLite boolean values to PostgreSQL
 */
function convertValue(value, columnName) {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return null;
  }
  
  // Convert SQLite boolean (0/1) to PostgreSQL boolean
  if ((columnName.startsWith('is_') || columnName === 'active' || columnName === 'enabled' || columnName === 'is_read') && typeof value === 'number') {
    return value === 1;
  }
  
  return value;
}

/**
 * Import data for a single table
 */
async function importTable(tableName, data) {
  if (data.length === 0) {
    console.log(`   ⚪ No data to import`);
    return { imported: 0, errors: 0 };
  }
  
  const stats = { imported: 0, errors: 0 };
  const columns = Object.keys(data[0]);
  
  // Prepare insert statement
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const insertSql = `
    INSERT INTO ${tableName} (${columns.join(', ')}) 
    VALUES (${placeholders})
    ON CONFLICT DO NOTHING
  `;
  
  // Import each row individually (no transaction)
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const values = columns.map(col => convertValue(row[col], col));
    
    try {
      await pool.query(insertSql, values);
      stats.imported++;
      
      // Show progress for large tables
      if (data.length > 100 && i % 100 === 0) {
        process.stdout.write(`   Progress: ${i}/${data.length}\r`);
      }
    } catch (error) {
      stats.errors++;
      
      // Only log first few errors to avoid spam
      if (stats.errors <= 3) {
        console.log(`   ⚠️  Row ${i + 1} error: ${error.message}`);
      }
    }
  }
  
  if (data.length > 100) {
    process.stdout.write('                           \r'); // Clear progress line
  }
  
  return stats;
}

/**
 * Main import function
 */
async function importData() {
  console.log('🚀 Safe PostgreSQL Data Import Starting...\n');
  console.log(`📁 Data Directory: ${DATA_DIR}\n`);
  
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`❌ Data directory not found: ${DATA_DIR}`);
    console.error('   Please run 1-export-sqlite-data.js first');
    process.exit(1);
  }
  
  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL\n');
    client.release();
    
    const overallStats = {
      tablesProcessed: 0,
      totalRows: 0,
      totalImported: 0,
      totalErrors: 0,
      skippedTables: []
    };
    
    // Import each table
    for (const tableName of EXISTING_TABLES) {
      const jsonFile = `${tableName}.json`;
      const filePath = path.join(DATA_DIR, jsonFile);
      
      // Check if data file exists
      if (!fs.existsSync(filePath)) {
        console.log(`📋 ${tableName}: No data file found, skipping`);
        overallStats.skippedTables.push(tableName);
        continue;
      }
      
      console.log(`📥 Importing: ${tableName}`);
      
      try {
        // Read data
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        overallStats.totalRows += data.length;
        
        console.log(`   📊 ${data.length} rows to import`);
        
        // Import table
        const tableStats = await importTable(tableName, data);
        
        overallStats.tablesProcessed++;
        overallStats.totalImported += tableStats.imported;
        overallStats.totalErrors += tableStats.errors;
        
        if (tableStats.errors > 0) {
          console.log(`   ✅ ${tableStats.imported} rows imported, ⚠️  ${tableStats.errors} errors\n`);
        } else {
          console.log(`   ✅ ${tableStats.imported} rows imported successfully\n`);
        }
        
      } catch (error) {
        console.log(`   ❌ Failed to process: ${error.message}\n`);
        overallStats.skippedTables.push(tableName);
      }
    }
    
    // Summary
    console.log('━'.repeat(60));
    console.log('📊 Import Summary:');
    console.log(`   📋 Tables processed: ${overallStats.tablesProcessed}`);
    console.log(`   📝 Total rows: ${overallStats.totalRows}`);
    console.log(`   ✅ Successfully imported: ${overallStats.totalImported}`);
    console.log(`   ⚠️  Errors: ${overallStats.totalErrors}`);
    console.log(`   ⏭️  Skipped tables: ${overallStats.skippedTables.length}`);
    
    if (overallStats.skippedTables.length > 0) {
      console.log('\n⏭️  Skipped tables:');
      overallStats.skippedTables.forEach(table => {
        console.log(`   - ${table}`);
      });
    }
    
    // Verify imported data
    console.log('\n🔍 Verifying imported data...');
    for (const tableName of EXISTING_TABLES) {
      if (overallStats.skippedTables.includes(tableName)) continue;
      
      try {
        const result = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
        const count = parseInt(result.rows[0].count);
        if (count > 0) {
          console.log(`   ✅ ${tableName}: ${count} rows`);
        }
      } catch (error) {
        // Ignore
      }
    }
    
    console.log('\n✅ Safe data import completed!');
    
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  importData()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
