#!/usr/bin/env node

/**
 * PostgreSQL Connection Test with CA Certificate
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

// CA sertifikasını oku
const caCertPath = path.join(__dirname, 'ca-certificate.crt');
let caCert;

try {
  caCert = fs.readFileSync(caCertPath, 'utf8');
  console.log('✅ CA Certificate loaded successfully');
} catch (error) {
  console.error('❌ Failed to load CA certificate:', error.message);
  process.exit(1);
}

// SSL konfigürasyonu
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,  // Güvenlik için true yapıyoruz
    ca: caCert                 // CA sertifikasını kullanıyoruz
  }
});

async function testConnection() {
  console.log('🔌 PostgreSQL Connection Test with CA Certificate\n');
  console.log(`📡 Connecting to: ${DATABASE_URL.split('@')[1].split('/')[0]}\n`);
  
  try {
    // Test 1: Basic connection
    console.log('1️⃣  Testing connection with CA certificate...');
    const client = await pool.connect();
    console.log('   ✅ Connected successfully with SSL!\n');
    
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
              AND table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('   ⚠️  No tables found (database is empty)');
    } else {
      console.log(`   ✅ Found ${tablesResult.rows.length} tables:`);
      tablesResult.rows.forEach(row => {
        console.log(`      📋 ${row.table_name} (${row.column_count} columns)`);
      });
    }
    
    // Test 4: Database permissions
    console.log('\n4️⃣  Testing database permissions...');
    try {
      await client.query('CREATE TABLE IF NOT EXISTS connection_test (id SERIAL PRIMARY KEY, test_time TIMESTAMP DEFAULT NOW())');
      await client.query('DROP TABLE connection_test');
      console.log('   ✅ Database write permissions OK');
    } catch (error) {
      console.log('   ⚠️  Limited permissions:', error.message);
    }
    
    client.release();
    console.log('\n🎉 All tests passed! Ready for migration.');
    
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

testConnection();