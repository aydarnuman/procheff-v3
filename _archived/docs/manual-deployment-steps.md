# 🚀 Manual Volume Deployment Steps

**Server**: 104.248.254.171 (root)  
**Path**: `/var/www/procheff`

## 🔧 Step 1: Navigate and Backup

```bash
cd /var/www/procheff

# Backup current configuration
cp docker-compose.digitalocean.yml docker-compose.digitalocean.yml.pre-volume-$(date +%Y%m%d-%H%M%S)

# Verify backup
ls -la docker-compose.digitalocean.yml*
```

## 📄 Step 2: Update Docker Compose

```bash
# Create new docker-compose.digitalocean.yml with volume configuration
cat > docker-compose.digitalocean.yml << 'EOF'
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
EOF

echo "✅ docker-compose.digitalocean.yml updated with volume configuration"
```

## 🛑 Step 3: Stop Current Services

```bash
# Stop current containers
docker-compose -f docker-compose.digitalocean.yml down

# Verify containers are stopped
docker ps
```

## 📊 Step 4: Verify Volume Setup

```bash
# Check volume is mounted
df -h /mnt/procheff

# Check volume contents (should have 22MB+ data)
du -sh /mnt/procheff/*

# Check permissions (should be 1001:1001)
ls -la /mnt/procheff/
```

## 🚀 Step 5: Start Services with New Configuration

```bash
# Start services with new volume configuration
docker-compose -f docker-compose.digitalocean.yml up -d

# Check container status
docker ps

# Follow startup logs
docker logs procheff-v3 --tail 50 -f
# Press Ctrl+C after seeing successful startup
```

## ✅ Step 6: Verification Tests

```bash
# Test 1: Check volume mounts inside container
docker exec procheff-v3 df -h

# Test 2: Verify database file access
docker exec procheff-v3 ls -la /app/data/procheff.db

# Test 3: Test application health
curl -I http://localhost:3001/api/health

# Test 4: Check upload directory is writable
docker exec procheff-v3 touch /app/public/uploads/test-file.txt
docker exec procheff-v3 ls -la /app/public/uploads/test-file.txt

# Test 5: Verify logs directory
docker exec procheff-v3 ls -la /app/logs/
```

## 📊 Step 7: Final Status Check

```bash
echo "=== VOLUME MIGRATION SUCCESS REPORT ==="
echo ""
echo "📊 Volume Usage:"
du -sh /mnt/procheff/*

echo ""
echo "📋 Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🔗 Application URLs:"
echo "Main App: http://$(curl -s ifconfig.me):3001"
echo "Health Check: http://$(curl -s ifconfig.me):3001/api/health"
echo "Ihale Worker: http://$(curl -s ifconfig.me):8081"

echo ""
echo "✅ VOLUME MIGRATION COMPLETE!"
```

## 🛡️ Rollback (if needed)

```bash
# If something goes wrong, restore previous config:
docker-compose -f docker-compose.digitalocean.yml down

# Copy backup back
cp docker-compose.digitalocean.yml.pre-volume-* docker-compose.digitalocean.yml

# Restart with old configuration
docker-compose -f docker-compose.digitalocean.yml up -d
```
