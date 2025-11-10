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

  // Indexes for performance
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
  file_size: number | null;
  mime_type: string | null;
  progress: number;
  status: string;
  current_step: string | null;
  steps_json: string | null;
  result: string | null;
  error: string | null;
  warnings: string | null;
  duration_ms: number | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export function createOrchestration(
  id: string,
  data?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    userId?: string;
  }
) {
  const db = getDB();
  db.prepare(`
    INSERT INTO orchestrations (id, file_name, file_size, mime_type, user_id, progress, status)
    VALUES (?, ?, ?, ?, ?, 0, 'pending')
  `).run(
    id,
    data?.fileName || null,
    data?.fileSize || null,
    data?.mimeType || null,
    data?.userId || null
  );
}

export function updateOrchestration(
  id: string,
  updates: {
    progress?: number;
    status?: string;
    current_step?: string;
    steps_json?: string;
    result?: unknown;
    error?: string;
    warnings?: string | null;
    started_at?: string;
    completed_at?: string;
    duration_ms?: number;
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
  if (updates.current_step) {
    fields.push("current_step = ?");
    values.push(updates.current_step);
  }
  if (updates.steps_json) {
    fields.push("steps_json = ?");
    values.push(updates.steps_json);
  }
  if (updates.result !== undefined) {
    fields.push("result = ?");
    values.push(JSON.stringify(updates.result));
  }
  if (updates.error) {
    fields.push("error = ?");
    values.push(updates.error);
  }
  if (updates.warnings !== undefined) {
    fields.push("warnings = ?");
    values.push(updates.warnings);
  }
  if (updates.started_at) {
    fields.push("started_at = ?");
    values.push(updates.started_at);
  }
  if (updates.completed_at) {
    fields.push("completed_at = ?");
    values.push(updates.completed_at);
  }
  if (updates.duration_ms !== undefined) {
    fields.push("duration_ms = ?");
    values.push(updates.duration_ms);
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

export function getOrchestrationsByStatus(
  status: string,
  limit = 50
): OrchestrationRecord[] {
  const db = getDB();
  return db
    .prepare(`
      SELECT * FROM orchestrations
      WHERE status = ?
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(status, limit) as OrchestrationRecord[];
}

export function searchOrchestrations(
  query: string,
  limit = 50
): OrchestrationRecord[] {
  const db = getDB();
  return db
    .prepare(`
      SELECT * FROM orchestrations
      WHERE file_name LIKE ? OR id LIKE ?
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(`%${query}%`, `%${query}%`, limit) as OrchestrationRecord[];
}

export function deleteOrchestration(id: string): void {
  const db = getDB();
  db.prepare("DELETE FROM orchestrations WHERE id = ?").run(id);
}

export function cancelOrchestration(id: string): void {
  const db = getDB();
  db.prepare(`
    UPDATE orchestrations 
    SET status = 'cancelled', 
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status = 'running'
  `).run(id);
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
