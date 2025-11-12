-- Migration 004: Add missing performance indexes for logs and notifications
-- Created: 2025-11-12
-- Purpose: Improve query performance on frequently accessed tables

-- Logs table indexes (for AILogger performance)
CREATE INDEX IF NOT EXISTS idx_logs_created_at 
ON logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logs_level 
ON logs(level);

CREATE INDEX IF NOT EXISTS idx_logs_level_created 
ON logs(level, created_at DESC);

-- Notifications table indexes (for notification system performance)
CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read 
ON notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_unread_created 
ON notifications(is_read, created_at DESC);

-- Analysis history indexes (if table exists)
CREATE INDEX IF NOT EXISTS idx_analysis_history_created_at 
ON analysis_history(created_at DESC);

-- Users table indexes (for auth performance)
CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(email);

-- Memberships table indexes (for org queries)
CREATE INDEX IF NOT EXISTS idx_memberships_user_id 
ON memberships(user_id);

CREATE INDEX IF NOT EXISTS idx_memberships_org_id 
ON memberships(org_id);



