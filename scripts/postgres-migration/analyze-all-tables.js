#!/usr/bin/env node

/**
 * Analyze All Tables for Complete Migration
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const Database = require('better-sqlite3');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;
const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || '../../procheff.db';
const DATA_DIR = path.join(__dirname, 'data-export');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('sslmode=require') ? {
    rejectUnauthorized: false,
    require: true
  } : false
});

async function analyzeAllTables() {
  console.log('🔍 Complete Table Analysis Starting...\n');
  
  try {
    // Initialize SQLite
    const sqlite = new Database(SQLITE_DB_PATH);
    console.log('✅ SQLite connected');
    
    // Initialize PostgreSQL
    const pgClient = await pool.connect();
    console.log('✅ PostgreSQL connected\n');
    
    // Get all SQLite tables with data
    const sqliteTables = sqlite.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();
    
    // Get all PostgreSQL tables
    const pgResult = await pgClient.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const pgTableNames = pgResult.rows.map(r => r.table_name);
    
    console.log(`📊 Found ${sqliteTables.length} SQLite tables`);
    console.log(`📊 Found ${pgTableNames.length} PostgreSQL tables\n`);
    
    // Categorize tables
    const tablesWithData = [];
    const tablesEmpty = [];
    const tablesNotInPG = [];
    const tablesInPG = [];
    
    for (const table of sqliteTables) {
      const tableName = table.name;
      
      // Check if has data
      const countResult = sqlite.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
      const rowCount = countResult.count;
      
      // Check if exists in PostgreSQL
      const existsInPG = pgTableNames.includes(tableName);
      
      // Check if JSON export exists
      const jsonFile = path.join(DATA_DIR, `${tableName}.json`);
      const hasExport = fs.existsSync(jsonFile);
      
      const tableInfo = {
        name: tableName,
        rowCount: rowCount,
        existsInPG: existsInPG,
        hasExport: hasExport
      };
      
      if (rowCount > 0) {
        tablesWithData.push(tableInfo);
        if (existsInPG) {
          tablesInPG.push(tableInfo);
        } else {
          tablesNotInPG.push(tableInfo);
        }
      } else {
        tablesEmpty.push(tableInfo);
      }
    }
    
    // Report results
    console.log('📋 SUMMARY REPORT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log(`\n✅ Tables with data (${tablesWithData.length}):`);
    tablesWithData.forEach(t => {
      const status = t.existsInPG ? '🐘' : '❌';
      const exportStatus = t.hasExport ? '📤' : '📭';
      console.log(`   ${status} ${exportStatus} ${t.name} (${t.rowCount} rows)`);
    });
    
    console.log(`\n❌ Missing in PostgreSQL (${tablesNotInPG.length}):`);
    tablesNotInPG.forEach(t => {
      console.log(`   📋 ${t.name} (${t.rowCount} rows)`);
    });
    
    console.log(`\n✅ Ready to import (${tablesInPG.length}):`);
    tablesInPG.forEach(t => {
      console.log(`   🚀 ${t.name} (${t.rowCount} rows)`);
    });
    
    console.log(`\n⚪ Empty tables (${tablesEmpty.length}):`);
    tablesEmpty.slice(0, 10).forEach(t => {
      console.log(`   📭 ${t.name}`);
    });
    if (tablesEmpty.length > 10) {
      console.log(`   ... and ${tablesEmpty.length - 10} more empty tables`);
    }
    
    // Action plan
    console.log('\n🎯 ACTION PLAN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`1. Import ${tablesInPG.length} tables to existing PostgreSQL schema`);
    console.log(`2. Create ${tablesNotInPG.length} missing tables in PostgreSQL`);
    console.log(`3. Skip ${tablesEmpty.length} empty tables`);
    
    console.log('\n✅ Analysis completed!');
    
    pgClient.release();
    sqlite.close();
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    await pool.end();
  }
}

analyzeAllTables();