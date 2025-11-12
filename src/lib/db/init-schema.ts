import { getDB } from "@/lib/db/sqlite-client";

/**
 * Complete database schema initialization
 * Creates all required tables if they don't exist
 */
export function initCompleteSchema() {
  const db = getDB();

  // Users and authentication tables
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS memberships (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      UNIQUE(org_id, user_id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `).run();

  // Notifications table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `).run();

  // Orchestration pipeline state tracking
  db.prepare(`
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      started_at TEXT,
      completed_at TEXT
    );
  `).run();

  // Tenders table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS tenders (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      institution TEXT,
      deadline TEXT,
      budget TEXT,
      category TEXT,
      link TEXT,
      raw_data TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `).run();

  // Logs table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      context TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `).run();

  // Analysis history table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS analysis_history (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      extracted_fields TEXT,
      contextual_analysis TEXT,
      market_analysis TEXT,
      validation TEXT,
      processing_time_ms INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `).run();

  // Analysis results table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS analysis_results (
      id TEXT PRIMARY KEY,
      analysis_id TEXT NOT NULL,
      stage TEXT NOT NULL,
      result_data TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (analysis_id) REFERENCES analysis_history(id)
    );
  `).run();

  // Analysis results v2 table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS analysis_results_v2 (
      id TEXT PRIMARY KEY,
      tender_id TEXT,
      institution TEXT,
      budget REAL,
      score REAL,
      result_data TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `).run();

  // Market prices cache table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS market_prices (
      product_key TEXT PRIMARY KEY,
      prices TEXT NOT NULL,
      last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
      confidence REAL
    );
  `).run();

  // Data pools table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS data_pools (
      id TEXT PRIMARY KEY,
      analysis_id TEXT NOT NULL,
      pool_data TEXT NOT NULL,
      expires TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (analysis_id) REFERENCES analysis_history(id)
    );
  `).run();

  // Menu cache table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS menu_cache (
      id TEXT PRIMARY KEY,
      menu_data TEXT NOT NULL,
      file_hash TEXT NOT NULL,
      last_used TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `).run();

  // API metrics table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS api_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      status_code INTEGER,
      duration_ms INTEGER,
      tokens_used INTEGER,
      cost REAL,
      model TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `).run();

  // Semantic cache table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS semantic_cache (
      id TEXT PRIMARY KEY,
      prompt_hash TEXT UNIQUE NOT NULL,
      prompt TEXT NOT NULL,
      response TEXT NOT NULL,
      model TEXT,
      tokens_used INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_used TEXT DEFAULT CURRENT_TIMESTAMP,
      hit_count INTEGER DEFAULT 1
    );
  `).run();

  console.log("✅ Complete schema initialized");
}

/**
 * Create all indexes for performance optimization
 */
export function createIndexes() {
  const db = getDB();

  try {
    // Orchestration indexes
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_orchestrations_created_at
      ON orchestrations(created_at DESC);
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_orchestrations_status
      ON orchestrations(status, created_at DESC);
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_orchestrations_user
      ON orchestrations(user_id, created_at DESC);
    `).run();

    // Analysis indexes
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_analysis_results_analysis_id
      ON analysis_results(analysis_id);
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_analysis_results_stage
      ON analysis_results(stage);
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_analysis_results_v2_tender_id
      ON analysis_results_v2(tender_id);
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_analysis_results_v2_score
      ON analysis_results_v2(score DESC);
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_analysis_results_v2_budget
      ON analysis_results_v2(budget);
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_analysis_results_v2_institution
      ON analysis_results_v2(institution);
    `).run();

    // Market prices index
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_market_prices_updated
      ON market_prices(last_updated);
    `).run();

    // Data pools index
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_datapool_expires
      ON data_pools(expires);
    `).run();

    // Menu cache index
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_menu_cache_last_used
      ON menu_cache(last_used);
    `).run();

    // API metrics indexes
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_api_metrics_endpoint
      ON api_metrics(endpoint, created_at DESC);
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_api_metrics_cost
      ON api_metrics(cost);
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_api_metrics_model
      ON api_metrics(model, created_at DESC);
    `).run();

    // Logs indexes
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_logs_level
      ON logs(level);
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_logs_level_created
      ON logs(level, created_at DESC);
    `).run();

    // Notifications indexes
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read
      ON notifications(is_read);
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_notifications_unread
      ON notifications(is_read, created_at DESC);
    `).run();

    // Memberships index
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_memberships_org_id
      ON memberships(org_id);
    `).run();

    // Tenders indexes
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_tenders_institution
      ON tenders(institution);
    `).run();

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_tenders_created_at
      ON tenders(created_at DESC);
    `).run();

    console.log("✅ All indexes created");
  } catch (error) {
    console.error("❌ Error creating indexes:", error);
  }
}

/**
 * Initialize complete database schema with indexes
 */
export function initializeDatabase() {
  initCompleteSchema();
  createIndexes();
}
