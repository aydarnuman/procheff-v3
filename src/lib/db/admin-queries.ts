import { getDB } from "@/lib/db/sqlite-client";
import bcrypt from "bcryptjs";
import type { Role } from "@/lib/db/init-auth";

// Admin Dashboard Stats
export function getAdminStats() {
  const db = getDB();

  const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  
  // Check if status column exists before using it
  let activeUsers = totalUsers; // Fallback to total users
  try {
    const statusCheck = db.prepare("SELECT status FROM users LIMIT 1").get();
    if (statusCheck !== undefined) {
      activeUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'active'").get() as { count: number };
    }
  } catch {
    // Status column doesn't exist yet, use total users count
  }
  
  const totalOrgs = db.prepare("SELECT COUNT(*) as count FROM organizations").get() as { count: number };

  const recentLogins = db.prepare(`
    SELECT COUNT(*) as count FROM activity_logs
    WHERE action = 'LOGIN' AND created_at >= datetime('now', '-24 hours')
  `).get() as { count: number };

  const roleDistribution = db.prepare(`
    SELECT role, COUNT(*) as count
    FROM memberships
    GROUP BY role
    ORDER BY count DESC
  `).all() as { role: string; count: number }[];

  return {
    totalUsers: totalUsers.count,
    activeUsers: activeUsers.count,
    totalOrgs: totalOrgs.count,
    recentLogins: recentLogins.count,
    roleDistribution,
  };
}

// User Management
export function getAllUsers(options?: {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const db = getDB();
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const offset = (page - 1) * limit;

  // Check if status and last_login_at columns exist
  let hasStatusColumn = false;
  try {
    db.prepare("SELECT status, last_login_at FROM users LIMIT 1").get();
    hasStatusColumn = true;
  } catch {
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

  if (options?.search) {
    query += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
    params.push(`%${options.search}%`, `%${options.search}%`);
  }

  if (options?.role) {
    query += ` AND m.role = ?`;
    params.push(options.role);
  }

  if (options?.status && hasStatusColumn) {
    query += ` AND u.status = ?`;
    params.push(options.status);
  }

  query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const users = db.prepare(query).all(...params);

  const countQuery = `SELECT COUNT(*) as count FROM users u WHERE 1=1` +
    (options?.search ? ` AND (u.name LIKE ? OR u.email LIKE ?)` : '') +
    (options?.status && hasStatusColumn ? ` AND u.status = ?` : '');

  const countParams: any[] = [];
  if (options?.search) {
    countParams.push(`%${options.search}%`, `%${options.search}%`);
  }
  if (options?.status) {
    countParams.push(options.status);
  }

  const total = db.prepare(countQuery).get(...countParams) as { count: number };

  return {
    users,
    pagination: {
      page,
      limit,
      total: total.count,
      pages: Math.ceil(total.count / limit),
    },
  };
}

export function getUserById(userId: string) {
  const db = getDB();
  
  // Check if status column exists
  let hasStatusColumn = false;
  try {
    db.prepare("SELECT status, last_login_at, last_ip FROM users LIMIT 1").get();
    hasStatusColumn = true;
  } catch {
    // Columns don't exist yet
  }

  const statusFields = hasStatusColumn ? ', u.status, u.last_login_at, u.last_ip' : '';
  
  return db.prepare(`
    SELECT
      u.id, u.email, u.name, u.created_at${statusFields},
      m.role, o.name as org_name, o.id as org_id
    FROM users u
    LEFT JOIN memberships m ON u.id = m.user_id
    LEFT JOIN organizations o ON m.org_id = o.id
    WHERE u.id = ?
  `).get(userId);
}

export function updateUser(userId: string, data: {
  name?: string;
  email?: string;
  status?: string;
}) {
  const db = getDB();
  const fields: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    fields.push("name = ?");
    values.push(data.name);
  }
  if (data.email !== undefined) {
    fields.push("email = ?");
    values.push(data.email);
  }
  if (data.status !== undefined) {
    fields.push("status = ?");
    values.push(data.status);
  }

  if (fields.length === 0) return;

  values.push(userId);

  db.prepare(`
    UPDATE users
    SET ${fields.join(", ")}
    WHERE id = ?
  `).run(...values);
}

export function deleteUser(userId: string) {
  const db = getDB();
  // Soft delete
  db.prepare("UPDATE users SET status = 'deleted' WHERE id = ?").run(userId);
}

export function resetUserPassword(userId: string, newPassword: string) {
  const db = getDB();
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, userId);
}

// Organization Management
export function getAllOrganizations() {
  const db = getDB();
  return db.prepare(`
    SELECT
      o.id, o.name, o.created_at,
      u.name as owner_name, u.email as owner_email,
      (SELECT COUNT(*) FROM memberships WHERE org_id = o.id) as member_count
    FROM organizations o
    LEFT JOIN users u ON o.owner_user_id = u.id
    ORDER BY o.created_at DESC
  `).all();
}

export function getOrgMembers(orgId: string) {
  const db = getDB();
  
  // Check if status column exists
  let hasStatusColumn = false;
  try {
    db.prepare("SELECT status FROM users LIMIT 1").get();
    hasStatusColumn = true;
  } catch {
    // Column doesn't exist yet
  }

  const statusField = hasStatusColumn ? ', u.status' : '';
  
  return db.prepare(`
    SELECT
      u.id, u.name, u.email${statusField},
      m.role, m.created_at as joined_at
    FROM users u
    JOIN memberships m ON u.id = m.user_id
    WHERE m.org_id = ?
    ORDER BY m.created_at ASC
  `).all(orgId);
}

export function addOrgMember(orgId: string, userId: string, role: Role) {
  const db = getDB();
  const membershipId = `${orgId}:${userId}`;
  db.prepare(`
    INSERT OR REPLACE INTO memberships (id, org_id, user_id, role)
    VALUES (?, ?, ?, ?)
  `).run(membershipId, orgId, userId, role);
}

export function removeOrgMember(orgId: string, userId: string) {
  const db = getDB();
  db.prepare("DELETE FROM memberships WHERE org_id = ? AND user_id = ?").run(orgId, userId);
}

export function updateMemberRole(orgId: string, userId: string, newRole: Role) {
  const db = getDB();
  db.prepare("UPDATE memberships SET role = ? WHERE org_id = ? AND user_id = ?")
    .run(newRole, orgId, userId);
}

// Activity Logs
export function getActivityLogs(options?: {
  userId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}) {
  const db = getDB();
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

  if (options?.userId) {
    query += ` AND a.user_id = ?`;
    params.push(options.userId);
  }

  if (options?.action) {
    query += ` AND a.action = ?`;
    params.push(options.action);
  }

  query += ` ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  return db.prepare(query).all(...params);
}
