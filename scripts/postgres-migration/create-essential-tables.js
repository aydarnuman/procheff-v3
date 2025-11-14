#!/usr/bin/env node

/**
 * Create Essential Tables in PostgreSQL
 * Direct table creation with proper PostgreSQL syntax
 */

const { Pool } = require('pg');

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

async function createEssentialTables() {
  console.log('🚀 Creating Essential PostgreSQL Tables...\n');
  
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    // Users table
    console.log('📋 Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Organizations table
    console.log('📋 Creating organizations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        owner_user_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Memberships table
    console.log('📋 Creating memberships table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS memberships (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(org_id, user_id)
      )
    `);
    
    // Notifications table
    console.log('📋 Creating notifications table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Orchestrations table
    console.log('📋 Creating orchestrations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS orchestrations (
        id TEXT PRIMARY KEY,
        file_name TEXT,
        file_size INTEGER,
        mime_type TEXT,
        progress INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        current_step TEXT,
        steps_json TEXT,
        result TEXT,
        error TEXT,
        warnings TEXT,
        duration_ms INTEGER,
        user_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);
    
    // Analysis history table
    console.log('📋 Creating analysis_history table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS analysis_history (
        id TEXT PRIMARY KEY,
        file_name TEXT,
        file_size INTEGER,
        mime_type TEXT,
        extracted_fields TEXT,
        contextual_analysis TEXT,
        market_analysis TEXT,
        validation TEXT,
        processing_time_ms INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        storage_path TEXT,
        progress INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        current_step TEXT,
        steps_json TEXT,
        result TEXT,
        error TEXT,
        warnings TEXT,
        duration_ms INTEGER,
        user_id TEXT,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        data_pool TEXT,
        input_files TEXT
      )
    `);
    
    // Data pools table
    console.log('📋 Creating data_pools table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS data_pools (
        analysis_id TEXT PRIMARY KEY,
        data_pool_json TEXT NOT NULL,
        text_content TEXT,
        document_count INTEGER,
        table_count INTEGER,
        date_count INTEGER,
        entity_count INTEGER,
        total_size_bytes INTEGER,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // AI logs table
    console.log('📋 Creating ai_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_logs (
        id SERIAL PRIMARY KEY,
        level TEXT NOT NULL CHECK(level IN ('info', 'warn', 'error', 'success')),
        message TEXT NOT NULL,
        context TEXT,
        tokens_used INTEGER,
        duration_ms INTEGER,
        model TEXT,
        endpoint TEXT,
        user_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Logs table
    console.log('📋 Creating logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        source TEXT,
        details TEXT
      )
    `);
    
    // Tenders table
    console.log('📋 Creating tenders table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenders (
        id TEXT PRIMARY KEY,
        tender_number TEXT,
        title TEXT NOT NULL,
        organization TEXT NOT NULL,
        city TEXT NOT NULL,
        tender_type TEXT,
        partial_bid_allowed BOOLEAN DEFAULT FALSE,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      )
    `);
    
    // Chat analytics table
    console.log('📋 Creating chat_analytics table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_analytics (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL,
        message_type TEXT NOT NULL,
        message_content TEXT,
        response_content TEXT,
        response_time_ms INTEGER,
        tokens_used INTEGER,
        model_used TEXT,
        user_satisfaction INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes
    console.log('📋 Creating indexes...');
    
    // Orchestrations indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orchestrations_created_at 
      ON orchestrations(created_at DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orchestrations_status 
      ON orchestrations(status, created_at DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orchestrations_user 
      ON orchestrations(user_id, created_at DESC)
    `);
    
    // Analysis history indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_analysis_history_status
      ON analysis_history(status)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_analysis_history_created_at
      ON analysis_history(created_at DESC)
    `);
    
    // Data pools index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_data_pools_expires
      ON data_pools(expires_at)
    `);
    
    // AI logs indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_logs_level_created
      ON ai_logs(level, created_at DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_logs_user
      ON ai_logs(user_id, created_at DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_logs_endpoint
      ON ai_logs(endpoint, created_at DESC)
    `);
    
    // Tenders index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tenders_status
      ON tenders(status, expires_at)
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('\n✅ All essential tables created successfully!');
    
    // List created tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`\n📊 Created ${tablesResult.rows.length} tables:`);
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating tables:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  createEssentialTables()
    .then(() => {
      console.log('\n✅ Essential tables creation completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Failed to create tables:', error);
      process.exit(1);
    });
}
