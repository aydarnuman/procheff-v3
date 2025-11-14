# PostgreSQL Migration - Quick Reference Card

## 🚀 One Command Migration

```bash
export DATABASE_URL="postgres://..." && npm run migrate:all
```

---

## 📋 Individual Steps

```bash
# 1. Test Connection
npm run migrate:test

# 2. Export SQLite Data
npm run migrate:export

# 3. Migrate Schema
npm run migrate:schema

# 4. Import Data
npm run migrate:import

# 5. Validate Migration
npm run migrate:validate
```

---

## ✅ Success Indicators

```bash
# Migration successful if:
cat validation-report-*.json | jq '.summary.mismatched'  # Should be 0
curl localhost:3000/api/health | jq '.database'         # Should be "connected"
pm2 logs procheff --lines 50 | grep -i error            # Should be empty
```

---

## ❌ Rollback

```bash
# Immediate rollback
sed -i 's/USE_POSTGRES=true/USE_POSTGRES=false/' .env.local
pm2 restart procheff
```

---

## 🔍 Common Checks

```bash
# Row counts match
sqlite3 procheff.db "SELECT COUNT(*) FROM users;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"

# Connection pool
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Application logs
pm2 logs procheff --lines 100 | grep -i "database\|postgres"
```

---

## 📞 Emergency

```bash
# Stop and restore
pm2 stop procheff
cp procheff_backup_*.db procheff.db
sed -i 's/USE_POSTGRES=true/USE_POSTGRES=false/' .env.local
pm2 start procheff
```

---

**Full docs:** See [START-HERE-MIGRATION.md](../../START-HERE-MIGRATION.md)

