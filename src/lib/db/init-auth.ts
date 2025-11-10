import { getDB } from "@/lib/db/sqlite-client";
import bcrypt from "bcryptjs";

export type Role = "OWNER" | "ADMIN" | "ANALYST" | "VIEWER";

export interface User {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
  created_at: string;
}

export function initAuthSchema() {
  const db = getDB();

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
      progress INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      current_step TEXT,
      result TEXT,
      error TEXT,
      warnings TEXT,
      duration_ms INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      started_at TEXT,
      completed_at TEXT
    );
  `).run();

  // Index for recent orchestrations query
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_orchestrations_created_at 
    ON orchestrations(created_at DESC);
  `).run();
}

export function findUserByEmail(email: string): User | undefined {
  const db = getDB();
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as User | undefined;
}

export function createUser({ id, email, name, password }: { id: string; email: string; name?: string; password: string; }) {
  const db = getDB();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare("INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)").run(id, email, name || null, hash);
  return findUserByEmail(email);
}

export function verifyPassword(hash: string, password: string) {
  return bcrypt.compareSync(password, hash);
}

export function createDefaultOrgForUser({ orgId, userId, orgName }: { orgId: string; userId: string; orgName: string }) {
  const db = getDB();
  db.prepare("INSERT INTO organizations (id, name, owner_user_id) VALUES (?, ?, ?)").run(orgId, orgName, userId);
  db.prepare("INSERT INTO memberships (id, org_id, user_id, role) VALUES (?, ?, ?, 'OWNER')").run(`${orgId}:${userId}`, orgId, userId);
}

export function getUserOrgs(userId: string) {
  const db = getDB();
  return db.prepare(`
    SELECT o.id, o.name, m.role
    FROM organizations o
    JOIN memberships m ON m.org_id = o.id
    WHERE m.user_id = ?
    ORDER BY o.created_at DESC
  `).all(userId) as Array<{ id: string; name: string; role: Role }>;
}

/**
 * Orchestration Pipeline State Management
 */
export interface OrchestrationRecord {
  id: string;
  file_name: string | null;
  progress: number;
  status: string;
  result: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export function createOrchestration(id: string, fileName?: string) {
  const db = getDB();
  db.prepare(`
    INSERT INTO orchestrations (id, file_name, progress, status)
    VALUES (?, ?, 0, 'pending')
  `).run(id, fileName || null);
}

export function updateOrchestration(
  id: string,
  updates: {
    progress?: number;
    status?: string;
    result?: unknown;
    error?: string;
  }
) {
  const db = getDB();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.progress !== undefined) {
    fields.push("progress = ?");
    values.push(updates.progress);
  }
  if (updates.status) {
    fields.push("status = ?");
    values.push(updates.status);
  }
  if (updates.result !== undefined) {
    fields.push("result = ?");
    values.push(JSON.stringify(updates.result));
  }
  if (updates.error) {
    fields.push("error = ?");
    values.push(updates.error);
  }

  if (fields.length === 0) return;

  fields.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);

  db.prepare(`
    UPDATE orchestrations 
    SET ${fields.join(", ")}
    WHERE id = ?
  `).run(...values);
}

export function getOrchestration(id: string): OrchestrationRecord | undefined {
  const db = getDB();
  return db
    .prepare("SELECT * FROM orchestrations WHERE id = ?")
    .get(id) as OrchestrationRecord | undefined;
}

export function getRecentOrchestrations(limit = 50): OrchestrationRecord[] {
  const db = getDB();
  return db
    .prepare(`
      SELECT * FROM orchestrations
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(limit) as OrchestrationRecord[];
}

/**
 * Notifications Management
 */
export interface NotificationRecord {
  id: number;
  level: string;
  message: string;
  is_read: number;
  created_at: string;
}

export function createNotification(data: {
  level: string;
  message: string;
}): void {
  const db = getDB();
  db.prepare(`
    INSERT INTO notifications (level, message)
    VALUES (?, ?)
  `).run(data.level, data.message);
}

export function getUnreadNotificationCount(): number {
  const db = getDB();
  const result = db
    .prepare("SELECT COUNT(*) as count FROM notifications WHERE is_read = 0")
    .get() as { count: number };
  return result.count;
}
