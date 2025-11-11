#!/bin/bash

# ================================
# Procheff-v3 Quick Access Setup
# ================================
# Bu script .zshrc'nize hızlı erişim alias'ları ekler

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}🚀 Procheff-v3 Hızlı Erişim Kurulumu${NC}"
echo ""

# Backup .zshrc
if [ -f "$HOME/.zshrc" ]; then
    cp "$HOME/.zshrc" "$HOME/.zshrc.backup.$(date +%s)"
    echo -e "${YELLOW}💾 .zshrc yedeklendi${NC}"
fi

# Procheff-v3 aliases'ını ekle
echo -e "${BLUE}📝 Hızlı erişim alias'ları ekleniyor...${NC}"

cat >> "$HOME/.zshrc" << 'EOF'

# ===================================
# Procheff-v3 Quick Access Aliases
# ===================================

# Ana komutlar
alias pm='cd ~/procheff-v3 && ./scripts/menu.sh'                    # Ana menü
alias pdev='cd ~/procheff-v3 && ./scripts/dev-utils.sh dev'         # Dev server
alias pbuild='cd ~/procheff-v3 && ./scripts/dev-utils.sh build'     # Build
alias ptest='cd ~/procheff-v3 && ./scripts/dev-utils.sh test'       # Test
alias plint='cd ~/procheff-v3 && ./scripts/dev-utils.sh lint'       # Lint
alias pclean='cd ~/procheff-v3 && ./scripts/dev-utils.sh clean'     # Clean

# Monitoring
alias pmon='cd ~/procheff-v3 && ./scripts/monitor.sh all'           # Tüm bilgiler
alias plive='cd ~/procheff-v3 && ./scripts/monitor.sh live'         # Canlı monitoring
alias pstats='cd ~/procheff-v3 && ./scripts/monitor.sh stats'       # Proje stats

# Git helpers
alias pgs='cd ~/procheff-v3 && ./scripts/git-helpers.sh status'     # Git status
alias pgc='cd ~/procheff-v3 && ./scripts/git-helpers.sh commit'     # Git commit
alias pgf='cd ~/procheff-v3 && ./scripts/git-helpers.sh feature'    # Feature branch

# Quick navigation
alias p='cd ~/procheff-v3'                                          # Proje dizinine git
alias plogs='cd ~/procheff-v3 && tail -f logs/*.log'               # Logları takip et

# Development shortcuts
alias psetup='cd ~/procheff-v3 && ./scripts/dev-utils.sh setup'     # Setup
alias preset='cd ~/procheff-v3 && ./scripts/dev-utils.sh db-reset'  # DB reset
alias pbackup='cd ~/procheff-v3 && ./scripts/dev-utils.sh backup'   # Backup

# Docker shortcuts
alias pdbuild='cd ~/procheff-v3 && ./scripts/docker-build.sh'       # Docker build
alias pdeploy='cd ~/procheff-v3 && ./scripts/deploy-digitalocean.sh' # Deploy

# Terminal setup
alias pterminal='cd ~/procheff-v3 && ./scripts/terminal-setup.sh'   # Terminal setup
alias pohmyzsh='cd ~/procheff-v3 && ./scripts/setup-ohmyzsh.sh'     # Oh My Zsh

# Quick functions
procheff() {
    case "$1" in
        "menu"|"m")     cd ~/procheff-v3 && ./scripts/menu.sh ;;
        "dev"|"d")      cd ~/procheff-v3 && ./scripts/dev-utils.sh dev ;;
        "build"|"b")    cd ~/procheff-v3 && ./scripts/dev-utils.sh build ;;
        "test"|"t")     cd ~/procheff-v3 && ./scripts/dev-utils.sh test ;;
        "monitor"|"mon") cd ~/procheff-v3 && ./scripts/monitor.sh live ;;
        "status"|"s")   cd ~/procheff-v3 && ./scripts/git-helpers.sh status ;;
        "clean"|"c")    cd ~/procheff-v3 && ./scripts/dev-utils.sh clean ;;
        "logs"|"l")     cd ~/procheff-v3 && tail -f logs/*.log ;;
        *)              cd ~/procheff-v3 && ./scripts/menu.sh ;;
    esac
}

# Tab completion for procheff function
if command -v compdef > /dev/null; then
    compdef '_arguments "1:command:(menu dev build test monitor status clean logs m d b t mon s c l)"' procheff
fi

# Help function
phelp() {
    echo -e "\033[0;34m🚀 Procheff-v3 Hızlı Komutlar:\033[0m"
    echo ""
    echo -e "\033[1;33mAna Komutlar:\033[0m"
    echo "  pm        - Ana menü"
    echo "  pdev      - Development server"
    echo "  pbuild    - Production build"
    echo "  ptest     - Test suite"
    echo "  pmon      - Sistem monitoring"
    echo "  plive     - Canlı monitoring"
    echo ""
    echo -e "\033[1;33mGit:\033[0m"
    echo "  pgs       - Git status"
    echo "  pgc       - Git commit"
    echo "  pgf       - Feature branch"
    echo ""
    echo -e "\033[1;33mYardımcılar:\033[0m"
    echo "  p         - Proje dizinine git"
    echo "  plogs     - Logları takip et"
    echo "  pclean    - Cache temizle"
    echo "  pbackup   - Backup al"
    echo ""
    echo -e "\033[1;33mUniversal Function:\033[0m"
    echo "  procheff menu     - Ana menü"
    echo "  procheff dev      - Development"
    echo "  procheff monitor  - Monitoring"
    echo "  procheff status   - Git status"
    echo ""
}

EOF

echo -e "${GREEN}✅ Hızlı erişim alias'ları eklendi!${NC}"
echo ""
echo -e "${CYAN}🔄 Değişiklikleri aktif etmek için:${NC}"
echo "source ~/.zshrc"
echo ""
echo -e "${CYAN}💡 Kullanım örnekleri:${NC}"
echo "  pm          # Ana menü"
echo "  pdev        # Development server"
echo "  pmon        # Monitoring"
echo "  procheff m  # Ana menü (kısa)"
echo "  phelp       # Tüm komutları göster"
echo ""