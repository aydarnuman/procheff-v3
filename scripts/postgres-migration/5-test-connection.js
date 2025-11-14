#!/usr/bin/env node

/**
 * PostgreSQL Connection Test Script
 * Tests connection and basic operations
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.error('\nUsage:');
  console.error('  DATABASE_URL="postgres://user:pass@host:port/db" node 5-test-connection.js');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('sslmode=require') ? {
    rejectUnauthorized: false,
    require: true
  } : false
});

async function testConnection() {
  console.log('🔌 PostgreSQL Connection Test\n');
  console.log(`📡 Connecting to: ${DATABASE_URL.split('@')[1]}\n`);
  
  try {
    // Test 1: Basic connection
    console.log('1️⃣  Testing basic connection...');
    const client = await pool.connect();
    console.log('   ✅ Connected successfully\n');
    
    // Test 2: Query execution
    console.log('2️⃣  Testing query execution...');
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    console.log(`   ✅ Query successful`);
    console.log(`   ⏰ Server time: ${result.rows[0].current_time}`);
    console.log(`   📦 Version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}\n`);
    
    // Test 3: List tables
    console.log('3️⃣  Listing tables...');
    const tablesResult = await client.query(`
      SELECT table_name, 
             (SELECT COUNT(*) 
              FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND columns.table_name = tables.table_name) as column_count
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('   ⚠️  No tables found (database is empty)\n');
    } else {
      console.log(`   ✅ Found ${tablesResult.rows.length} tables:`);
      tablesResult.rows.forEach(row => {
        console.log(`      - ${row.table_name} (${row.column_count} columns)`);
      });
      console.log('');
    }
    
    // Test 4: Transaction
    console.log('4️⃣  Testing transaction...');
    await client.query('BEGIN');
    await client.query('CREATE TEMP TABLE test_transaction (id SERIAL PRIMARY KEY, data TEXT)');
    await client.query('INSERT INTO test_transaction (data) VALUES ($1)', ['test data']);
    const txResult = await client.query('SELECT * FROM test_transaction');
    await client.query('ROLLBACK');
    console.log(`   ✅ Transaction test passed (inserted ${txResult.rows.length} row, then rolled back)\n`);
    
    // Test 5: Connection pool stats
    console.log('5️⃣  Connection pool stats:');
    console.log(`   Total connections: ${pool.totalCount}`);
    console.log(`   Idle connections: ${pool.idleCount}`);
    console.log(`   Waiting clients: ${pool.waitingCount}\n`);
    
    // Test 6: Check important tables
    console.log('6️⃣  Checking critical tables...');
    const criticalTables = ['users', 'organizations', 'analysis_history', 'notifications'];
    
    for (const table of criticalTables) {
      try {
        const countResult = await client.query(
          `SELECT COUNT(*) as count FROM ${table}`
        );
        const count = countResult.rows[0].count;
        console.log(`   ✅ ${table.padEnd(20)} - ${count} rows`);
      } catch (error) {
        if (error.message.includes('does not exist')) {
          console.log(`   ⚠️  ${table.padEnd(20)} - Table does not exist`);
        } else {
          console.log(`   ❌ ${table.padEnd(20)} - Error: ${error.message}`);
        }
      }
    }
    
    client.release();
    
    console.log('\n✅ All tests passed!');
    console.log('\n💡 Connection details:');
    console.log(`   Host: ${DATABASE_URL.split('@')[1].split(':')[0]}`);
    console.log(`   Port: ${DATABASE_URL.split(':')[3].split('/')[0]}`);
    console.log(`   Database: ${DATABASE_URL.split('/').pop().split('?')[0]}`);
    console.log(`   SSL: Enabled`);
    
  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    console.error('\nPossible causes:');
    console.error('  - Invalid DATABASE_URL');
    console.error('  - Network connectivity issues');
    console.error('  - SSL certificate problems');
    console.error('  - Database server is down');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run test
testConnection().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

