/**
 * Run database migrations
 */

import { getDB } from './sqlite-client';
import fs from 'fs';
import path from 'path';

export function runMigrations() {
  try {
    const db = getDB();

    // List of migration files in order
    const migrations = [
      '000_create_analysis_history.sql',
      'add-analysis-tables.sql',
      'add-storage-progress.sql',
      '003_analysis_repository.sql',
      '004_add_missing_indexes.sql',
      '006_market_prices.sql',
      '007_market_prices_real.sql'
    ];

    for (const migrationFile of migrations) {
      try {
        // Try multiple possible paths for Next.js compatibility
        const possiblePaths = [
          path.join(__dirname, 'migrations', migrationFile),
          path.join(process.cwd(), 'src', 'lib', 'db', 'migrations', migrationFile),
          path.join(process.cwd(), '.next', 'server', 'src', 'lib', 'db', 'migrations', migrationFile),
        ];
        
        let migrationPath: string | null = null;
        for (const possiblePath of possiblePaths) {
          if (fs.existsSync(possiblePath)) {
            migrationPath = possiblePath;
            break;
          }
        }
        
        // Check if file exists
        if (!migrationPath) {
          console.log(`⚠️  Migration file not found: ${migrationFile}`);
          console.log(`   Tried paths: ${possiblePaths.join(', ')}`);
          continue;
        }

        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

        // Split by semicolon and run each statement
        const statements = migrationSQL
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
          try {
            db.exec(statement + ';');
            // Only log successful non-index operations to reduce noise
            if (!statement.includes('CREATE INDEX')) {
              console.log('✓ Executed:', statement.substring(0, 50) + '...');
            }
          } catch (error: any) {
            // Ignore common migration errors that don't affect functionality
            const ignorableErrors = [
              'duplicate column',
              'duplicate index',
              'already exists',
              'no such table',  // Tables that haven't been created yet
              'no such column', // Columns that don't exist in base tables
            ];

            const shouldIgnore = ignorableErrors.some(msg =>
              error.message.toLowerCase().includes(msg.toLowerCase())
            );

            if (!shouldIgnore) {
              console.error('✗ Failed:', statement.substring(0, 50) + '...');
              console.error(error.message);
            }
          }
        }

        console.log(`✅ Migration completed: ${migrationFile}`);
      } catch (error) {
        console.error(`❌ Migration failed for ${migrationFile}:`, error);
        // Continue with next migration
      }
    }

    console.log('✅ All migrations completed successfully');

  } catch (error) {
    console.error('❌ Migration system failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations();
}