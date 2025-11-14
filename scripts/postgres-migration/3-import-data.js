#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * PostgreSQL Data Import Script
 * Imports data from JSON files to PostgreSQL
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration
const DATABASE_URL = process.env.DATABASE_URL;
const DATA_DIR = path.join(__dirname, 'data-export');
const BATCH_SIZE = 100; // Insert rows in batches for performance

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

// CA sertifikasını oku
const caCertPath = path.join(__dirname, 'ca-certificate.crt');
let caCert;

try {
  caCert = fs.readFileSync(caCertPath, 'utf8');
} catch (error) {
  console.error('❌ Failed to load CA certificate:', error.message);
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: caCert
  }
});

/**
 * Import data from JSON files to PostgreSQL
 */
async function importData() {
  console.log('🚀 PostgreSQL Data Import Starting...\n');
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
    
    // Get JSON files
    const jsonFiles = fs.readdirSync(DATA_DIR)
      .filter(f => f.endsWith('.json') && !f.startsWith('_'))
      .sort();
    
    console.log(`📋 Found ${jsonFiles.length} data files\n`);
    
    const stats = {
      total: jsonFiles.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      totalRows: 0,
      errors: []
    };
    
    // Import each table
    for (const file of jsonFiles) {
      const table = file.replace('.json', '');
      
      try {
        console.log(`📥 Importing: ${table}`);
        
        // Read data
        const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));
        
        if (data.length === 0) {
          console.log(`   ⚠️  Empty table, skipping\n`);
          stats.skipped++;
          continue;
        }
        
        console.log(`   📊 ${data.length} rows to import`);
        
        // Get columns from first row
        const columns = Object.keys(data[0]);
        
        // Check if table exists
        const tableCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public'
            AND table_name = $1
          )
        `, [table]);
        
        if (!tableCheck.rows[0].exists) {
          console.log(`   ⚠️  Table does not exist, skipping\n`);
          stats.skipped++;
          continue;
        }
        
        // Prepare insert statement
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const insertSql = `
          INSERT INTO ${table} (${columns.join(', ')}) 
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING
        `;
        
        // Import data in batches
        const client = await pool.connect();
        let imported = 0;
        
        try {
          await client.query('BEGIN');
          
          for (let i = 0; i < data.length; i += BATCH_SIZE) {
            const batch = data.slice(i, i + BATCH_SIZE);
            
            for (const row of batch) {
              const values = columns.map(col => {
                const value = row[col];
                
                // Convert SQLite boolean integers to PostgreSQL booleans
                if (typeof value === 'number' && (value === 0 || value === 1)) {
                  // Check if column name suggests boolean
                  if (col.startsWith('is_') || col === 'active' || col === 'enabled') {
                    return value === 1;
                  }
                }
                
                return value;
              });
              
              try {
                await client.query(insertSql, values);
                imported++;
              } catch (rowError) {
                // Log but continue with other rows
                if (!rowError.message.includes('duplicate key')) {
                  console.log(`      ⚠️  Row error: ${rowError.message}`);
                }
              }
            }
            
            // Show progress
            if (data.length > BATCH_SIZE) {
              process.stdout.write(`      Progress: ${Math.min(i + BATCH_SIZE, data.length)}/${data.length} rows\r`);
            }
          }
          
          await client.query('COMMIT');
          console.log(`   ✅ ${imported} rows imported\n`);
          
          stats.successful++;
          stats.totalRows += imported;
          
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
        
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}\n`);
        stats.failed++;
        stats.errors.push({ table, error: error.message });
      }
    }
    
    // Update sequences for SERIAL columns
    console.log('🔄 Updating sequences...');
    const sequenceUpdateQuery = `
      SELECT 
        'SELECT SETVAL(' ||
        quote_literal(quote_ident(sequence_namespace.nspname) || '.' || quote_ident(class_sequence.relname)) ||
        ', COALESCE(MAX(' || quote_ident(pg_attribute.attname) || '), 1)) FROM ' ||
        quote_ident(table_namespace.nspname) || '.' || quote_ident(class_table.relname) || ';'
      FROM pg_depend
      INNER JOIN pg_class AS class_sequence ON class_sequence.oid = pg_depend.objid
      INNER JOIN pg_class AS class_table ON class_table.oid = pg_depend.refobjid
      INNER JOIN pg_attribute ON pg_attribute.attrelid = class_table.oid AND pg_attribute.attnum = pg_depend.refobjsubid
      INNER JOIN pg_namespace AS sequence_namespace ON sequence_namespace.oid = class_sequence.relnamespace
      INNER JOIN pg_namespace AS table_namespace ON table_namespace.oid = class_table.relnamespace
      WHERE class_sequence.relkind = 'S'
    `;
    
    try {
      const sequences = await pool.query(sequenceUpdateQuery);
      for (const row of sequences.rows) {
        await pool.query(row['?column?']);
      }
      console.log('   ✅ Sequences updated\n');
    } catch (error) {
      console.log(`   ⚠️  Sequence update warning: ${error.message}\n`);
    }
    
    // Summary
    console.log('━'.repeat(60));
    console.log('📊 Import Summary:');
    console.log(`   ✅ Successful: ${stats.successful} tables`);
    console.log(`   📝 Total rows: ${stats.totalRows}`);
    console.log(`   ⏭️  Skipped: ${stats.skipped} tables`);
    console.log(`   ❌ Failed: ${stats.failed} tables`);
    
    if (stats.errors.length > 0) {
      console.log('\n❌ Errors:');
      stats.errors.forEach(err => {
        console.log(`   - ${err.table}: ${err.error}`);
      });
    }
    
    console.log('\n✅ Data import completed!');
    
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run import
importData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

