#!/usr/bin/env tsx
/**
 * Fix Database Script
 * Initializes all required database tables and runs migrations
 */

import { getDB } from '../src/lib/db/sqlite-client';
import { initCompleteSchema } from '../src/lib/db/init-schema';
import { runMigrations } from '../src/lib/db/run-migration';
import fs from 'fs';
import path from 'path';

function backupDatabase() {
  const dbPath = 'procheff.db';
  if (fs.existsSync(dbPath)) {
    const timestamp = Date.now();
    const backupPath = `procheff.db.backup.${timestamp}`;
    fs.copyFileSync(dbPath, backupPath);
    console.log(`✅ Database backed up to: ${backupPath}`);
  }
}

function dropOldTables() {
  const db = getDB();
  
  console.log('🗑️  Dropping old conflicting tables...');
  
  try {
    // Disable foreign key constraints temporarily
    db.pragma('foreign_keys = OFF');
    
    // Drop tables that might have incorrect schemas
    const tablesToDrop = ['data_pools'];
    
    for (const table of tablesToDrop) {
      try {
        db.exec(`DROP TABLE IF EXISTS ${table}`);
        console.log(`  ✓ Dropped ${table}`);
      } catch (error) {
        console.log(`  ⚠️  Could not drop ${table}:`, error);
      }
    }
    
    // Re-enable foreign key constraints
    db.pragma('foreign_keys = ON');
  } catch (error) {
    console.error('❌ Error dropping tables:', error);
  }
}

async function main() {
  console.log('🔧 Starting database initialization...\n');

  // Step 1: Backup
  console.log('📦 Step 1: Backing up database...');
  backupDatabase();
  console.log('');

  // Step 2: Drop conflicting tables
  console.log('🗑️  Step 2: Cleaning up old schema...');
  dropOldTables();
  console.log('');

  // Step 3: Run migrations (which will create tables correctly)
  console.log('📝 Step 3: Running migrations...');
  try {
    runMigrations();
    console.log('');
  } catch (error) {
    console.error('❌ Migration error:', error);
    console.log('Continuing with schema initialization...\n');
  }

  // Step 4: Initialize complete schema (creates any missing tables)
  console.log('🏗️  Step 4: Initializing complete schema...');
  try {
    initCompleteSchema();
    console.log('');
  } catch (error) {
    console.error('❌ Schema initialization error:', error);
    console.log('');
  }

  // Step 5: Verify tables exist
  console.log('✅ Step 5: Verifying database...');
  const db = getDB();
  
  const requiredTables = [
    'users',
    'organizations',
    'memberships',
    'notifications',
    'analysis_history',
    'analysis_results_v2',
    'data_pools',
    'api_metrics',
    'logs'
  ];

  let allTablesExist = true;
  for (const table of requiredTables) {
    try {
      const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
      if (result) {
        console.log(`  ✓ ${table} exists`);
      } else {
        console.log(`  ✗ ${table} MISSING`);
        allTablesExist = false;
      }
    } catch (error) {
      console.log(`  ✗ ${table} ERROR:`, error);
      allTablesExist = false;
    }
  }

  console.log('');
  
  if (allTablesExist) {
    console.log('✅ Database initialization completed successfully!');
    console.log('🚀 You can now restart your application.');
  } else {
    console.log('⚠️  Some tables are still missing. Manual intervention may be required.');
  }
}

main().catch(console.error);

