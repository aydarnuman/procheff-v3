# PostgreSQL Migration Scripts

Bu klasör SQLite'tan PostgreSQL'e geçiş için gerekli tüm script'leri içerir.

## 📋 Script'ler

### 1️⃣ Export SQLite Data
```bash
node 1-export-sqlite-data.js
```
- SQLite'taki tüm tabloları JSON dosyalarına export eder
- Output: `data-export/` klasörü
- Geri dönülebilir (read-only işlem)

### 2️⃣ Migrate Schema
```bash
DATABASE_URL=postgresql://avnadmin:***PASSWORD***@procheff-ai-procheff-ai.k.aivencloud.com:11738/procheff_ai?sslmode=require
```
- Migration dosyalarını PostgreSQL'e uygun hale getirir
- Tüm tabloları PostgreSQL'de oluşturur
- SQLite syntax -> PostgreSQL syntax dönüşümü yapar

### 3️⃣ Import Data
```bash
DATABASE_URL="postgres://..." node 3-import-data.js
```
- JSON dosyalarındaki data'yı PostgreSQL'e import eder
- Batch insert ile optimize edilmiş
- Sequence'leri günceller (SERIAL columns için)

### 4️⃣ Validate Data
```bash
DATABASE_URL="postgres://..." node 4-validate-data.js
```
- SQLite ve PostgreSQL'deki data'yı karşılaştırır
- Row count kontrolü
- Schema kontrolü
- Validation raporu oluşturur

### 5️⃣ Test Connection
```bash
DATABASE_URL="postgres://..." node 5-test-connection.js
```
- PostgreSQL bağlantısını test eder
- Temel query'leri çalıştırır
- Connection pool kontrolü
- Kritik tabloları kontrol eder

## 🚀 Kullanım

### Adım 1: Environment Setup
```bash
# .env.local dosyasına ekle
export DATABASE_URL="postgres://doadmin:***PASSWORD***@db-postgresql-fra1-22277-do-user-28803712-0.f.db.ondigitalocean.com:25060/defaultdb?sslmode=require"
```

### Adım 2: Test Connection
```bash
cd scripts/postgres-migration
source ../../.env.local
node 5-test-connection.js
```

### Adım 3: Backup SQLite
```bash
cd /var/www/procheff
sqlite3 procheff.db ".backup procheff_backup_$(date +%Y%m%d_%H%M%S).db"
```

### Adım 4: Export Data
```bash
node 1-export-sqlite-data.js
```

### Adım 5: Migrate Schema
```bash
node 2-migrate-schema.js
```

### Adım 6: Import Data
```bash
node 3-import-data.js
```

### Adım 7: Validate
```bash
node 4-validate-data.js
```

## 📊 Output Klasörleri

- `data-export/` - SQLite export'larının JSON dosyaları
- `validation-report-*.json` - Validation sonuçları

## 🔄 Rollback

Her adım geri dönülebilir:

1. **Schema migration hatası**: PostgreSQL'i temizle
   ```bash
   psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
   ```

2. **Data import hatası**: Tabloları temizle ve tekrar import et
   ```bash
   psql $DATABASE_URL -c "TRUNCATE TABLE users CASCADE;"
   ```

3. **Production'da problem**: Feature flag'i değiştir
   ```bash
   # .env.local
   USE_POSTGRES=false
   ```

## ⚠️ Önemli Notlar

- **Read-only**: Export script SQLite'a hiçbir şey yazmaz
- **Idempotent**: Script'ler birden fazla çalıştırılabilir
- **Batch processing**: Büyük tablolar için optimize edilmiş
- **Error handling**: Hata durumunda detaylı log verir

## 🐛 Troubleshooting

### "DATABASE_URL not set" hatası
```bash
export DATABASE_URL="postgres://..."
```

### "Connection refused" hatası
- VPN/Firewall kontrolü
- DigitalOcean whitelist kontrolü
- SSL sertifikası kontrolü

### "Table does not exist" hatası
- Önce schema migration'ı çalıştır (script 2)
- Migration dosyalarını kontrol et

### "Duplicate key" hatası
- Normal (ON CONFLICT DO NOTHING kullanılıyor)
- Re-run yapılabilir

## 📞 Destek

Migration sırasında sorun olursa:
1. Log dosyalarını kontrol et
2. Validation script'ini çalıştır
3. Ana README'deki rollback planını takip et
