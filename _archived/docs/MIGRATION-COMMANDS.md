# PostgreSQL Migration - Komut Referansı

## 🎯 Hızlı Komutlar

### Environment Setup
```bash
# Connection string'i ayarla
export DATABASE_URL="postgres://doadmin:***PASSWORD***@db-postgresql-fra1-22277-do-user-28803712-0.f.db.ondigitalocean.com:25060/defaultdb?sslmode=require"

# veya .env.local'dan yükle
source .env.local
```

---

## 📦 NPM Scripts (Kolay Yöntem)

```bash
# Connection test
npm run migrate:test

# SQLite export
npm run migrate:export

# Schema migration
npm run migrate:schema

# Data import
npm run migrate:import

# Validation
npm run migrate:validate

# Tüm migration (otomatik)
npm run migrate:all
```

---

## 🔧 Manuel Komutlar (Detaylı Kontrol)

### 1. Connection Test
```bash
cd scripts/postgres-migration
node 5-test-connection.js
```

**Beklenen çıktı:**
```
✅ Connected successfully
✅ Query successful
✅ All tests passed!
```

### 2. SQLite Export
```bash
cd scripts/postgres-migration
node 1-export-sqlite-data.js
```

**Beklenen çıktı:**
```
✅ Tables exported: 27
📝 Total rows: XXXXX
📁 Data exported to: data-export/
```

### 3. Schema Migration
```bash
cd scripts/postgres-migration
export DATABASE_URL="postgres://..."
node 2-migrate-schema.js
```

**Beklenen çıktı:**
```
✅ Successful: XX migrations
✅ Found XX tables
```

### 4. Data Import
```bash
cd scripts/postgres-migration
export DATABASE_URL="postgres://..."
node 3-import-data.js
```

**Beklenen çıktı:**
```
✅ Successful: XX tables
📝 Total rows: XXXXX
```

### 5. Data Validation
```bash
cd scripts/postgres-migration
export DATABASE_URL="postgres://..."
node 4-validate-data.js
```

**Beklenen çıktı:**
```
✅ Matched: XX tables
❌ Mismatched: 0 tables
✅ Validation completed successfully!
```

---

## 🗄️ Database Komutları

### SQLite Commands

```bash
# Backup oluştur
sqlite3 procheff.db ".backup procheff_backup_$(date +%Y%m%d_%H%M%S).db"

# Tablo listesi
sqlite3 procheff.db ".tables"

# Row count
sqlite3 procheff.db "SELECT COUNT(*) FROM users;"

# Schema export
sqlite3 procheff.db ".schema users"

# Database boyutu
ls -lh procheff.db

# Vacuum (temizlik)
sqlite3 procheff.db "VACUUM;"
```

### PostgreSQL Commands

```bash
# Connection test
psql $DATABASE_URL -c "SELECT version();"

# Tablo listesi
psql $DATABASE_URL -c "\dt"

# Row count
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"

# Schema göster
psql $DATABASE_URL -c "\d users"

# Database boyutu
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size('defaultdb'));"

# Active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Slow queries (pg_stat_statements gerekli)
psql $DATABASE_URL -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

---

## 🔍 Validation & Monitoring

### Data Validation
```bash
# Validation report'u görüntüle
cat scripts/postgres-migration/validation-report-*.json | jq '.'

# Sadece summary
cat scripts/postgres-migration/validation-report-*.json | jq '.summary'

# Mismatched tablolar
cat scripts/postgres-migration/validation-report-*.json | jq '.errors'
```

### Application Monitoring
```bash
# PM2 logs
pm2 logs procheff --lines 100

# Sadece hatalar
pm2 logs procheff --err --lines 50

# Real-time logs
pm2 logs procheff --lines 0

# Database errors
pm2 logs procheff | grep -i "database\|postgres\|connection"

# Response times
pm2 logs procheff | grep "ms" | tail -20
```

### Health Checks
```bash
# Application health
curl http://localhost:3000/api/health

# Database health
curl http://localhost:3000/api/database/stats

# Pretty print
curl http://localhost:3000/api/health | jq '.'
```

---

## 🔄 Rollback Komutları

### Hızlı Rollback (SQLite'a Dön)
```bash
# Feature flag'i değiştir
sed -i 's/USE_POSTGRES=true/USE_POSTGRES=false/' .env.local

# veya manuel
nano .env.local
# USE_POSTGRES=false yap

# Restart application
pm2 restart procheff

# Logs kontrol
pm2 logs procheff --lines 50
```

### SQLite Restore (Backup'tan)
```bash
# Backup listesi
ls -lh procheff_backup_*.db

# En son backup'ı restore et
cp procheff_backup_$(ls -t procheff_backup_*.db | head -1 | cut -d_ -f3-) procheff.db

# veya belirli bir backup
cp procheff_backup_20251114_120000.db procheff.db

# Restart
pm2 restart procheff
```

### PostgreSQL Cleanup (Yeniden Başlama)
```bash
# Tüm tabloları sil
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Belirli tabloyu sil
psql $DATABASE_URL -c "DROP TABLE users CASCADE;"

# Tabloyu truncate et (data'yı sil, yapıyı koru)
psql $DATABASE_URL -c "TRUNCATE TABLE users CASCADE;"
```

---

## 🧹 Cleanup Komutları

### Migration Cleanup
```bash
# Export data'yı temizle
rm -rf scripts/postgres-migration/data-export/

# Validation reports'ları temizle
rm scripts/postgres-migration/validation-report-*.json

# SQLite backup'ları arşivle
mkdir -p archive/sqlite-backups
mv procheff_backup_*.db archive/sqlite-backups/
```

### SQLite Cleanup (Migration Başarılı Olduysa)
```bash
# SQLite dosyasını arşivle
mkdir -p archive/
mv procheff.db archive/procheff_final_backup_$(date +%Y%m%d).db

# WAL dosyalarını temizle
rm -f procheff.db-shm procheff.db-wal
```

---

## 🐛 Troubleshooting Komutları

### Connection Issues
```bash
# DNS resolve test
nslookup db-postgresql-fra1-22277-do-user-28803712-0.f.db.ondigitalocean.com

# Port test
nc -zv db-postgresql-fra1-22277-do-user-28803712-0.f.db.ondigitalocean.com 25060

# SSL test
openssl s_client -connect db-postgresql-fra1-22277-do-user-28803712-0.f.db.ondigitalocean.com:25060

# psql connection debug
psql $DATABASE_URL -v ON_ERROR_STOP=1 --echo-all
```

### Data Issues
```bash
# SQLite ve PostgreSQL karşılaştır
echo "SQLite users:"
sqlite3 procheff.db "SELECT COUNT(*) FROM users;"
echo "PostgreSQL users:"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"

# Row count all tables (SQLite)
sqlite3 procheff.db "SELECT name, (SELECT COUNT(*) FROM sqlite_master AS sm WHERE sm.name = m.name) AS count FROM sqlite_master AS m WHERE type='table' ORDER BY name;"

# Row count all tables (PostgreSQL)
psql $DATABASE_URL -c "SELECT schemaname,relname,n_live_tup FROM pg_stat_user_tables ORDER BY relname;"
```

### Performance Issues
```bash
# PostgreSQL active queries
psql $DATABASE_URL -c "SELECT pid, now() - query_start AS duration, query FROM pg_stat_activity WHERE state = 'active';"

# Lock monitoring
psql $DATABASE_URL -c "SELECT * FROM pg_locks WHERE granted = false;"

# Cache hit ratio
psql $DATABASE_URL -c "SELECT sum(blks_hit) / (sum(blks_hit) + sum(blks_read)) AS cache_hit_ratio FROM pg_stat_database;"
```

---

## 📊 Comparison Queries

### Users Table
```bash
# SQLite
sqlite3 procheff.db "SELECT COUNT(*), MIN(created_at), MAX(created_at) FROM users;"

# PostgreSQL
psql $DATABASE_URL -c "SELECT COUNT(*), MIN(created_at), MAX(created_at) FROM users;"
```

### Analysis History
```bash
# SQLite
sqlite3 procheff.db "SELECT COUNT(*), status, COUNT(*) FROM analysis_history GROUP BY status;"

# PostgreSQL
psql $DATABASE_URL -c "SELECT status, COUNT(*) FROM analysis_history GROUP BY status;"
```

### Market Prices
```bash
# SQLite
sqlite3 procheff.db "SELECT COUNT(*), AVG(price) FROM market_prices WHERE price > 0;"

# PostgreSQL
psql $DATABASE_URL -c "SELECT COUNT(*), AVG(price) FROM market_prices WHERE price > 0;"
```

---

## 🚀 Production Deployment

### Pre-Deployment
```bash
# Build production
npm run build

# Test build locally
npm run start
```

### Deployment
```bash
# SSH to server
ssh root@your-server

# Navigate to app
cd /var/www/procheff

# Pull latest code
git pull

# Install dependencies
npm install

# Run migration
export DATABASE_URL="postgres://..."
npm run migrate:all

# Update environment
echo "USE_POSTGRES=true" >> .env.local

# Rebuild
npm run build

# Restart
pm2 restart procheff

# Monitor
pm2 logs procheff --lines 100
```

---

## 📱 One-Liners (Kopya-Yapıştır)

```bash
# Complete migration in one go
export DATABASE_URL="postgres://..." && npm run migrate:all && echo "✅ Migration completed!"

# Quick validation
npm run migrate:validate && echo "✅ Validation passed!" || echo "❌ Validation failed!"

# Production cutover
sed -i 's/USE_POSTGRES=false/USE_POSTGRES=true/' .env.local && pm2 restart procheff

# Quick rollback
sed -i 's/USE_POSTGRES=true/USE_POSTGRES=false/' .env.local && pm2 restart procheff

# Backup + Migration
sqlite3 procheff.db ".backup procheff_backup_$(date +%Y%m%d_%H%M%S).db" && npm run migrate:all

# Full health check
npm run migrate:test && npm run migrate:validate && curl -s http://localhost:3000/api/health | jq '.database'
```

---

## 🔐 Security & Credentials

### Environment Variables
```bash
# View current DATABASE_URL (masked)
echo $DATABASE_URL | sed 's/:.*@/:***@/'

# Set from file
source .env.local

# Temporary set (current session only)
export DATABASE_URL="postgres://..."

# Permanent set (add to profile)
echo 'export DATABASE_URL="postgres://..."' >> ~/.bashrc
source ~/.bashrc
```

### Secure Connection Test
```bash
# Test with SSL
psql "postgres://doadmin:***@host:25060/db?sslmode=require" -c "SELECT version();"

# Verify SSL
psql $DATABASE_URL -c "SHOW ssl;"
```

---

## 📞 Emergency Commands

### System Down - Quick Recovery
```bash
# 1. Rollback immediately
sed -i 's/USE_POSTGRES=true/USE_POSTGRES=false/' .env.local
pm2 restart procheff

# 2. Check if working
curl http://localhost:3000/api/health

# 3. Restore backup if needed
cp procheff_backup_*.db procheff.db
pm2 restart procheff
```

### Data Corruption - Emergency Restore
```bash
# 1. Stop application
pm2 stop procheff

# 2. Restore backup
cp archive/procheff_backup_LATEST.db procheff.db

# 3. Switch to SQLite
sed -i 's/USE_POSTGRES=true/USE_POSTGRES=false/' .env.local

# 4. Restart
pm2 start procheff

# 5. Verify
curl http://localhost:3000/api/health
```

---

**💡 Pro Tip:** Bu dosyayı favorilere ekle, migration sırasında açık tut!

