#!/bin/bash

###############################################################################
# PostgreSQL Migration - Complete Pipeline
# Bu script tüm migration adımlarını sırasıyla çalıştırır
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL environment variable is not set"
    echo ""
    echo "Usage:"
    echo '  export DATABASE_URL="postgres://user:pass@host:port/db?sslmode=require"'
    echo "  ./run-all.sh"
    exit 1
fi

# Set NODE_TLS_REJECT_UNAUTHORIZED for DigitalOcean SSL
export NODE_TLS_REJECT_UNAUTHORIZED=0
log_info "NODE_TLS_REJECT_UNAUTHORIZED set to 0 for DigitalOcean SSL compatibility"

# Check if SQLite database exists
if [ ! -f "../../procheff.db" ]; then
    log_error "SQLite database not found: ../../procheff.db"
    exit 1
fi

echo ""
log_info "=========================================="
log_info "PostgreSQL Migration - Complete Pipeline"
log_info "=========================================="
echo ""

# Step 0: Test PostgreSQL connection
log_info "Step 0: Testing PostgreSQL connection..."
if node 5-test-connection.js; then
    log_success "PostgreSQL connection test passed"
else
    log_error "PostgreSQL connection test failed"
    log_warning "Please check your DATABASE_URL and network connectivity"
    exit 1
fi

echo ""
read -p "Continue with migration? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_warning "Migration cancelled by user"
    exit 0
fi

# Step 1: Export SQLite data
echo ""
log_info "Step 1: Exporting SQLite data..."
if node 1-export-sqlite-data.js; then
    log_success "Data export completed"
else
    log_error "Data export failed"
    exit 1
fi

# Step 2: Migrate schema
echo ""
log_info "Step 2: Migrating schema to PostgreSQL..."
if node 2-migrate-schema.js; then
    log_success "Schema migration completed"
else
    log_error "Schema migration failed"
    log_warning "You can run 'node 2-migrate-schema.js' separately to debug"
    exit 1
fi

# Step 3: Import data
echo ""
log_info "Step 3: Importing data to PostgreSQL..."
if node 3-import-data.js; then
    log_success "Data import completed"
else
    log_error "Data import failed"
    log_warning "You can run 'node 3-import-data.js' separately to debug"
    exit 1
fi

# Step 4: Validate data
echo ""
log_info "Step 4: Validating migrated data..."
if node 4-validate-data.js; then
    log_success "Data validation passed"
else
    log_warning "Data validation found mismatches"
    log_warning "Check validation-report-*.json for details"
    echo ""
    read -p "Continue despite validation warnings? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "Migration stopped due to validation issues"
        exit 1
    fi
fi

# Summary
echo ""
log_info "=========================================="
log_success "Migration completed successfully!"
log_info "=========================================="
echo ""
log_info "Next steps:"
echo "  1. Review validation report in validation-report-*.json"
echo "  2. Test your application with PostgreSQL:"
echo "     export USE_POSTGRES=true"
echo "     npm run dev"
echo "  3. If everything works, update production .env"
echo ""
log_warning "Keep your SQLite backup until you're sure everything works!"
echo ""

