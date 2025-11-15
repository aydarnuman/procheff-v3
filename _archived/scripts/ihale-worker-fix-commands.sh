#!/bin/bash

# ==========================================
# İHALE WORKER KALICI FIX - PRODUCTION COMMANDS
# ==========================================
# Bu komutları sunucuda çalıştır!

echo "🔧 İHALE WORKER KALICI FIX BAŞLIYOR..."

# 1. Sunucuya bağlan ve dizine git
cd /var/www/procheff

# 2. İhale Worker Dockerfile'ı güncelle (Multi-stage build)
cat > ihale-worker/Dockerfile << 'EOF'
# Multi-stage build for TypeScript compilation
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript to JavaScript
RUN npm run build

# Production stage
FROM mcr.microsoft.com/playwright:v1.47.0-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start server
CMD ["node", "dist/server.js"]
EOF

echo "✅ Dockerfile güncellendi"

# 3. .dockerignore dosyasını güncelle
cat > ihale-worker/.dockerignore << 'EOF'
node_modules
npm-debug.log
.DS_Store
.env
.env.local
*.log
.git
.gitignore
README.md
start-clean.sh
.vscode
.idea
EOF

echo "✅ .dockerignore güncellendi"

# 4. Mevcut container'ları durdur
echo "⏹️ Container'lar durduruluyor..."
docker-compose -f docker-compose.digitalocean.yml down

# 5. Docker build cache'i temizle (optional - daha temiz build için)
echo "🧹 Docker cache temizleniyor..."
docker system prune -f

# 6. Yeniden build et ve başlat
echo "🚀 Docker Compose başlatılıyor..."
docker-compose -f docker-compose.digitalocean.yml up -d --build

# 7. Container durumlarını kontrol et
echo "📊 Container durumları:"
docker ps

# 8. İhale worker loglarını kontrol et
echo "📝 İhale Worker logları:"
docker logs ihale-worker --tail 20

# 9. Procheff-v3 loglarını kontrol et
echo "📝 Procheff-v3 logları:"
docker logs procheff-v3 --tail 20

# 10. Health check
echo "🏥 Health Check:"
curl -f http://localhost:3001/api/health || echo "Procheff-v3 health check failed"
curl -f http://localhost:8081/health || echo "İhale Worker health check failed"

echo "✅ İHALE WORKER KALICI FIX TAMAMLANDI!"
