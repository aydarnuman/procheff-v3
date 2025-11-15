# 🚀 Gerçekçi PostgreSQL Geçiş Planı (Revize Edilmiş)

## ⚠️ KRİTİK SORUNLAR VE ÇÖZÜMLER

### Sorun #1: sqlite-to-postgres paketi güvenilir değil
**Çözüm:** Custom migration script yazacağız (kontrollü, test edilebilir)

### Sorun #2: Kod hala sqlite-client kullanıyor
**Çözüm:** db-adapter'a geçiş yapmadan dual mode çalışmaz

### Sorun #3: AUTOINCREMENT → SERIAL dönüşümü yapılmamış
**Çözüm:** Migration dosyalarını otomatik convert edeceğiz

### Sorun #4: Schema önce oluşturulmalı
**Çözüm:** Data migration'dan önce tablolar hazır olmalı

---

## 📋 GÜVENLİ GEÇİŞ PLANI

### 🔥 AŞAMA 0: YEDEKLEMEVEHazırlık (15 dakika)

```bash
cd /var/www/procheff

# 1. SQLite yedeği al (3 kopya)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p backups/postgres-migration-$TIMESTAMP

# Database backup
cp procheff.db backups/postgres-migration-$TIMESTAMP/
sqlite3 procheff.db .dump > backups/postgres-migration-$TIMESTAMP/procheff.sql

# Code backup
cp .env backups/postgres-migration-$TIMESTAMP/.env
cp -r src/lib/db backups/postgres-migration-$TIMESTAMP/db-backup

echo "✅ 3 kopya backup tamamlandı!"
ls -lh backups/postgres-migration-$TIMESTAMP/
```

**Verify:**
```bash
# Backup boyutlarını kontrol et
du -sh backups/postgres-migration-$TIMESTAMP/*
# procheff.db: ~380 KB
# procheff.sql: ~500 KB
# .env: ~2 KB
# db-backup/: ~100 KB
```

---

### 🧪 AŞAMA 1: POSTGRESQL BAĞLANTI TESTİ (10 dakika)

```bash
cd /var/www/procheff

# Environment variable'ı ekle (.env değil, .env.local kullan!)
cat >> .env << 'EOF'

# ====================================
# PostgreSQL Migration Configuration
# ====================================
DATABASE_URL="postgresql://doadmin:***PASSWORD***@db-postgresql-fra1-22277-do-user-28803712-0.f.db.ondigitalocean.com:25060/procheff_db?sslmode=require"
DB_MODE="sqlite"  # Henüz dual değil!
SQLITE_DB_PATH="./procheff.db"
EOF

# Test script oluştur
cat > test-postgres-connection.js << 'EOF'
const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🔗 PostgreSQL bağlantısı test ediliyor...');
    await client.connect();
    console.log('✅ Bağlantı başarılı!');

    // Test query
    const result = await client.query('SELECT NOW() as time, VERSION() as version');
    console.log('✅ Zaman:', result.rows[0].time);
    console.log('✅ Versiyon:', result.rows[0].version.substring(0, 50) + '...');

    // Check database name
    const dbInfo = await client.query('SELECT current_database()');
    console.log('✅ Database:', dbInfo.rows[0].current_database);

    await client.end();
    console.log('\n✅ PostgreSQL bağlantı testi BAŞARILI!');
    process.exit(0);
  } catch (error) {
    console.error('❌ PostgreSQL bağlantı hatası:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testConnection();
EOF

# Test et
node test-postgres-connection.js
```

**Beklenen Çıktı:**
```
🔗 PostgreSQL bağlantısı test ediliyor...
✅ Bağlantı başarılı!
✅ Zaman: 2025-11-14T18:30:00.000Z
✅ Versiyon: PostgreSQL 14.x on x86_64-pc-linux-gnu...
✅ Database: procheff_db
✅ PostgreSQL bağlantı testi BAŞARILI!
```

---

### 📊 AŞAMA 2: SCHEMA DÖNÜŞTÜRME (20 dakika)

```bash
cd /var/www/procheff

# Schema conversion script
cat > convert-schema-to-postgres.js << 'EOF'
const fs = require('fs');
const path = require('path');

console.log('📝 Converting SQLite migrations to PostgreSQL...\n');

// Migration dosyalarını oku
const migrationsDir = path.join(__dirname, 'src', 'lib', 'db', 'migrations');
const outputDir = path.join(__dirname, 'postgres-migrations');

// Output klasörü oluştur
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Conversion rules
const conversions = [
  // AUTOINCREMENT → SERIAL
  { from: /INTEGER PRIMARY KEY AUTOINCREMENT/g, to: 'SERIAL PRIMARY KEY' },

  // DATETIME → TIMESTAMP
  { from: /DATETIME/g, to: 'TIMESTAMP' },

  // TEXT DEFAULT CURRENT_TIMESTAMP → TIMESTAMP DEFAULT NOW()
  { from: /TEXT DEFAULT CURRENT_TIMESTAMP/g, to: 'TIMESTAMP DEFAULT NOW()' },

  // INTEGER DEFAULT 0 is compatible, no change needed

  // Remove PRAGMA statements
  { from: /PRAGMA[^;]*;/g, to: '' },

  // Remove BEGIN TRANSACTION / COMMIT
  { from: /BEGIN TRANSACTION;?/g, to: '' },
  { from: /COMMIT;?/g, to: '' },

  // Boolean: INTEGER → BOOLEAN, 0/1 → FALSE/TRUE
  { from: /is_read INTEGER DEFAULT 0/g, to: 'is_read BOOLEAN DEFAULT FALSE' },
  { from: /is_read INTEGER/g, to: 'is_read BOOLEAN' },
];

// Migration dosyalarını işle
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

let totalConversions = 0;

files.forEach(file => {
  console.log(`📄 Processing: ${file}`);

  let content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  let fileConversions = 0;

  // Her conversion rule'u uygula
  conversions.forEach(rule => {
    const matches = content.match(rule.from);
    if (matches) {
      fileConversions += matches.length;
      content = content.replace(rule.from, rule.to);
    }
  });

  // PostgreSQL uyumlu dosyayı yaz
  fs.writeFileSync(path.join(outputDir, file), content);

  console.log(`   ✅ ${fileConversions} conversion applied`);
  totalConversions += fileConversions;
});

console.log(`\n✅ Total conversions: ${totalConversions}`);
console.log(`✅ PostgreSQL migrations created in: ${outputDir}`);
EOF

# Script'i çalıştır
node convert-schema-to-postgres.js
```

**Beklenen Çıktı:**
```
📝 Converting SQLite migrations to PostgreSQL...

📄 Processing: 000_create_analysis_history.sql
   ✅ 3 conversion applied
📄 Processing: 003_analysis_repository.sql
   ✅ 5 conversion applied
📄 Processing: 009_ai_logs_table.sql
   ✅ 2 conversion applied
...

✅ Total conversions: 45
✅ PostgreSQL migrations created in: /var/www/procheff/postgres-migrations
```

---

### 🗄️ AŞAMA 3: POSTGRESQL SCHEMA OLUŞTUR (15 dakika)

```bash
cd /var/www/procheff

# PostgreSQL tablolarını oluştur
cat > create-postgres-schema.js << 'EOF'
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function createSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ PostgreSQL bağlantısı kuruldu\n');

    // Migration dosyalarını sırayla çalıştır
    const migrationsDir = path.join(__dirname, 'postgres-migrations');
    const migrations = [
      '000_create_analysis_history.sql',
      'add-analysis-tables.sql',
      'add-storage-progress.sql',
      '003_analysis_repository.sql',
      '004_add_missing_indexes.sql',
      '006_market_prices.sql',
      '007_market_prices_real.sql',
      '009_ai_logs_table.sql'
    ];

    let successCount = 0;
    let errorCount = 0;

    for (const file of migrations) {
      const filePath = path.join(migrationsDir, file);

      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipping: ${file} (not found)`);
        continue;
      }

      console.log(`📋 Running: ${file}`);

      try {
        const sql = fs.readFileSync(filePath, 'utf8');

        // Her statement'ı ayrı çalıştır
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        for (const stmt of statements) {
          try {
            await client.query(stmt);
          } catch (error) {
            // Ignorable errors (table already exists, etc.)
            if (!error.message.includes('already exists')) {
              throw error;
            }
          }
        }

        console.log(`   ✅ Success\n`);
        successCount++;
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}\n`);
        errorCount++;
      }
    }

    // Tabloları listele
    const tables = await client.query(`
      SELECT table_name,
             pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('\n📊 Oluşturulan Tablolar:');
    console.log('═══════════════════════════════════════');
    tables.rows.forEach(row => {
      console.log(`  ${row.table_name.padEnd(30)} ${row.size}`);
    });
    console.log('═══════════════════════════════════════');
    console.log(`\n✅ Success: ${successCount} migrations`);
    console.log(`❌ Errors: ${errorCount} migrations`);

    await client.end();

    if (errorCount > 0) {
      console.error('\n⚠️  Some migrations failed. Review errors above.');
      process.exit(1);
    }

    console.log('\n✅ PostgreSQL schema creation COMPLETE!');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

createSchema();
EOF

# Schema oluştur
node create-postgres-schema.js
```

---

### 📦 AŞAMA 4: VERİ MİGRATION (30 dakika)

**⚠️ ÖNEM:** sqlite-to-postgres paketi yerine kontrollü script kullanacağız!

```bash
cd /var/www/procheff

# Data migration script
cat > migrate-data-to-postgres.js << 'EOF'
const { Client } = require('pg');
const Database = require('better-sqlite3');

async function migrateData() {
  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL
  });

  const sqlite = new Database('./procheff.db', { readonly: true });

  try {
    await pgClient.connect();
    console.log('✅ Her iki database bağlantısı kuruldu\n');

    // Migre edilecek tablolar (sıralı - foreign key'ler için)
    const tables = [
      { name: 'users', priority: 1 },
      { name: 'organizations', priority: 2 },
      { name: 'memberships', priority: 3 },
      { name: 'notifications', priority: 4 },
      { name: 'orchestrations', priority: 4 },
      { name: 'analysis_history', priority: 5 },
      { name: 'analysis_results_v2', priority: 5 },
      { name: 'data_pools', priority: 6 },
      { name: 'ai_logs', priority: 7 },
      { name: 'market_prices', priority: 7 },
      { name: 'market_price_details', priority: 8 },
      { name: 'tenders', priority: 7 },
      { name: 'cache_entries', priority: 9 }
    ];

    // Priority'ye göre sırala
    tables.sort((a, b) => a.priority - b.priority);

    let totalMigrated = 0;
    const migrationReport = [];

    for (const { name: table } of tables) {
      try {
        // SQLite'tan kontrol et
        const countStmt = sqlite.prepare(`SELECT COUNT(*) as count FROM ${table}`);
        const { count } = countStmt.get() || { count: 0 };

        if (count === 0) {
          console.log(`⚪ ${table}: 0 kayıt (boş tablo)\n`);
          migrationReport.push({ table, source: 0, target: 0, status: 'empty' });
          continue;
        }

        console.log(`📊 ${table}: ${count} kayıt migre ediliyor...`);

        // SQLite'tan veri oku (batch olarak)
        const BATCH_SIZE = 1000;
        let offset = 0;
        let migratedRows = 0;

        while (offset < count) {
          const rows = sqlite.prepare(
            `SELECT * FROM ${table} LIMIT ${BATCH_SIZE} OFFSET ${offset}`
          ).all();

          if (rows.length === 0) break;

          // PostgreSQL'e batch insert
          for (const row of rows) {
            const columns = Object.keys(row);
            const values = Object.values(row);
            const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

            const query = `
              INSERT INTO ${table} (${columns.join(', ')})
              VALUES (${placeholders})
              ON CONFLICT DO NOTHING
            `;

            try {
              await pgClient.query(query, values);
              migratedRows++;
            } catch (error) {
              console.error(`     ⚠️ Row insert error: ${error.message}`);
            }
          }

          offset += BATCH_SIZE;
          process.stdout.write(`\r   Progress: ${migratedRows}/${count} (${Math.round(migratedRows/count*100)}%)`);
        }

        console.log(`\n   ✅ ${migratedRows} kayıt migre edildi\n`);
        totalMigrated += migratedRows;
        migrationReport.push({ table, source: count, target: migratedRows, status: 'success' });

      } catch (error) {
        console.error(`   ❌ ${table} migration hatası: ${error.message}\n`);
        migrationReport.push({ table, source: 0, target: 0, status: 'error', error: error.message });
      }
    }

    // Verification
    console.log('\n📋 VERIFICATION REPORT');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TABLE'.padEnd(30) + 'SQLite'.padEnd(12) + 'PostgreSQL'.padEnd(12) + 'Status');
    console.log('───────────────────────────────────────────────────────────');

    for (const report of migrationReport) {
      const status = report.status === 'success' ? '✅' :
                     report.status === 'empty' ? '⚪' : '❌';
      console.log(
        report.table.padEnd(30) +
        report.source.toString().padEnd(12) +
        report.target.toString().padEnd(12) +
        status
      );
    }
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\nToplam migre edilen: ${totalMigrated} kayıt\n`);

    // Save report
    const reportPath = `migration-report-${Date.now()}.json`;
    require('fs').writeFileSync(reportPath, JSON.stringify(migrationReport, null, 2));
    console.log(`📄 Detaylı rapor kaydedildi: ${reportPath}\n`);

    await pgClient.end();
    sqlite.close();

    console.log('✅ Data migration COMPLETE!');
  } catch (error) {
    console.error('❌ Migration fatal error:', error);
    process.exit(1);
  }
}

migrateData();
EOF

# Migration'ı çalıştır
node migrate-data-to-postgres.js
```

**Beklenen Çıktı:**
```
✅ Her iki database bağlantısı kuruldu

📊 users: 5 kayıt migre ediliyor...
   Progress: 5/5 (100%)
   ✅ 5 kayıt migre edildi

📊 organizations: 3 kayıt migre ediliyor...
   Progress: 3/3 (100%)
   ✅ 3 kayıt migre edildi

...

📋 VERIFICATION REPORT
═══════════════════════════════════════════════════════════
TABLE                         SQLite      PostgreSQL  Status
───────────────────────────────────────────────────────────
users                         5           5           ✅
organizations                 3           3           ✅
memberships                   8           8           ✅
...
═══════════════════════════════════════════════════════════

Toplam migre edilen: 142 kayıt

✅ Data migration COMPLETE!
```

---

### ⚠️ AŞAMA 5: KOD REFACTORİNG (Bu aşamayı ATLAYAMAYIZ!)

**Sorun:** 41 dosya hala `sqlite-client` kullanıyor, db-adapter'a geçmeliyiz!

```bash
cd /var/www/procheff

# db-adapter.ts'yi kontrol et
cat src/lib/db/db-adapter.ts | head -20
# Dosya zaten var ve hazır!
```

**2 Seçenek:**

#### Seçenek A: Manuel Refactoring (Güvenli, 4-6 saat)
Her dosyayı tek tek kontrol edip değiştir:

```typescript
// ❌ BEFORE
import { getDB } from '@/lib/db/sqlite-client';
const db = getDB();
const users = db.prepare('SELECT * FROM users').all();

// ✅ AFTER
import { getDBAdapter } from '@/lib/db/db-adapter';
const db = await getDBAdapter();
const users = await db.query('SELECT * FROM users');
```

#### Seçenek B: sqlite-client.ts Override (Hızlı, riskli, 30 dakika)

```bash
# sqlite-client.ts'yi db-adapter'ı kullanacak şekilde değiştir
cat > src/lib/db/sqlite-client-override.ts << 'EOF'
/**
 * ⚠️ TEMPORARY OVERRIDE
 * Bu dosya db-adapter'ı kullanıyor
 * Gradual migration için geçici çözüm
 */

import { getDBAdapter, getDBMode } from './db-adapter';
import type Database from 'better-sqlite3';

// Sync wrapper for backward compatibility
export function getDB(): any {
  const mode = getDBMode();

  if (mode === 'sqlite') {
    // Native SQLite
    const sqlite = require('./sqlite-client-original');
    return sqlite.getDB();
  }

  // PostgreSQL or Dual mode
  // Return a Proxy that converts sync calls to async
  console.warn('⚠️ getDB() called in async mode! Use getDBAdapter() instead.');

  return new Proxy({}, {
    get(target, prop) {
      throw new Error(`getDB().${String(prop)} is not supported in ${mode} mode. Use getDBAdapter() instead.`);
    }
  });
}

export { getDBAdapter } from './db-adapter';
EOF

# Original'i rename et
mv src/lib/db/sqlite-client.ts src/lib/db/sqlite-client-original.ts
mv src/lib/db/sqlite-client-override.ts src/lib/db/sqlite-client.ts
```

**ÖNERİM:** Seçenek A'yı tercih et, daha güvenli!

---

### 🚦 AŞAMA 6: DUAL MODE TEST (15 dakika)

```bash
cd /var/www/procheff

# .env'de DB_MODE'u değiştir
sed -i 's/DB_MODE="sqlite"/DB_MODE="dual"/g' .env

# Build
npm run build

# PM2 restart
pm2 restart procheff

# Logs izle
pm2 logs procheff --lines 50
```

**Beklenecekler:**
```
🗄️  Database mode: DUAL
✅ PostgreSQL connection established
✅ SQLite connection established
✅ Dual mode initialized
```

**Test Endpoint'leri:**
```bash
# Health check
curl http://localhost:3000/api/health

# Database stats
curl http://localhost:3000/api/database/stats

# Users (test query)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/admin/users
```

---

### ✅ AŞAMA 7: FULL POSTGRESQL (Final)

Dual mode stabil çalışıyorsa:

```bash
# PostgreSQL-only mode
sed -i 's/DB_MODE="dual"/DB_MODE="postgres"/g' .env

# Rebuild & restart
npm run build
pm2 restart procheff
pm2 logs procheff
```

---

## 🆘 ROLLBACK PROSEDÜRÜ

### Acil Rollback (1 dakika)

```bash
cd /var/www/procheff

# DB_MODE'u sqlite'a çevir
sed -i 's/DB_MODE=".*"/DB_MODE="sqlite"/g' .env

# Restart
pm2 restart procheff

# Verify
curl http://localhost:3000/api/health
```

### Full Rollback (5 dakika)

```bash
# Backup'tan restore
LATEST_BACKUP=$(ls -t backups/postgres-migration-*/procheff.db | head -1)
cp "$LATEST_BACKUP" procheff.db

# Code restore
cp backups/postgres-migration-*/.env .env
cp -r backups/postgres-migration-*/db-backup/* src/lib/db/

# Restart
npm run build
pm2 restart procheff
```

---

## 📊 TAHMİNİ SÜRELER

| Aşama | Süre | Risk | Downtime |
|-------|------|------|----------|
| 0. Yedekleme | 15 dk | 0% | Hayır |
| 1. Connection Test | 10 dk | 0% | Hayır |
| 2. Schema Convert | 20 dk | 0% | Hayır |
| 3. Schema Create | 15 dk | 10% | Hayır |
| 4. Data Migration | 30 dk | 20% | Hayır |
| 5. Kod Refactoring | 4-6 saat | 40% | Hayır |
| 6. Dual Mode Test | 15 dk | 30% | 2 dk |
| 7. Full PostgreSQL | 10 dk | 20% | 1 dk |
| **TOPLAM** | **6-8 saat** | - | **~3 dk** |

---

## ✅ BAŞARI KRİTERLERİ

- [ ] PostgreSQL bağlantısı çalışıyor
- [ ] Tüm tablolar oluşturuldu
- [ ] Tüm veriler migre oldu (verification report ✅)
- [ ] Dual mode çalışıyor
- [ ] API endpoint'leri respond ediyor
- [ ] Login çalışıyor
- [ ] Admin panel açılıyor
- [ ] PostgreSQL-only mode stabil

---

## 🎯 SONRAKİ ADIMLAR

1. **ŞİMDİ:** Bu planı oku ve anla
2. **Aşama 0-4:** Veri hazırlığı (downtime yok)
3. **Aşama 5:** Kod refactoring (lokal test)
4. **Aşama 6-7:** Production deployment (gece 2-4)

Hazır mısın? 🚀
