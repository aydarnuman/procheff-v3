#!/usr/bin/env node

/**
 * SQLite Data Export Script
 * Exports all tables from SQLite to JSON files
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Configuration
const DB_PATH = process.env.SQLITE_DB_PATH || path.join(__dirname, '../../procheff.db');
const OUTPUT_DIR = path.join(__dirname, 'data-export');

// Tables to export (in order to handle foreign keys)
const TABLES = [
  // Auth & Users
  'users',
  'organizations',
  'memberships',
  
  // Analysis
  'analysis_history',
  'data_pools',
  'analysis_results',
  
  // Notifications & Logs
  'notifications',
  'ai_logs',
  'orchestrations',
  
  // Market Data
  'market_prices',
  'market_price_history',
  'market_fusion_sources',
  'market_comparison_cache',
  
  // Menu System
  'menu_items',
  'menu_categories',
  'menu_plans',
  
  // API & Integrations
  'webhooks',
  'api_usage_logs',
  'integration_configs',
  'webhook_logs',
  'api_keys',
  
  // Settings
  'settings',
  'report_templates',
  'notification_channels',
  
  // Tenders
  'tenders',
  
  // Semantic Cache
  'semantic_cache',
  
  // Migrations tracking
  '_migrations'
];

function exportSQLiteData() {
  console.log('🚀 SQLite Data Export Starting...\n');
  console.log(`📂 Database: ${DB_PATH}`);
  console.log(`📁 Output Directory: ${OUTPUT_DIR}\n`);
  
  // Check if database exists
  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌ Database file not found: ${DB_PATH}`);
    process.exit(1);
  }
  
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✅ Created output directory: ${OUTPUT_DIR}\n`);
  }
  
  // Open database
  const db = new Database(DB_PATH, { readonly: true });
  
  // Get all tables from database
  const allTables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all().map(row => row.name);
  
  console.log(`📊 Found ${allTables.length} tables in database\n`);
  
  const stats = {
    totalTables: 0,
    totalRows: 0,
    exportedTables: [],
    skippedTables: [],
    errors: []
  };
  
  // Export each table
  for (const table of allTables) {
    try {
      console.log(`📤 Exporting: ${table}`);
      
      // Get row count
      const countResult = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
      const rowCount = countResult.count;
      
      // Get all rows
      const rows = db.prepare(`SELECT * FROM ${table}`).all();
      
      // Write to JSON file
      const outputPath = path.join(OUTPUT_DIR, `${table}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(rows, null, 2));
      
      console.log(`   ✅ ${rowCount} rows exported\n`);
      
      stats.totalTables++;
      stats.totalRows += rowCount;
      stats.exportedTables.push({ table, rows: rowCount });
      
    } catch (error) {
      console.log(`   ⚠️  Error: ${error.message}\n`);
      stats.skippedTables.push(table);
      stats.errors.push({ table, error: error.message });
    }
  }
  
  // Export schema (CREATE TABLE statements)
  console.log('📋 Exporting database schema...');
  const schema = db.prepare(`
    SELECT sql FROM sqlite_master 
    WHERE type IN ('table', 'index', 'trigger', 'view') 
    AND name NOT LIKE 'sqlite_%'
    ORDER BY type, name
  `).all().map(row => row.sql).filter(Boolean).join(';\n\n') + ';';
  
  fs.writeFileSync(path.join(OUTPUT_DIR, '_schema.sql'), schema);
  console.log('   ✅ Schema exported\n');
  
  // Export metadata
  const metadata = {
    exportDate: new Date().toISOString(),
    databasePath: DB_PATH,
    totalTables: stats.totalTables,
    totalRows: stats.totalRows,
    exportedTables: stats.exportedTables,
    skippedTables: stats.skippedTables,
    errors: stats.errors,
    allTables: allTables
  };
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, '_metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
  
  console.log('📊 Export Summary:');
  console.log(`   ✅ Tables exported: ${stats.totalTables}`);
  console.log(`   📝 Total rows: ${stats.totalRows}`);
  console.log(`   ⚠️  Skipped tables: ${stats.skippedTables.length}`);
  
  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    stats.errors.forEach(err => {
      console.log(`   - ${err.table}: ${err.error}`);
    });
  }
  
  console.log('\n✅ Export completed successfully!');
  console.log(`📁 Data exported to: ${OUTPUT_DIR}`);
  
  db.close();
}

// Run export
try {
  exportSQLiteData();
} catch (error) {
  console.error('\n❌ Export failed:', error);
  process.exit(1);
}

