import { getDB } from "@/lib/db/sqlite-client";

/**
 * Initialize Batch Processing Database Schema
 *
 * Tables:
 * - batch_jobs: Tracks batch upload jobs
 * - batch_files: Individual files within a batch
 */

export type BatchJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type BatchFileStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "skipped";

export type BatchPriority = "high" | "normal" | "low";

export interface BatchJob {
  id: string;
  user_id: string | null;
  status: BatchJobStatus;
  total_files: number;
  processed_files: number;
  failed_files: number;
  priority: BatchPriority;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
}

export interface BatchFile {
  id: string;
  batch_id: string;
  filename: string;
  file_size: number;
  file_hash: string;
  status: BatchFileStatus;
  progress: number;
  result: string | null;
  error: string | null;
  retry_count: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export function initBatchSchema() {
  const db = getDB();

  // Batch Jobs Table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS batch_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      total_files INTEGER NOT NULL DEFAULT 0,
      processed_files INTEGER NOT NULL DEFAULT 0,
      failed_files INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'normal',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      started_at TEXT,
      completed_at TEXT,
      error TEXT
    );
  `).run();

  // Batch Files Table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS batch_files (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      progress INTEGER NOT NULL DEFAULT 0,
      result TEXT,
      error TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      started_at TEXT,
      completed_at TEXT,
      FOREIGN KEY (batch_id) REFERENCES batch_jobs(id) ON DELETE CASCADE
    );
  `).run();

  // Create indexes for performance
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_batch_jobs_status
    ON batch_jobs(status);
  `).run();

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_batch_jobs_user_id
    ON batch_jobs(user_id);
  `).run();

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_batch_jobs_created_at
    ON batch_jobs(created_at DESC);
  `).run();

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_batch_files_batch_id
    ON batch_files(batch_id);
  `).run();

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_batch_files_status
    ON batch_files(status);
  `).run();

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_batch_files_hash
    ON batch_files(file_hash);
  `).run();

  console.log("[Batch] Database schema initialized");
}

/**
 * Create a new batch job
 */
export function createBatchJob(data: {
  id: string;
  user_id?: string;
  total_files: number;
  priority?: BatchPriority;
}): BatchJob {
  const db = getDB();

  const { id, user_id, total_files, priority = "normal" } = data;

  db.prepare(`
    INSERT INTO batch_jobs (id, user_id, total_files, priority, status)
    VALUES (?, ?, ?, ?, 'pending')
  `).run(id, user_id || null, total_files, priority);

  return getBatchJob(id)!;
}

/**
 * Get batch job by ID
 */
export function getBatchJob(id: string): BatchJob | undefined {
  const db = getDB();
  return db
    .prepare("SELECT * FROM batch_jobs WHERE id = ?")
    .get(id) as BatchJob | undefined;
}

/**
 * Update batch job status
 */
export function updateBatchJobStatus(
  id: string,
  status: BatchJobStatus,
  error?: string
): void {
  const db = getDB();

  const updates: string[] = ["status = ?"];
  const values: (string | number)[] = [status];

  if (status === "processing" && !getBatchJob(id)?.started_at) {
    updates.push("started_at = CURRENT_TIMESTAMP");
  }

  if (status === "completed" || status === "failed" || status === "cancelled") {
    updates.push("completed_at = CURRENT_TIMESTAMP");
  }

  if (error) {
    updates.push("error = ?");
    values.push(error);
  }

  values.push(id);

  db.prepare(`
    UPDATE batch_jobs
    SET ${updates.join(", ")}
    WHERE id = ?
  `).run(...values);
}

/**
 * Increment processed files count
 */
export function incrementProcessedFiles(batchId: string, failed: boolean = false): void {
  const db = getDB();

  if (failed) {
    db.prepare(`
      UPDATE batch_jobs
      SET processed_files = processed_files + 1,
          failed_files = failed_files + 1
      WHERE id = ?
    `).run(batchId);
  } else {
    db.prepare(`
      UPDATE batch_jobs
      SET processed_files = processed_files + 1
      WHERE id = ?
    `).run(batchId);
  }
}

/**
 * Create a batch file entry
 */
export function createBatchFile(data: {
  id: string;
  batch_id: string;
  filename: string;
  file_size: number;
  file_hash: string;
}): BatchFile {
  const db = getDB();

  const { id, batch_id, filename, file_size, file_hash } = data;

  db.prepare(`
    INSERT INTO batch_files (id, batch_id, filename, file_size, file_hash, status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `).run(id, batch_id, filename, file_size, file_hash);

  return getBatchFile(id)!;
}

/**
 * Get batch file by ID
 */
export function getBatchFile(id: string): BatchFile | undefined {
  const db = getDB();
  return db
    .prepare("SELECT * FROM batch_files WHERE id = ?")
    .get(id) as BatchFile | undefined;
}

/**
 * Get all files for a batch
 */
export function getBatchFiles(batchId: string): BatchFile[] {
  const db = getDB();
  return db
    .prepare("SELECT * FROM batch_files WHERE batch_id = ? ORDER BY created_at ASC")
    .all(batchId) as BatchFile[];
}

/**
 * Update batch file status and progress
 */
export function updateBatchFileStatus(
  id: string,
  status: BatchFileStatus,
  progress: number = 0,
  result?: string,
  error?: string
): void {
  const db = getDB();

  const updates: string[] = ["status = ?", "progress = ?"];
  const values: (string | number)[] = [status, progress];

  if (status === "processing" && !getBatchFile(id)?.started_at) {
    updates.push("started_at = CURRENT_TIMESTAMP");
  }

  if (status === "completed" || status === "failed" || status === "skipped") {
    updates.push("completed_at = CURRENT_TIMESTAMP");
  }

  if (result) {
    updates.push("result = ?");
    values.push(result);
  }

  if (error) {
    updates.push("error = ?");
    values.push(error);
  }

  values.push(id);

  db.prepare(`
    UPDATE batch_files
    SET ${updates.join(", ")}
    WHERE id = ?
  `).run(...values);
}

/**
 * Increment retry count for a file
 */
export function incrementRetryCount(id: string): number {
  const db = getDB();

  db.prepare(`
    UPDATE batch_files
    SET retry_count = retry_count + 1
    WHERE id = ?
  `).run(id);

  const file = getBatchFile(id);
  return file?.retry_count || 0;
}

/**
 * Get pending batch files (for queue processing)
 */
export function getPendingBatchFiles(limit: number = 10): BatchFile[] {
  const db = getDB();
  return db
    .prepare(`
      SELECT bf.*
      FROM batch_files bf
      JOIN batch_jobs bj ON bf.batch_id = bj.id
      WHERE bf.status = 'pending'
        AND bj.status != 'cancelled'
      ORDER BY
        CASE bj.priority
          WHEN 'high' THEN 1
          WHEN 'normal' THEN 2
          WHEN 'low' THEN 3
        END,
        bf.created_at ASC
      LIMIT ?
    `)
    .all(limit) as BatchFile[];
}

/**
 * Get all batch jobs with pagination
 */
export function getAllBatchJobs(options: {
  limit?: number;
  offset?: number;
  userId?: string;
  status?: BatchJobStatus;
}): BatchJob[] {
  const db = getDB();
  const { limit = 50, offset = 0, userId, status } = options;

  let sql = "SELECT * FROM batch_jobs WHERE 1=1";
  const params: (string | number)[] = [];

  if (userId) {
    sql += " AND user_id = ?";
    params.push(userId);
  }

  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }

  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  return db.prepare(sql).all(...params) as BatchJob[];
}

/**
 * Delete old completed jobs (cleanup)
 */
export function cleanupOldBatchJobs(daysOld: number = 7): number {
  const db = getDB();

  const result = db.prepare(`
    DELETE FROM batch_jobs
    WHERE status IN ('completed', 'failed', 'cancelled')
      AND created_at < datetime('now', '-' || ? || ' days')
  `).run(daysOld);

  return result.changes;
}
