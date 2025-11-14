#!/usr/bin/env tsx
/**
 * Run Enhanced Market Migration
 * Executes the 004_enhanced_market.sql migration
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';
import { AILogger } from '../src/lib/ai/logger';

const DB_PATH = join(process.cwd(), 'procheff.db');
const MIGRATION_PATH = join(process.cwd(), 'src/lib/db/migrations/004_enhanced_market.sql');

async function runMigration() {
  try {
    AILogger.info('[Migration] Starting enhanced market migration...');
    
    // Open database connection
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    
    // Read migration SQL
    const migrationSQL = readFileSync(MIGRATION_PATH, 'utf-8');
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        // Remove empty statements and standalone comments
        if (s.length === 0) return false;
        // Remove lines that are only comments
        const lines = s.split('\n').filter(line => !line.trim().startsWith('--'));
        return lines.some(line => line.trim().length > 0);
      });
    
    AILogger.info('[Migration] Found statements to execute:', {
      count: statements.length,
      firstFew: statements.slice(0, 3).map(s => s.substring(0, 50) + '...')
    });
    
    let successCount = 0;
    let errorCount = 0;
    
    // Begin transaction
    const beginTransaction = db.prepare('BEGIN TRANSACTION');
    const commitTransaction = db.prepare('COMMIT');
    const rollbackTransaction = db.prepare('ROLLBACK');
    
    beginTransaction.run();
    
    try {
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        try {
          // Log what we're about to execute
          const statementType = statement.trim().substring(0, 50);
          AILogger.info(`[Migration] Executing statement ${i + 1}/${statements.length}: ${statementType}...`);
          
          db.prepare(statement + ';').run();
          successCount++;
        } catch (error: any) {
          errorCount++;
          AILogger.error('[Migration] Statement failed:', {
            statementNumber: i + 1,
            statement: statement.substring(0, 200) + '...',
            error: error.message
          });
          
          // Don't fail on constraint errors for existing data
          if (!error.message.includes('UNIQUE constraint failed') && 
              !error.message.includes('already exists')) {
            throw error;
          }
        }
      }
      
      commitTransaction.run();
      AILogger.success('[Migration] Enhanced market migration completed', {
        totalStatements: statements.length,
        successful: successCount,
        failed: errorCount
      });
      
      // Verify tables were created
      const tables = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table'
        AND name LIKE '%price%' OR name LIKE '%brand%' OR name LIKE '%user%'
        ORDER BY name
      `).all() as { name: string }[];

      AILogger.info('[Migration] Database tables:', {
        tables: tables.map(t => t.name)
      });
      
    } catch (error) {
      rollbackTransaction.run();
      throw error;
    } finally {
      db.close();
    }
    
  } catch (error) {
    AILogger.error('[Migration] Enhanced market migration failed', { error });
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runMigration();
}
