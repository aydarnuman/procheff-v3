#!/usr/bin/env node
import { getDB } from '../src/lib/db/sqlite-client';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  console.log('🔄 Running market prices migration...');

  try {
    const db = getDB();
    
    // Read migration file
    const migrationPath = path.join(process.cwd(), 'src/lib/db/migrations/003_market_prices.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        db.exec(statement);
    }
    }
    
    console.log('✅ Migration completed successfully!');

    // Verify tables were created
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('\n📊 Database tables:');
    tables.forEach((table: any) => {
      console.log(`  - ${table.name}`);
      });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runMigration();
}