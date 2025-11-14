#!/usr/bin/env node

/**
 * Data Validation Script
 * Compares SQLite and PostgreSQL data to ensure migration was successful
 */

const Database = require('better-sqlite3');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration
const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || 'procheff.db';
const DATABASE_URL = process.env.DATABASE_URL;

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
 * Validate migrated data
 */
async function validateData() {
  console.log('🔍 Data Validation Starting...\n');
  
  if (!fs.existsSync(SQLITE_DB_PATH)) {
    console.error(`❌ SQLite database not found: ${SQLITE_DB_PATH}`);
    process.exit(1);
  }
  
  const sqlite = new Database(SQLITE_DB_PATH, { readonly: true });
  
  try {
    // Get all tables from SQLite
    const sqliteTables = sqlite.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all().map(row => row.name);
    
    console.log(`📊 Found ${sqliteTables.length} tables in SQLite\n`);
    
    const stats = {
      total: 0,
      matched: 0,
      mismatched: 0,
      pgMissing: 0,
      errors: []
    };
    
    const results = [];
    
    // Validate each table
    for (const table of sqliteTables) {
      try {
        // Get SQLite count
        const sqliteResult = sqlite.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
        const sqliteCount = sqliteResult.count;
        
        // Get PostgreSQL count
        let pgCount = 0;
        try {
          const pgResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
          pgCount = parseInt(pgResult.rows[0].count);
        } catch (pgError) {
          if (pgError.message.includes('does not exist')) {
            console.log(`⚠️  ${table.padEnd(30)} - Table not in PostgreSQL`);
            stats.pgMissing++;
            results.push({
              table,
              status: 'missing',
              sqliteCount,
              pgCount: 0,
              difference: sqliteCount
            });
            continue;
          }
          throw pgError;
        }
        
        // Compare counts
        const difference = Math.abs(sqliteCount - pgCount);
        const isMatch = sqliteCount === pgCount;
        
        if (isMatch) {
          console.log(`✅ ${table.padEnd(30)} - ${sqliteCount} rows (matched)`);
          stats.matched++;
        } else {
          console.log(`❌ ${table.padEnd(30)} - SQLite: ${sqliteCount}, PostgreSQL: ${pgCount} (diff: ${difference})`);
          stats.mismatched++;
          stats.errors.push({
            table,
            sqliteCount,
            pgCount,
            difference
          });
        }
        
        results.push({
          table,
          status: isMatch ? 'matched' : 'mismatched',
          sqliteCount,
          pgCount,
          difference
        });
        
        stats.total++;
        
      } catch (error) {
        console.log(`❌ ${table.padEnd(30)} - Error: ${error.message}`);
        results.push({
          table,
          status: 'error',
          error: error.message
        });
      }
    }
    
    // Sample data validation for important tables
    console.log('\n🔍 Sample Data Validation:\n');
    
    const criticalTables = ['users', 'organizations', 'analysis_history'];
    
    for (const table of criticalTables) {
      if (!sqliteTables.includes(table)) continue;
      
      try {
        // Get first row from each database
        const sqliteRow = sqlite.prepare(`SELECT * FROM ${table} LIMIT 1`).get();
        
        if (!sqliteRow) {
          console.log(`⚠️  ${table} - No data to validate`);
          continue;
        }
        
        const pgResult = await pool.query(`SELECT * FROM ${table} LIMIT 1`);
        const pgRow = pgResult.rows[0];
        
        if (!pgRow) {
          console.log(`❌ ${table} - PostgreSQL has no data`);
          continue;
        }
        
        // Compare column names
        const sqliteColumns = Object.keys(sqliteRow);
        const pgColumns = Object.keys(pgRow);
        
        const missingInPg = sqliteColumns.filter(col => !pgColumns.includes(col));
        const extraInPg = pgColumns.filter(col => !sqliteColumns.includes(col));
        
        if (missingInPg.length === 0 && extraInPg.length === 0) {
          console.log(`✅ ${table} - Schema matches`);
        } else {
          console.log(`⚠️  ${table} - Schema differences:`);
          if (missingInPg.length > 0) {
            console.log(`     Missing in PG: ${missingInPg.join(', ')}`);
          }
          if (extraInPg.length > 0) {
            console.log(`     Extra in PG: ${extraInPg.join(', ')}`);
          }
        }
        
      } catch (error) {
        console.log(`❌ ${table} - Validation error: ${error.message}`);
      }
    }
    
    // Summary
    console.log('\n' + '━'.repeat(60));
    console.log('📊 Validation Summary:');
    console.log(`   ✅ Matched: ${stats.matched} tables`);
    console.log(`   ❌ Mismatched: ${stats.mismatched} tables`);
    console.log(`   ⚠️  Missing in PostgreSQL: ${stats.pgMissing} tables`);
    console.log(`   📊 Total validated: ${stats.total} tables`);
    
    if (stats.errors.length > 0) {
      console.log('\n❌ Mismatched Tables:');
      stats.errors.forEach(err => {
        console.log(`   - ${err.table}:`);
        console.log(`       SQLite: ${err.sqliteCount} rows`);
        console.log(`       PostgreSQL: ${err.pgCount} rows`);
        console.log(`       Difference: ${err.difference} rows`);
      });
    }
    
    // Save validation report
    const report = {
      validationDate: new Date().toISOString(),
      sqliteDb: SQLITE_DB_PATH,
      postgresDb: DATABASE_URL.split('@')[1],
      summary: {
        totalTables: stats.total,
        matched: stats.matched,
        mismatched: stats.mismatched,
        pgMissing: stats.pgMissing
      },
      results,
      errors: stats.errors
    };
    
    const reportPath = path.join(__dirname, `validation-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Validation report saved: ${reportPath}`);
    
    // Exit code based on validation result
    if (stats.mismatched > 0) {
      console.log('\n⚠️  Validation completed with mismatches!');
      process.exit(1);
    } else {
      console.log('\n✅ Validation completed successfully!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n❌ Validation failed:', error);
    process.exit(1);
  } finally {
    sqlite.close();
    await pool.end();
  }
}

// Run validation
validateData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

