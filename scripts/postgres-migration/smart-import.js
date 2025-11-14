#!/usr/bin/env node

/**
 * Smart Data Import with Schema Mapping
 * Maps SQLite data to PostgreSQL schema differences
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;
const DATA_DIR = path.join(__dirname, 'data-export');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('sslmode=require') ? {
    rejectUnauthorized: false,
    require: true
  } : false
});

// Schema mappings for each table
const SCHEMA_MAPPINGS = {
  logs: {
    sqlite_cols: ['id', 'level', 'message', 'data', 'created_at'],
    pg_cols: ['id', 'level', 'message', 'details', 'timestamp'],
    mapping: {
      data: 'details',
      created_at: 'timestamp'
    },
    defaults: {
      source: 'sqlite_migration'
    }
  },
  
  market_prices: {
    sqlite_cols: ['id', 'product_key', 'unit', 'unit_price', 'currency', 'source', 'created_at', 'meta'],
    pg_cols: ['id', 'product_key', 'unit', 'unit_price', 'currency', 'source', 'created_at', 'meta'],
    mapping: {
      // raw_query kolonu PostgreSQL'de yok, görmezden geliyoruz
    },
    ignore: ['raw_query']
  },
  
  tenders: {
    sqlite_cols: ['id', 'tender_number', 'title', 'organization', 'city', 'tender_type', 'partial_bid_allowed', 'status', 'created_at', 'updated_at'],
    pg_cols: ['id', 'tender_number', 'title', 'organization', 'city', 'tender_type', 'partial_bid_allowed', 'status', 'created_at', 'updated_at'],
    mapping: {
      // publish_date, tender_date, days_remaining, url kolonları PostgreSQL'de yok
    },
    ignore: ['publish_date', 'tender_date', 'days_remaining', 'url'],
    defaults: {
      expires_at: null
    }
  }
};

async function smartImport() {
  console.log('🚀 Smart Data Import Starting...\n');
  
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL\n');
    client.release();
    
    // Import mapped tables
    for (const tableName of ['logs', 'market_prices', 'tenders']) {
      const jsonFile = path.join(DATA_DIR, `${tableName}.json`);
      
      if (fs.existsSync(jsonFile)) {
        console.log(`📤 Smart importing: ${tableName}`);
        await importTableWithMapping(tableName, jsonFile);
      } else {
        console.log(`⚠️  File not found: ${jsonFile}`);
      }
    }
    
    console.log('\n✅ Smart import completed!');
    
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function importTableWithMapping(tableName, jsonFile) {
  try {
    const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    
    if (!data || data.length === 0) {
      console.log(`   ⚠️  No data to import for ${tableName}`);
      return;
    }
    
    const mapping = SCHEMA_MAPPINGS[tableName];
    if (!mapping) {
      console.log(`   ❌ No mapping defined for ${tableName}`);
      return;
    }
    
    console.log(`   📊 Found ${data.length} rows`);
    
    const client = await pool.connect();
    
    try {
      // Clear existing data first  
      await client.query(`TRUNCATE TABLE ${tableName} CASCADE`);
      console.log(`   🗑️  Cleared existing data`);
      
      // Prepare mapped columns
      const pgColumns = mapping.pg_cols;
      const placeholders = pgColumns.map((_, i) => `$${i + 1}`).join(', ');
      const insertQuery = `
        INSERT INTO ${tableName} (${pgColumns.join(', ')}) 
        VALUES (${placeholders})
      `;
      
      // Insert each row with mapping
      let insertedCount = 0;
      
      for (const row of data) {
        try {
          const mappedValues = pgColumns.map(pgCol => {
            // Check if this column has a mapping
            const sqliteCol = Object.keys(mapping.mapping || {}).find(k => mapping.mapping[k] === pgCol) || pgCol;
            
            // Get value from SQLite data
            let value = row[sqliteCol];
            
            // Apply defaults if missing
            if (value === undefined && mapping.defaults && mapping.defaults[pgCol]) {
              value = mapping.defaults[pgCol];
            }
            
            // Convert timestamp formats
            if (pgCol.includes('timestamp') || pgCol.includes('_at')) {
              if (value && typeof value === 'string') {
                // Convert SQLite datetime to PostgreSQL timestamp
                value = new Date(value).toISOString();
              }
            }
            
            return value;
          });
          
          await client.query(insertQuery, mappedValues);
          insertedCount++;
          
          if (insertedCount % 100 === 0) {
            console.log(`   ✅ Inserted ${insertedCount}/${data.length} rows`);
          }
          
        } catch (rowError) {
          console.log(`   ⚠️  Skipped row: ${rowError.message}`);
        }
      }
      
      console.log(`   🎉 ${tableName} import completed! (${insertedCount}/${data.length} rows)\n`);
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error(`   ❌ Error importing ${tableName}:`, error.message);
  }
}

smartImport();