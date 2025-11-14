#!/bin/bash

# PostgreSQL Migration - Aşama 1: Backup
# ========================================

echo "🔄 PostgreSQL Migration - Backup Aşaması Başlıyor..."

# Timestamp oluştur
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups/postgres-migration-${TIMESTAMP}"

# Backup dizinini oluştur
mkdir -p "${BACKUP_DIR}"

# 1. SQLite database backup
echo "📦 SQLite database yedekleniyor..."
cp procheff.db "${BACKUP_DIR}/procheff.db"
cp procheff.db-wal "${BACKUP_DIR}/procheff.db-wal" 2>/dev/null || true
cp procheff.db-shm "${BACKUP_DIR}/procheff.db-shm" 2>/dev/null || true

# 2. Kod backup (SQLite bağımlı dosyalar)
echo "📁 Kod dosyaları yedekleniyor..."
tar -czf "${BACKUP_DIR}/code-backup.tar.gz" src/lib/db/

# 3. Environment backup
echo "🔑 Environment dosyaları yedekleniyor..."
cp .env "${BACKUP_DIR}/.env" 2>/dev/null || true
cp .env.local "${BACKUP_DIR}/.env.local" 2>/dev/null || true

# 4. Migration öncesi verileri dışa aktar (JSON formatında)
echo "📊 Veriler JSON formatında dışa aktarılıyor..."
node -e "
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('./procheff.db', { readonly: true });

// Tüm tabloları al
const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'\").all();

const data = {};

tables.forEach(table => {
  try {
    const rows = db.prepare(\`SELECT * FROM \${table.name}\`).all();
    data[table.name] = {
      rows: rows,
      count: rows.length
    };
    console.log(\`  ✓ \${table.name}: \${rows.length} kayıt\`);
  } catch (error) {
    console.log(\`  ⚠️  \${table.name}: Hata - \${error.message}\`);
  }
});

// Verileri JSON olarak kaydet
fs.writeFileSync('${BACKUP_DIR}/database-export.json', JSON.stringify(data, null, 2));

db.close();

console.log('✅ Veri dışa aktarma tamamlandı');
"

echo "✅ Backup tamamlandı: ${BACKUP_DIR}"
echo ""
echo "📌 Backup içeriği:"
ls -la "${BACKUP_DIR}/"
echo ""
echo "🔴 ÖNEMLİ: Migration başlamadan önce bu backup'ın güvenli bir yerde olduğundan emin olun!"
echo "📁 Backup konumu: ${BACKUP_DIR}"
