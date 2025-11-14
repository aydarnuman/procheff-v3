#!/bin/bash

# ╔═══════════════════════════════════════════════════════════════════════════════════╗
# ║                         PROCHEFF-V3 DEVELOPMENT ALIASES                            ║
# ║                   Quick shortcuts for common development tasks                     ║
# ╚═══════════════════════════════════════════════════════════════════════════════════╝

# Bu dosyayı ~/.bashrc veya ~/.zshrc dosyanıza ekleyin:
# source ~/procheff-v3/scripts/dev-aliases.sh

# Colors for output
export PROCHEFF_COLOR_RED='\033[0;31m'
export PROCHEFF_COLOR_GREEN='\033[0;32m'
export PROCHEFF_COLOR_YELLOW='\033[1;33m'
export PROCHEFF_COLOR_BLUE='\033[0;34m'
export PROCHEFF_COLOR_PURPLE='\033[0;35m'
export PROCHEFF_COLOR_CYAN='\033[0;36m'
export PROCHEFF_COLOR_NC='\033[0m'

# Project directory (adjust this path)
export PROCHEFF_DIR="$HOME/procheff-v3"

# ═══════════════════════════════════════════════════════════════════════════════════
# QUICK NAVIGATION
# ═══════════════════════════════════════════════════════════════════════════════════

# Ana proje dizinine git
alias pcd='cd $PROCHEFF_DIR && echo -e "${PROCHEFF_COLOR_GREEN}📁 Procheff dizinine geldiniz${PROCHEFF_COLOR_NC}"'

# Önemli dizinlere hızlı erişim
alias pcd-src='cd $PROCHEFF_DIR/src'
alias pcd-app='cd $PROCHEFF_DIR/src/app'
alias pcd-comp='cd $PROCHEFF_DIR/src/components'
alias pcd-lib='cd $PROCHEFF_DIR/src/lib'
alias pcd-api='cd $PROCHEFF_DIR/src/app/api'
alias pcd-worker='cd $PROCHEFF_DIR/ihale-worker'

# ═══════════════════════════════════════════════════════════════════════════════════
# DEVELOPMENT COMMANDS
# ═══════════════════════════════════════════════════════════════════════════════════

# Hızlı başlatma
alias pstart='cd $PROCHEFF_DIR && npm run master'
alias pstart-clean='cd $PROCHEFF_DIR && npm run master:clean'
alias pstop='cd $PROCHEFF_DIR && npm run master:stop'
alias pstatus='cd $PROCHEFF_DIR && npm run master:status'
alias plogs='cd $PROCHEFF_DIR && npm run master:logs'
alias pmon='cd $PROCHEFF_DIR && npm run master:monitor'

# Concurrent mod
alias pcon='cd $PROCHEFF_DIR && ./scripts/dev-concurrent.sh'
alias pcon-mon='cd $PROCHEFF_DIR && ./scripts/dev-concurrent.sh monitor'
alias pcon-debug='cd $PROCHEFF_DIR && ./scripts/dev-concurrent.sh debug'

# Normal dev komutları
alias pdev='cd $PROCHEFF_DIR && npm run dev'
alias pbuild='cd $PROCHEFF_DIR && npm run build'
alias ptest='cd $PROCHEFF_DIR && npm test'
alias plint='cd $PROCHEFF_DIR && npm run lint'
alias pfix='cd $PROCHEFF_DIR && npm run duzelt'
alias pformat='cd $PROCHEFF_DIR && npm run duzenle'

# Worker komutları
alias pworker='cd $PROCHEFF_DIR/ihale-worker && npm run dev'
alias pworker-clean='cd $PROCHEFF_DIR/ihale-worker && npm run dev:clean'
alias pworker-kill='cd $PROCHEFF_DIR/ihale-worker && npm run kill'

# ═══════════════════════════════════════════════════════════════════════════════════
# PORT MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════════

# Port temizleme fonksiyonları
function pkill-port() {
    local port=${1:-3000}
    echo -e "${PROCHEFF_COLOR_YELLOW}🔫 Port $port temizleniyor...${PROCHEFF_COLOR_NC}"
    lsof -ti:$port | xargs kill -9 2>/dev/null || echo "Port zaten boş"
}

function pkill-all-ports() {
    echo -e "${PROCHEFF_COLOR_RED}🔥 Tüm development portları temizleniyor...${PROCHEFF_COLOR_NC}"
    for port in 3000 3001 3002 8080 8000 5000 5173 4000; do
        pkill-port $port
    done
    echo -e "${PROCHEFF_COLOR_GREEN}✅ Tamamlandı${PROCHEFF_COLOR_NC}"
}

# Port durumu kontrolü
function pcheck-ports() {
    echo -e "${PROCHEFF_COLOR_CYAN}📊 Port Durumları:${PROCHEFF_COLOR_NC}"
    for port in 3000 3001 3002 8080; do
        if lsof -ti:$port > /dev/null 2>&1; then
            echo -e "  Port $port: ${PROCHEFF_COLOR_GREEN}● KULLANIMDA${PROCHEFF_COLOR_NC}"
        else
            echo -e "  Port $port: ${PROCHEFF_COLOR_YELLOW}○ BOŞ${PROCHEFF_COLOR_NC}"
        fi
    done
}

# ═══════════════════════════════════════════════════════════════════════════════════
# CLEANING FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════════

# Cache temizleme
alias pclean='cd $PROCHEFF_DIR && rm -rf .next out node_modules/.cache && echo -e "${PROCHEFF_COLOR_GREEN}✅ Cache temizlendi${PROCHEFF_COLOR_NC}"'

# Derin temizlik
function pclean-deep() {
    cd $PROCHEFF_DIR
    echo -e "${PROCHEFF_COLOR_YELLOW}🧹 Derin temizlik başlatılıyor...${PROCHEFF_COLOR_NC}"
    rm -rf .next out node_modules/.cache
    rm -f tsconfig.tsbuildinfo
    rm -rf logs/*.log
    echo -e "${PROCHEFF_COLOR_GREEN}✅ Derin temizlik tamamlandı${PROCHEFF_COLOR_NC}"
}

# Full reset
function preset() {
    cd $PROCHEFF_DIR
    echo -e "${PROCHEFF_COLOR_RED}⚠️  FULL RESET: node_modules dahil her şey silinecek!${PROCHEFF_COLOR_NC}"
    echo "Devam etmek için 'yes' yazın:"
    read confirm
    if [ "$confirm" = "yes" ]; then
        rm -rf node_modules package-lock.json
        rm -rf .next out
        rm -rf ihale-worker/node_modules ihale-worker/package-lock.json
        npm install
        echo -e "${PROCHEFF_COLOR_GREEN}✅ Full reset tamamlandı${PROCHEFF_COLOR_NC}"
    else
        echo "İptal edildi"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════════
# DATABASE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════════

# Database komutları
alias pdb-backup='cd $PROCHEFF_DIR && cp procheff.db procheff.db.backup.$(date +%s) && echo -e "${PROCHEFF_COLOR_GREEN}✅ DB yedeklendi${PROCHEFF_COLOR_NC}"'
alias pdb-reset='cd $PROCHEFF_DIR && rm -f procheff.db && echo -e "${PROCHEFF_COLOR_YELLOW}🗄️ DB sıfırlandı${PROCHEFF_COLOR_NC}"'

# ═══════════════════════════════════════════════════════════════════════════════════
# GIT HELPERS
# ═══════════════════════════════════════════════════════════════════════════════════

# Git kısayolları
alias pgit='cd $PROCHEFF_DIR && git status'
alias pgit-add='cd $PROCHEFF_DIR && git add .'
alias pgit-commit='cd $PROCHEFF_DIR && git commit -m'
alias pgit-push='cd $PROCHEFF_DIR && git push'
alias pgit-pull='cd $PROCHEFF_DIR && git pull'

# ═══════════════════════════════════════════════════════════════════════════════════
# QUICK INFO
# ═══════════════════════════════════════════════════════════════════════════════════

# Proje bilgisi göster
function pinfo() {
    echo -e "${PROCHEFF_COLOR_PURPLE}╔════════════════════════════════════════════╗${PROCHEFF_COLOR_NC}"
    echo -e "${PROCHEFF_COLOR_PURPLE}║        PROCHEFF-V3 PROJECT INFO            ║${PROCHEFF_COLOR_NC}"
    echo -e "${PROCHEFF_COLOR_PURPLE}╚════════════════════════════════════════════╝${PROCHEFF_COLOR_NC}"
    echo ""
    echo -e "${PROCHEFF_COLOR_CYAN}📁 Project:${PROCHEFF_COLOR_NC} $PROCHEFF_DIR"
    
    if [ -d "$PROCHEFF_DIR/.git" ]; then
        cd $PROCHEFF_DIR
        echo -e "${PROCHEFF_COLOR_CYAN}🌿 Branch:${PROCHEFF_COLOR_NC} $(git branch --show-current)"
        echo -e "${PROCHEFF_COLOR_CYAN}📊 Status:${PROCHEFF_COLOR_NC} $(git status --short | wc -l) değişiklik"
    fi
    
    if [ -f "$PROCHEFF_DIR/package.json" ]; then
        echo -e "${PROCHEFF_COLOR_CYAN}📦 Version:${PROCHEFF_COLOR_NC} $(grep '"version"' $PROCHEFF_DIR/package.json | awk -F'"' '{print $4}')"
    fi
    
    pcheck-ports
}

# Tüm alias'ları listele
function phelp() {
    echo -e "${PROCHEFF_COLOR_PURPLE}╔════════════════════════════════════════════╗${PROCHEFF_COLOR_NC}"
    echo -e "${PROCHEFF_COLOR_PURPLE}║       PROCHEFF-V3 QUICK COMMANDS           ║${PROCHEFF_COLOR_NC}"
    echo -e "${PROCHEFF_COLOR_PURPLE}╚════════════════════════════════════════════╝${PROCHEFF_COLOR_NC}"
    echo ""
    echo -e "${PROCHEFF_COLOR_CYAN}🚀 BAŞLATMA:${PROCHEFF_COLOR_NC}"
    echo "  pstart        - Development ortamını başlat"
    echo "  pstart-clean  - Cache temizleyerek başlat"
    echo "  pstop         - Tüm servisleri durdur"
    echo "  pcon          - Concurrent mode"
    echo "  pdev          - Sadece Next.js'i başlat"
    echo "  pworker       - Sadece Worker'ı başlat"
    echo ""
    echo -e "${PROCHEFF_COLOR_CYAN}📊 İZLEME:${PROCHEFF_COLOR_NC}"
    echo "  pstatus       - Servis durumları"
    echo "  plogs         - Canlı loglar"
    echo "  pmon          - Sistem monitörü"
    echo "  pinfo         - Proje bilgisi"
    echo ""
    echo -e "${PROCHEFF_COLOR_CYAN}🧹 TEMİZLİK:${PROCHEFF_COLOR_NC}"
    echo "  pclean        - Cache temizle"
    echo "  pclean-deep   - Derin temizlik"
    echo "  preset        - Full reset"
    echo "  pkill-all-ports - Tüm portları temizle"
    echo ""
    echo -e "${PROCHEFF_COLOR_CYAN}📁 NAVİGASYON:${PROCHEFF_COLOR_NC}"
    echo "  pcd           - Ana dizine git"
    echo "  pcd-src       - src/ dizinine"
    echo "  pcd-app       - app/ dizinine"
    echo "  pcd-api       - api/ dizinine"
    echo ""
    echo -e "${PROCHEFF_COLOR_CYAN}🔧 GELİŞTİRME:${PROCHEFF_COLOR_NC}"
    echo "  pbuild        - Production build"
    echo "  ptest         - Testleri çalıştır"
    echo "  plint         - Linting kontrolü"
    echo "  pfix          - Linting hatalarını düzelt"
    echo "  pformat       - Kod formatlama"
    echo ""
    echo -e "${PROCHEFF_COLOR_CYAN}🗄️ DATABASE:${PROCHEFF_COLOR_NC}"
    echo "  pdb-backup    - Database yedekle"
    echo "  pdb-reset     - Database sıfırla"
    echo ""
    echo -e "${PROCHEFF_COLOR_YELLOW}💡 İpucu: Tab completion çalışır!${PROCHEFF_COLOR_NC}"
}

# ═══════════════════════════════════════════════════════════════════════════════════
# AUTO COMPLETION
# ═══════════════════════════════════════════════════════════════════════════════════

# Bash completion for pcd variations
if [ -n "$BASH_VERSION" ]; then
    complete -W "src app comp lib api worker" pcd-
fi

# Zsh completion
if [ -n "$ZSH_VERSION" ]; then
    compdef '_values "directories" src app comp lib api worker' pcd-
fi

# ═══════════════════════════════════════════════════════════════════════════════════
# INITIALIZATION
# ═══════════════════════════════════════════════════════════════════════════════════

# Welcome message when sourced
echo -e "${PROCHEFF_COLOR_GREEN}✨ Procheff-v3 development aliases yüklendi!${PROCHEFF_COLOR_NC}"
echo -e "${PROCHEFF_COLOR_CYAN}Komutları görmek için: ${PROCHEFF_COLOR_YELLOW}phelp${PROCHEFF_COLOR_NC}"

# Auto-check if in project directory
if [ "$PWD" = "$PROCHEFF_DIR" ]; then
    echo -e "${PROCHEFF_COLOR_PURPLE}📍 Proje dizinindesiniz${PROCHEFF_COLOR_NC}"
fi
