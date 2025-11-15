-- Add status column to users table for user management
-- This migration adds the status and last_login_at columns if they don't exist

-- Add status column if it doesn't exist (SQLite doesn't support IF NOT EXISTS for ALTER TABLE)
-- We'll handle this in the run-migrations.ts logic

ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN last_login_at TEXT;
ALTER TABLE users ADD COLUMN last_ip TEXT;

-- Create index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);



