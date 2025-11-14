# 📊 ProCheff v3 - SQLite → PostgreSQL Geçiş Planı

## 🔍 MEVCUT DURUM ANALİZİ

### Database Kullanımı
```
✅ SQLite (procheff.db) - 380 KB
✅ better-sqlite3 paketi kurulu
✅ 88 dosyada 320+ getDB() kullanımı
✅ Migrations sistemi mevcut (16 migration dosyası)
✅ WAL mode aktif
```

### Mimari Yapı
```typescript
// Mevcut: src/lib/db/sqlite-client.ts
export function getDB(): Database {
  // Synchronous SQLite connection
  return db;
}

// Hazır: src/lib/db/postgres-client.ts (MEVCUT!)
export async function getPool(): Promise<Pool> {
  // Async PostgreSQL pool
  return pool;
}
```

### Kritik Noktalar
- ⚠️ **88 DOSYADA** `getDB()` import edilmiş
- ⚠️ **320+ KULLANIM** mevcut
- ⚠️ **SYNC → ASYNC** dönüşüm gerekli
- ✅ **postgres-client.ts** ZATEN HAZIR!
- ✅ **pg** paketi ZATEN KURULU!

---

## 🎯 STRATEJİ: HİBRİT GEÇİŞ (Sıfır Downtime)

### Yaklaşım
1. **PostgreSQL hazırlığı** (production'ı etkilemez)
2. **Veri migration** (offline, kontrollü)
3. **Dual-mode çalışma** (hem SQLite hem PostgreSQL)
4. **Rollback imkanı** (her adımda)
5. **Kademeli geçiş** (feature by feature)

---

## 📋 ADIM ADIM PLAN

### PHASE 1: Hazırlık (15 dk) ⏱️

#### 1.1. PostgreSQL Bağlantısını Test Et

```bash
# Server'da çalıştır
cd /var/www/procheff

# Test script oluştur
cat > test-postgres.js << 'EOF'
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://doadmin:***PASSWORD***@db-postgresql-fra1-22277-do-user-28803712-0.f.db.ondigitalocean.com:25060/defaultdb?sslmode=require'
});

async function test() {
  try {
    await client.connect();
    console.log('✅ PostgreSQL bağlantısı başarılı');
    
    const result = await client.query('SELECT NOW()');
    console.log('✅ Zaman:', result.rows[0].now);
    
    await client.end();
    console.log('✅ Test tamamlandı');
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

test();
EOF

# Test et
node test-postgres.js
```

**Beklenen Çıktı:**
```
✅ PostgreSQL bağlantısı başarılı
✅ Zaman: 2025-11-14T17:30:00.000Z
✅ Test tamamlandı
```

**Sorun varsa:**
- Firewall kontrol et
- SSL bağlantısını kontrol et
- Connection string'i doğrula

---

#### 1.2. .env Dosyasını Güncelle

```bash
cd /var/www/procheff
nano .env
```

**Ekle:**
```bash
# PostgreSQL Database (DigitalOcean)
DATABASE_URL=postgresql://avnadmin:***PASSWORD***@procheff-ai-procheff-ai.k.aivencloud.com:11738/procheff_ai?sslmode=require

# Migration mode (dual/postgres/sqlite)
DB_MODE="dual"  # İlk başta dual mode

# SQLite backup location (fallback)
SQLITE_DB_PATH="/var/www/procheff/procheff.db"
```

**Kaydet:** `Ctrl+X`, `Y`, `Enter`

---

#### 1.3. SQLite Verisini Backup Al

```bash
cd /var/www/procheff

# Timestamp ile backup
BACKUP_FILE="procheff-backup-$(date +%Y%m%d-%H%M%S).db"
cp procheff.db "backups/$BACKUP_FILE"

# Verify backup
ls -lh "backups/$BACKUP_FILE"

# Export SQL dump (PostgreSQL'e import için)
sqlite3 procheff.db .dump > procheff-dump.sql

echo "✅ Backup tamamlandı: $BACKUP_FILE"
```

**Kontrol:**
```bash
# Dosya boyutu kontrol
du -h procheff.db
du -h backups/$BACKUP_FILE
du -h procheff-dump.sql
```

---

### PHASE 2: Veri Migration (30 dk) ⏱️

#### 2.1. SQLite Schema'yı PostgreSQL'e Uyarla

```bash
cd /var/www/procheff

# Schema conversion script
cat > convert-schema.sh << 'EOF'
#!/bin/bash
# SQLite → PostgreSQL schema converter

INPUT="procheff-dump.sql"
OUTPUT="postgres-schema.sql"

echo "📝 Converting SQLite schema to PostgreSQL..."

# SQLite → PostgreSQL syntax dönüşümleri
sed -e 's/INTEGER PRIMARY KEY AUTOINCREMENT/SERIAL PRIMARY KEY/g' \
    -e 's/DATETIME/TIMESTAMP/g' \
    -e 's/TEXT DEFAULT CURRENT_TIMESTAMP/TEXT DEFAULT NOW()/g' \
    -e 's/PRAGMA[^;]*;//g' \
    -e '/BEGIN TRANSACTION/d' \
    -e '/COMMIT/d' \
    -e 's/AUTOINCREMENT//' \
    "$INPUT" > "$OUTPUT"

echo "✅ Schema converted: $OUTPUT"
EOF

chmod +x convert-schema.sh
./convert-schema.sh
```

---

#### 2.2. PostgreSQL Tabloları Oluştur

```bash
cd /var/www/procheff

# PostgreSQL'e bağlan ve tabloları oluştur
cat > create-postgres-tables.js << 'EOF'
const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function createTables() {
  try {
    await client.connect();
    console.log('✅ PostgreSQL bağlantısı kuruldu');

    // Schema oku
    const schema = fs.readFileSync('postgres-schema.sql', 'utf8');
    
    // Sadece CREATE TABLE ve CREATE INDEX komutlarını al
    const statements = schema
      .split(';')
      .filter(stmt => 
        stmt.trim().startsWith('CREATE TABLE') || 
        stmt.trim().startsWith('CREATE INDEX')
      )
      .map(stmt => stmt.trim() + ';');

    console.log(`📋 ${statements.length} statement bulundu`);

    // Her statement'ı çalıştır
    for (const stmt of statements) {
      try {
        await client.query(stmt);
        console.log('✅', stmt.substring(0, 50) + '...');
      } catch (error) {
        console.error('❌', error.message);
      }
    }

    // Tabloları listele
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('\n✅ Oluşturulan tablolar:');
    tables.rows.forEach(row => console.log('  -', row.table_name));

    await client.end();
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

createTables();
EOF

# Çalıştır
node create-postgres-tables.js
```

---

#### 2.3. Verileri Migre Et

```bash
cd /var/www/procheff

# Veri migration script
cat > migrate-data.js << 'EOF'
const { Client } = require('pg');
const Database = require('better-sqlite3');

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL
});

const sqlite = new Database('procheff.db');

async function migrateData() {
  try {
    await pgClient.connect();
    console.log('✅ Her iki database bağlantısı kuruldu\n');

    // Tablolar ve row sayıları
    const tables = [
      'users',
      'organizations',
      'memberships',
      'notifications',
      'orchestrations',
      'analysis_history',
      'analysis_results_v2',
      'data_pools',
      'logs',
      'ai_logs',
      'market_prices',
      'market_price_details',
      'tenders',
      'cache_entries'
    ];

    for (const table of tables) {
      try {
        // SQLite'tan veri oku
        const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
        
        if (rows.length === 0) {
          console.log(`⚪ ${table}: 0 kayıt (boş)`);
          continue;
        }

        console.log(`📊 ${table}: ${rows.length} kayıt migre ediliyor...`);

        // PostgreSQL'e insert
        for (const row of rows) {
          const columns = Object.keys(row);
          const values = Object.values(row);
          const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

          const query = `
            INSERT INTO ${table} (${columns.join(', ')})
            VALUES (${placeholders})
            ON CONFLICT DO NOTHING
          `;

          await pgClient.query(query, values);
        }

        console.log(`✅ ${table}: ${rows.length} kayıt migre edildi\n`);
      } catch (error) {
        console.error(`❌ ${table} hatası:`, error.message);
      }
    }

    // Verify
    console.log('\n📋 PostgreSQL Kayıt Sayıları:');
    for (const table of tables) {
      try {
        const result = await pgClient.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`  ${table}: ${result.rows[0].count}`);
      } catch (error) {
        // Tablo yoksa skip
      }
    }

    await pgClient.end();
    sqlite.close();
    
    console.log('\n✅ Migration tamamlandı!');
  } catch (error) {
    console.error('❌ Migration hatası:', error);
    process.exit(1);
  }
}

migrateData();
EOF

# Çalıştır
node migrate-data.js
```

**Beklenen Çıktı:**
```
✅ Her iki database bağlantısı kuruldu

📊 users: 5 kayıt migre ediliyor...
✅ users: 5 kayıt migre edildi

📊 organizations: 3 kayıt migre ediliyor...
✅ organizations: 3 kayıt migre edildi
...
✅ Migration tamamlandı!
```

---

### PHASE 3: Database Adapter Oluştur (10 dk) ⏱️

#### 3.1. Dual-Mode Database Client

Bu dosya **ZATEN MEVCUT** ancak güncelleyeceğiz:

```bash
cd /var/www/procheff
```

Local'de bu dosyayı oluştur ve sunucuya aktar:

**File: `src/lib/db/db-adapter.ts`** (YENİ DOSYA)

```typescript
/**
 * Database Adapter - Dual Mode Support
 * Hem SQLite hem PostgreSQL ile çalışabilir
 * Environment variable ile kontrol edilir
 */

import { getDB as getSQLiteDB } from './sqlite-client';
import { getPool, query as pgQuery, getClient } from './postgres-client';

const DB_MODE = process.env.DB_MODE || 'sqlite'; // 'sqlite' | 'postgres' | 'dual'

/**
 * Universal Database Interface
 */
export interface UniversalDB {
  query: <T = any>(sql: string, params?: any[]) => Promise<T[]>;
  queryOne: <T = any>(sql: string, params?: any[]) => Promise<T | undefined>;
  execute: (sql: string, params?: any[]) => Promise<{ changes: number }>;
  transaction: <T>(callback: () => Promise<T>) => Promise<T>;
}

/**
 * Get database adapter based on mode
 */
export async function getDBAdapter(): Promise<UniversalDB> {
  if (DB_MODE === 'postgres' || DB_MODE === 'dual') {
    return getPostgresAdapter();
  }
  return getSQLiteAdapter();
}

/**
 * SQLite Adapter (Sync → Async wrapper)
 */
function getSQLiteAdapter(): UniversalDB {
  const db = getSQLiteDB();
  
  return {
    async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
      return db.prepare(sql).all(...params) as T[];
    },
    
    async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
      return db.prepare(sql).get(...params) as T | undefined;
    },
    
    async execute(sql: string, params: any[] = []): Promise<{ changes: number }> {
      const info = db.prepare(sql).run(...params);
      return { changes: info.changes };
    },
    
    async transaction<T>(callback: () => Promise<T>): Promise<T> {
      return db.transaction(callback)();
    }
  };
}

/**
 * PostgreSQL Adapter
 */
function getPostgresAdapter(): UniversalDB {
  return {
    async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
      const result = await pgQuery<T>(sql, params);
      return result.rows;
    },
    
    async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
      const result = await pgQuery<T>(sql, params);
      return result.rows[0];
    },
    
    async execute(sql: string, params: any[] = []): Promise<{ changes: number }> {
      const result = await pgQuery(sql, params);
      return { changes: result.rowCount || 0 };
    },
    
    async transaction<T>(callback: () => Promise<T>): Promise<T> {
      const client = await getClient();
      try {
        await client.query('BEGIN');
        const result = await callback();
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  };
}

/**
 * Legacy getDB() compatibility
 * ⚠️ Bu fonksiyon async olmalı artık!
 */
export async function getDB() {
  return getDBAdapter();
}

// Export for backward compatibility
export { getSQLiteDB, getPool };
```

---

### PHASE 4: Test ve Rollback Hazırlığı (5 dk) ⏱️

#### 4.1. Test Script

```bash
cd /var/www/procheff

cat > test-dual-mode.js << 'EOF'
const { getDBAdapter } = require('./src/lib/db/db-adapter.ts');

async function test() {
  try {
    const db = await getDBAdapter();
    
    // Test query
    const users = await db.query('SELECT * FROM users LIMIT 5');
    console.log('✅ Users:', users.length);
    
    const user = await db.queryOne('SELECT * FROM users LIMIT 1');
    console.log('✅ First user:', user?.email);
    
    console.log('\n✅ Dual mode test başarılı!');
  } catch (error) {
    console.error('❌ Test hatası:', error);
    process.exit(1);
  }
}

test();
EOF

# Test et
DB_MODE=sqlite node test-dual-mode.js
DB_MODE=postgres node test-dual-mode.js
```

---

#### 4.2. Rollback Script Hazırla

```bash
cd /var/www/procheff

cat > rollback.sh << 'EOF'
#!/bin/bash
# Rollback to SQLite

echo "🔄 Rolling back to SQLite..."

# .env'den PostgreSQL'i kaldır
sed -i 's/DB_MODE="postgres"/DB_MODE="sqlite"/g' .env

# PM2'yi restart et
pm2 restart procheff

echo "✅ Rolled back to SQLite"
pm2 logs procheff --lines 20
EOF

chmod +x rollback.sh
```

---

### PHASE 5: Production Geçişi (5 dk) ⏱️

#### 5.1. Kademeli Geçiş

```bash
cd /var/www/procheff

# Dual mode'a geç (hem SQLite hem PostgreSQL)
nano .env
# DB_MODE="dual" → Zaten ayarlı

# Build
npm run build

# Restart
pm2 restart procheff
pm2 logs procheff
```

#### 5.2. PostgreSQL'e Tam Geçiş

```bash
# Her şey çalışıyorsa:
nano .env
# DB_MODE="postgres"  # Sadece PostgreSQL

# Rebuild
npm run build
pm2 restart procheff

# Monitor
pm2 logs procheff --lines 50
```

---

## 🔍 KONTROL LİSTESİ

### Phase 1 Kontrol
- [ ] PostgreSQL bağlantısı test edildi
- [ ] `.env` dosyası güncellendi
- [ ] SQLite backup alındı (3 kopya)
- [ ] SQL dump oluşturuldu

### Phase 2 Kontrol
- [ ] Schema dönüştürüldü
- [ ] PostgreSQL tabloları oluşturuldu
- [ ] Veriler migre edildi
- [ ] Kayıt sayıları eşleşiyor

### Phase 3 Kontrol
- [ ] `db-adapter.ts` oluşturuldu
- [ ] Test script çalıştı
- [ ] Hem SQLite hem PostgreSQL test edildi

### Phase 4 Kontrol
- [ ] Rollback script hazır
- [ ] Backup doğrulandı

### Phase 5 Kontrol
- [ ] Dual mode çalışıyor
- [ ] Production stabil
- [ ] PostgreSQL'e tam geçiş yapıldı

---

## ⚠️ KRİTİK UYARILAR

### 1. Async/Await Dönüşümü
```typescript
// ❌ ESKİ (Sync)
const db = getDB();
const users = db.prepare('SELECT * FROM users').all();

// ✅ YENİ (Async)
const db = await getDBAdapter();
const users = await db.query('SELECT * FROM users');
```

### 2. Transaction Farkı
```typescript
// ❌ ESKİ (SQLite)
const insertMany = db.transaction((items) => {
  items.forEach(item => stmt.run(item));
});

// ✅ YENİ (Universal)
await db.transaction(async () => {
  for (const item of items) {
    await db.execute('INSERT ...', [item]);
  }
});
```

### 3. Auto-increment ID
```typescript
// ❌ SQLite
INTEGER PRIMARY KEY AUTOINCREMENT

// ✅ PostgreSQL
SERIAL PRIMARY KEY
```

---

## 🚨 SORUN GİDERME

### Problem: Migration çok yavaş
```bash
# Batch insert kullan
# migrate-data.js'de batch size ekle
const BATCH_SIZE = 1000;
```

### Problem: Connection timeout
```bash
# .env'de timeout artır
DATABASE_CONNECTION_TIMEOUT=30000
```

### Problem: SSL hatası
```bash
# Connection string'e ?sslmode=require ekle
# Zaten ekli ama verify et
```

### Problem: Application başlamıyor
```bash
# Rollback yap
./rollback.sh

# Logs kontrol
pm2 logs procheff --err
```

---

## 📊 BAŞARI KRİTERLERİ

✅ **Fonksiyonel**
- [ ] Uygulama başlıyor
- [ ] Login çalışıyor
- [ ] Admin panel açılıyor
- [ ] Analysis çalışıyor
- [ ] Market data erişilebilir

✅ **Performans**
- [ ] Query süreleri < 100ms
- [ ] Page load < 2s
- [ ] No memory leaks

✅ **Veri Bütünlüğü**
- [ ] Tüm users migre oldu
- [ ] Tüm organizations migre oldu
- [ ] Analysis history korundu
- [ ] Market data eksiksiz

---

## 🎯 TAHMİNİ SÜRELER

| Phase | Süre | Downtime |
|-------|------|----------|
| Phase 1: Hazırlık | 15 dk | Hayır |
| Phase 2: Migration | 30 dk | Hayır |
| Phase 3: Adapter | 10 dk | Hayır |
| Phase 4: Test | 5 dk | Hayır |
| Phase 5: Production | 5 dk | ~2 dk |
| **TOPLAM** | **65 dk** | **~2 dk** |

---

## 📝 SONRAKİ ADIMLAR

1. **Şimdi:** Bu planı oku ve anla
2. **Test:** Local'de test et (opsiyonel)
3. **Backup:** 3 kopya backup al
4. **Execute:** Phase 1'den başla
5. **Monitor:** Her adımı kontrol et
6. **Verify:** Phase 5'te production'ı test et

---

## 🆘 ACİL DURUM

Bir şeyler ters giderse:

```bash
# 1. HEMEN ROLLBACK
cd /var/www/procheff
./rollback.sh

# 2. SQLite'ı restore et
cp backups/procheff-backup-XXXXXX.db procheff.db

# 3. Restart
pm2 restart procheff

# 4. Verify
curl http://localhost:3000/api/health
```

---

## ✅ HAZIR MISIN?

Eğer evet diyorsan, şu komutla başla:

```bash
ssh root@104.248.254.171
cd /var/www/procheff
# Phase 1 - Adım 1.1'den başla!
```
