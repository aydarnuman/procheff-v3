#!/usr/bin/env node

/**
 * Quick PostgreSQL Verification (Unsafe SSL)
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

async function quickVerify() {
  console.log('🔍 Quick PostgreSQL Verification\n');
  
  try {
    const client = await pool.connect();
    
    // Check critical tables row counts
    const tables = ['logs', 'market_prices', 'tenders', 'recipe_ingredients'];
    
    console.log('📊 Row counts in PostgreSQL:');
    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = result.rows[0].count;
      console.log(`   ${table}: ${count} rows`);
    }
    
    console.log('\n✅ Verification completed!');
    client.release();
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await pool.end();
  }
}

quickVerify();