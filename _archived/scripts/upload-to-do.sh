#!/bin/bash

# DigitalOcean PostgreSQL Upload Script
# ======================================

echo "🚀 DigitalOcean'a veri yükleme başlıyor..."
echo ""
echo "⚠️  DigitalOcean bağlantı bilgilerini girin:"
echo ""

read -p "Host (örn: db-xxx.db.ondigitalocean.com): " DO_HOST
read -p "Port [25060]: " DO_PORT
DO_PORT=${DO_PORT:-25060}
read -p "Database [defaultdb]: " DO_DATABASE
DO_DATABASE=${DO_DATABASE:-defaultdb}
read -p "Username [doadmin]: " DO_USER
DO_USER=${DO_USER:-doadmin}
read -s -p "Password: " DO_PASSWORD
echo ""

# Connection string oluştur
DO_CONNECTION="postgresql://${DO_USER}:${DO_PASSWORD}@${DO_HOST}:${DO_PORT}/${DO_DATABASE}?sslmode=require"

echo ""
echo "📊 Bağlantı test ediliyor..."
export PGPASSWORD="${DO_PASSWORD}"
psql -h "${DO_HOST}" -p "${DO_PORT}" -U "${DO_USER}" -d "${DO_DATABASE}" -c "SELECT version();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Bağlantı başarılı!"
else
    echo "❌ Bağlantı başarısız! Bilgileri kontrol edin."
    exit 1
fi

echo ""
echo "🗄️ Database oluşturuluyor..."
psql -h "${DO_HOST}" -p "${DO_PORT}" -U "${DO_USER}" -d "${DO_DATABASE}" -c "CREATE DATABASE procheff_db;" 2>/dev/null || echo "Database zaten var veya oluşturulamadı (sorun değil)"

echo ""
echo "📤 Veriler yükleniyor..."
echo "   Bu işlem birkaç dakika sürebilir..."

# PATH'e PostgreSQL ekle
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"

# Local backup'ı DigitalOcean'a yükle
psql -h "${DO_HOST}" -p "${DO_PORT}" -U "${DO_USER}" -d "procheff_db" -f procheff_local_backup.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Veriler başarıyla yüklendi!"
    echo ""
    echo "📊 Tablo kontrolü:"
    psql -h "${DO_HOST}" -p "${DO_PORT}" -U "${DO_USER}" -d "procheff_db" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' LIMIT 10;"
    
    echo ""
    echo "📈 Kayıt sayıları:"
    psql -h "${DO_HOST}" -p "${DO_PORT}" -U "${DO_USER}" -d "procheff_db" -c "SELECT 'logs' as tablo, COUNT(*) as kayit FROM logs UNION SELECT 'market_prices', COUNT(*) FROM market_prices UNION SELECT 'tenders', COUNT(*) FROM tenders;"
else
    echo "❌ Veri yükleme başarısız!"
fi

echo ""
echo "🔧 .env.local dosyasını güncellemek için:"
echo ""
echo "DATABASE_URL=\"postgresql://${DO_USER}:${DO_PASSWORD}@${DO_HOST}:${DO_PORT}/procheff_db?sslmode=require\""
echo "USE_POSTGRES=true"
