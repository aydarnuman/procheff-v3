# PostgreSQL Migration - Quick Start Guide

## 🎯 Hızlı Özet

SQLite'tan PostgreSQL'e güvenli ve test edilebilir geçiş.

---

## ⚡ 5 Dakikada Migration (Test Ortamı)

### 1. Connection String'i Ayarla

```bash
export DATABASE_URL="postgres://doadmin:***PASSWORD***@db-postgresql-fra1-22277-do-user-28803712-0.f.db.ondigitalocean.com:25060/defaultdb?sslmode=require"
```

### 2. PostgreSQL Bağlantısını Test Et

```bash
cd scripts/postgres-migration
node 5-test-connection.js
```

**Beklenen output:**
```
✅ Connected successfully
✅ Query successful
⚠️  No tables found (database is empty)
✅ All tests passed!
```

### 3. Tüm Migration'ı Çalıştır

```bash
./run-all.sh
```

Bu script otomatik olarak:
1. ✅ SQLite'tan data export eder
2. ✅ PostgreSQL'de schema oluşturur
3. ✅ Data'yı import eder
4. ✅ Data'yı validate eder

**Süre:** ~2-5 dakika (data miktarına göre)

### 4. Validation Raporunu Kontrol Et

```bash
cat validation-report-*.json
```

Tüm tablolar eşleşmeli:
```json
{
  "summary": {
    "matched": 25,
    "mismatched": 0,
    "pgMissing": 0
  }
}
```

---

## 🚀 Production Migration

### Hazırlık (Local)

```bash
# 1. Repository'yi güncelle
cd /Users/numanaydar/procheff-v3
git pull

# 2. Migration script'lerini test et
cd scripts/postgres-migration
export DATABASE_URL="postgres://..."
./run-all.sh

# 3. Başarılı ise production'a hazır
```

### Production'da (Server)

```bash
# 1. SSH ile server'a bağlan
ssh root@your-server

# 2. Proje klasörüne git
cd /var/www/procheff

# 3. Backup al (ÖNEMLİ!)
sqlite3 procheff.db ".backup procheff_backup_$(date +%Y%m%d_%H%M%S).db"

# 4. Environment variable'ı ekle
nano .env.local
# DATABASE_URL="postgres://..." ekle
# Kaydet ve çık (Ctrl+X, Y, Enter)

# 5. Migration'ı çalıştır
cd scripts/postgres-migration
export DATABASE_URL="postgres://..."
./run-all.sh

# 6. Validation kontrolü
cat validation-report-*.json

# 7. Eğer her şey OK ise, app'i PostgreSQL ile başlat
cd /var/www/procheff
export USE_POSTGRES=true
pm2 restart procheff

# 8. Logs'ları izle
pm2 logs procheff --lines 100
```

---

## 🔍 Manuel Migration (Adım Adım)

Daha fazla kontrol istiyorsanız:

### Adım 1: Data Export

```bash
cd scripts/postgres-migration
node 1-export-sqlite-data.js
```

**Output:** `data-export/` klasöründe JSON dosyaları

**Kontrol:**
```bash
ls -lh data-export/
cat data-export/users.json | jq '. | length'  # User sayısı
```

### Adım 2: Schema Migration

```bash
export DATABASE_URL="postgres://..."
node 2-migrate-schema.js
```

**Kontrol:**
```bash
node 5-test-connection.js  # Tabloların oluştuğunu göreceksin
```

### Adım 3: Data Import

```bash
node 3-import-data.js
```

**Kontrol:**
```bash
# PostgreSQL'de user sayısını kontrol et
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

### Adım 4: Validation

```bash
node 4-validate-data.js
```

**Output:** `validation-report-*.json`

---

## ❌ Rollback (Geri Alma)

### Senaryo 1: Migration Hatası (Henüz production'da değil)

```bash
# PostgreSQL'i temizle
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Tekrar dene
./run-all.sh
```

### Senaryo 2: Production'da Problem

```bash
# 1. Hemen SQLite'a geri dön
nano .env.local
# USE_POSTGRES=false yap

# 2. App'i restart et
pm2 restart procheff

# 3. Backup'tan restore et (gerekirse)
cp procheff_backup_XXXXXXXX.db procheff.db
pm2 restart procheff
```

### Senaryo 3: Data Kaybı

```bash
# Backup'tan restore
cp procheff_backup_XXXXXXXX.db procheff.db

# Migration'ı tekrar çalıştır
cd scripts/postgres-migration
./run-all.sh
```

---

## 📊 Monitoring (İlk 24 Saat)

### 1. Hata Kontrolü

```bash
pm2 logs procheff --err --lines 100 | grep -i "database\|postgres\|connection"
```

### 2. Response Time

```bash
pm2 logs procheff | grep "ms" | tail -20
```

### 3. Database Connections

```bash
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE datname='defaultdb';"
```

### 4. Slow Queries (PostgreSQL'de pg_stat_statements aktifse)

```bash
psql $DATABASE_URL -c "
  SELECT query, calls, mean_time 
  FROM pg_stat_statements 
  WHERE mean_time > 100 
  ORDER BY mean_time DESC 
  LIMIT 10;
"
```

---

## ✅ Başarı Kriterleri

Migration başarılı sayılır eğer:

- ✅ Tüm tablolar PostgreSQL'de mevcut
- ✅ Row count'lar eşleşiyor
- ✅ API'ler çalışıyor (error yok)
- ✅ Response time'lar normal (SQLite ile benzer)
- ✅ 24 saat boyunca stabil

---

## 🐛 Sık Karşılaşılan Hatalar

### "DATABASE_URL not set"

```bash
export DATABASE_URL="postgres://..."
# veya
source ../../.env.local
```

### "Connection refused"

- DigitalOcean firewall kontrolü
- IP whitelist kontrolü
- VPN/Proxy kontrolü

### "relation does not exist"

```bash
# Schema migration'ı tekrar çalıştır
node 2-migrate-schema.js
```

### "duplicate key value"

- Normal (script ON CONFLICT kullanıyor)
- Birden fazla çalıştırılabilir

---

## 📞 Destek Checklist

Migration sırasında problem yaşarsan:

1. ✅ Rollback yaptın mı? (Yukarıdaki adımlar)
2. ✅ Logs'ları kontrol ettin mi? (`pm2 logs`)
3. ✅ Validation raporu ne diyor? (`validation-report-*.json`)
4. ✅ PostgreSQL'e bağlanabiliyor musun? (`node 5-test-connection.js`)
5. ✅ Backup'ın var mı? (`ls -lh procheff_backup_*.db`)

---

## 🎓 En İyi Pratikler

### DO ✅

- Her zaman backup al
- Önce test ortamında dene
- Validation raporunu kontrol et
- İlk 24 saat yakından izle
- Düşük trafik saatinde geç

### DON'T ❌

- Backup almadan migration yapma
- Validation'ı skip etme
- Production'da direkt test etme
- SQLite backup'ı hemen silme
- Rollback planı olmadan başlama

---

## 📚 Ek Kaynaklar

- **Detaylı Plan:** `POSTGRESQL-MIGRATION-PLAN.md`
- **Script Dökümantasyonu:** `scripts/postgres-migration/README.md`
- **PostgreSQL Client:** `src/lib/db/postgres-client.ts`
- **Migration Files:** `src/lib/db/migrations/*.sql`

---

**Hazırlayan:** AI Assistant  
**Tarih:** 2025-11-14  
**Versiyon:** 1.0  

**Notlar:**
- Bu migration production-ready'dir
- Tüm adımlar geri dönülebilir
- Minimum downtime hedeflenmiştir
- Data kaybı riski minimumdur (backup + validation)

