#!/bin/bash
# 🚀 Production Volume Migration Commands
# Run these on the server (104.248.254.171)

set -e

echo "🚀 STARTING PROCHEFF-V3 VOLUME MIGRATION"
echo "========================================"

# STEP 1: Navigate and Backup
echo ""
echo "📋 STEP 1: Navigate and Backup"
cd /var/www/procheff
pwd

echo "Creating backup..."
cp docker-compose.digitalocean.yml docker-compose.digitalocean.yml.pre-volume-$(date +%Y%m%d-%H%M%S)

echo "Backup created:"
ls -la docker-compose.digitalocean.yml*

echo ""
echo "✅ STEP 1 COMPLETE - Backup created successfully!"

# STEP 2: Stop current services
echo ""
echo "📋 STEP 2: Stop Current Services"
echo "Stopping containers..."
docker-compose -f docker-compose.digitalocean.yml down

echo "Verifying containers stopped:"
docker ps

echo ""
echo "✅ STEP 2 COMPLETE - Services stopped!"

# STEP 3: Verify Volume Setup
echo ""
echo "📋 STEP 3: Verify Volume Setup"
echo "Volume mount status:"
df -h /mnt/procheff

echo ""
echo "Volume contents:"
du -sh /mnt/procheff/*

echo ""
echo "Volume permissions:"
ls -la /mnt/procheff/

echo ""
echo "✅ STEP 3 COMPLETE - Volume verified!"

# STEP 4: Update Docker Compose (The big update!)
echo ""
echo "📋 STEP 4: Update Docker Compose Configuration"
echo "Updating docker-compose.digitalocean.yml with volume bind mounts..."

cat > docker-compose.digitalocean.yml << 'COMPOSE_EOF'
# Docker Compose for DigitalOcean VPS Deployment
# Procheff v3 - Production Configuration
# Configure server IP in server-config.sh or environment variables

services:
  # Main Application (Procheff v3)
  procheff-v3:
    image: aydarnuman/procheff-v3:latest
    container_name: procheff-v3
    restart: unless-stopped
    ports:
      - "3001:8080"  # Different port from v2 (assuming v2 uses 3000)
    environment:
      NODE_ENV: production
      PORT: 8080
      HOSTNAME: "0.0.0.0"
      DATABASE_PATH: "/app/data/procheff.db"

      # API Keys (set via .env file)
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      GOOGLE_API_KEY: ${GOOGLE_API_KEY}
      GEMINI_API_KEY: ${GOOGLE_API_KEY}

      # NextAuth
      NEXTAUTH_URL: ${NEXTAUTH_URL:-https://procheff-v3.example.com}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}

      # Upstash Redis (optional)
      UPSTASH_REDIS_REST_URL: ${UPSTASH_REDIS_REST_URL:-}
      UPSTASH_REDIS_REST_TOKEN: ${UPSTASH_REDIS_REST_TOKEN:-}

      # Application Settings
      NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL:-https://procheff-v3.example.com}
      APP_NAME: procheff-v3
      APP_VERSION: 3.0.0
      TIER: professional

      # AI Configuration
      ANTHROPIC_MODEL: claude-sonnet-4-20250514
      GEMINI_MODEL: gemini-2.0-flash-exp
      AI_MODEL_TEMPERATURE: 0.7
      AI_MAX_TOKENS: 16000

      # Features
      ENABLE_IHALE_ANALYSIS: true
      ENABLE_SMART_ANALYZE: true
      ENABLE_MENU_MANAGEMENT: true
      ENABLE_COST_CALCULATOR: true
      ENABLE_OFFER_ENGINE: true
      ENABLE_ANALYTICS: true

      # File Processing
      MAX_DOCUMENT_SIZE_MB: 50
      OCR_ENABLED: true
      PDF_PARSING_TIMEOUT: 20000

      # Scraper/Worker Configuration
      SCRAPER_ENABLED: true
      IHALE_WORKER_URL: http://ihale-worker:8080
      SCRAPER_API_KEY: ${SCRAPER_API_KEY:-}

    volumes:
      # NEW: Block storage volume bind mounts
      - /mnt/procheff/data:/app/data
      - /mnt/procheff/uploads:/app/public/uploads
      - /mnt/procheff/logs:/app/logs
      - /mnt/procheff/cache:/app/cache
    networks:
      - procheff-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:8080/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    labels:
      - "com.centurylinklabs.watchtower.enable=true"  # Auto-update with Watchtower

  # İhale Worker Service
  ihale-worker:
    build:
      context: ./ihale-worker
      dockerfile: Dockerfile
    image: aydarnuman/ihale-worker:latest
    container_name: ihale-worker
    restart: unless-stopped
    ports:
      - "8081:8080"  # Map to different external port to avoid conflicts
    environment:
      NODE_ENV: production
      PORT: 8080
      # İhalebul credentials (set via .env file)
      IHALEBUL_USERNAME: ${IHALEBUL_USERNAME}
      IHALEBUL_PASSWORD: ${IHALEBUL_PASSWORD}
    networks:
      - procheff-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    labels:
      - "com.centurylinklabs.watchtower.enable=true"  # Auto-update with Watchtower

# Volumes section removed - using bind mounts to /mnt/procheff/ instead

networks:
  procheff-network:
    driver: bridge

# Optional: Watchtower for auto-updates
  # watchtower:
  #   image: containrrr/watchtower
  #   container_name: watchtower-procheff-v3
  #   restart: unless-stopped
  #   volumes:
  #     - /var/run/docker.sock:/var/run/docker.sock
  #   environment:
  #     - WATCHTOWER_CLEANUP=true
  #     - WATCHTOWER_POLL_INTERVAL=3600  # Check every hour
  #     - WATCHTOWER_LABEL_ENABLE=true
  #   networks:
  #     - procheff-network
COMPOSE_EOF

echo ""
echo "✅ STEP 4 COMPLETE - Docker compose updated with volume bind mounts!"

# STEP 5: Start Services
echo ""
echo "📋 STEP 5: Start Services with New Configuration"
echo "Starting containers with volume configuration..."
docker-compose -f docker-compose.digitalocean.yml up -d

echo ""
echo "Container status:"
docker ps

echo ""
echo "✅ STEP 5 COMPLETE - Services started!"

# Give containers time to initialize
echo ""
echo "⏳ Waiting 30 seconds for containers to initialize..."
sleep 30

# STEP 6: Verification Tests
echo ""
echo "📋 STEP 6: Verification Tests"

echo ""
echo "Test 1: Volume mounts inside container"
docker exec procheff-v3 df -h || echo "Container not ready yet"

echo ""
echo "Test 2: Database file access"
docker exec procheff-v3 ls -la /app/data/procheff.db || echo "Database not accessible yet"

echo ""
echo "Test 3: Application health check"
curl -I http://localhost:3001/api/health || echo "App not responding yet"

echo ""
echo "Test 4: Upload directory writable test"
docker exec procheff-v3 touch /app/public/uploads/test-volume-$(date +%s).txt || echo "Upload directory not ready"
docker exec procheff-v3 ls -la /app/public/uploads/ | tail -5

echo ""
echo "Test 5: Logs directory"
docker exec procheff-v3 ls -la /app/logs/ || echo "Logs directory not ready"

echo ""
echo "✅ STEP 6 COMPLETE - Verification tests run!"

# STEP 7: Final Status
echo ""
echo "📋 STEP 7: Final Status Report"
echo "================================================"

echo ""
echo "📊 Volume Usage:"
du -sh /mnt/procheff/* 2>/dev/null || echo "Volume usage calculation failed"

echo ""
echo "📋 Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🔗 Application URLs:"
echo "Main App: http://$(curl -s -m 5 ifconfig.me 2>/dev/null || echo 'IP-CHECK-FAILED'):3001"
echo "Health Check: http://$(curl -s -m 5 ifconfig.me 2>/dev/null || echo 'IP-CHECK-FAILED'):3001/api/health"
echo "Worker: http://$(curl -s -m 5 ifconfig.me 2>/dev/null || echo 'IP-CHECK-FAILED'):8081"

echo ""
echo "🎉 VOLUME MIGRATION DEPLOYMENT COMPLETE!"
echo "========================================"
echo ""
echo "🔍 Next steps:"
echo "1. Test file uploads (should go to /mnt/procheff/uploads/)"
echo "2. Check application logs in /mnt/procheff/logs/"
echo "3. Monitor volume usage with 'df -h /mnt/procheff'"
echo "4. Run reboot test to verify persistence"
echo ""
echo "🛡️ Rollback (if needed):"
echo "docker-compose -f docker-compose.digitalocean.yml down"
echo "cp docker-compose.digitalocean.yml.pre-volume-* docker-compose.digitalocean.yml"
echo "docker-compose -f docker-compose.digitalocean.yml up -d"
