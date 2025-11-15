import { getDatabase } from "@/lib/db/universal-client";
import bcrypt from "bcryptjs";
import type { Role } from "@/lib/db/init-auth";

export interface RoleDistributionEntry {
  role: string;
  count: number;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalOrgs: number;
  recentLogins: number;
  roleDistribution: RoleDistributionEntry[];
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  details?: string | null;
  ip_address?: string | null;
  created_at: string;
  user_name?: string | null;
  user_email?: string | null;
}

// Admin Dashboard Stats
export async function getAdminStats(): Promise<AdminStats> {
  const db = await getDatabase();

  const totalUsers = await db.queryOne("SELECT COUNT(*) as count FROM users") as { count: number };

  // Check if status column exists before using it
  let activeUsers = totalUsers; // Fallback to total users
  try {
    const statusCheck = await db.queryOne("SELECT status FROM users LIMIT 1");
    if (statusCheck !== undefined && statusCheck !== null) {
      activeUsers = await db.queryOne("SELECT COUNT(*) as count FROM users WHERE status = 'active'") as { count: number };
    }
  } catch (error) {
    // Status column doesn't exist yet, use total users count
  }

  const totalOrgs = await db.queryOne("SELECT COUNT(*) as count FROM organizations") as { count: number };

  const recentLogins = await db.queryOne(`
    SELECT COUNT(*) as count FROM activity_logs
    WHERE action = 'LOGIN' AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
  `) as { count: number };

  const roleDistribution = await db.query(`
    SELECT role, COUNT(*) as count
    FROM memberships
    GROUP BY role
    ORDER BY count DESC
  `) as { role: string; count: number }[];

  return {
    totalUsers: Number(totalUsers?.count || 0),
    activeUsers: Number(activeUsers?.count || 0),
    totalOrgs: Number(totalOrgs?.count || 0),
    recentLogins: Number(recentLogins?.count || 0),
    roleDistribution: roleDistribution.map(r => ({ ...r, count: Number(r.count) })),
  };
}

// User Management
export async function getAllUsers(options?: {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const db = await getDatabase();
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const offset = (page - 1) * limit;

  // Check if status and last_login_at columns exist
  let hasStatusColumn = false;
  try {
    await db.queryOne("SELECT status, last_login_at FROM users LIMIT 1");
    hasStatusColumn = true;
  } catch (error) {
    // Columns don't exist yet
  }

  const statusField = hasStatusColumn ? ', u.status, u.last_login_at' : '';

  let query = `
    SELECT
      u.id, u.email, u.name, u.created_at${statusField},
      m.role, o.name as org_name, o.id as org_id
    FROM users u
    LEFT JOIN memberships m ON u.id = m.user_id
    LEFT JOIN organizations o ON m.org_id = o.id
    WHERE 1=1
  `;

  const params: any[] = [];
  let paramCounter = 1;

  if (options?.search) {
    query += ` AND (u.name LIKE $${paramCounter} OR u.email LIKE $${paramCounter + 1})`;
    params.push(`%${options.search}%`, `%${options.search}%`);
    paramCounter += 2;
  }

  if (options?.role) {
    query += ` AND m.role = $${paramCounter}`;
    params.push(options.role);
    paramCounter++;
  }

  if (options?.status && hasStatusColumn) {
    query += ` AND u.status = $${paramCounter}`;
    params.push(options.status);
    paramCounter++;
  }

  query += ` ORDER BY u.created_at DESC LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
  params.push(limit, offset);

  const users = await db.query(query, params);

  const countQuery = `SELECT COUNT(*) as count FROM users u WHERE 1=1` +
    (options?.search ? ` AND (u.name LIKE $1 OR u.email LIKE $2)` : '') +
    (options?.status && hasStatusColumn ? ` AND u.status = $${options?.search ? '3' : '1'}` : '');

  const countParams: any[] = [];
  if (options?.search) {
    countParams.push(`%${options.search}%`, `%${options.search}%`);
  }
  if (options?.status) {
    countParams.push(options.status);
  }

  const total = await db.queryOne(countQuery, countParams.length > 0 ? countParams : undefined) as { count: number };

  return {
    users,
    pagination: {
      page,
      limit,
      total: Number(total?.count || 0),
      pages: Math.ceil(Number(total?.count || 0) / limit),
    },
  };
}

export async function getUserById(userId: string) {
  const db = await getDatabase();

  // Check if status column exists
  let hasStatusColumn = false;
  try {
    await db.queryOne("SELECT status, last_login_at, last_ip FROM users LIMIT 1");
    hasStatusColumn = true;
  } catch (error) {
    // Columns don't exist yet
  }

  const statusFields = hasStatusColumn ? ', u.status, u.last_login_at, u.last_ip' : '';

  return await db.queryOne(`
    SELECT
      u.id, u.email, u.name, u.created_at${statusFields},
      m.role, o.name as org_name, o.id as org_id
    FROM users u
    LEFT JOIN memberships m ON u.id = m.user_id
    LEFT JOIN organizations o ON m.org_id = o.id
    WHERE u.id = $1
  `, [userId]);
}

export async function updateUser(userId: string, data: {
  name?: string;
  email?: string;
  status?: string;
}) {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];
  let paramCounter = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${paramCounter++}`);
    values.push(data.name);
  }
  if (data.email !== undefined) {
    fields.push(`email = $${paramCounter++}`);
    values.push(data.email);
  }
  if (data.status !== undefined) {
    fields.push(`status = $${paramCounter++}`);
    values.push(data.status);
  }

  if (fields.length === 0) return;

  values.push(userId);

  await db.execute(`
    UPDATE users
    SET ${fields.join(", ")}
    WHERE id = $${paramCounter}
  `, values);
}

export async function deleteUser(userId: string) {
  const db = await getDatabase();
  // Soft delete
  await db.execute("UPDATE users SET status = 'deleted' WHERE id = $1", [userId]);
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const db = await getDatabase();
  const hash = bcrypt.hashSync(newPassword, 10);
  await db.execute("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, userId]);
}

// Organization Management
export async function getAllOrganizations() {
  const db = await getDatabase();
  return await db.query(`
    SELECT
      o.id, o.name, o.created_at,
      u.name as owner_name, u.email as owner_email,
      (SELECT COUNT(*) FROM memberships WHERE org_id = o.id) as member_count
    FROM organizations o
    LEFT JOIN users u ON o.owner_user_id = u.id
    ORDER BY o.created_at DESC
  `);
}

export async function getOrgMembers(orgId: string) {
  const db = await getDatabase();

  // Check if status column exists
  let hasStatusColumn = false;
  try {
    await db.queryOne("SELECT status FROM users LIMIT 1");
    hasStatusColumn = true;
  } catch (error) {
    // Column doesn't exist yet
  }

  const statusField = hasStatusColumn ? ', u.status' : '';

  return await db.query(`
    SELECT
      u.id, u.name, u.email${statusField},
      m.role, m.created_at as joined_at
    FROM users u
    JOIN memberships m ON u.id = m.user_id
    WHERE m.org_id = $1
    ORDER BY m.created_at ASC
  `, [orgId]);
}

export async function addOrgMember(orgId: string, userId: string, role: Role) {
  const db = await getDatabase();
  const membershipId = `${orgId}:${userId}`;
  await db.execute(`
    INSERT INTO memberships (id, org_id, user_id, role)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role
  `, [membershipId, orgId, userId, role]);
}

export async function removeOrgMember(orgId: string, userId: string) {
  const db = await getDatabase();
  await db.execute("DELETE FROM memberships WHERE org_id = $1 AND user_id = $2", [orgId, userId]);
}

export async function updateMemberRole(orgId: string, userId: string, newRole: Role) {
  const db = await getDatabase();
  await db.execute("UPDATE memberships SET role = $1 WHERE org_id = $2 AND user_id = $3",
    [newRole, orgId, userId]);
}

// Activity Logs
export async function getActivityLogs(options?: {
  userId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}): Promise<ActivityLogEntry[]> {
  const db = await getDatabase();
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  let query = `
    SELECT
      a.id, a.action, a.entity_type, a.entity_id, a.details,
      a.ip_address, a.created_at,
      u.name as user_name, u.email as user_email
    FROM activity_logs a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE 1=1
  `;

  const params: any[] = [];
  let paramCounter = 1;

  if (options?.userId) {
    query += ` AND a.user_id = $${paramCounter++}`;
    params.push(options.userId);
  }

  if (options?.action) {
    query += ` AND a.action = $${paramCounter++}`;
    params.push(options.action);
  }

  query += ` ORDER BY a.created_at DESC LIMIT $${paramCounter++} OFFSET $${paramCounter}`;
  params.push(limit, offset);

  const rows = await db.query<ActivityLogEntry>(query, params);
  return rows;
}
