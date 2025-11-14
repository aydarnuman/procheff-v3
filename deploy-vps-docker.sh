#!/bin/bash

# Procheff v3 - DigitalOcean VPS Docker Deployment
# Server: 161.35.217.113

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🚀 Procheff v3 - VPS Docker Deployment${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# 1. Build ve Push Ana Uygulama
echo -e "${YELLOW}📦 1. Ana Uygulama Build & Push${NC}"
echo "================================"

echo "🔨 Building Procheff v3..."
docker build -t aydarnuman/procheff-v3:latest .

echo "☁️ Pushing to Docker Hub..."
docker push aydarnuman/procheff-v3:latest

echo -e "${GREEN}✅ Ana uygulama image'i hazır!${NC}"
echo ""

# 2. Build ve Push İhale Worker
echo -e "${YELLOW}🤖 2. İhale Worker Build & Push${NC}"
echo "================================"

echo "📂 İhale Worker dizinine geçiliyor..."
cd ihale-worker

echo "🔨 TypeScript build ediliyor..."
npm run build

echo "🐳 Docker image build ediliyor..."
docker build -t aydarnuman/ihale-worker:latest .

echo "☁️ Docker Hub'a push ediliyor..."
docker push aydarnuman/ihale-worker:latest

cd ..

echo -e "${GREEN}✅ İhale Worker image'i hazır!${NC}"
echo ""

# 3. Create .env file template
echo -e "${YELLOW}📄 3. Environment Variables${NC}"
echo "================================"

if [ ! -f ".env.production" ]; then
    cat > .env.production.example << 'EOF'
# NextAuth
NEXTAUTH_URL=https://procheff.yourdomain.com
NEXTAUTH_SECRET=your-nextauth-secret-here

# AI API Keys
ANTHROPIC_API_KEY=sk-ant-xxx
GOOGLE_API_KEY=AIzaxxx
GEMINI_API_KEY=AIzaxxx

# İhalebul Credentials
IHALEBUL_USERNAME=your-username
IHALEBUL_PASSWORD=your-password

# Upstash Redis (Optional)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# App URL
NEXT_PUBLIC_APP_URL=https://procheff.yourdomain.com
EOF
    echo -e "${YELLOW}⚠️  .env.production.example created. Please copy to .env.production and fill in values${NC}"
fi

# 4. SSH Commands for VPS
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}📋 VPS'de Çalıştırılacak Komutlar:${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}1. SSH ile sunucuya bağlan:${NC}"
echo "   ssh root@161.35.217.113"
echo ""
echo -e "${YELLOW}2. Proje dizinine git:${NC}"
echo "   cd /root/procheff-v3"
echo ""
echo -e "${YELLOW}3. docker-compose.digitalocean.yml ve .env dosyasını güncelle${NC}"
echo ""
echo -e "${YELLOW}4. Mevcut container'ları durdur:${NC}"
echo "   docker-compose -f docker-compose.digitalocean.yml down"
echo ""
echo -e "${YELLOW}5. Yeni image'leri çek:${NC}"
echo "   docker-compose -f docker-compose.digitalocean.yml pull"
echo ""
echo -e "${YELLOW}6. Container'ları başlat:${NC}"
echo "   docker-compose -f docker-compose.digitalocean.yml up -d"
echo ""
echo -e "${YELLOW}7. Container durumunu kontrol et:${NC}"
echo "   docker ps"
echo "   docker logs procheff-v3"
echo "   docker logs ihale-worker"
echo ""
echo -e "${YELLOW}8. Health check:${NC}"
echo "   curl http://localhost:3001/api/health"
echo "   curl http://localhost:8081/health"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🌐 Deployment Adresleri:${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo "  Ana Uygulama:  http://161.35.217.113:3001"
echo "  İhale Worker:  http://161.35.217.113:8081"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📝 Not: Nginx reverse proxy kurulumu için:${NC}"
echo "   - Ana domain → localhost:3001"
echo "   - /api/ihale/* → localhost:8081/*"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
