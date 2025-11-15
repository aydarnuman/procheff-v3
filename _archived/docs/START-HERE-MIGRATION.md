# 🚀 PostgreSQL Migration - BURADAN BAŞLA

## 📍 Sen Neredesin?

Seç:
- 🔵 [İlk Kez Migration Yapıyorum](#ilk-kez-migration)
- 🟢 [Test Ortamında Denemek İstiyorum](#test-ortam%C4%B1)
- 🟡 [Production'da Migration Yapacağım](#production-migration)
- 🔴 [Problem Yaşıyorum / Rollback](#problem--rollback)

---

## 🔵 İlk Kez Migration

### Adım 1: Dokümantasyonu Oku (5 dakika)

1. **MIGRATION-SUMMARY.md** - Genel bakış (bu dosyayı oku)
2. **POSTGRES-MIGRATION-QUICKSTART.md** - Hızlı başlangıç
3. **MIGRATION-COMMANDS.md** - Komut referansı

### Adım 2: Environment Setup (2 dakika)

```bash
# .env.local dosyasına ekle
DATABASE_URL=postgresql://avnadmin:***PASSWORD***@procheff-ai-procheff-ai.k.aivencloud.com:11738/procheff_ai?sslmode=require
```

### Adım 3: Connection Test (1 dakika)

```bash
npm run migrate:test
```

✅ **Beklenen sonuç:**
```
✅ Connected successfully
✅ Query successful
✅ All tests passed!
```

❌ **Hata alırsan:**
- DigitalOcean whitelist kontrolü
- VPN/Firewall kontrolü
- DATABASE_URL kontrolü

### Adım 4: İlk Migration Testi (5 dakika)

```bash
# Local test (production'ı etkilemez)
npm run migrate:all
```

✅ **Başarılı olduysa:**
- `validation-report-*.json` dosyasını kontrol et
- Tüm tablolar "matched" olmalı

### Sonraki Adım

➡️ [Test Ortamında Denemek İstiyorum](#test-ortam%C4%B1)

---

## 🟢 Test Ortamı

### Senaryo: Local/Staging Test

**Amaç:** Production'ı riske atmadan migration'ı test et

### 1. Backup Al (1 dakika)

```bash
sqlite3 procheff.db ".backup procheff_backup_test_$(date +%Y%m%d_%H%M%S).db"
```

### 2. Migration Çalıştır (5 dakika)

```bash
# Tüm migration pipeline
npm run migrate:all
```

**Script otomatik olarak:**
- ✅ SQLite'tan data export eder
- ✅ PostgreSQL'de schema oluşturur
- ✅ Data'yı import eder
- ✅ Validation yapar

### 3. Validation Kontrol (1 dakika)

```bash
# Validation report
cat scripts/postgres-migration/validation-report-*.json | jq '.summary'
```

**Beklenen:**
```json
{
  "matched": 27,
  "mismatched": 0,
  "pgMissing": 0
}
```

### 4. Application Test (5 dakika)

```bash
# PostgreSQL ile app'i başlat
export USE_POSTGRES=true
npm run dev
```

**Test et:**
- ✅ Login çalışıyor mu?
- ✅ Analysis yapılabiliyor mu?
- ✅ Market data çekiliyor mu?
- ✅ Hata yok mu?

### 5. Geri Dön (SQLite'a)

```bash
# Test bitti, SQLite'a dön
export USE_POSTGRES=false
npm run dev
```

### Sonraki Adım

✅ Test başarılıysa ➡️ [Production'da Migration Yapacağım](#production-migration)

---

## 🟡 Production Migration

### ⚠️ UYARI: Production Ortamı

**Önce şunları kontrol et:**
- ✅ Test ortamında denedim, başarılı oldu
- ✅ Backup stratejim var
- ✅ Rollback planını biliyorum
- ✅ Düşük trafik saati seçtim
- ✅ Team bilgilendirildi

### Hazır mısın?

➡️ **[MIGRATION-CHECKLIST.md](MIGRATION-CHECKLIST.md)** dosyasını aç ve takip et

### Hızlı Özet (Server'da)

```bash
# 1. SSH ile bağlan
ssh root@your-server

# 2. Proje klasörüne git
cd /var/www/procheff

# 3. ÖNEMLİ: Backup al
sqlite3 procheff.db ".backup procheff_backup_prod_$(date +%Y%m%d_%H%M%S).db"

# 4. Environment'ı ayarla
export DATABASE_URL="postgres://..."

# 5. Migration çalıştır
npm run migrate:all

# 6. Validation kontrol
cat scripts/postgres-migration/validation-report-*.json | jq '.summary'

# 7. Feature flag'i aç
echo "USE_POSTGRES=true" >> .env.local

# 8. Restart
pm2 restart procheff

# 9. Logs izle
pm2 logs procheff --lines 100
```

### İlk 1 Saat Monitoring

```bash
# Her 5 dakikada bir çalıştır
pm2 logs procheff --err --lines 50 | grep -i "database\|postgres\|error"
```

**Sorun yoksa:** ✅ Migration başarılı!

**Sorun varsa:** ⚠️ [Problem / Rollback](#problem--rollback)

---

## 🔴 Problem / Rollback

### Hızlı Rollback (< 2 dakika)

```bash
# 1. SQLite'a geri dön
sed -i 's/USE_POSTGRES=true/USE_POSTGRES=false/' .env.local

# 2. Restart
pm2 restart procheff

# 3. Kontrol
curl http://localhost:3000/api/health
pm2 logs procheff --lines 50
```

### Backup'tan Restore (Gerekirse)

```bash
# 1. Stop app
pm2 stop procheff

# 2. Restore backup
cp procheff_backup_prod_XXXXXXXX.db procheff.db

# 3. Start app
pm2 start procheff

# 4. Verify
curl http://localhost:3000/api/health
```

### Sık Karşılaşılan Problemler

#### 1. "Cannot connect to database"

**Çözüm:**
```bash
# Connection test
npm run migrate:test

# DATABASE_URL kontrolü
echo $DATABASE_URL | sed 's/:.*@/:***@/'
```

#### 2. "Table does not exist"

**Çözüm:**
```bash
# Schema migration'ı tekrar çalıştır
npm run migrate:schema
```

#### 3. "Data validation failed"

**Çözüm:**
```bash
# Validation report'u incele
cat scripts/postgres-migration/validation-report-*.json | jq '.errors'

# Re-import data
npm run migrate:import
npm run migrate:validate
```

#### 4. "Application crashes"

**Çözüm:**
```bash
# Logs kontrol
pm2 logs procheff --err --lines 100

# Hemen rollback
sed -i 's/USE_POSTGRES=true/USE_POSTGRES=false/' .env.local
pm2 restart procheff
```

### Destek Lazımsa

1. ✅ Logs'ları topla: `pm2 logs procheff --lines 200 > migration-error.log`
2. ✅ Validation report'u kaydet
3. ✅ Connection test sonucu: `npm run migrate:test > test-result.log`
4. ✅ Bu dosyaları gönder

---

## 📚 Dokümantasyon Rehberi

### Hangi Dosyayı Ne Zaman Oku?

| Dosya | Ne Zaman? | Süre |
|-------|-----------|------|
| **START-HERE-MIGRATION.md** | 👈 İlk başta (şimdi) | 5 dk |
| **MIGRATION-SUMMARY.md** | Genel bakış için | 10 dk |
| **POSTGRES-MIGRATION-QUICKSTART.md** | Hızlı başlangıç | 5 dk |
| **POSTGRESQL-MIGRATION-PLAN.md** | Detaylı plan için | 30 dk |
| **MIGRATION-CHECKLIST.md** | Production migration sırasında | - |
| **MIGRATION-COMMANDS.md** | Komut lazım olunca | - |
| **scripts/postgres-migration/README.md** | Script detayları | 10 dk |

### Sıralı Okuma Önerisi

1. ✅ **START-HERE-MIGRATION.md** (bu dosya)
2. ✅ **POSTGRES-MIGRATION-QUICKSTART.md**
3. ✅ **MIGRATION-COMMANDS.md** (reference)
4. ✅ **MIGRATION-CHECKLIST.md** (production'da)
5. ⚠️ **POSTGRESQL-MIGRATION-PLAN.md** (detay gerekirse)

---

## 🎯 Success Path (Önerilen Yol)

```
1. Connection Test ✅
   └── npm run migrate:test
   
2. Local Test Migration ✅
   └── npm run migrate:all
   
3. Validation ✅
   └── Validation report OK
   
4. Application Test ✅
   └── USE_POSTGRES=true ile test
   
5. Production Backup ✅
   └── sqlite3 backup komutu
   
6. Production Migration ✅
   └── npm run migrate:all (server'da)
   
7. Production Validation ✅
   └── Validation report kontrol
   
8. Production Cutover ✅
   └── USE_POSTGRES=true & pm2 restart
   
9. Monitoring (24 saat) ✅
   └── pm2 logs & health checks
   
10. Cleanup (1 hafta sonra) ✅
    └── SQLite backup arşivle
```

---

## ⚡ Hızlı Başlangıç (TL;DR)

**5 dakikada test migration:**

```bash
# 1. Setup
export DATABASE_URL="postgres://..."

# 2. Test
npm run migrate:test

# 3. Migrate
npm run migrate:all

# 4. Done!
cat scripts/postgres-migration/validation-report-*.json | jq '.summary'
```

---

## 📊 Migration Durumu

### Şu An Neredesin?

- [ ] Dokümantasyonu okudum
- [ ] Connection test yaptım
- [ ] Local'de test ettim
- [ ] Validation başarılı
- [ ] Production'a hazırım
- [ ] Production migration tamamlandı
- [ ] Monitoring devam ediyor
- [ ] Migration başarılı ✅

### Sorun mu Var?

➡️ [Problem / Rollback](#problem--rollback) bölümüne git

---

## 🎓 Öğrenilen Dersler (İleride)

Migration tamamlandıktan sonra:

1. ✅ Ne iyi gitti?
2. ⚠️ Ne zorluk yaşadın?
3. 📝 Ne farklı yapardın?
4. 💡 Takıma ne tavsiye edersin?

**Notlarını buraya yaz:**

```
Tarih: _________________
Durum: _________________
Notlar:
-
-
-
```

---

## 📞 Acil Durum

### 🚨 ROLLBACK GEREKİYOR!

```bash
# COPY-PASTE (acil durum)
sed -i 's/USE_POSTGRES=true/USE_POSTGRES=false/' .env.local && pm2 restart procheff && echo "✅ Rollback completed"
```

### ✅ Her Şey Yolunda

```bash
# Migration durumunu kontrol et
npm run migrate:validate && curl http://localhost:3000/api/health | jq '.'
```

---

## 🎯 Son Kontrol (Production Öncesi)

- [ ] Test ortamında denedim
- [ ] Validation başarılı (0 mismatch)
- [ ] Backup aldım ve test ettim
- [ ] Rollback planını biliyorum
- [ ] Team bilgilendirdim
- [ ] Monitoring hazır
- [ ] Düşük trafik saati seçtim
- [ ] MIGRATION-CHECKLIST.md yanımda

**Hepsini işaretledin mi?** ➡️ Production'a hazırsın! 🚀

---

**🎉 Başarılar! Migration sorunsuz geçsin!**

---

**Hazırlayan:** AI Assistant  
**Versiyon:** 1.0  
**Tarih:** 2025-11-14  
**Proje:** Procheff-v3  

**Quick Links:**
- 📖 [Quick Start](POSTGRES-MIGRATION-QUICKSTART.md)
- 📋 [Checklist](MIGRATION-CHECKLIST.md)
- 🔧 [Commands](MIGRATION-COMMANDS.md)
- 📊 [Summary](MIGRATION-SUMMARY.md)
- 📚 [Full Plan](POSTGRESQL-MIGRATION-PLAN.md)

