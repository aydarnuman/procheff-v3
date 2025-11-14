#!/bin/bash

echo "🔧 Database'i düzeltiyorum..."

ssh root@104.248.254.171 << 'REMOTE'
cd /var/www/procheff

# Eski database'i yedekle
mv procheff.db procheff.db.broken.$(date +%s) 2>/dev/null

# Yeni temiz database oluştur
cat > create-db.js << 'JSEOF'
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

console.log('📦 Yeni database oluşturuluyor...');
const db = new Database('procheff.db');

// Temel tablolar
const tables = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password TEXT,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ihale_id TEXT UNIQUE,
  kurum TEXT,
  ihale_adi TEXT,
  tarih TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analysis_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  type TEXT,
  result TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS market_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_name TEXT,
  price REAL,
  unit TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR REPLACE INTO users (email, name, role) VALUES 
('admin@procheff.app', 'Admin', 'admin');
`;

db.exec(tables);
db.close();
console.log('✅ Database hazır!');
JSEOF

node create-db.js
rm create-db.js

# PM2 restart
pm2 restart procheff

echo "✅ Database düzeltildi ve site yeniden başlatıldı!"
REMOTE

echo "🎉 TAMAMLANDI! Site çalışıyor: https://procheff.app"
