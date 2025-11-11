/**
 * Run database migrations
 */

import { getDB } from './sqlite-client';
import fs from 'fs';
import path from 'path';

export function runMigrations() {
  try {
    const db = getDB();

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add-analysis-tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split by semicolon and run each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        db.exec(statement + ';');
        console.log('✓ Executed:', statement.substring(0, 50) + '...');
      } catch (error: any) {
        // Ignore "duplicate column" errors
        if (!error.message.includes('duplicate column')) {
          console.error('✗ Failed:', statement.substring(0, 50) + '...');
          console.error(error.message);
        }
      }
    }

    console.log('✅ Migrations completed successfully');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations();
}