#!/bin/bash
# Procheff v3 - Direct Deployment from GitHub to DigitalOcean
# Run this script ON THE DIGITALOCEAN DROPLET (161.35.217.113)

set -e

# Configuration
REPO_URL="https://github.com/aydarnuman/procheff-v3-enterprise.git"
DEPLOY_DIR="/root/procheff-v3"
BACKUP_DIR="/root/backups"
VERSION="3.0.0"

echo "🚀 Procheff v3 - Direct GitHub Deployment"
echo "=========================================="
echo ""

# Step 1: Create directories
echo "1️⃣ Setting up directories..."
mkdir -p ${DEPLOY_DIR}
mkdir -p ${BACKUP_DIR}
cd ${DEPLOY_DIR}

# Step 2: Clone or pull repository
if [ -d ".git" ]; then
    echo "2️⃣ Updating existing repository..."
    git pull origin main
else
    echo "2️⃣ Cloning repository..."
    git clone ${REPO_URL} .
fi

# Step 3: Create .env file (if not exists)
if [ ! -f ".env" ]; then
    echo "3️⃣ Creating .env file..."
    cat > .env <<'EOF'
# Procheff v3 - DigitalOcean Production Environment

# API KEYS
ANTHROPIC_API_KEY=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
GOOGLE_API_KEY=AIzaSyB3Fz7u9dD5i9BAooTJGCnFzTkTiWPrHT8
NEXTAUTH_SECRET=f4d41086daa6d1036794c8b81758b0b6840045ac28b9fee9208f01f4f2c65fc7

# UPSTASH REDIS (Update with real values if needed)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token-here

# APPLICATION URLS (Update with your domain)
NEXTAUTH_URL=https://v3.procheff.com
NEXT_PUBLIC_APP_URL=https://v3.procheff.com

# SCRAPER
SCRAPER_ENABLED=true
SCRAPER_API_KEY=932ded3c1efbbc14e5cb82e319c4d966
SCRAPER_CRON_SECRET=procheff-ihale-scraper-secret-2025-secure-key-32chars
EOF
    echo "   ⚠️  .env file created. Please update NEXTAUTH_URL and NEXT_PUBLIC_APP_URL"
else
    echo "3️⃣ .env file already exists, skipping..."
fi

# Step 4: Build Docker image
echo ""
echo "4️⃣ Building Docker image (this may take 10-15 minutes)..."
docker build -t procheff-v3:${VERSION} -t procheff-v3:latest .

# Step 5: Stop old container if running
echo ""
echo "5️⃣ Stopping old container (if running)..."
docker-compose down 2>/dev/null || docker stop procheff-v3 2>/dev/null || true

# Step 6: Start new container
echo ""
echo "6️⃣ Starting Procheff v3..."
docker-compose up -d

# Step 7: Wait for health check
echo ""
echo "7️⃣ Waiting for application to be healthy..."
sleep 10

# Test health endpoint
for i in {1..30}; do
    if curl -s http://localhost:3001/api/health | grep -q "ok"; then
        echo "   ✅ Application is healthy!"
        break
    fi
    echo "   Waiting... ($i/30)"
    sleep 2
done

# Step 8: Show status
echo ""
echo "=========================================="
echo "🎉 Deployment Complete!"
echo "=========================================="
echo ""
docker ps | grep procheff
echo ""
echo "📊 Application Status:"
echo "   Container: $(docker ps --filter name=procheff-v3 --format '{{.Status}}')"
echo "   Health: $(curl -s http://localhost:3001/api/health)"
echo ""
echo "🔗 Access Points:"
echo "   Local: http://localhost:3001"
echo "   Public: http://161.35.217.113:3001"
echo "   Domain: https://v3.procheff.com (after Nginx setup)"
echo ""
echo "📝 Next Steps:"
echo "   1. Update .env with your domain if needed"
echo "   2. Configure Nginx reverse proxy"
echo "   3. Setup SSL certificate with certbot"
echo ""
echo "📋 Useful Commands:"
echo "   View logs: docker-compose logs -f procheff-v3"
echo "   Restart: docker-compose restart procheff-v3"
echo "   Stop: docker-compose down"
echo "   Update: cd ${DEPLOY_DIR} && git pull && docker-compose up -d --build"
echo ""
