#!/bin/bash

echo "🧹 İhale Worker - Temiz Başlatma"
echo "================================"

# Kill any existing processes
echo "1. Mevcut process'leri temizliyorum..."
pkill -f "tsx.*server.ts" 2>/dev/null && echo "   ✅ tsx process'leri durduruldu" || echo "   ℹ️  Çalışan tsx process yok"
lsof -ti:8080 | xargs kill -9 2>/dev/null && echo "   ✅ Port 8080 temizlendi" || echo "   ℹ️  Port 8080 zaten boş"

# Wait a bit
sleep 2

# Start fresh
echo ""
echo "2. Worker'ı başlatıyorum..."
npm run dev

