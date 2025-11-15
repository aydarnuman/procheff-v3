# PostgreSQL Migration Checklist

## 📋 PRE-MIGRATION (Hazırlık)

### Environment Setup
- [ ] DigitalOcean PostgreSQL database oluşturuldu
- [ ] Connection string alındı
- [ ] `.env.local` dosyasına `DATABASE_URL` eklendi
- [ ] `pg` package kurulu (✅ Zaten var - v8.16.3)

### Testing
- [ ] Connection test başarılı (`npm run migrate:test`)
- [ ] Local'de test migration yapıldı (`npm run migrate:all`)
- [ ] Validation report kontrol edildi (0 mismatch)
- [ ] PostgreSQL'de tablolar görüldü

### Backup
- [ ] SQLite backup alındı
  ```bash
  sqlite3 procheff.db ".backup procheff_backup_$(date +%Y%m%d_%H%M%S).db"
  ```
- [ ] Backup dosyası doğrulandı (dosya boyutu > 0)
- [ ] Backup güvenli konuma kopyalandı

### Documentation Review
- [ ] `POSTGRESQL-MIGRATION-PLAN.md` okundu
- [ ] `POSTGRES-MIGRATION-QUICKSTART.md` gözden geçirildi
- [ ] Rollback planı anlaşıldı

---

## 🚀 MIGRATION (Geçiş)

### Step 1: Export SQLite Data
```bash
npm run migrate:export
```
- [ ] Export başarılı (exit code 0)
- [ ] `data-export/` klasörü oluştu
- [ ] JSON dosyaları kontrol edildi
- [ ] `_metadata.json` incelendi

**Validation:**
```bash
ls -lh scripts/postgres-migration/data-export/
cat scripts/postgres-migration/data-export/_metadata.json | jq '.totalTables'
```

### Step 2: Migrate Schema
```bash
npm run migrate:schema
```
- [ ] Schema migration başarılı
- [ ] Tablolar PostgreSQL'de oluştu
- [ ] Migration tracking table (`_migrations`) var
- [ ] Hata yok veya ignorable hatalar

**Validation:**
```bash
npm run migrate:test
# Tablo listesini görmeli
```

### Step 3: Import Data
```bash
npm run migrate:import
```
- [ ] Data import başarılı
- [ ] Tüm tablolar import edildi
- [ ] Sequence'ler güncellendi
- [ ] Row count'lar mantıklı

**Validation:**
```bash
# PostgreSQL'de user sayısını kontrol
echo "SELECT COUNT(*) FROM users;" | psql $DATABASE_URL
```

### Step 4: Validate Data
```bash
npm run migrate:validate
```
- [ ] Validation script çalıştı
- [ ] Validation report oluştu
- [ ] Matched tables = Total tables
- [ ] Mismatched = 0
- [ ] Critical tables validated (users, organizations, analysis_history)

**Validation:**
```bash
cat scripts/postgres-migration/validation-report-*.json | jq '.summary'
```

---

## 🔄 PRODUCTION CUTOVER

### Pre-Cutover
- [ ] Downtime window belirlendi
- [ ] Team bilgilendirildi
- [ ] Monitoring hazır
- [ ] Rollback planı gözden geçirildi

### Cutover Steps
- [ ] Maintenance mode açıldı (optional)
- [ ] Son bir SQLite backup alındı
- [ ] `.env.local` güncellendi: `USE_POSTGRES=true`
- [ ] Application rebuild edildi (gerekirse)
- [ ] PM2 restart edildi: `pm2 restart procheff`

### Post-Cutover Validation
- [ ] Application başladı (no crash)
- [ ] Health check passed: `curl localhost:3000/api/health`
- [ ] Login çalışıyor
- [ ] Analysis çalışıyor
- [ ] Market data çekiliyor
- [ ] API endpoints responding (status 200)

---

## 📊 MONITORING (İlk 24 Saat)

### Hour 1
- [ ] No errors in logs
  ```bash
  pm2 logs procheff --err --lines 100
  ```
- [ ] Response times normal
- [ ] Database connections stable
  ```bash
  psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
  ```

### Hour 6
- [ ] All features working
- [ ] No memory leaks
- [ ] No connection pool exhaustion
- [ ] Error rate < 1%

### Hour 24
- [ ] System stable
- [ ] Performance acceptable
- [ ] No rollback needed
- [ ] User feedback collected

---

## 🎯 POST-MIGRATION (1 Hafta Sonra)

### Cleanup
- [ ] Migration başarılı onaylandı
- [ ] SQLite backup archive'a taşındı
  ```bash
  mkdir -p archive/sqlite-backups
  mv procheff_backup_*.db archive/sqlite-backups/
  ```
- [ ] Migration scripts arşivlendi
- [ ] `data-export/` klasörü temizlendi (optional)

### Optimization
- [ ] PostgreSQL indexes kontrol edildi
- [ ] Slow queries analiz edildi
  ```bash
  # pg_stat_statements eklenmişse
  psql $DATABASE_URL -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
  ```
- [ ] Connection pool settings optimize edildi
- [ ] Backup schedule ayarlandı (PostgreSQL)

### Documentation
- [ ] Migration notes eklendi
- [ ] Team training yapıldı
- [ ] Lessons learned dokümanı oluşturuldu
- [ ] README güncellendi

---

## ❌ ROLLBACK CHECKLIST (Gerekirse)

### Immediate Rollback (< 5 dakika)
- [ ] `.env.local` değiştirildi: `USE_POSTGRES=false`
- [ ] PM2 restart: `pm2 restart procheff`
- [ ] Application health check
- [ ] Users bilgilendirildi

### Data Restoration (Gerekirse)
- [ ] Backup dosyası bulundu
- [ ] SQLite restore edildi:
  ```bash
  cp archive/procheff_backup_XXXXXXXX.db procheff.db
  ```
- [ ] Application restart
- [ ] Data integrity check

### Post-Rollback
- [ ] Root cause analysis
- [ ] Migration script'leri düzeltildi
- [ ] Re-migration planı yapıldı
- [ ] Documentation güncellendi

---

## 📈 SUCCESS CRITERIA

Migration başarılı sayılır:
- ✅ Tüm tablolar migrate edildi (100%)
- ✅ Row count'lar eşleşti (100%)
- ✅ Validation passed (0 error)
- ✅ API'ler çalışıyor (status 200)
- ✅ Response time < 2x SQLite
- ✅ 24 saat stabil (0 crash)
- ✅ 0 data kaybı
- ✅ 0 critical error

---

## 📞 EMERGENCY CONTACTS

### Rollback Trigger
Aşağıdaki durumlardan biri gerçekleşirse **HEMEN ROLLBACK**:
- Critical data loss
- System crash > 5 dakika
- Error rate > 10%
- Data corruption detected
- Cannot login/access system

### Rollback Command
```bash
# Hızlı rollback
sed -i 's/USE_POSTGRES=true/USE_POSTGRES=false/' .env.local
pm2 restart procheff
```

---

## 📝 NOTES

### Current Status
- [ ] Not started
- [ ] In progress
- [ ] Testing
- [ ] Production
- [ ] Completed
- [ ] Rolled back

### Migration Date
- **Planned:** _________________
- **Started:** _________________
- **Completed:** ______________

### Team Sign-off
- [ ] Technical Lead
- [ ] DevOps
- [ ] QA
- [ ] Product Owner

---

**Bu checklist'i yazdırıp, migration sırasında yanınızda tutun!**

