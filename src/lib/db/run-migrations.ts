import { getDB } from "./sqlite-client";
import fs from "fs";
import path from "path";

interface MigrationRecord {
  id: number;
  filename: string;
  executed_at: string;
}

export class MigrationRunner {
  private db: ReturnType<typeof getDB>;
  private migrationsDir: string;

  constructor() {
    this.db = getDB();
    this.migrationsDir = path.join(process.cwd(), "src/lib/db/migrations");
  }

  /**
   * Initialize migrations table
   */
  private initMigrationsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT UNIQUE NOT NULL,
        executed_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Get list of executed migrations
   */
  private getExecutedMigrations(): Set<string> {
    const migrations = this.db
      .prepare("SELECT filename FROM migrations")
      .all() as MigrationRecord[];

    return new Set(migrations.map(m => m.filename));
  }

  /**
   * Backup database before migration
   */
  private backupDatabase(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(process.cwd(), `procheff-backup-${timestamp}.db`);

    // Simple file copy for backup
    const fs = require("fs");
    const dbPath = path.join(process.cwd(), "procheff.db");

    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      console.log(`✅ Database backed up to: ${backupPath}`);
    } else {
      console.log("⚠️ Database file not found, skipping backup");
    }

    return backupPath;
  }

  /**
   * Run a single migration file
   */
  private runMigration(filename: string): void {
    const filepath = path.join(this.migrationsDir, filename);

    if (!fs.existsSync(filepath)) {
      throw new Error(`Migration file not found: ${filename}`);
    }

    const sql = fs.readFileSync(filepath, "utf-8");

    try {
      console.log(`⏳ Running migration: ${filename}`);
      this.db.exec(sql);

      // Record successful migration
      this.db
        .prepare("INSERT INTO migrations (filename) VALUES (?)")
        .run(filename);

      console.log(`✅ Migration completed: ${filename}`);
    } catch (error) {
      console.error(`❌ Migration failed: ${filename}`, error);
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  public async runAll(): Promise<void> {
    console.log("🚀 Starting migration runner...");

    // Initialize migrations table
    this.initMigrationsTable();

    // Get list of migration files
    const files = fs
      .readdirSync(this.migrationsDir)
      .filter(f => f.endsWith(".sql"))
      .sort(); // Sort to ensure order

    // Get executed migrations
    const executed = this.getExecutedMigrations();

    // Find pending migrations
    const pending = files.filter(f => !executed.has(f));

    if (pending.length === 0) {
      console.log("✅ No pending migrations");
      return;
    }

    console.log(`📋 Found ${pending.length} pending migrations`);

    // Backup before running migrations
    const backupPath = this.backupDatabase();

    try {
      // Run each pending migration
      for (const file of pending) {
        this.runMigration(file);
      }

      console.log("✅ All migrations completed successfully");
    } catch (error) {
      console.error("❌ Migration failed, backup available at:", backupPath);
      throw error;
    }
  }

  /**
   * Rollback last migration (if rollback file exists)
   */
  public async rollback(): Promise<void> {
    const lastMigration = this.db
      .prepare("SELECT filename FROM migrations ORDER BY id DESC LIMIT 1")
      .get() as MigrationRecord | undefined;

    if (!lastMigration) {
      console.log("⚠️ No migrations to rollback");
      return;
    }

    const rollbackFile = lastMigration.filename.replace(".sql", "_rollback.sql");
    const rollbackPath = path.join(this.migrationsDir, rollbackFile);

    if (!fs.existsSync(rollbackPath)) {
      console.log("⚠️ No rollback file found for:", lastMigration.filename);
      return;
    }

    const sql = fs.readFileSync(rollbackPath, "utf-8");

    try {
      console.log(`⏳ Rolling back: ${lastMigration.filename}`);
      this.db.exec(sql);

      // Remove migration record
      this.db
        .prepare("DELETE FROM migrations WHERE filename = ?")
        .run(lastMigration.filename);

      console.log(`✅ Rollback completed: ${lastMigration.filename}`);
    } catch (error) {
      console.error(`❌ Rollback failed: ${lastMigration.filename}`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const migrationRunner = new MigrationRunner();

// Auto-run migrations if called directly
if (require.main === module) {
  migrationRunner.runAll().catch(console.error);
}