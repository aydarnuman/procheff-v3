#!/bin/bash

# ================================
# System Monitor & Performance Script
# ================================
# Sistem kaynaklarını ve projenin performansını izler

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

function show_system_info() {
    echo -e "${BLUE}🖥️  Sistem Bilgileri${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # macOS version
    echo -e "${CYAN}OS:${NC} $(sw_vers -productName) $(sw_vers -productVersion)"
    
    # CPU info
    CPU_MODEL=$(sysctl -n machdep.cpu.brand_string)
    CPU_CORES=$(sysctl -n hw.ncpu)
    echo -e "${CYAN}CPU:${NC} $CPU_MODEL ($CPU_CORES cores)"
    
    # Memory info
    MEMORY_GB=$(($(sysctl -n hw.memsize) / 1024 / 1024 / 1024))
    echo -e "${CYAN}Memory:${NC} ${MEMORY_GB}GB"
    
    # Disk usage
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 " used)"}')
    echo -e "${CYAN}Disk:${NC} $DISK_USAGE"
    
    echo ""
}

function show_resource_usage() {
    echo -e "${BLUE}📊 Kaynak Kullanımı${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # CPU usage
    CPU_USAGE=$(top -l 1 -n 0 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')
    echo -e "${CYAN}CPU Usage:${NC} $CPU_USAGE%"
    
    # Memory usage
    MEMORY_PRESSURE=$(memory_pressure | grep "System-wide memory free percentage" | awk '{print $5}' | sed 's/%//')
    if [ ! -z "$MEMORY_PRESSURE" ]; then
        MEMORY_USED=$((100 - MEMORY_PRESSURE))
        echo -e "${CYAN}Memory Usage:${NC} ${MEMORY_USED}%"
    fi
    
    # Top processes
    echo -e "\n${CYAN}Top 5 CPU Consuming Processes:${NC}"
    top -l 1 -o cpu -n 5 | tail -n +12 | head -n 5
    
    echo ""
}

function show_network_info() {
    echo -e "${BLUE}🌐 Network Bilgileri${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Network interfaces
    for interface in $(networksetup -listallhardwareports | grep "Hardware Port" | awk '{print $3}'); do
        if [[ $interface != "Bluetooth" && $interface != "Thunderbolt" ]]; then
            STATUS=$(networksetup -getinfo "$interface" | grep "IP address" | awk '{print $3}')
            if [ ! -z "$STATUS" ] && [ "$STATUS" != "none" ]; then
                echo -e "${CYAN}$interface:${NC} $STATUS"
            fi
        fi
    done
    
    # Internet connectivity test
    if ping -c 1 google.com &> /dev/null; then
        echo -e "${GREEN}✅ Internet bağlantısı aktif${NC}"
    else
        echo -e "${RED}❌ Internet bağlantısı yok${NC}"
    fi
    
    echo ""
}

function show_dev_status() {
    echo -e "${BLUE}⚡ Development Status${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Node.js version
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        echo -e "${CYAN}Node.js:${NC} $NODE_VERSION"
    fi
    
    # npm version
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        echo -e "${CYAN}npm:${NC} $NPM_VERSION"
    fi
    
    # Git status
    if [ -d ".git" ]; then
        BRANCH=$(git branch --show-current)
        COMMITS_AHEAD=$(git rev-list --count HEAD ^origin/$BRANCH 2>/dev/null || echo "0")
        echo -e "${CYAN}Git Branch:${NC} $BRANCH"
        if [ "$COMMITS_AHEAD" -gt "0" ]; then
            echo -e "${YELLOW}⚠️  $COMMITS_AHEAD commits ahead of origin${NC}"
        fi
    fi
    
    # Project specific checks
    if [ -f "package.json" ]; then
        if [ -d "node_modules" ]; then
            echo -e "${GREEN}✅ Dependencies kurulu${NC}"
        else
            echo -e "${RED}❌ Dependencies eksik (npm install çalıştırın)${NC}"
        fi
        
        if [ -f ".env.local" ]; then
            echo -e "${GREEN}✅ Environment dosyası mevcut${NC}"
        else
            echo -e "${YELLOW}⚠️  .env.local dosyası eksik${NC}"
        fi
    fi
    
    # Check running processes
    if pgrep -f "next dev" > /dev/null; then
        echo -e "${GREEN}✅ Next.js dev server çalışıyor${NC}"
    else
        echo -e "${YELLOW}⏸️  Next.js dev server durdu${NC}"
    fi
    
    echo ""
}

function show_project_stats() {
    echo -e "${BLUE}📈 Proje İstatistikleri${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ -d "src" ]; then
        # File counts
        TS_FILES=$(find src -name "*.ts" -o -name "*.tsx" | wc -l | tr -d ' ')
        JS_FILES=$(find src -name "*.js" -o -name "*.jsx" | wc -l | tr -d ' ')
        CSS_FILES=$(find src -name "*.css" -o -name "*.scss" | wc -l | tr -d ' ')
        
        echo -e "${CYAN}TypeScript dosyaları:${NC} $TS_FILES"
        echo -e "${CYAN}JavaScript dosyaları:${NC} $JS_FILES"
        echo -e "${CYAN}CSS dosyaları:${NC} $CSS_FILES"
        
        # Lines of code
        if command -v cloc &> /dev/null; then
            echo -e "\n${CYAN}Kod satırları:${NC}"
            cloc src --quiet
        fi
    fi
    
    # Log files
    if [ -d "logs" ]; then
        LOG_COUNT=$(find logs -name "*.log" | wc -l | tr -d ' ')
        if [ "$LOG_COUNT" -gt "0" ]; then
            echo -e "${CYAN}Log dosyaları:${NC} $LOG_COUNT"
            LATEST_LOG=$(ls -t logs/*.log 2>/dev/null | head -1)
            if [ ! -z "$LATEST_LOG" ]; then
                LOG_SIZE=$(du -h "$LATEST_LOG" | awk '{print $1}')
                echo -e "${CYAN}Son log boyutu:${NC} $LOG_SIZE"
            fi
        fi
    fi
    
    echo ""
}

function live_monitor() {
    echo -e "${BLUE}🔴 Canlı Monitoring Başlatılıyor...${NC}"
    echo -e "${YELLOW}Çıkmak için Ctrl+C${NC}\n"
    
    while true; do
        clear
        echo -e "${PURPLE}$(date '+%Y-%m-%d %H:%M:%S') - Procheff-v3 Live Monitor${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        # Quick stats
        CPU_USAGE=$(top -l 1 -n 0 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')
        MEMORY_INFO=$(vm_stat | head -4 | tail -3)
        
        echo -e "${CYAN}CPU:${NC} $CPU_USAGE%"
        echo -e "${CYAN}Processes:${NC} $(ps aux | wc -l | tr -d ' ') running"
        
        if pgrep -f "next dev" > /dev/null; then
            echo -e "${GREEN}✅ Next.js Dev Server: RUNNING${NC}"
        else
            echo -e "${RED}❌ Next.js Dev Server: STOPPED${NC}"
        fi
        
        # Recent logs
        if [ -d "logs" ] && [ "$(ls -A logs 2>/dev/null)" ]; then
            echo -e "\n${CYAN}Son Log Girişleri:${NC}"
            tail -5 logs/*.log 2>/dev/null | tail -5
        fi
        
        sleep 5
    done
}

function show_help() {
    echo -e "${BLUE}🔧 System Monitor & Performance Script${NC}"
    echo ""
    echo -e "${YELLOW}Kullanım:${NC} ./scripts/monitor.sh [komut]"
    echo ""
    echo -e "${CYAN}Komutlar:${NC}"
    echo "  system    - Sistem bilgilerini göster"
    echo "  resources - Kaynak kullanımını göster"
    echo "  network   - Network durumunu göster"
    echo "  dev       - Development durumunu göster"
    echo "  stats     - Proje istatistiklerini göster"
    echo "  all       - Tüm bilgileri göster"
    echo "  live      - Canlı monitoring başlat"
    echo ""
}

# Ana komut işlemcisi
case "${1:-all}" in
    "system")
        show_system_info
        ;;
    "resources")
        show_resource_usage
        ;;
    "network")
        show_network_info
        ;;
    "dev")
        show_dev_status
        ;;
    "stats")
        show_project_stats
        ;;
    "all")
        show_system_info
        show_resource_usage
        show_network_info
        show_dev_status
        show_project_stats
        ;;
    "live")
        live_monitor
        ;;
    "help"|*)
        show_help
        ;;
esac