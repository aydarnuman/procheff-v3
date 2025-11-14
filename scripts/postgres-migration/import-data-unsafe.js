#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * PostgreSQL Data Import Script (Unsafe SSL)
 * Imports data from JSON files to PostgreSQL
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration
const DATABASE_URL = process.env.DATABASE_URL;
const DATA_DIR = path.join(__dirname, 'data-export');
const BATCH_SIZE = 50; // Insert rows in batches for performance

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

// Critical tables that must be imported
const CRITICAL_TABLES = [
  'logs',
  'market_prices', 
  'tenders',
  'chat_analytics',
  'recipe_ingredients'
];

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
    
    // Import only critical tables first
    for (const tableName of CRITICAL_TABLES) {
      const jsonFile = path.join(DATA_DIR, `${tableName}.json`);
      
      if (fs.existsSync(jsonFile)) {
        console.log(`📤 Importing: ${tableName}`);
        await importTable(tableName, jsonFile);
      } else {
        console.log(`⚠️  File not found: ${jsonFile}`);
      }
    }
    
    console.log('\n✅ Critical data import completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

/**
 * Import single table
 */
async function importTable(tableName, jsonFile) {
  try {
    const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    
    if (!data || data.length === 0) {
      console.log(`   ⚠️  No data to import for ${tableName}`);
      return;
    }
    
    console.log(`   📊 Found ${data.length} rows`);
    
    const client = await pool.connect();
    
    try {
      // Clear existing data first  
      await client.query(`TRUNCATE TABLE ${tableName} CASCADE`);
      console.log(`   🗑️  Cleared existing data`);
      
      // Get column names from first row
      const columns = Object.keys(data[0]);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const insertQuery = `
        INSERT INTO ${tableName} (${columns.join(', ')}) 
        VALUES (${placeholders})
      `;
      
      // Insert in batches
      for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);
        
        for (const row of batch) {
          const values = columns.map(col => row[col]);
          await client.query(insertQuery, values);
        }
        
        console.log(`   ✅ Imported ${Math.min(i + BATCH_SIZE, data.length)}/${data.length} rows`);
      }
      
      console.log(`   🎉 ${tableName} import completed!\n`);
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error(`   ❌ Error importing ${tableName}:`, error.message);
  }
}

importData();