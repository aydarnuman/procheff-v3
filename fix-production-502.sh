#!/bin/bash

# Fix Production 502 Bad Gateway Error
# Run this on your production server

set -e

echo "🔧 PRODUCTION 502 ERROR FIX"
echo "============================"
echo ""

# Load configuration if exists
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ .env file loaded"
else
    echo "❌ .env file not found!"
    echo "Creating .env template..."
    cat > .env << 'EOF'
# NextAuth
NEXTAUTH_URL=https://procheff.app
NEXTAUTH_SECRET=your-32-char-secret-here

# AI API Keys
ANTHROPIC_API_KEY=sk-ant-xxx
GOOGLE_API_KEY=AIzaxxx
GEMINI_API_KEY=AIzaxxx

# İhalebul Credentials (REQUIRED for ihale scraping!)
IHALEBUL_USERNAME=your-username
IHALEBUL_PASSWORD=your-password

# Worker URL (internal docker network)
IHALE_WORKER_URL=http://ihale-worker:8080

# Upstash Redis (Optional)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
EOF
    echo "⚠️  Please edit .env file with your actual credentials!"
    exit 1
fi

# Step 1: Check current status
echo "1️⃣ Current Container Status:"
echo "-----------------------------"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Step 2: Stop all containers
echo "2️⃣ Stopping all containers..."
docker-compose -f docker-compose.digitalocean.yml down
echo "✅ Containers stopped"
echo ""

# Step 3: Pull latest images
echo "3️⃣ Pulling latest images..."
docker pull aydarnuman/procheff-v3:latest
docker pull aydarnuman/ihale-worker:latest
echo "✅ Images updated"
echo ""

# Step 4: Ensure IHALE_WORKER_URL is set
echo "4️⃣ Setting IHALE_WORKER_URL..."
if ! grep -q "IHALE_WORKER_URL" .env; then
    echo "IHALE_WORKER_URL=http://ihale-worker:8080" >> .env
    echo "✅ Added IHALE_WORKER_URL to .env"
else
    echo "✅ IHALE_WORKER_URL already in .env"
fi
echo ""

# Step 5: Check critical environment variables
echo "5️⃣ Checking critical environment variables..."
MISSING_VARS=()

# Check required variables
[ -z "$ANTHROPIC_API_KEY" ] || [ "$ANTHROPIC_API_KEY" = "sk-ant-xxx" ] && MISSING_VARS+=("ANTHROPIC_API_KEY")
[ -z "$GOOGLE_API_KEY" ] || [ "$GOOGLE_API_KEY" = "AIzaxxx" ] && MISSING_VARS+=("GOOGLE_API_KEY")
[ -z "$IHALEBUL_USERNAME" ] || [ "$IHALEBUL_USERNAME" = "your-username" ] && MISSING_VARS+=("IHALEBUL_USERNAME")
[ -z "$IHALEBUL_PASSWORD" ] || [ "$IHALEBUL_PASSWORD" = "your-password" ] && MISSING_VARS+=("IHALEBUL_PASSWORD")
[ -z "$NEXTAUTH_SECRET" ] || [ "$NEXTAUTH_SECRET" = "your-32-char-secret-here" ] && MISSING_VARS+=("NEXTAUTH_SECRET")

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "❌ Missing or invalid environment variables:"
    printf '%s\n' "${MISSING_VARS[@]}"
    echo ""
    echo "⚠️  Please update .env file with actual values!"
    echo "Continuing anyway..."
else
    echo "✅ All critical environment variables are set"
fi
echo ""

# Step 6: Start containers
echo "6️⃣ Starting containers..."
docker-compose -f docker-compose.digitalocean.yml up -d
echo "✅ Containers started"
echo ""

# Step 7: Wait for containers to be ready
echo "7️⃣ Waiting for containers to be ready..."
sleep 10

# Step 8: Check container health
echo "8️⃣ Checking container health..."
echo ""

echo "Main app (procheff-v3):"
if docker exec procheff-v3 curl -s http://localhost:8080/api/health 2>/dev/null | grep -q "ok"; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    echo "Checking logs:"
    docker logs procheff-v3 --tail 20
fi
echo ""

echo "İhale Worker:"
if docker exec ihale-worker curl -s http://localhost:8080/health 2>/dev/null | grep -q "ok"; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    echo "Checking logs:"
    docker logs ihale-worker --tail 20
fi
echo ""

# Step 9: Test internal connectivity
echo "9️⃣ Testing internal connectivity..."
echo "Main app → Worker connection:"
docker exec procheff-v3 curl -s http://ihale-worker:8080/health 2>/dev/null && echo "✅ Connected" || echo "❌ Connection failed"
echo ""

# Step 10: Check Nginx
echo "🔟 Checking Nginx..."
if systemctl is-active nginx > /dev/null; then
    echo "✅ Nginx is running"
    nginx -t 2>&1 | grep -q "successful" && echo "✅ Nginx config is valid" || echo "❌ Nginx config has errors"
else
    echo "❌ Nginx is not running"
    echo "Starting Nginx..."
    systemctl start nginx
fi
echo ""

# Step 11: Test external access
echo "1️⃣1️⃣ Testing external access..."
echo "Testing port 3001 (or your configured port):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3001/api/health
echo ""

# Step 12: Final status
echo "📊 FINAL STATUS:"
echo "================"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "🔍 Next Steps:"
echo "=============="
echo "1. If containers are running but site still shows 502:"
echo "   - Check Cloudflare settings"
echo "   - Verify Nginx proxy configuration"
echo "   - Check firewall rules"
echo ""
echo "2. To monitor logs:"
echo "   docker logs procheff-v3 -f"
echo "   docker logs ihale-worker -f"
echo ""
echo "3. To check detailed status:"
echo "   docker exec procheff-v3 env | grep IHALE"
echo "   docker network inspect procheff-network"
echo ""

echo "✅ Fix script completed!"
