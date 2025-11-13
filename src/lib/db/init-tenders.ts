import { getDB } from './sqlite-client';

/**
 * Initialize tenders table for ihalebul.com integration
 */
export function initTendersTable() {
  const db = getDB();

  // Create tenders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenders (
      id TEXT PRIMARY KEY,
      tender_number TEXT,
      title TEXT,
      organization TEXT,
      city TEXT,
      tender_type TEXT,
      partial_bid_allowed INTEGER DEFAULT 0,
      publish_date TEXT,
      tender_date TEXT,
      days_remaining INTEGER,
      url TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tenders_tender_date ON tenders(tender_date);
    CREATE INDEX IF NOT EXISTS idx_tenders_days_remaining ON tenders(days_remaining);
    CREATE INDEX IF NOT EXISTS idx_tenders_status ON tenders(status);
    CREATE INDEX IF NOT EXISTS idx_tenders_city ON tenders(city);
    CREATE INDEX IF NOT EXISTS idx_tenders_created_at ON tenders(created_at);
  `);

  console.log('✅ Tenders table initialized');
}

/**
 * Upsert tender (insert if new, update if exists)
 */
export function upsertTender(tender: {
  id: string;
  tenderNumber?: string;
  title: string;
  organization: string;
  city: string;
  tenderType?: string;
  partialBidAllowed?: boolean;
  publishDate?: string;
  tenderDate?: string;
  daysRemaining?: number | null;
  url: string;
}) {
  const db = getDB();

  const stmt = db.prepare(`
    INSERT INTO tenders (
      id, tender_number, title, organization, city, tender_type,
      partial_bid_allowed, publish_date, tender_date, days_remaining,
      url, status, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, 'active', CURRENT_TIMESTAMP
    )
    ON CONFLICT(id) DO UPDATE SET
      tender_number = excluded.tender_number,
      title = excluded.title,
      organization = excluded.organization,
      city = excluded.city,
      tender_type = excluded.tender_type,
      partial_bid_allowed = excluded.partial_bid_allowed,
      publish_date = excluded.publish_date,
      tender_date = excluded.tender_date,
      days_remaining = excluded.days_remaining,
      url = excluded.url,
      updated_at = CURRENT_TIMESTAMP
  `);

  stmt.run(
    tender.id,
    tender.tenderNumber || null,
    tender.title,
    tender.organization,
    tender.city,
    tender.tenderType || null,
    tender.partialBidAllowed ? 1 : 0,
    tender.publishDate || null,
    tender.tenderDate || null,
    tender.daysRemaining ?? null,
    tender.url
  );
}

/**
 * Get all active tenders
 */
export function getActiveTenders(filters?: {
  city?: string;
  minDaysRemaining?: number;
  maxDaysRemaining?: number;
}) {
  const db = getDB();

  let query = `
    SELECT
      id,
      tender_number as tenderNumber,
      title,
      organization,
      city,
      tender_type as tenderType,
      partial_bid_allowed as partialBidAllowed,
      publish_date as publishDate,
      tender_date as tenderDate,
      days_remaining as daysRemaining,
      url,
      status,
      created_at as createdAt,
      updated_at as updatedAt
    FROM tenders
    WHERE status = 'active'
  `;

  const params: (string | number)[] = [];

  if (filters?.city) {
    query += ` AND city = ?`;
    params.push(filters.city);
  }

  if (filters?.minDaysRemaining !== undefined) {
    query += ` AND days_remaining >= ?`;
    params.push(filters.minDaysRemaining);
  }

  if (filters?.maxDaysRemaining !== undefined) {
    query += ` AND days_remaining <= ?`;
    params.push(filters.maxDaysRemaining);
  }

  query += ` ORDER BY days_remaining ASC, tender_date ASC`;

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as Record<string, unknown>[];

  // Convert partialBidAllowed from INTEGER to boolean
  return rows.map((row) => ({
    ...row,
    partialBidAllowed: Boolean(row.partialBidAllowed),
  })) as any[];
}

/**
 * Archive old/expired tenders
 */
export function archiveExpiredTenders() {
  const db = getDB();

  const stmt = db.prepare(`
    UPDATE tenders
    SET status = 'archived'
    WHERE status = 'active'
      AND days_remaining < 0
  `);

  const info = stmt.run();
  console.log(`📦 Archived ${info.changes} expired tenders`);

  return info.changes;
}

/**
 * Get tender statistics
 */
export function getTenderStats() {
  const db = getDB();

  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived,
      SUM(CASE WHEN days_remaining <= 7 AND days_remaining >= 0 THEN 1 ELSE 0 END) as urgent
    FROM tenders
  `);

  return stmt.get();
}
