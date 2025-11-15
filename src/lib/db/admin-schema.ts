import { getDatabase } from "@/lib/db/universal-client";

/**
 * Admin panel için veritabanı şeması genişletmeleri
 * - activity_logs: Kullanıcı aktivite takibi
 * - users tablosuna yeni kolonlar: status, last_login_at, last_ip
 */

export async function initAdminSchema() {
  const db = await getDatabase();

  // 1. Activity Logs Tablosu
  await db.execute(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255),
      action VARCHAR(255) NOT NULL,
      entity_type VARCHAR(255),
      entity_id VARCHAR(255),
      details TEXT,
      ip_address VARCHAR(50),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // 2. Activity Logs İndeksleri
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_activity_logs_user
    ON activity_logs(user_id, created_at DESC);
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_activity_logs_action
    ON activity_logs(action, created_at DESC);
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_activity_logs_created
    ON activity_logs(created_at DESC);
  `);

  // 3. Users Tablosuna Yeni Kolonlar (Güvenli Ekleme)
  try {
    // PostgreSQL'de kolonu var mı kontrol etmek için information_schema kullan
    const statusCol = await db.queryOne(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'status'
    `) as { column_name: string } | undefined;

    const lastLoginCol = await db.queryOne(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'last_login_at'
    `) as { column_name: string } | undefined;

    const lastIpCol = await db.queryOne(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'last_ip'
    `) as { column_name: string } | undefined;

    if (!statusCol) {
      await db.execute(`ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active'`);
      console.log("✅ Added 'status' column to users table");
    } else {
      console.log("ℹ️  'status' column already exists in users table");
    }

    if (!lastLoginCol) {
      await db.execute(`ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP`);
      console.log("✅ Added 'last_login_at' column to users table");
    } else {
      console.log("ℹ️  'last_login_at' column already exists in users table");
    }

    if (!lastIpCol) {
      await db.execute(`ALTER TABLE users ADD COLUMN last_ip VARCHAR(50)`);
      console.log("✅ Added 'last_ip' column to users table");
    } else {
      console.log("ℹ️  'last_ip' column already exists in users table");
    }
  } catch (error) {
    console.error("⚠️ Error adding columns to users table:", error);
    // Hata olsa bile devam et (kolonlar zaten var olabilir)
  }

  console.log("✅ Admin schema initialized successfully");
}

// Activity logger utility
export async function logActivity(data: {
  userId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}) {
  const db = await getDatabase();

  try {
    await db.execute(`
      INSERT INTO activity_logs
      (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      data.userId || null,
      data.action,
      data.entityType || null,
      data.entityId || null,
      data.details ? JSON.stringify(data.details) : null,
      data.ipAddress || null,
      data.userAgent || null
    ]);
  } catch (error) {
    console.error("❌ Failed to log activity:", error);
  }
}
