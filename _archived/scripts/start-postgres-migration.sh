#!/bin/bash

# ============================================================
# Quick Start - PostgreSQL Migration
# ============================================================
# Bu script migration sürecini başlatır
# ============================================================

echo "🚀 Procheff v3 - PostgreSQL Migration Quick Start"
echo "=================================================="
echo ""
echo "📋 Bu script şunları yapacak:"
echo "  1. PostgreSQL paketlerini kuracak"
echo "  2. Backup alacak"
echo "  3. Verileri PostgreSQL'e aktaracak"
echo "  4. Kodları güncelleyecek"
echo "  5. Testleri çalıştıracak"
echo ""
echo "⚠️  DİKKAT: Bu işlem 5-10 dakika sürebilir!"
echo ""

# PostgreSQL bağlantı bilgilerini sor
echo "🔧 PostgreSQL Bağlantı Bilgileri"
echo "================================="
echo ""
echo "Lütfen PostgreSQL bağlantı bilgilerinizi girin:"
echo "(Enter'a basarak varsayılan değerleri kullanabilirsiniz)"
echo ""

read -p "Host [localhost]: " PG_HOST
PG_HOST=${PG_HOST:-localhost}

read -p "Port [5432]: " PG_PORT
PG_PORT=${PG_PORT:-5432}

read -p "Database [procheff_db]: " PG_DATABASE
PG_DATABASE=${PG_DATABASE:-procheff_db}

read -p "Username [postgres]: " PG_USER
PG_USER=${PG_USER:-postgres}

read -s -p "Password: " PG_PASSWORD
echo ""

# DATABASE_URL oluştur
DATABASE_URL="postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${PG_DATABASE}"

# .env.local dosyasını güncelle veya oluştur
echo ""
echo "📝 Environment dosyası güncelleniyor..."

# .env.local yoksa oluştur
if [ ! -f .env.local ]; then
    touch .env.local
fi

# PostgreSQL ayarlarını ekle (varsa güncelle)
if grep -q "DATABASE_URL" .env.local; then
    # macOS ve Linux uyumlu sed komutu
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env.local
    else
        sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env.local
    fi
else
    echo "" >> .env.local
    echo "# PostgreSQL Configuration" >> .env.local
    echo "DATABASE_URL=\"${DATABASE_URL}\"" >> .env.local
fi

# Diğer PostgreSQL değişkenlerini ekle
if ! grep -q "POSTGRES_HOST" .env.local; then
    echo "POSTGRES_HOST=\"${PG_HOST}\"" >> .env.local
    echo "POSTGRES_PORT=\"${PG_PORT}\"" >> .env.local
    echo "POSTGRES_USER=\"${PG_USER}\"" >> .env.local
    echo "POSTGRES_PASSWORD=\"${PG_PASSWORD}\"" >> .env.local
    echo "POSTGRES_DATABASE=\"${PG_DATABASE}\"" >> .env.local
fi

# USE_POSTGRES flag'ini ekle (varsayılan false)
if ! grep -q "USE_POSTGRES" .env.local; then
    echo "" >> .env.local
    echo "# Database Selection" >> .env.local
    echo "USE_POSTGRES=false" >> .env.local
fi

echo "✅ Environment dosyası güncellendi"
echo ""

# PostgreSQL bağlantısını test et
echo "🧪 PostgreSQL bağlantısı test ediliyor..."
node -e "
const { Client } = require('pg');
const client = new Client({
  connectionString: '${DATABASE_URL}'
});

client.connect()
  .then(() => {
    console.log('✅ PostgreSQL bağlantısı başarılı!');
    return client.end();
  })
  .catch(err => {
    console.error('❌ PostgreSQL bağlantısı başarısız!');
    console.error('Hata:', err.message);
    console.error('');
    console.error('Lütfen şunları kontrol edin:');
    console.error('1. PostgreSQL server çalışıyor mu?');
    console.error('2. Database mevcut mu? (createdb ${PG_DATABASE})');
    console.error('3. Kullanıcı adı ve şifre doğru mu?');
    console.error('4. PostgreSQL bağlantı ayarları doğru mu?');
    process.exit(1);
  });
" || exit 1

echo ""
echo "🎯 Migration başlatılıyor..."
echo ""

# Migration script'ini çalıştır
if [ -f "scripts/postgres-migration/migrate.sh" ]; then
    bash scripts/postgres-migration/migrate.sh
else
    echo "❌ Migration script bulunamadı!"
    echo "Lütfen scripts/postgres-migration/ dizinini kontrol edin."
    exit 1
fi

echo ""
echo "✨ İşlem tamamlandı!"
echo ""
echo "📋 Sonraki adımlar:"
echo "1. PostgreSQL'i aktif etmek için:"
echo "   sed -i 's/USE_POSTGRES=false/USE_POSTGRES=true/' .env.local"
echo ""
echo "2. Uygulamayı test edin:"
echo "   npm run dev"
echo ""
echo "3. Sorun yaşarsanız SQLite'a geri dönmek için:"
echo "   sed -i 's/USE_POSTGRES=true/USE_POSTGRES=false/' .env.local"
