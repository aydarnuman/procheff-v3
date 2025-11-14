#!/bin/bash

# ╔═══════════════════════════════════════════════════════════════════════════════════╗
# ║                      PROCHEFF-V3 CONCURRENT DEVELOPMENT SCRIPT                     ║
# ║                         Runs Multiple Services Simultaneously                       ║
# ╚═══════════════════════════════════════════════════════════════════════════════════╝

set -e

# Terminal Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# Check for npx availability
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx bulunamadı. Node.js/npm kurulumu gerekli.${NC}"
    exit 1
fi

# Check for concurrently
if ! npx concurrently --version &> /dev/null 2>&1; then
    echo -e "${YELLOW}📦 'concurrently' paketi kuruluyor...${NC}"
    npm install -g concurrently
fi

function show_banner() {
    clear
    echo -e "${PURPLE}${BOLD}"
    cat << 'EOF'
   ____                                         __  
  / ___|___  _ __   ___ _   _ _ __ _ __ ___ _ __ | |_ 
 | |   / _ \| '_ \ / __| | | | '__| '__/ _ \ '_ \| __|
 | |__| (_) | | | | (__| |_| | |  | | |  __/ | | | |_ 
  \____\___/|_| |_|\___|\__,_|_|  |_|  \___|_| |_|\__|
                                                       
            🚀 PARALLEL DEVELOPMENT MODE 🚀
EOF
    echo -e "${NC}"
}

function clean_ports() {
    echo -e "${YELLOW}🔧 Portlar temizleniyor...${NC}"
    
    # Kill processes on specific ports
    for port in 3000 3001 3002 8080; do
        if lsof -ti:$port > /dev/null 2>&1; then
            echo -e "  Port $port temizleniyor..."
            lsof -ti:$port | xargs kill -9 2>/dev/null || true
        fi
    done
    
    # Kill Next.js processes
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "tsx.*server" 2>/dev/null || true
    
    sleep 2
    echo -e "${GREEN}✅ Portlar hazır${NC}"
}

function setup_environment() {
    echo -e "${BLUE}⚙️  Ortam hazırlanıyor...${NC}"
    
    # Create necessary directories
    mkdir -p logs .tmp
    
    # Check dependencies
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Dependencies kuruluyor...${NC}"
        npm install
    fi
    
    # Check environment file
    if [ ! -f ".env.local" ]; then
        echo -e "${YELLOW}📝 .env.local oluşturuluyor...${NC}"
        touch .env.local
    fi
    
    echo -e "${GREEN}✅ Ortam hazır${NC}"
}

function start_concurrent() {
    show_banner
    
    echo -e "${CYAN}${BOLD}🎯 CONCURRENT MODE BAŞLATILIYOR${NC}"
    echo ""
    
    # Clean and setup
    clean_ports
    setup_environment
    
    echo ""
    echo -e "${GREEN}🚀 Servisler başlatılıyor...${NC}"
    echo -e "${YELLOW}────────────────────────────────────────────────────────${NC}"
    echo -e "${CYAN}[MAIN]${NC}   → http://localhost:3000  ${GRAY}(Next.js App)${NC}"
    echo -e "${CYAN}[WORKER]${NC} → http://localhost:8080  ${GRAY}(İhale Worker)${NC}"
    echo -e "${YELLOW}────────────────────────────────────────────────────────${NC}"
    echo -e "${RED}Durdurmak için: Ctrl+C${NC}"
    echo ""
    
    # Start services concurrently with better formatting
    npx concurrently \
        --names "MAIN,WORKER" \
        --prefix-colors "cyan,magenta" \
        --handle-input \
        --kill-others \
        --restart-tries 3 \
        --prefix "[{name}]" \
        --timestamp-format "HH:mm:ss" \
        "npm run dev" \
        "cd ihale-worker && npm run dev" \
        || true
}

function start_with_monitoring() {
    show_banner
    
    echo -e "${CYAN}${BOLD}📊 MONITORED MODE BAŞLATILIYOR${NC}"
    echo ""
    
    clean_ports
    setup_environment
    
    echo ""
    echo -e "${GREEN}🚀 Servisler monitoring ile başlatılıyor...${NC}"
    echo ""
    
    # Start with system monitoring
    npx concurrently \
        --names "MAIN,WORKER,MONITOR" \
        --prefix-colors "cyan,magenta,yellow" \
        --handle-input \
        --kill-others \
        --restart-tries 3 \
        --prefix "[{name}]" \
        --timestamp-format "HH:mm:ss" \
        "npm run dev" \
        "cd ihale-worker && npm run dev" \
        "while true; do echo '[SYS] CPU: '$(top -l 1 | grep 'CPU usage' | awk '{print $3}')' | Memory Free: '$(vm_stat | grep 'Pages free' | awk '{print $3}'); sleep 30; done" \
        || true
}

function start_debug() {
    show_banner
    
    echo -e "${CYAN}${BOLD}🐛 DEBUG MODE BAŞLATILIYOR${NC}"
    echo ""
    
    clean_ports
    setup_environment
    
    echo ""
    echo -e "${GREEN}🔍 Debug mode ile başlatılıyor...${NC}"
    echo ""
    
    # Start with debug options
    npx concurrently \
        --names "MAIN:DEBUG,WORKER:DEBUG" \
        --prefix-colors "cyan,magenta" \
        --handle-input \
        --kill-others \
        --restart-tries 0 \
        --prefix "[{name}]" \
        --timestamp-format "HH:mm:ss" \
        "NODE_OPTIONS='--inspect' npm run dev" \
        "cd ihale-worker && NODE_OPTIONS='--inspect=9230' npm run dev" \
        || true
    
    echo ""
    echo -e "${YELLOW}Debug Portları:${NC}"
    echo -e "  Main App: chrome://inspect → localhost:9229"
    echo -e "  Worker: chrome://inspect → localhost:9230"
}

function show_help() {
    show_banner
    
    echo -e "${CYAN}${BOLD}KULLANIM${NC}"
    echo -e "  ./scripts/dev-concurrent.sh [mode]"
    echo ""
    echo -e "${CYAN}${BOLD}MODLAR${NC}"
    echo -e "  ${GREEN}default${NC}    Normal concurrent başlatma"
    echo -e "  ${GREEN}monitor${NC}    Sistem monitoring ile başlat"
    echo -e "  ${GREEN}debug${NC}      Debug mode ile başlat"
    echo -e "  ${GREEN}help${NC}       Bu yardımı göster"
    echo ""
    echo -e "${CYAN}${BOLD}ÖRNEKLER${NC}"
    echo -e "  ./scripts/dev-concurrent.sh"
    echo -e "  ./scripts/dev-concurrent.sh monitor"
    echo -e "  ./scripts/dev-concurrent.sh debug"
    echo ""
    echo -e "${YELLOW}💡 Tip: tmux veya screen ile arka planda çalıştırabilirsiniz${NC}"
}

# Main execution
case "${1:-default}" in
    default|start)
        start_concurrent
        ;;
    monitor)
        start_with_monitoring
        ;;
    debug)
        start_debug
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Bilinmeyen komut: $1${NC}"
        show_help
        exit 1
        ;;
esac
