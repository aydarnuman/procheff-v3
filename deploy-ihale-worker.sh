#!/bin/bash

# İhale Worker Docker Image Build & Deploy Script
# Usage: ./deploy-ihale-worker.sh

set -e

echo "🚀 İhale Worker Deployment Başlıyor..."
echo "======================================"

# 1. İhale Worker dizinine geç
echo "📂 İhale Worker dizinine geçiliyor..."
cd ihale-worker

# 2. TypeScript'i build et
echo "🔨 TypeScript build ediliyor..."
npm run build

# 3. Docker image'i build et
echo "🐳 Docker image build ediliyor..."
docker build -t aydarnuman/ihale-worker:latest .

# 4. Docker Hub'a push et
echo "☁️ Docker Hub'a push ediliyor..."
docker push aydarnuman/ihale-worker:latest

# 5. Ana dizine dön
cd ..

echo ""
echo "✅ İhale Worker image başarıyla Docker Hub'a yüklendi!"
echo ""
echo "📝 Production'da çalıştırmak için:"
echo "   1. DigitalOcean sunucusuna SSH ile bağlan"
echo "   2. docker-compose.digitalocean.yml dosyasını güncelle"
echo "   3. Şu komutları çalıştır:"
echo ""
echo "   docker-compose -f docker-compose.digitalocean.yml pull"
echo "   docker-compose -f docker-compose.digitalocean.yml up -d"
echo ""
echo "🔍 Container durumunu kontrol et:"
echo "   docker ps"
echo "   docker logs ihale-worker"
