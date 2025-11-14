#!/usr/bin/env node

/**
 * Final Verification - All Tables
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('sslmode=require') ? {
    rejectUnauthorized: false,
    require: true
  } : false
});

async function finalVerification() {
  console.log('🔍 FINAL VERIFICATION - All Tables\n');
  
  try {
    const client = await pool.connect();
    
    // Get all tables and their row counts
    const result = await client.query(`
      SELECT 
        t.table_name,
        COALESCE((
          SELECT (
            xpath('/row/c/text()', 
              query_to_xml('SELECT COUNT(*) FROM ' || quote_ident(t.table_name), false, true, '')
            )::text[]
          )[1], '0'
        )::integer as row_count
      FROM information_schema.tables t
      WHERE t.table_schema = 'public'
      ORDER BY t.table_name
    `);
    
    console.log('📊 PostgreSQL Table Status:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    let totalRows = 0;
    let tablesWithData = 0;
    let emptyTables = 0;
    
    for (const row of result.rows) {
      const count = parseInt(row.row_count) || 0;
      totalRows += count;
      
      if (count > 0) {
        console.log(`✅ ${row.table_name}: ${count.toLocaleString()} rows`);
        tablesWithData++;
      } else {
        console.log(`📭 ${row.table_name}: 0 rows`);
        emptyTables++;
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 FINAL SUMMARY:');
    console.log(`📊 Total tables: ${result.rows.length}`);
    console.log(`✅ Tables with data: ${tablesWithData}`);
    console.log(`📭 Empty tables: ${emptyTables}`);
    console.log(`📈 Total rows: ${totalRows.toLocaleString()}`);
    
    console.log('\n✅ Migration verification completed!');
    client.release();
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await pool.end();
  }
}

finalVerification();