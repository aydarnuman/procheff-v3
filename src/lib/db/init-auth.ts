import { getDatabase } from "@/lib/db/universal-client";
import type { UniversalDB } from "@/lib/db/universal-client";
import bcrypt from "bcryptjs";

let dbInstance: UniversalDB | null = null;
async function getDBInstance(): Promise<UniversalDB> {
  if (!dbInstance) {
    dbInstance = await getDatabase();
  }
  return dbInstance;
}

export type Role = "OWNER" | "ADMIN" | "ANALYST" | "VIEWER";

export interface User {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
  created_at: string;
}

export async function initAuthSchema() {
  const db = await getDBInstance();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS memberships (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(org_id, user_id)
      );
    `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Orchestration pipeline state tracking
  await db.execute(`
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      started_at TIMESTAMP,
      completed_at TIMESTAMP
    );
  `);

  // Indexes for performance
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
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDBInstance();
  return await db.queryOne<User>("SELECT * FROM users WHERE email = $1", [email]);
}

export async function createUser({ id, email, name, password }: { id: string; email: string; name?: string; password: string; }) {
  const db = await getDBInstance();
  const hash = bcrypt.hashSync(password, 10);
  await db.execute("INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)", [id, email, name || null, hash]);
  return await findUserByEmail(email);
}

export function verifyPassword(hash: string, password: string) {
  return bcrypt.compareSync(password, hash);
}

export async function createDefaultOrgForUser({ orgId, userId, orgName }: { orgId: string; userId: string; orgName: string }) {
  const db = await getDBInstance();
  await db.execute("INSERT INTO organizations (id, name, owner_user_id) VALUES ($1, $2, $3)", [orgId, orgName, userId]);
  await db.execute("INSERT INTO memberships (id, org_id, user_id, role) VALUES ($1, $2, $3, 'OWNER')", [`${orgId}:${userId}`, orgId, userId]);
}

export async function getUserOrgs(userId: string) {
  const db = await getDBInstance();
  return await db.query<{ id: string; name: string; role: Role }>(`
    SELECT o.id, o.name, m.role
    FROM organizations o
    JOIN memberships m ON m.org_id = o.id
    WHERE m.user_id = $1
    ORDER BY o.created_at DESC
  `, [userId]);
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

export async function createOrchestration(
  id: string,
  data?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    userId?: string;
  }
) {
  const db = await getDBInstance();
  await db.execute(`
    INSERT INTO orchestrations (id, file_name, file_size, mime_type, user_id, progress, status)
    VALUES ($1, $2, $3, $4, $5, 0, 'pending')
  `, [
    id,
    data?.fileName || null,
    data?.fileSize || null,
    data?.mimeType || null,
    data?.userId || null
  ]);
}

export async function updateOrchestration(
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
  const db = await getDBInstance();
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.progress !== undefined) {
    fields.push(`progress = $${paramIndex++}`);
    values.push(updates.progress);
  }
  if (updates.status) {
    fields.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }
  if (updates.current_step) {
    fields.push(`current_step = $${paramIndex++}`);
    values.push(updates.current_step);
  }
  if (updates.steps_json) {
    fields.push(`steps_json = $${paramIndex++}`);
    values.push(updates.steps_json);
  }
  if (updates.result !== undefined) {
    fields.push(`result = $${paramIndex++}`);
    values.push(JSON.stringify(updates.result));
  }
  if (updates.error) {
    fields.push(`error = $${paramIndex++}`);
    values.push(updates.error);
  }
  if (updates.warnings !== undefined) {
    fields.push(`warnings = $${paramIndex++}`);
    values.push(updates.warnings);
  }
  if (updates.started_at) {
    fields.push(`started_at = $${paramIndex++}`);
    values.push(updates.started_at);
  }
  if (updates.completed_at) {
    fields.push(`completed_at = $${paramIndex++}`);
    values.push(updates.completed_at);
  }
  if (updates.duration_ms !== undefined) {
    fields.push(`duration_ms = $${paramIndex++}`);
    values.push(updates.duration_ms);
  }

  if (fields.length === 0) return;

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  await db.execute(`
    UPDATE orchestrations
    SET ${fields.join(", ")}
    WHERE id = $${paramIndex}
  `, values);
}

export async function getOrchestration(id: string): Promise<OrchestrationRecord | undefined> {
  const db = await getDBInstance();
  return await db.queryOne<OrchestrationRecord>("SELECT * FROM orchestrations WHERE id = $1", [id]);
}

export async function getRecentOrchestrations(limit = 50): Promise<OrchestrationRecord[]> {
  const db = await getDBInstance();
  return await db.query<OrchestrationRecord>(`
    SELECT * FROM orchestrations
    ORDER BY created_at DESC
    LIMIT $1
  `, [limit]);
}

export async function getOrchestrationsByStatus(
  status: string,
  limit = 50
): Promise<OrchestrationRecord[]> {
  const db = await getDBInstance();
  return await db.query<OrchestrationRecord>(`
    SELECT * FROM orchestrations
    WHERE status = $1
    ORDER BY created_at DESC
    LIMIT $2
  `, [status, limit]);
}

export async function searchOrchestrations(
  query: string,
  limit = 50
): Promise<OrchestrationRecord[]> {
  const db = await getDBInstance();
  return await db.query<OrchestrationRecord>(`
    SELECT * FROM orchestrations
    WHERE file_name LIKE $1 OR id LIKE $2
    ORDER BY created_at DESC
    LIMIT $3
  `, [`%${query}%`, `%${query}%`, limit]);
}

export async function deleteOrchestration(id: string): Promise<void> {
  const db = await getDBInstance();
  await db.execute("DELETE FROM orchestrations WHERE id = $1", [id]);
}

export async function cancelOrchestration(id: string): Promise<void> {
  const db = await getDBInstance();
  await db.execute(`
    UPDATE orchestrations
    SET status = 'cancelled',
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND status = 'running'
  `, [id]);
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

export async function createNotification(data: {
  level: string;
  message: string;
}): Promise<void> {
  const db = await getDBInstance();
  await db.execute(`
    INSERT INTO notifications (level, message)
    VALUES ($1, $2)
  `, [data.level, data.message]);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const db = await getDBInstance();
  const result = await db.queryOne<{ count: number }>("SELECT COUNT(*) as count FROM notifications WHERE is_read = 0");
  return result?.count || 0;
}
