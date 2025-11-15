#!/bin/bash
# Quick Fix Script - Run this on production server
# Fixes: Status column, SMTP timeout, PM2 restart

set -e

echo "🔧 ProCheff Quick Fix"
echo "===================="
echo ""

cd /var/www/procheff

# 1. Database Migration (ignore if column exists)
echo "📊 Checking database..."
sqlite3 procheff.db <<EOF 2>/dev/null || echo "⚠️  Status column might already exist (OK)"
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN last_login_at TEXT;
ALTER TABLE users ADD COLUMN last_ip TEXT;
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
EOF

echo "✅ Database checked"
echo ""

# 2. Build
echo "🏗️  Building..."
npm run build

echo "✅ Build complete"
echo ""

# 3. Restart PM2
echo "🔄 Restarting..."
pm2 delete procheff 2>/dev/null || true
pm2 start npm --name "procheff" -- start
pm2 save

echo ""
echo "✅ Done! Check status:"
pm2 list
echo ""
echo "📝 View logs:"
echo "   pm2 logs procheff"
echo ""

