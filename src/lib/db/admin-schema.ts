import { getDB } from "@/lib/db/sqlite-client";
import { getSQLSyntax } from './db-adapter';

/**
 * Admin panel için veritabanı şeması genişletmeleri
 * - activity_logs: Kullanıcı aktivite takibi
 * - users tablosuna yeni kolonlar: status, last_login_at, last_ip
 */

export async function ensureAdminSchema(): Promise<void> {
  const db = getDB();
  const syntax = getSQLSyntax();

    // 1. Activity Logs Tablosu
  db.prepare(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id ${syntax.serialPrimaryKey},
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at ${syntax.timestampDefault},
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

  // 2. Activity Logs İndeksleri
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_activity_logs_user
    ON activity_logs(user_id, created_at DESC);
  `).run();

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_activity_logs_action
    ON activity_logs(action, created_at DESC);
  `).run();

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_activity_logs_created
    ON activity_logs(created_at DESC);
  `).run();

  // 3. Users Tablosuna Yeni Kolonlar (Güvenli Ekleme)
  try {
    // Status kolonu kontrolü
    const tableInfo = db.prepare(`PRAGMA table_info(users)`).all() as any[];
    const hasStatus = tableInfo.some((col) => col.name === "status");
    const hasLastLogin = tableInfo.some((col) => col.name === "last_login_at");
    const hasLastIp = tableInfo.some((col) => col.name === "last_ip");

    if (!hasStatus) {
      db.prepare(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'`).run();
      console.log("✅ Added 'status' column to users table");
    } else {
      console.log("ℹ️  'status' column already exists in users table");
    }

    if (!hasLastLogin) {
      db.prepare(`ALTER TABLE users ADD COLUMN last_login_at TEXT`).run();
      console.log("✅ Added 'last_login_at' column to users table");
    } else {
      console.log("ℹ️  'last_login_at' column already exists in users table");
    }

    if (!hasLastIp) {
      db.prepare(`ALTER TABLE users ADD COLUMN last_ip TEXT`).run();
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
export function logActivity(data: {
  userId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}) {
  const db = getDB();

  try {
    db.prepare(`
      INSERT INTO activity_logs
      (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.userId || null,
      data.action,
      data.entityType || null,
      data.entityId || null,
      data.details ? JSON.stringify(data.details) : null,
      data.ipAddress || null,
      data.userAgent || null
    );
  } catch (error) {
    console.error("❌ Failed to log activity:", error);
  }
}
