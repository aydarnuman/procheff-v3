#!/bin/bash

# PostgreSQL Migration - Aşama 2: PostgreSQL Kurulumu
# =====================================================

echo "🐘 PostgreSQL Migration - Kurulum Aşaması"
echo "=========================================="
echo ""

# PostgreSQL paketlerini kur
echo "📦 PostgreSQL npm paketleri kuruluyor..."
npm install pg @types/pg
npm install --save-dev @types/pg

echo ""
echo "✅ PostgreSQL paketleri kuruldu!"
echo ""

# Environment değişkenleri için örnek
echo "📝 .env dosyanıza aşağıdaki PostgreSQL bağlantı bilgilerini ekleyin:"
echo "=================================================="
cat << 'EOF'

# PostgreSQL Configuration (Yeni)
DATABASE_URL="postgresql://username:password@localhost:5432/procheff_db"
POSTGRES_HOST="localhost"
POSTGRES_PORT="5432"
POSTGRES_USER="your_username"
POSTGRES_PASSWORD="your_password"
POSTGRES_DATABASE="procheff_db"

# SQLite (Geçici olarak saklayın, migration sonrası silinecek)
SQLITE_DATABASE="./procheff.db"

EOF

echo ""
echo "🔧 PostgreSQL Kurulum Kontrol Listesi:"
echo "======================================="
echo "[ ] PostgreSQL server kurulu mu? (brew install postgresql veya apt-get install postgresql)"
echo "[ ] PostgreSQL servisi çalışıyor mu? (brew services start postgresql veya systemctl start postgresql)"
echo "[ ] Database oluşturuldu mu? (createdb procheff_db)"
echo "[ ] Kullanıcı oluşturuldu mu? (createuser -s your_username)"
echo "[ ] .env dosyası güncellendi mi?"
echo ""
echo "📌 PostgreSQL bağlantısını test etmek için:"
echo "   psql -h localhost -U your_username -d procheff_db"
echo ""

# Test bağlantısı için basit script
cat > test-postgres-connection.js << 'EOF'
const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/procheff_db'
  });

  try {
    await client.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ PostgreSQL bağlantısı başarılı!');
    console.log('   Server zamanı:', result.rows[0].now);
    await client.end();
  } catch (error) {
    console.error('❌ PostgreSQL bağlantısı başarısız!');
    console.error('   Hata:', error.message);
    console.error('   DATABASE_URL:', process.env.DATABASE_URL || 'Tanımlı değil');
    process.exit(1);
  }
}

testConnection();
EOF

echo "🧪 PostgreSQL bağlantısını test etmek için:"
echo "   node test-postgres-connection.js"
