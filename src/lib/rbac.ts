type Role = "OWNER" | "ADMIN" | "ANALYST" | "VIEWER";

export const canRead = (role: Role) => ["OWNER", "ADMIN", "ANALYST", "VIEWER"].includes(role);
export const canWrite = (role: Role) => ["OWNER", "ADMIN", "ANALYST"].includes(role);
export const canManage = (role: Role) => ["OWNER", "ADMIN"].includes(role);
