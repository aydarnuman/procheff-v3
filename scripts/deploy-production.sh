#!/bin/bash

# ProCheff V3 Production Deployment Script
# This script is called by GitHub Actions

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/root/procheff-v3"
PM2_APP_NAME="procheff-v3"
NODE_VERSION="20"

echo -e "${GREEN}🚀 Starting ProCheff V3 Deployment${NC}"
echo "================================================"

# 1. Navigate to project directory
cd $PROJECT_DIR
echo -e "${YELLOW}📁 Working directory: $(pwd)${NC}"

# 2. Backup current deployment
if [ -d ".next" ]; then
    echo -e "${YELLOW}📦 Backing up current build...${NC}"
    rm -rf .next.backup
    mv .next .next.backup
fi

# 3. Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes from GitHub...${NC}"
git fetch origin main
git reset --hard origin/main

# 4. Check Node.js version
CURRENT_NODE=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$CURRENT_NODE" -lt "$NODE_VERSION" ]; then
    echo -e "${RED}❌ Node.js version $NODE_VERSION or higher required${NC}"
    exit 1
fi

# 5. Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm ci --production=false  # Need dev dependencies for build

# 6. Build application
echo -e "${YELLOW}🏗️  Building application...${NC}"
npm run build

if [ ! -d ".next" ]; then
    echo -e "${RED}❌ Build failed - .next directory not found${NC}"
    if [ -d ".next.backup" ]; then
        echo -e "${YELLOW}⚠️  Restoring previous build...${NC}"
        mv .next.backup .next
    fi
    exit 1
fi

# 7. Clean up old backup
rm -rf .next.backup

# 8. Database migrations
echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
if [ -f "procheff.db" ]; then
    cp procheff.db procheff.db.backup.$(date +%s)
fi

# 9. Restart application with PM2
echo -e "${YELLOW}🔄 Restarting application...${NC}"

# Check if app exists in PM2
if pm2 describe $PM2_APP_NAME > /dev/null 2>&1; then
    echo "Restarting existing PM2 process..."
    pm2 restart $PM2_APP_NAME
else
    echo "Starting new PM2 process..."
    pm2 start npm --name "$PM2_APP_NAME" -- start
fi

# Save PM2 configuration
pm2 save
pm2 startup || true

# 10. Wait for application to start
echo -e "${YELLOW}⏳ Waiting for application to start...${NC}"
sleep 10

# 11. Health check
echo -e "${YELLOW}🏥 Running health check...${NC}"
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || echo "000")

if [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
    echo -e "${GREEN}🌐 Application is healthy and running${NC}"
    
    # Show PM2 status
    pm2 status $PM2_APP_NAME
    
    # Show recent logs
    echo -e "${YELLOW}📋 Recent logs:${NC}"
    pm2 logs $PM2_APP_NAME --lines 10 --nostream
    
    exit 0
else
    echo -e "${RED}❌ Health check failed with status: $HEALTH_STATUS${NC}"
    echo -e "${YELLOW}📋 Application logs:${NC}"
    pm2 logs $PM2_APP_NAME --lines 50 --nostream
    
    # Don't exit with error to keep the deployment
    echo -e "${YELLOW}⚠️  Application deployed but health check failed${NC}"
    echo -e "${YELLOW}⚠️  Please check logs manually${NC}"
    exit 0
fi
