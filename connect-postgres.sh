#!/bin/bash
# PostgreSQL Console Connection Script
# Procheff v3 - DigitalOcean PostgreSQL Database

echo "🔌 Connecting to PostgreSQL Database..."
echo "📍 Host: db-postgresql-fra1-22277-do-user-28803712-0.f.db.ondigitalocean.com"
echo "🗄️  Database: defaultdb"
echo ""

# PostgreSQL bağlantı komutu
PGPASSWORD='***PASSWORD***' psql \
  -h db-postgresql-fra1-22277-do-user-28803712-0.f.db.ondigitalocean.com \
  -p 25060 \
  -U doadmin \
  -d defaultdb \
  --set=sslmode=require

# Alternatif: Connection string ile
# psql "postgresql://doadmin:***PASSWORD***@db-postgresql-fra1-22277-do-user-28803712-0.f.db.ondigitalocean.com:25060/defaultdb?sslmode=require"
