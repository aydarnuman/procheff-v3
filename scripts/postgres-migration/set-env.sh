#!/bin/bash

# PostgreSQL Migration Environment Setup
# This script sets up the required environment variables for migration

echo "🔧 Setting up PostgreSQL migration environment..."

# Database connection string
export DATABASE_URL="postgres://doadmin:***PASSWORD***@db-postgresql-fra1-22277-do-user-28803712-0.f.db.ondigitalocean.com:25060/defaultdb?sslmode=require"

# Required for DigitalOcean managed database SSL
export NODE_TLS_REJECT_UNAUTHORIZED=0

echo "✅ Environment variables set:"
echo "   DATABASE_URL: ${DATABASE_URL:0:30}...***"
echo "   NODE_TLS_REJECT_UNAUTHORIZED: $NODE_TLS_REJECT_UNAUTHORIZED"
echo ""
echo "⚠️  Warning: NODE_TLS_REJECT_UNAUTHORIZED=0 is set for DigitalOcean SSL compatibility"
echo ""
