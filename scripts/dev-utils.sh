#!/bin/bash

# ================================
# Procheff-v3 Development Utils
# ================================
# Bu script geliştirme için yararlı komutları sağlar

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

function show_help() {
    echo -e "${BLUE}🚀 Procheff-v3 Development Utils${NC}"
    echo ""
    echo -e "${YELLOW}Kullanım:${NC} ./scripts/dev-utils.sh [komut]"
    echo ""
    echo -e "${CYAN}Mevcut Komutlar:${NC}"
    echo "  setup     - Tam geliştirme ortamı kurulumu"
    echo "  dev       - Development server başlat"
    echo "  build     - Production build"
    echo "  test      - Test suite çalıştır"
    echo "  lint      - Code linting"
    echo "  typecheck - TypeScript type check"
    echo "  clean     - Cache ve build dosyalarını temizle"
    echo "  db-reset  - SQLite veritabanını sıfırla"
    echo "  logs      - Development loglarını görüntüle"
    echo "  backup    - Proje yedeği al"
    echo "  deploy    - Production deployment"
    echo ""
}

function setup_dev_environment() {
    echo -e "${BLUE}🔧 Geliştirme ortamı kuruluyor...${NC}"
    
    # Node modules
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Dependencies kuruluyor...${NC}"
        npm install
    fi
    
    # Environment files
    if [ ! -f ".env.local" ]; then
        echo -e "${YELLOW}⚙️  Environment dosyası oluşturuluyor...${NC}"
        cp .env.example .env.local 2>/dev/null || echo "# Procheff-v3 Environment Variables" > .env.local
    fi
    
    # Database setup
    echo -e "${YELLOW}🗄️  Veritabanı hazırlanıyor...${NC}"
    mkdir -p logs
    
    echo -e "${GREEN}✅ Geliştirme ortamı hazır!${NC}"
}

function start_dev() {
    echo -e "${BLUE}🚀 Development server başlatılıyor...${NC}"
    npm run dev
}

function build_project() {
    echo -e "${BLUE}🔨 Production build başlatılıyor...${NC}"
    npm run build
}

function run_tests() {
    echo -e "${BLUE}🧪 Test suite çalıştırılıyor...${NC}"
    npm test
}

function lint_code() {
    echo -e "${BLUE}🔍 Code linting çalıştırılıyor...${NC}"
    npm run lint
}

function type_check() {
    echo -e "${BLUE}📝 TypeScript type check çalıştırılıyor...${NC}"
    npx tsc --noEmit
}

function clean_project() {
    echo -e "${BLUE}🧹 Cache ve build dosyaları temizleniyor...${NC}"
    rm -rf .next
    rm -rf out
    rm -rf node_modules/.cache
    echo -e "${GREEN}✅ Temizlik tamamlandı!${NC}"
}

function reset_database() {
    echo -e "${YELLOW}⚠️  Veritabanı sıfırlanıyor...${NC}"
    rm -f procheff.db
    rm -f logs/*.log
    echo -e "${GREEN}✅ Veritabanı sıfırlandı!${NC}"
}

function show_logs() {
    echo -e "${BLUE}📋 Development logları:${NC}"
    if [ -d "logs" ] && [ "$(ls -A logs)" ]; then
        tail -f logs/*.log
    else
        echo -e "${YELLOW}Henüz log dosyası bulunamadı.${NC}"
    fi
}

function backup_project() {
    BACKUP_DIR="$HOME/procheff-backups"
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="procheff-v3_backup_$TIMESTAMP.tar.gz"
    
    echo -e "${BLUE}💾 Proje yedeği alınıyor...${NC}"
    
    mkdir -p "$BACKUP_DIR"
    
    tar -czf "$BACKUP_DIR/$BACKUP_FILE" \
        --exclude=node_modules \
        --exclude=.next \
        --exclude=out \
        --exclude=logs \
        --exclude=*.log \
        .
    
    echo -e "${GREEN}✅ Yedek alındı: $BACKUP_DIR/$BACKUP_FILE${NC}"
}

function deploy_production() {
    echo -e "${BLUE}🚀 Production deployment başlatılıyor...${NC}"
    ./scripts/deploy-digitalocean.sh
}

# Ana komut işlemcisi
case "${1:-help}" in
    "setup")
        setup_dev_environment
        ;;
    "dev")
        start_dev
        ;;
    "build")
        build_project
        ;;
    "test")
        run_tests
        ;;
    "lint")
        lint_code
        ;;
    "typecheck")
        type_check
        ;;
    "clean")
        clean_project
        ;;
    "db-reset")
        reset_database
        ;;
    "logs")
        show_logs
        ;;
    "backup")
        backup_project
        ;;
    "deploy")
        deploy_production
        ;;
    "help"|*)
        show_help
        ;;
esac