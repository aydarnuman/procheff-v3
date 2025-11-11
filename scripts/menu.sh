#!/bin/bash

# ================================
# Procheff-v3 Scripts Menu
# ================================
# Tüm scriptlerin tek yerden yönetilmesi

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

function show_banner() {
    echo -e "${BLUE}"
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════════════╗
║                         PROCHEFF-V3 SCRIPTS                         ║
║                    AI-Powered Procurement Analysis                   ║
╚══════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

function show_main_menu() {
    echo -e "${CYAN}📋 Ana Menü${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}1.${NC} 🚀 Development - Geliştirme araçları"
    echo -e "${YELLOW}2.${NC} 📊 Monitoring - Sistem izleme"
    echo -e "${YELLOW}3.${NC} 📋 Git Tools - Git yardımcıları"
    echo -e "${YELLOW}4.${NC} ⚙️  Setup - Terminal kurulum"
    echo -e "${YELLOW}5.${NC} 🐳 Docker - Container yönetimi"
    echo -e "${YELLOW}6.${NC} 📦 Deploy - Deployment işlemleri"
    echo -e "${YELLOW}7.${NC} 🔧 Utils - Yararlı araçlar"
    echo -e "${YELLOW}8.${NC} ❓ Help - Yardım ve dokümantasyon"
    echo -e "${YELLOW}0.${NC} 🚪 Exit - Çıkış"
    echo ""
    echo -e "${BLUE}Seçiminizi yapın (0-8):${NC}"
}

function development_menu() {
    clear
    show_banner
    echo -e "${CYAN}🚀 Development Tools${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}1.${NC} Setup - Geliştirme ortamı kurulumu"
    echo -e "${YELLOW}2.${NC} Dev - Development server başlat"
    echo -e "${YELLOW}3.${NC} Build - Production build"
    echo -e "${YELLOW}4.${NC} Test - Test suite çalıştır"
    echo -e "${YELLOW}5.${NC} Lint - Code linting"
    echo -e "${YELLOW}6.${NC} TypeCheck - TypeScript kontrol"
    echo -e "${YELLOW}7.${NC} Clean - Cache temizle"
    echo -e "${YELLOW}8.${NC} DB Reset - Veritabanı sıfırla"
    echo -e "${YELLOW}9.${NC} Logs - Development logları"
    echo -e "${YELLOW}0.${NC} Back - Ana menüye dön"
    echo ""
    echo -e "${BLUE}Seçiminizi yapın:${NC}"
    
    read -r choice
    case $choice in
        1) ./scripts/dev-utils.sh setup ;;
        2) ./scripts/dev-utils.sh dev ;;
        3) ./scripts/dev-utils.sh build ;;
        4) ./scripts/dev-utils.sh test ;;
        5) ./scripts/dev-utils.sh lint ;;
        6) ./scripts/dev-utils.sh typecheck ;;
        7) ./scripts/dev-utils.sh clean ;;
        8) ./scripts/dev-utils.sh db-reset ;;
        9) ./scripts/dev-utils.sh logs ;;
        0) return ;;
        *) echo -e "${RED}❌ Geçersiz seçim!${NC}" ;;
    esac
    
    if [ "$choice" != "0" ]; then
        echo -e "\n${YELLOW}Devam etmek için Enter'a basın...${NC}"
        read -r
        development_menu
    fi
}

function monitoring_menu() {
    clear
    show_banner
    echo -e "${CYAN}📊 System Monitoring${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}1.${NC} System - Sistem bilgileri"
    echo -e "${YELLOW}2.${NC} Resources - Kaynak kullanımı"
    echo -e "${YELLOW}3.${NC} Network - Network durumu"
    echo -e "${YELLOW}4.${NC} Dev Status - Development durumu"
    echo -e "${YELLOW}5.${NC} Project Stats - Proje istatistikleri"
    echo -e "${YELLOW}6.${NC} All Info - Tüm bilgiler"
    echo -e "${YELLOW}7.${NC} Live Monitor - Canlı monitoring"
    echo -e "${YELLOW}0.${NC} Back - Ana menüye dön"
    echo ""
    echo -e "${BLUE}Seçiminizi yapın:${NC}"
    
    read -r choice
    case $choice in
        1) ./scripts/monitor.sh system ;;
        2) ./scripts/monitor.sh resources ;;
        3) ./scripts/monitor.sh network ;;
        4) ./scripts/monitor.sh dev ;;
        5) ./scripts/monitor.sh stats ;;
        6) ./scripts/monitor.sh all ;;
        7) ./scripts/monitor.sh live ;;
        0) return ;;
        *) echo -e "${RED}❌ Geçersiz seçim!${NC}" ;;
    esac
    
    if [ "$choice" != "0" ] && [ "$choice" != "7" ]; then
        echo -e "\n${YELLOW}Devam etmek için Enter'a basın...${NC}"
        read -r
        monitoring_menu
    fi
}

function git_menu() {
    clear
    show_banner
    echo -e "${CYAN}📋 Git Tools${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}1.${NC} Status - Git durumu"
    echo -e "${YELLOW}2.${NC} Quick Commit - Hızlı commit"
    echo -e "${YELLOW}3.${NC} New Feature - Feature branch oluştur"
    echo -e "${YELLOW}4.${NC} Merge Feature - Feature'ı merge et"
    echo -e "${YELLOW}5.${NC} Hotfix - Hotfix branch oluştur"
    echo -e "${YELLOW}6.${NC} Merge Hotfix - Hotfix'i merge et"
    echo -e "${YELLOW}7.${NC} Release - Version release"
    echo -e "${YELLOW}0.${NC} Back - Ana menüye dön"
    echo ""
    echo -e "${BLUE}Seçiminizi yapın:${NC}"
    
    read -r choice
    case $choice in
        1) ./scripts/git-helpers.sh status ;;
        2) 
            echo -e "${YELLOW}Commit mesajı girin:${NC}"
            read -r message
            ./scripts/git-helpers.sh commit "$message"
            ;;
        3)
            echo -e "${YELLOW}Feature adı girin:${NC}"
            read -r feature_name
            ./scripts/git-helpers.sh feature "$feature_name"
            ;;
        4) ./scripts/git-helpers.sh merge-feature ;;
        5)
            echo -e "${YELLOW}Hotfix adı girin:${NC}"
            read -r hotfix_name
            ./scripts/git-helpers.sh hotfix "$hotfix_name"
            ;;
        6) ./scripts/git-helpers.sh merge-hotfix ;;
        7)
            echo -e "${YELLOW}Version numarası girin (örn: 1.2.0):${NC}"
            read -r version
            ./scripts/git-helpers.sh release "$version"
            ;;
        0) return ;;
        *) echo -e "${RED}❌ Geçersiz seçim!${NC}" ;;
    esac
    
    if [ "$choice" != "0" ]; then
        echo -e "\n${YELLOW}Devam etmek için Enter'a basın...${NC}"
        read -r
        git_menu
    fi
}

function setup_menu() {
    clear
    show_banner
    echo -e "${CYAN}⚙️ Setup Tools${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}1.${NC} Terminal Setup - Ultimate terminal kurulumu"
    echo -e "${YELLOW}2.${NC} Oh My Zsh - Oh My Zsh kurulumu"
    echo -e "${YELLOW}3.${NC} Development Env - Geliştirme ortamı"
    echo -e "${YELLOW}4.${NC} Project Backup - Proje yedeği"
    echo -e "${YELLOW}0.${NC} Back - Ana menüye dön"
    echo ""
    echo -e "${BLUE}Seçiminizi yapın:${NC}"
    
    read -r choice
    case $choice in
        1) ./scripts/terminal-setup.sh ;;
        2) ./scripts/setup-ohmyzsh.sh ;;
        3) ./scripts/dev-utils.sh setup ;;
        4) ./scripts/dev-utils.sh backup ;;
        0) return ;;
        *) echo -e "${RED}❌ Geçersiz seçim!${NC}" ;;
    esac
    
    if [ "$choice" != "0" ]; then
        echo -e "\n${YELLOW}Devam etmek için Enter'a basın...${NC}"
        read -r
        setup_menu
    fi
}

function docker_menu() {
    clear
    show_banner
    echo -e "${CYAN}🐳 Docker Tools${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}1.${NC} Build - Docker image build"
    echo -e "${YELLOW}2.${NC} PS - Container listesi"
    echo -e "${YELLOW}3.${NC} Logs - Container logları"
    echo -e "${YELLOW}4.${NC} Clean - Kullanılmayan cleanup"
    echo -e "${YELLOW}5.${NC} Compose Up - Docker compose up"
    echo -e "${YELLOW}6.${NC} Compose Down - Docker compose down"
    echo -e "${YELLOW}0.${NC} Back - Ana menüye dön"
    echo ""
    echo -e "${BLUE}Seçiminizi yapın:${NC}"
    
    read -r choice
    case $choice in
        1) ./scripts/docker-build.sh ;;
        2) docker ps -a ;;
        3) 
            echo -e "${YELLOW}Container ID girin:${NC}"
            read -r container_id
            docker logs -f "$container_id"
            ;;
        4) docker system prune -f ;;
        5) docker-compose up -d ;;
        6) docker-compose down ;;
        0) return ;;
        *) echo -e "${RED}❌ Geçersiz seçim!${NC}" ;;
    esac
    
    if [ "$choice" != "0" ] && [ "$choice" != "3" ]; then
        echo -e "\n${YELLOW}Devam etmek için Enter'a basın...${NC}"
        read -r
        docker_menu
    fi
}

function deploy_menu() {
    clear
    show_banner
    echo -e "${CYAN}📦 Deployment Tools${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}1.${NC} Production Deploy - DigitalOcean deployment"
    echo -e "${YELLOW}2.${NC} Staging Deploy - Staging environment"
    echo -e "${YELLOW}3.${NC} Build Production - Production build"
    echo -e "${YELLOW}4.${NC} Test Deploy - Deployment test"
    echo -e "${YELLOW}0.${NC} Back - Ana menüye dön"
    echo ""
    echo -e "${BLUE}Seçiminizi yapın:${NC}"
    
    read -r choice
    case $choice in
        1) ./scripts/deploy-digitalocean.sh production ;;
        2) ./scripts/deploy-digitalocean.sh staging ;;
        3) npm run build ;;
        4) echo -e "${YELLOW}Deployment test çalıştırılıyor...${NC}" && npm run build ;;
        0) return ;;
        *) echo -e "${RED}❌ Geçersiz seçim!${NC}" ;;
    esac
    
    if [ "$choice" != "0" ]; then
        echo -e "\n${YELLOW}Devam etmek için Enter'a basın...${NC}"
        read -r
        deploy_menu
    fi
}

function utils_menu() {
    clear
    show_banner
    echo -e "${CYAN}🔧 Utility Tools${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}1.${NC} Port Kill - Port'ta çalışan process'i öldür"
    echo -e "${YELLOW}2.${NC} Find Files - Dosya ara"
    echo -e "${YELLOW}3.${NC} Quick Server - HTTP server başlat"
    echo -e "${YELLOW}4.${NC} System Info - Detaylı sistem bilgisi"
    echo -e "${YELLOW}5.${NC} Weather - Hava durumu"
    echo -e "${YELLOW}6.${NC} IP Info - IP adresi bilgisi"
    echo -e "${YELLOW}0.${NC} Back - Ana menüye dön"
    echo ""
    echo -e "${BLUE}Seçiminizi yapın:${NC}"
    
    read -r choice
    case $choice in
        1) 
            echo -e "${YELLOW}Port numarası girin:${NC}"
            read -r port
            kill -9 $(lsof -ti tcp:$port) 2>/dev/null || echo "Port $port'ta çalışan process bulunamadı"
            ;;
        2) 
            echo -e "${YELLOW}Aranacak dosya adı:${NC}"
            read -r filename
            find . -name "*$filename*" -type f 2>/dev/null
            ;;
        3) 
            echo -e "${YELLOW}Port numarası (default: 8000):${NC}"
            read -r port
            port=${port:-8000}
            echo "Server başlatılıyor: http://localhost:$port"
            python3 -m http.server $port
            ;;
        4) 
            echo -e "${CYAN}Sistem Bilgileri:${NC}"
            system_profiler SPHardwareDataType SPSoftwareDataType
            ;;
        5) 
            echo -e "${YELLOW}Şehir adı girin (boş bırakın = mevcut konum):${NC}"
            read -r city
            curl -s "wttr.in/$city?format=3"
            ;;
        6) 
            echo -e "${CYAN}IP Bilgileriniz:${NC}"
            curl -s ipinfo.io
            ;;
        0) return ;;
        *) echo -e "${RED}❌ Geçersiz seçim!${NC}" ;;
    esac
    
    if [ "$choice" != "0" ] && [ "$choice" != "3" ]; then
        echo -e "\n${YELLOW}Devam etmek için Enter'a basın...${NC}"
        read -r
        utils_menu
    fi
}

function help_menu() {
    clear
    show_banner
    echo -e "${CYAN}❓ Help & Documentation${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}📖 Dokümantasyon:${NC}"
    echo "  • README.md - Proje genel bilgileri"
    echo "  • docs/ - Detaylı dokümantasyon"
    echo "  • CHANGELOG.md - Değişiklik listesi"
    echo ""
    echo -e "${YELLOW}🔧 Script Dosyaları:${NC}"
    echo "  • dev-utils.sh - Geliştirme araçları"
    echo "  • monitor.sh - Sistem monitoring"
    echo "  • git-helpers.sh - Git yardımcıları"
    echo "  • terminal-setup.sh - Terminal kurulumu"
    echo ""
    echo -e "${YELLOW}⚡ Hızlı Komutlar:${NC}"
    echo "  • ./scripts/menu.sh - Bu menüyü açar"
    echo "  • npm run dev - Development server"
    echo "  • npm run build - Production build"
    echo "  • npm test - Test suite"
    echo ""
    echo -e "${YELLOW}🌐 Linkler:${NC}"
    echo "  • GitHub: https://github.com/aydarnuman/procheff-v3"
    echo "  • Docs: /docs klasörü"
    echo ""
    echo -e "${YELLOW}Devam etmek için Enter'a basın...${NC}"
    read -r
}

function main_loop() {
    while true; do
        clear
        show_banner
        show_main_menu
        
        read -r choice
        case $choice in
            1) development_menu ;;
            2) monitoring_menu ;;
            3) git_menu ;;
            4) setup_menu ;;
            5) docker_menu ;;
            6) deploy_menu ;;
            7) utils_menu ;;
            8) help_menu ;;
            0) 
                echo -e "${GREEN}👋 Görüşürüz!${NC}"
                exit 0
                ;;
            *) 
                echo -e "${RED}❌ Geçersiz seçim! (0-8)${NC}"
                sleep 2
                ;;
        esac
    done
}

# Ana döngüyü başlat
main_loop