#!/bin/bash

# ============================================================
# PostgreSQL Migration Orchestrator
# ============================================================
# Bu script tüm migration sürecini yönetir
# Kullanım: ./migrate.sh [--skip-backup] [--force] [--test-only]
# ============================================================

set -e  # Hata durumunda dur

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script dizini
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/../.."

# Argümanları parse et
SKIP_BACKUP=false
FORCE=false
TEST_ONLY=false

for arg in "$@"; do
    case $arg in
        --skip-backup)
            SKIP_BACKUP=true
            ;;
        --force)
            FORCE=true
            ;;
        --test-only)
            TEST_ONLY=true
            ;;
        --help)
            echo "PostgreSQL Migration Tool"
            echo "========================="
            echo "Kullanım: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-backup   Backup aşamasını atla (tehlikeli!)"
            echo "  --force         Onay istemeden devam et"
            echo "  --test-only     Sadece test ve doğrulama yap"
            echo "  --help          Bu yardım mesajını göster"
            exit 0
            ;;
    esac
done

# Proje dizinine geç
cd "$PROJECT_ROOT"

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════╗"
echo "║     PostgreSQL Migration Tool v1.0       ║"
echo "║     SQLite → PostgreSQL Geçiş Aracı      ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# Ön kontroller
echo -e "${BLUE}📋 Ön Kontroller${NC}"
echo "=================="

# Node.js kontrolü
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js kurulu değil!${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Node.js: $(node -v)"

# npm kontrolü
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm kurulu değil!${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} npm: $(npm -v)"

# SQLite database kontrolü
if [ ! -f "procheff.db" ]; then
    echo -e "${RED}❌ procheff.db dosyası bulunamadı!${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} SQLite database: procheff.db"

# PostgreSQL kontrolü
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✓${NC} PostgreSQL client: $(psql --version | head -n1)"
else
    echo -e "${YELLOW}⚠${NC} PostgreSQL client kurulu değil (opsiyonel)"
fi

# Environment dosyası kontrolü
if [ ! -f ".env" ] && [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ .env veya .env.local dosyası bulunamadı!${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Environment dosyası mevcut"

echo ""

# Migration özeti
echo -e "${BLUE}📊 Migration Özeti${NC}"
echo "==================="
echo "• Kaynak: SQLite (procheff.db)"
echo "• Hedef: PostgreSQL"
echo "• Dosya boyutu: $(du -h procheff.db | cut -f1)"
echo "• Skip backup: $SKIP_BACKUP"
echo "• Force mode: $FORCE"
echo "• Test only: $TEST_ONLY"
echo ""

# Onay iste (force değilse)
if [ "$FORCE" = false ]; then
    echo -e "${YELLOW}⚠️  DİKKAT:${NC} Bu işlem veritabanınızı değiştirecek!"
    echo "Devam etmeden önce:"
    echo "  1. Production'da değilsiniz değil mi?"
    echo "  2. Backup aldınız mı?"
    echo "  3. PostgreSQL server çalışıyor mu?"
    echo ""
    read -p "Devam etmek istiyor musunuz? (yes/no): " -r CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "Migration iptal edildi."
        exit 0
    fi
fi

# Test-only modda sadece test yap
if [ "$TEST_ONLY" = true ]; then
    echo ""
    echo -e "${BLUE}🧪 Test Modu${NC}"
    echo "============="
    bash "$SCRIPT_DIR/05-test-and-verify.sh"
    exit $?
fi

# Migration aşamaları
STEPS=(
    "01-backup.sh:🔒 Backup alınıyor..."
    "02-install-postgres.sh:📦 PostgreSQL paketleri kuruluyor..."
    "03-migrate-data.js:🔄 Veriler aktarılıyor..."
    "04-code-migration.sh:💻 Kod güncelleniyor..."
    "05-test-and-verify.sh:🧪 Test ve doğrulama yapılıyor..."
)

# Her aşamayı çalıştır
for step in "${STEPS[@]}"; do
    IFS=':' read -r script message <<< "$step"
    
    # Backup skip kontrolü
    if [ "$SKIP_BACKUP" = true ] && [ "$script" = "01-backup.sh" ]; then
        echo -e "${YELLOW}⏭️  Backup aşaması atlanıyor...${NC}"
        continue
    fi
    
    echo ""
    echo -e "${CYAN}$message${NC}"
    echo "─────────────────────────────────"
    
    # Script'i çalıştır
    if [ "${script##*.}" = "js" ]; then
        # JavaScript dosyası
        if ! node "$SCRIPT_DIR/$script"; then
            echo -e "${RED}❌ $script başarısız oldu!${NC}"
            echo "Migration durduruldu. Lütfen hataları düzeltin ve tekrar deneyin."
            exit 1
        fi
    else
        # Bash script
        if ! bash "$SCRIPT_DIR/$script"; then
            echo -e "${RED}❌ $script başarısız oldu!${NC}"
            echo "Migration durduruldu. Lütfen hataları düzeltin ve tekrar deneyin."
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✓ Tamamlandı${NC}"
done

# Final özet
echo ""
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════╗"
echo "║     🎉 MIGRATION BAŞARIYLA TAMAMLANDI!    ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

echo ""
echo "📋 Sonraki Adımlar:"
echo "==================="
echo ""
echo "1. PostgreSQL'e geçmek için:"
echo -e "   ${CYAN}echo 'USE_POSTGRES=true' >> .env.local${NC}"
echo ""
echo "2. Uygulamayı test edin:"
echo -e "   ${CYAN}npm run dev${NC}"
echo ""
echo "3. Production deployment:"
echo "   • Environment değişkenlerini güncelleyin"
echo "   • DATABASE_URL'i PostgreSQL'e yönlendirin"
echo "   • Server'ı yeniden başlatın"
echo ""
echo "4. Sorun yaşarsanız SQLite'a geri dönmek için:"
echo -e "   ${CYAN}echo 'USE_POSTGRES=false' >> .env.local${NC}"
echo ""
echo "📁 Backup konumu: ./backups/"
echo "📊 Migration raporu: migration-report-*.json"
echo ""
echo -e "${YELLOW}⚠️  ÖNEMLİ:${NC} SQLite dosyalarını silmeyin!"
echo "   Gerekirse geri dönebilmek için saklayın."
echo ""
echo "Sorularınız için: https://github.com/yourusername/procheff-v3"
