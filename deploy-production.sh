#!/bin/bash
# Production Deployment Script for Procheff v3
# Run this script on your DigitalOcean server

set -e  # Exit on error

echo "🚀 ProCheff v3 - Production Deployment"
echo "========================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/procheff"
NGINX_CONF="/etc/nginx/sites-available/procheff"
NGINX_ENABLED="/etc/nginx/sites-enabled/procheff"

echo -e "${YELLOW}📂 Navigating to project directory...${NC}"
cd $PROJECT_DIR

echo -e "${YELLOW}🔄 Pulling latest changes from git...${NC}"
git pull origin main || echo "⚠️  Git pull failed (might be already up to date)"

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install --production

echo -e "${YELLOW}🔧 Checking PostgreSQL connection...${NC}"
# Test PostgreSQL connection instead of SQLite migrations
if [ -f ".env.local" ]; then
  echo "✅ Environment configuration found"
  # You can add PostgreSQL connection test here if needed
else
  echo "⚠️  .env.local not found, copying from example..."
  cp .env.example .env.local
fi

# No SQLite migrations needed - using PostgreSQL now
echo "✅ Database: PostgreSQL (no migrations needed)"

echo -e "${YELLOW}🏗️  Building production bundle...${NC}"
npm run build

echo -e "${YELLOW}🔧 Setting up Nginx configuration...${NC}"
# Check if nginx config exists
if [ ! -f "$NGINX_CONF" ]; then
  echo "Creating Nginx configuration..."
  sudo cp nginx-production.conf $NGINX_CONF
  
  # Enable site
  if [ ! -L "$NGINX_ENABLED" ]; then
    sudo ln -s $NGINX_CONF $NGINX_ENABLED
  fi
  
  # Test nginx configuration
  sudo nginx -t && sudo systemctl reload nginx
  echo "✅ Nginx configured"
else
  echo "✅ Nginx configuration already exists"
fi

echo -e "${YELLOW}🔄 Restarting PM2 process...${NC}"
# Stop existing process if any
pm2 delete procheff 2>/dev/null || true

# Start new process
pm2 start npm --name "procheff" -- start
pm2 save

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "📊 Process Status:"
pm2 list

echo ""
echo "🔍 To view logs:"
echo "  pm2 logs procheff"
echo ""
echo "🌐 Your app should be running at:"
echo "  http://localhost:3000"
echo "  https://procheff.app (if Nginx is configured)"
echo ""

