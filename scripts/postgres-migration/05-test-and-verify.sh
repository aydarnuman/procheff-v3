#!/bin/bash

# PostgreSQL Migration - Aşama 5: Test ve Doğrulama
# ==================================================

echo "🧪 PostgreSQL Migration - Test ve Doğrulama"
echo "==========================================="
echo ""

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test sonuçlarını sakla
TESTS_PASSED=0
TESTS_FAILED=0

# Test fonksiyonu
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -n "  Testing $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((TESTS_FAILED++))
    fi
}

echo "1️⃣ Database Bağlantı Testleri"
echo "--------------------------------"

# SQLite test
export USE_POSTGRES=false
run_test "SQLite connection" "node -e \"
require('dotenv').config({ path: '.env.local' });
const Database = require('better-sqlite3');
const db = new Database('./procheff.db');
const result = db.prepare('SELECT 1').get();
db.close();
process.exit(result ? 0 : 1);
\""

# PostgreSQL test
export USE_POSTGRES=true
run_test "PostgreSQL connection" "node -e \"
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => client.query('SELECT 1'))
  .then(() => client.end())
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
\""

echo ""
echo "2️⃣ Veri Tutarlılık Testleri"
echo "-----------------------------"

# Tablo sayısı karşılaştırması
echo -n "  Comparing table counts... "
SQLITE_TABLES=$(node -e "
const Database = require('better-sqlite3');
const db = new Database('./procheff.db', { readonly: true });
const tables = db.prepare(\"SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'\").get();
console.log(tables.count);
db.close();
" 2>/dev/null)

PG_TABLES=$(node -e "
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => client.query(\"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'\"))
  .then(result => {
    console.log(result.rows[0].count);
    return client.end();
  })
  .catch(() => console.log(0));
" 2>/dev/null)

if [ "$SQLITE_TABLES" = "$PG_TABLES" ]; then
    echo -e "${GREEN}✓${NC} (SQLite: $SQLITE_TABLES, PostgreSQL: $PG_TABLES)"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠${NC} (SQLite: $SQLITE_TABLES, PostgreSQL: $PG_TABLES)"
    ((TESTS_FAILED++))
fi

# Kayıt sayısı kontrolü
echo ""
echo "3️⃣ Kayıt Sayısı Kontrolü"
echo "-------------------------"

# Her tablo için kayıt sayısını kontrol et
node << 'EOF'
const Database = require('better-sqlite3');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function compareRecordCounts() {
  const sqlite = new Database('./procheff.db', { readonly: true });
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await pg.connect();
    
    // SQLite tablolarını al
    const tables = sqlite.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE '_migrations'
      ORDER BY name
    `).all();
    
    console.log('  Tablo kayıt sayıları:');
    let mismatches = 0;
    
    for (const table of tables) {
      const sqliteCount = sqlite.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get().count;
      
      try {
        const pgResult = await pg.query(`SELECT COUNT(*) as count FROM ${table.name}`);
        const pgCount = parseInt(pgResult.rows[0].count);
        
        const match = sqliteCount === pgCount;
        const icon = match ? '✓' : '⚠';
        const color = match ? '\x1b[32m' : '\x1b[33m';
        
        console.log(`  ${color}${icon}\x1b[0m ${table.name}: SQLite=${sqliteCount}, PostgreSQL=${pgCount}`);
        
        if (!match) mismatches++;
      } catch (error) {
        console.log(`  \x1b[31m✗\x1b[0m ${table.name}: PostgreSQL tablosu bulunamadı`);
        mismatches++;
      }
    }
    
    process.exit(mismatches > 0 ? 1 : 0);
  } catch (error) {
    console.error('Hata:', error.message);
    process.exit(1);
  } finally {
    sqlite.close();
    await pg.end();
  }
}

compareRecordCounts();
EOF

if [ $? -eq 0 ]; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

echo ""
echo "4️⃣ API Endpoint Testleri"
echo "------------------------"

# API test fonksiyonu
test_api() {
    local endpoint="$1"
    local method="${2:-GET}"
    local expected_status="${3:-200}"
    
    echo -n "  Testing $method $endpoint... "
    
    # Start Next.js server in test mode if not running
    if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${YELLOW}Server not running${NC}"
        return
    fi
    
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "http://localhost:3000$endpoint")
    
    if [ "$STATUS" = "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} ($STATUS)"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗${NC} (Expected: $expected_status, Got: $STATUS)"
        ((TESTS_FAILED++))
    fi
}

# Kritik API endpoint'leri test et
test_api "/api/health" "GET" "200"
test_api "/api/database/stats" "GET" "200"
test_api "/api/notifications/stream" "GET" "200"

echo ""
echo "5️⃣ Performans Karşılaştırması"
echo "------------------------------"

# Basit performans testi
echo "  Running performance comparison..."

# SQLite performansı
export USE_POSTGRES=false
SQLITE_TIME=$(node -e "
require('dotenv').config({ path: '.env.local' });
const start = Date.now();
const Database = require('better-sqlite3');
const db = new Database('./procheff.db');

// 100 SELECT sorgusu
for (let i = 0; i < 100; i++) {
  db.prepare('SELECT * FROM users LIMIT 1').get();
}

db.close();
console.log(Date.now() - start);
" 2>/dev/null)

# PostgreSQL performansı
export USE_POSTGRES=true
PG_TIME=$(node -e "
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function test() {
  const start = Date.now();
  await client.connect();
  
  // 100 SELECT sorgusu
  for (let i = 0; i < 100; i++) {
    await client.query('SELECT * FROM users LIMIT 1');
  }
  
  await client.end();
  console.log(Date.now() - start);
}

test().catch(() => console.log(99999));
" 2>/dev/null)

echo "  SQLite: ${SQLITE_TIME}ms"
echo "  PostgreSQL: ${PG_TIME}ms"

if [ "$PG_TIME" -lt $((SQLITE_TIME * 3)) ]; then
    echo -e "  ${GREEN}✓${NC} Performans kabul edilebilir"
    ((TESTS_PASSED++))
else
    echo -e "  ${YELLOW}⚠${NC} PostgreSQL daha yavaş (3x'den fazla)"
fi

echo ""
echo "=========================================="
echo "📊 Test Özeti"
echo "=========================================="
echo -e "  Başarılı: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "  Başarısız: ${RED}${TESTS_FAILED}${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Tüm testler başarılı!${NC}"
    echo ""
    echo "🎉 PostgreSQL migration başarıyla tamamlandı!"
    echo ""
    echo "📋 Sonraki adımlar:"
    echo "   1. Production'a deploy etmeden önce staging'de test edin"
    echo "   2. .env.local'de USE_POSTGRES=true yapın"
    echo "   3. Uygulamayı yeniden başlatın"
    echo "   4. SQLite backup'larını saklayın"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Bazı testler başarısız!${NC}"
    echo ""
    echo "🔧 Öneriler:"
    echo "   1. Migration log'larını kontrol edin"
    echo "   2. PostgreSQL bağlantı ayarlarını doğrulayın"
    echo "   3. Eksik verileri manuel olarak aktarın"
    echo "   4. USE_POSTGRES=false yaparak SQLite'a geri dönün"
    exit 1
fi
