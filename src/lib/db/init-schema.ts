import { getDatabase } from "@/lib/db/universal-client";

/**
 * Complete database schema initialization
 * Creates all required tables if they don't exist
 */
export async function initCompleteSchema() {
  const db = await getDatabase();

  // Users and authentication tables
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255),
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS organizations (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      owner_user_id VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS memberships (
      id VARCHAR(255) PRIMARY KEY,
      org_id VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(org_id, user_id)
    );
  `);

  // Notifications table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      level VARCHAR(50) NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Orchestration pipeline state tracking
  await db.execute(`
    CREATE TABLE IF NOT EXISTS orchestrations (
      id VARCHAR(255) PRIMARY KEY,
      file_name VARCHAR(255),
      file_size INTEGER,
      mime_type VARCHAR(100),
      progress INTEGER DEFAULT 0,
      status VARCHAR(50) DEFAULT 'pending',
      current_step VARCHAR(255),
      steps_json TEXT,
      result TEXT,
      error TEXT,
      warnings TEXT,
      duration_ms INTEGER,
      user_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      started_at TIMESTAMP,
      completed_at TIMESTAMP
    );
  `);

  // Tenders table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tenders (
      id VARCHAR(255) PRIMARY KEY,
      title TEXT NOT NULL,
      institution VARCHAR(255),
      deadline VARCHAR(255),
      budget VARCHAR(255),
      category VARCHAR(255),
      link TEXT,
      raw_data TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Logs table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS logs (
      id SERIAL PRIMARY KEY,
      level VARCHAR(50) NOT NULL,
      message TEXT NOT NULL,
      context TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Analysis history table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS analysis_history (
      id VARCHAR(255) PRIMARY KEY,
      file_name VARCHAR(255) NOT NULL,
      file_size INTEGER,
      mime_type VARCHAR(100),
      extracted_fields TEXT,
      contextual_analysis TEXT,
      market_analysis TEXT,
      validation TEXT,
      processing_time_ms INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Analysis results table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS analysis_results (
      id VARCHAR(255) PRIMARY KEY,
      analysis_id VARCHAR(255) NOT NULL,
      stage VARCHAR(50) NOT NULL,
      result_data TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (analysis_id) REFERENCES analysis_history(id)
    );
  `);

  // Analysis results v2 table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS analysis_results_v2 (
      id VARCHAR(255) PRIMARY KEY,
      tender_id VARCHAR(255),
      institution VARCHAR(255),
      budget REAL,
      score REAL,
      result_data TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Market prices cache table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS market_prices (
      product_key VARCHAR(255) PRIMARY KEY,
      prices TEXT NOT NULL,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      confidence REAL
    );
  `);

  // Data pools table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS data_pools (
      id VARCHAR(255) PRIMARY KEY,
      analysis_id VARCHAR(255) NOT NULL,
      pool_data TEXT NOT NULL,
      expires TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (analysis_id) REFERENCES analysis_history(id)
    );
  `);

  // Menu cache table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS menu_cache (
      id VARCHAR(255) PRIMARY KEY,
      menu_data TEXT NOT NULL,
      file_hash VARCHAR(255) NOT NULL,
      last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // API metrics table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS api_metrics (
      id SERIAL PRIMARY KEY,
      endpoint VARCHAR(255) NOT NULL,
      method VARCHAR(50) NOT NULL,
      status_code INTEGER,
      duration_ms INTEGER,
      tokens_used INTEGER,
      cost REAL,
      model VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Semantic cache table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS semantic_cache (
      id VARCHAR(255) PRIMARY KEY,
      prompt_hash VARCHAR(255) UNIQUE NOT NULL,
      prompt TEXT NOT NULL,
      response TEXT NOT NULL,
      model VARCHAR(100),
      tokens_used INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      hit_count INTEGER DEFAULT 1
    );
  `);

  console.log("✅ Complete schema initialized");
}

/**
 * Create all indexes for performance optimization
 */
export async function createIndexes() {
  const db = await getDatabase();

  try {
    // Orchestration indexes
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_orchestrations_created_at
      ON orchestrations(created_at DESC);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_orchestrations_status
      ON orchestrations(status, created_at DESC);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_orchestrations_user
      ON orchestrations(user_id, created_at DESC);
    `);

    // Analysis indexes
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_analysis_results_analysis_id
      ON analysis_results(analysis_id);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_analysis_results_stage
      ON analysis_results(stage);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_analysis_results_v2_tender_id
      ON analysis_results_v2(tender_id);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_analysis_results_v2_score
      ON analysis_results_v2(score DESC);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_analysis_results_v2_budget
      ON analysis_results_v2(budget);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_analysis_results_v2_institution
      ON analysis_results_v2(institution);
    `);

    // Market prices index
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_market_prices_updated
      ON market_prices(last_updated);
    `);

    // Data pools index
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_datapool_expires
      ON data_pools(expires);
    `);

    // Menu cache index
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_menu_cache_last_used
      ON menu_cache(last_used);
    `);

    // API metrics indexes
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_api_metrics_endpoint
      ON api_metrics(endpoint, created_at DESC);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_api_metrics_cost
      ON api_metrics(cost);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_api_metrics_model
      ON api_metrics(model, created_at DESC);
    `);

    // Logs indexes
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_logs_level
      ON logs(level);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_logs_level_created
      ON logs(level, created_at DESC);
    `);

    // Notifications indexes
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read
      ON notifications(is_read);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_notifications_unread
      ON notifications(is_read, created_at DESC);
    `);

    // Memberships index
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_memberships_org_id
      ON memberships(org_id);
    `);

    // Tenders indexes
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_tenders_institution
      ON tenders(institution);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_tenders_created_at
      ON tenders(created_at DESC);
    `);

    console.log("✅ All indexes created");
  } catch (error) {
    console.error("❌ Error creating indexes:", error);
  }
}

/**
 * Initialize complete database schema with indexes
 */
export async function initializeDatabase() {
  await initCompleteSchema();
  await createIndexes();
}
