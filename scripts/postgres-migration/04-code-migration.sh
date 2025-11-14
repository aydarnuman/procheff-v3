#!/bin/bash

# PostgreSQL Migration - Aşama 4: Kod Dönüşümü
# ============================================

echo "🔄 PostgreSQL Migration - Kod Dönüşümü"
echo "======================================"
echo ""
echo "⚠️  DİKKAT: Bu script kodunuzu değiştirecek!"
echo "   Lütfen önce backup aldığınızdan emin olun."
echo ""
read -p "Devam etmek istiyor musunuz? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "İptal edildi."
    exit 1
fi

# Geçici geçiş dosyası oluştur
echo "📝 Database adapter dosyası oluşturuluyor..."
cat > src/lib/db/database-adapter.ts << 'EOF'
/**
 * Database Adapter - SQLite to PostgreSQL Migration Layer
 * =========================================================
 * Bu dosya geçiş sürecinde hem SQLite hem PostgreSQL'i destekler
 */

// Environment variable ile hangi database kullanılacağını belirle
const USE_POSTGRES = process.env.USE_POSTGRES === 'true';

// Conditional imports
let dbModule: any;

if (USE_POSTGRES) {
  console.log('🐘 Using PostgreSQL database');
  dbModule = require('./postgres-client');
} else {
  console.log('📦 Using SQLite database');
  dbModule = require('./sqlite-client');
}

// Export the appropriate functions
export const getDB = dbModule.getDB;
export const transaction = dbModule.transaction;
export const validateJSON = dbModule.validateJSON;
export const closeDB = USE_POSTGRES ? dbModule.closePool : dbModule.closeDB;

// PostgreSQL specific exports
export const query = dbModule.query;
export const getPool = dbModule.getPool;
export const getClient = dbModule.getClient;

// Compatibility layer for gradual migration
export const db = {
  prepare: (sql: string) => {
    if (USE_POSTGRES) {
      // PostgreSQL compatibility layer
      return {
        get: async (...params: any[]) => {
          const result = await dbModule.query(sql, params);
          return result.rows[0];
        },
        all: async (...params: any[]) => {
          const result = await dbModule.query(sql, params);
          return result.rows;
        },
        run: async (...params: any[]) => {
          const result = await dbModule.query(sql, params);
          return {
            changes: result.rowCount || 0,
            lastInsertRowid: 0
          };
        }
      };
    } else {
      // SQLite original
      const db = dbModule.getDB();
      return db.prepare(sql);
    }
  },
  exec: async (sql: string) => {
    if (USE_POSTGRES) {
      await dbModule.query(sql);
    } else {
      const db = dbModule.getDB();
      db.exec(sql);
    }
  },
  transaction: dbModule.transaction
};
EOF

echo "✅ Database adapter oluşturuldu"

# Import statement'ları güncelle
echo ""
echo "🔧 Import statement'lar güncelleniyor..."

# sqlite-client import'larını database-adapter ile değiştir
find src -type f -name "*.ts" -not -path "*/node_modules/*" -not -path "*/.next/*" \
  -exec sed -i.bak 's|from "@/lib/db/sqlite-client"|from "@/lib/db/database-adapter"|g' {} \;

find src -type f -name "*.tsx" -not -path "*/node_modules/*" -not -path "*/.next/*" \
  -exec sed -i.bak 's|from "@/lib/db/sqlite-client"|from "@/lib/db/database-adapter"|g' {} \;

echo "✅ Import statement'lar güncellendi"

# Environment dosyasını güncelle
echo ""
echo "📝 Environment değişkeni ekleniyor..."
if ! grep -q "USE_POSTGRES" .env.local 2>/dev/null; then
  echo "" >> .env.local
  echo "# Database Selection (set to 'true' for PostgreSQL, 'false' for SQLite)" >> .env.local
  echo "USE_POSTGRES=false" >> .env.local
  echo "✅ USE_POSTGRES=false eklendi (.env.local)"
fi

# Test scripti oluştur
echo ""
echo "🧪 Test scripti oluşturuluyor..."
cat > test-database-adapter.js << 'EOF'
require('dotenv').config({ path: '.env.local' });

console.log('Database Adapter Test');
console.log('=====================');
console.log('USE_POSTGRES:', process.env.USE_POSTGRES);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Tanımlı' : '❌ Tanımlı değil');
console.log('');

async function test() {
  try {
    const { getDB } = require('./src/lib/db/database-adapter');
    
    if (process.env.USE_POSTGRES === 'true') {
      console.log('🐘 PostgreSQL bağlantısı test ediliyor...');
      const db = getDB();
      const result = await db.prepare('SELECT NOW() as time').get();
      console.log('✅ PostgreSQL çalışıyor:', result.time);
    } else {
      console.log('📦 SQLite bağlantısı test ediliyor...');
      const db = getDB();
      const result = db.prepare('SELECT datetime("now") as time').get();
      console.log('✅ SQLite çalışıyor:', result.time);
    }
  } catch (error) {
    console.error('❌ Test başarısız:', error.message);
    process.exit(1);
  }
}

test();
EOF

echo ""
echo "✅ Kod dönüşümü tamamlandı!"
echo ""
echo "📋 Yapılan değişiklikler:"
echo "   • database-adapter.ts oluşturuldu"
echo "   • Import statement'lar güncellendi"
echo "   • .env.local'e USE_POSTGRES değişkeni eklendi"
echo ""
echo "🔧 Sonraki adımlar:"
echo "   1. Test için: node test-database-adapter.js"
echo "   2. PostgreSQL'e geçmek için: USE_POSTGRES=true"
echo "   3. SQLite'a dönmek için: USE_POSTGRES=false"
echo ""
echo "💡 İpucu: Önce USE_POSTGRES=false ile test edin,"
echo "   sonra USE_POSTGRES=true yaparak PostgreSQL'e geçin."

# Backup dosyalarını temizle
echo ""
read -p "*.bak backup dosyaları silinsin mi? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    find src -name "*.bak" -type f -delete
    echo "✅ Backup dosyaları temizlendi"
fi
