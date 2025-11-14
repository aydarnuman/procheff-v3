#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */

/**
 * Simple verification script for PostgreSQL migration
 * Checks basic data integrity and table counts
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

async function simpleVerification() {
  console.log('🔍 SIMPLE FINAL VERIFICATION\n');
  
  try {
    const client = await pool.connect();
    
    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📊 PostgreSQL Tables and Row Counts:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    let totalRows = 0;
    let tablesWithData = 0;
    let emptyTables = 0;
    
    for (const tableRow of tablesResult.rows) {
      const tableName = tableRow.table_name;
      
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        const count = parseInt(countResult.rows[0].count);
        totalRows += count;
        
        if (count > 0) {
          console.log(`✅ ${tableName}: ${count.toLocaleString()} rows`);
          tablesWithData++;
        } else {
          console.log(`📭 ${tableName}: 0 rows`);
          emptyTables++;
        }
      } catch (error) {
        console.log(`❌ ${tableName}: Error - ${error.message}`);
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 FINAL SUMMARY:');
    console.log(`📊 Total tables: ${tablesResult.rows.length}`);
    console.log(`✅ Tables with data: ${tablesWithData}`);
    console.log(`📭 Empty tables: ${emptyTables}`);
    console.log(`📈 Total rows: ${totalRows.toLocaleString()}`);
    
    // Key migration stats
    const keyTables = ['logs', 'market_prices', 'tenders', 'recipe_ingredients', 'menu_items', 'recipes'];
    console.log('\n🔑 Key Migration Tables:');
    for (const tableName of keyTables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        const count = parseInt(result.rows[0].count);
        console.log(`   ${tableName}: ${count} rows`);
      } catch (error) {
        console.log(`   ${tableName}: Not found`);
      }
    }
    
    console.log('\n✅ Simple verification completed!');
    client.release();
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await pool.end();
  }
}

simpleVerification();