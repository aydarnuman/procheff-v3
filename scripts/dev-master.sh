#!/bin/bash

# ╔═══════════════════════════════════════════════════════════════════════════════════╗
# ║                           PROCHEFF-V3 MASTER DEVELOPER SCRIPT                      ║
# ║                     All-in-One Development Environment Manager                      ║
# ╚═══════════════════════════════════════════════════════════════════════════════════╝

set -e

# Terminal Colors & Emojis
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'
NC='\033[0m'
BOLD='\033[1m'
UNDERLINE='\033[4m'

# Configuration
MAIN_PORT=3000
WORKER_PORT=8080
API_PORT=3001
MONITORING_PORT=3002
LOG_DIR="logs"
TEMP_DIR=".tmp"
PID_FILE=".tmp/dev-master.pid"

# Project Paths
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKER_DIR="$PROJECT_ROOT/ihale-worker"

# ═══════════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════════

function show_banner() {
    clear
    echo -e "${PURPLE}${BOLD}"
    cat << 'EOF'
    ____                  __           ________  ___    ___
   / __ \________  ______/ /_  ___  __/ __/ __/  |  |  /  /
  / /_/ / ___/ _ \/ ___/ __ \/ _ \/ /_/ /_/ /_    | | /  / 
 / ____/ /  /  __/ /__/ / / /  __/ __/ __/ __/    | |/  /  
/_/   /_/   \___/\___/_/ /_/\___/_/ /_/ /_/       |___/   
                                                           
               ⚡ MASTER DEVELOPMENT ENVIRONMENT ⚡
EOF
    echo -e "${NC}"
    echo -e "${GRAY}═══════════════════════════════════════════════════════════════════${NC}"
}

function spinner() {
    local pid=$1
    local message=$2
    local spinstr='⠋⠙⠸⠴⠦⠇'
    local i=0
    
    while kill -0 $pid 2>/dev/null; do
        printf "\r${CYAN}%s ${message}...${NC}" "${spinstr:$i:1}"
        i=$(( (i+1) % ${#spinstr} ))
        sleep 0.1
    done
    printf "\r"
}

function log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

function log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

function log_error() {
    echo -e "${RED}❌ $1${NC}"
}

function log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

function create_dirs() {
    mkdir -p "$LOG_DIR" "$TEMP_DIR"
}

# ═══════════════════════════════════════════════════════════════════════════════════
# PORT MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════════

function check_port() {
    local port=$1
    if lsof -ti:$port > /dev/null 2>&1; then
        return 0  # Port in use
    else
        return 1  # Port free
    fi
}

function kill_port() {
    local port=$1
    local service=$2
    
    if check_port $port; then
        log_warning "Port $port kullanımda, $service için temizleniyor..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

function kill_all_ports() {
    log_info "Tüm portlar temizleniyor..."
    
    local ports=($MAIN_PORT $WORKER_PORT $API_PORT $MONITORING_PORT 3003 3004 4000 5000 5173 8000 8001)
    
    for port in "${ports[@]}"; do
        if check_port $port; then
            kill_port $port "Port $port"
        fi
    done
    
    log_success "Portlar temizlendi"
}

# ═══════════════════════════════════════════════════════════════════════════════════
# PROCESS MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════════

function kill_node_processes() {
    log_info "Node processler temizleniyor..."
    
    # Kill specific processes
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "tsx.*server.ts" 2>/dev/null || true
    pkill -f "node.*procheff" 2>/dev/null || true
    pkill -f "npm.*dev" 2>/dev/null || true
    pkill -f "npm.*start" 2>/dev/null || true
    
    sleep 2
    log_success "Node processler temizlendi"
}

function clean_cache() {
    log_info "Cache temizleniyor..."
    
    # Next.js cache
    rm -rf .next 2>/dev/null || true
    rm -rf out 2>/dev/null || true
    
    # Node modules cache
    rm -rf node_modules/.cache 2>/dev/null || true
    
    # TypeScript cache
    rm -f tsconfig.tsbuildinfo 2>/dev/null || true
    
    # Temp files
    rm -rf $TEMP_DIR/* 2>/dev/null || true
    
    log_success "Cache temizlendi"
}

# ═══════════════════════════════════════════════════════════════════════════════════
# SERVICE STARTERS
# ═══════════════════════════════════════════════════════════════════════════════════

function start_main_server() {
    log_info "Ana uygulama başlatılıyor (Port: $MAIN_PORT)..."
    
    cd "$PROJECT_ROOT"
    
    # Start in background with log redirect
    npm run dev > "$LOG_DIR/main.log" 2>&1 &
    local pid=$!
    echo "$pid" > "$TEMP_DIR/main.pid"
    
    # Wait for server to start
    local retries=0
    while ! check_port $MAIN_PORT && [ $retries -lt 30 ]; do
        sleep 1
        retries=$((retries + 1))
    done
    
    if check_port $MAIN_PORT; then
        log_success "Ana uygulama başlatıldı → http://localhost:$MAIN_PORT"
    else
        log_error "Ana uygulama başlatılamadı!"
        return 1
    fi
}

function start_worker() {
    log_info "İhale Worker başlatılıyor (Port: $WORKER_PORT)..."
    
    if [ ! -d "$WORKER_DIR" ]; then
        log_warning "İhale Worker dizini bulunamadı, atlanıyor..."
        return 0
    fi
    
    cd "$WORKER_DIR"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        npm install > "$LOG_DIR/worker-install.log" 2>&1
    fi
    
    # Start worker
    npm run dev > "$LOG_DIR/worker.log" 2>&1 &
    local pid=$!
    echo "$pid" > "$TEMP_DIR/worker.pid"
    
    # Wait for worker to start
    local retries=0
    while ! check_port $WORKER_PORT && [ $retries -lt 20 ]; do
        sleep 1
        retries=$((retries + 1))
    done
    
    if check_port $WORKER_PORT; then
        log_success "İhale Worker başlatıldı → http://localhost:$WORKER_PORT"
    else
        log_warning "İhale Worker başlatılamadı (opsiyonel)"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════════
# MONITORING & LOGS
# ═══════════════════════════════════════════════════════════════════════════════════

function show_status() {
    echo ""
    echo -e "${CYAN}${BOLD}📊 SYSTEM STATUS${NC}"
    echo -e "${GRAY}═══════════════════════════════════════════════════════════════════${NC}"
    
    # Port status
    echo -e "${WHITE}Port Durumları:${NC}"
    
    if check_port $MAIN_PORT; then
        echo -e "  ${GREEN}● Ana Uygulama (Port $MAIN_PORT): ÇALIşIYOR${NC}"
    else
        echo -e "  ${RED}○ Ana Uygulama (Port $MAIN_PORT): DURDU${NC}"
    fi
    
    if check_port $WORKER_PORT; then
        echo -e "  ${GREEN}● İhale Worker (Port $WORKER_PORT): ÇALIŞIYOR${NC}"
    else
        echo -e "  ${YELLOW}○ İhale Worker (Port $WORKER_PORT): DURDU${NC}"
    fi
    
    # System resources
    echo -e "\n${WHITE}Sistem Kaynakları:${NC}"
    
    # CPU Usage (macOS compatible)
    local cpu_usage=$(top -l 1 -n 0 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')
    echo -e "  CPU: ${CYAN}$cpu_usage%${NC}"
    
    # Memory info
    local mem_info=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
    local mem_free=$((mem_info * 4096 / 1024 / 1024))
    echo -e "  Free Memory: ${CYAN}${mem_free}MB${NC}"
    
    # Process count
    local proc_count=$(ps aux | grep -E "node|npm" | grep -v grep | wc -l | tr -d ' ')
    echo -e "  Node Processes: ${CYAN}$proc_count${NC}"
}

function tail_logs() {
    echo ""
    echo -e "${CYAN}${BOLD}📋 LIVE LOGS (Ctrl+C to stop)${NC}"
    echo -e "${GRAY}═══════════════════════════════════════════════════════════════════${NC}"
    
    # Create log files if they don't exist
    touch "$LOG_DIR/main.log" "$LOG_DIR/worker.log" 2>/dev/null
    
    # Use multitail if available, otherwise fallback to tail
    if command -v multitail &> /dev/null; then
        multitail -s 2 \
            -l "tail -f $LOG_DIR/main.log" \
            -l "tail -f $LOG_DIR/worker.log"
    else
        tail -f "$LOG_DIR/main.log" "$LOG_DIR/worker.log" 2>/dev/null
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════════
# MAIN COMMANDS
# ═══════════════════════════════════════════════════════════════════════════════════

function cmd_start() {
    show_banner
    
    echo -e "${CYAN}${BOLD}🚀 STARTING DEVELOPMENT ENVIRONMENT${NC}"
    echo -e "${GRAY}═══════════════════════════════════════════════════════════════════${NC}"
    
    # Prepare environment
    create_dirs
    kill_all_ports
    kill_node_processes
    
    if [[ "$1" == "--clean" ]]; then
        clean_cache
    fi
    
    # Start services
    start_main_server
    start_worker
    
    # Show final status
    show_status
    
    echo ""
    echo -e "${GREEN}${BOLD}✨ Development environment hazır!${NC}"
    echo ""
    echo -e "${WHITE}Kullanılabilir komutlar:${NC}"
    echo -e "  ${CYAN}./scripts/dev-master.sh status${NC}  - Durum kontrolü"
    echo -e "  ${CYAN}./scripts/dev-master.sh logs${NC}    - Logları görüntüle"
    echo -e "  ${CYAN}./scripts/dev-master.sh restart${NC} - Yeniden başlat"
    echo -e "  ${CYAN}./scripts/dev-master.sh stop${NC}    - Durdur"
    echo ""
    echo -e "${YELLOW}💡 Tip: Logları canlı izlemek için 'logs' komutunu kullanın${NC}"
}

function cmd_stop() {
    show_banner
    
    echo -e "${RED}${BOLD}🛑 STOPPING DEVELOPMENT ENVIRONMENT${NC}"
    echo -e "${GRAY}═══════════════════════════════════════════════════════════════════${NC}"
    
    kill_all_ports
    kill_node_processes
    
    # Kill saved PIDs
    if [ -f "$TEMP_DIR/main.pid" ]; then
        kill -9 $(cat "$TEMP_DIR/main.pid") 2>/dev/null || true
        rm "$TEMP_DIR/main.pid"
    fi
    
    if [ -f "$TEMP_DIR/worker.pid" ]; then
        kill -9 $(cat "$TEMP_DIR/worker.pid") 2>/dev/null || true
        rm "$TEMP_DIR/worker.pid"
    fi
    
    log_success "Tüm servisler durduruldu"
}

function cmd_restart() {
    cmd_stop
    sleep 2
    cmd_start "$@"
}

function cmd_clean() {
    show_banner
    
    echo -e "${BLUE}${BOLD}🧹 DEEP CLEAN${NC}"
    echo -e "${GRAY}═══════════════════════════════════════════════════════════════════${NC}"
    
    cmd_stop
    clean_cache
    
    # Deep clean
    log_info "Derin temizlik yapılıyor..."
    rm -rf node_modules 2>/dev/null || true
    rm -rf "$WORKER_DIR/node_modules" 2>/dev/null || true
    rm -f package-lock.json 2>/dev/null || true
    rm -f "$WORKER_DIR/package-lock.json" 2>/dev/null || true
    
    log_success "Derin temizlik tamamlandı"
    
    echo ""
    log_info "Yeniden başlatmak için: ./scripts/dev-master.sh start"
}

function cmd_monitor() {
    show_banner
    
    echo -e "${CYAN}${BOLD}📊 LIVE MONITORING${NC}"
    echo -e "${GRAY}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Ctrl+C ile çıkış${NC}"
    echo ""
    
    while true; do
        clear
        show_banner
        show_status
        
        echo -e "\n${WHITE}Son Log Satırları:${NC}"
        echo -e "${GRAY}───────────────────────────────────────────────────────${NC}"
        
        if [ -f "$LOG_DIR/main.log" ]; then
            echo -e "${CYAN}[Main App]${NC}"
            tail -n 3 "$LOG_DIR/main.log" 2>/dev/null || echo "  Log yok"
        fi
        
        if [ -f "$LOG_DIR/worker.log" ]; then
            echo -e "\n${CYAN}[Worker]${NC}"
            tail -n 3 "$LOG_DIR/worker.log" 2>/dev/null || echo "  Log yok"
        fi
        
        sleep 3
    done
}

function show_help() {
    show_banner
    
    echo -e "${WHITE}${BOLD}KULLANIM${NC}"
    echo -e "${GRAY}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${CYAN}./scripts/dev-master.sh${NC} ${WHITE}[komut] [opsiyonlar]${NC}"
    echo ""
    echo -e "${WHITE}${BOLD}KOMUTLAR${NC}"
    echo -e "${GRAY}───────────────────────────────────────────────────────${NC}"
    echo -e "  ${GREEN}start${NC}     Tüm servisleri başlat"
    echo -e "            ${GRAY}--clean${NC}  Cache temizleyerek başlat"
    echo -e "  ${GREEN}stop${NC}      Tüm servisleri durdur"
    echo -e "  ${GREEN}restart${NC}   Yeniden başlat"
    echo -e "  ${GREEN}status${NC}    Servis durumlarını göster"
    echo -e "  ${GREEN}logs${NC}      Canlı log takibi"
    echo -e "  ${GREEN}monitor${NC}   Canlı sistem monitörü"
    echo -e "  ${GREEN}clean${NC}     Derin temizlik (node_modules dahil)"
    echo -e "  ${GREEN}help${NC}      Bu yardım mesajını göster"
    echo ""
    echo -e "${WHITE}${BOLD}ÖRNEKLEr${NC}"
    echo -e "${GRAY}───────────────────────────────────────────────────────${NC}"
    echo -e "  ${GRAY}# Normal başlatma${NC}"
    echo -e "  ./scripts/dev-master.sh start"
    echo ""
    echo -e "  ${GRAY}# Cache temizleyerek başlat${NC}"
    echo -e "  ./scripts/dev-master.sh start --clean"
    echo ""
    echo -e "  ${GRAY}# Sistem monitörü${NC}"
    echo -e "  ./scripts/dev-master.sh monitor"
    echo ""
    echo -e "${WHITE}${BOLD}PORTLAR${NC}"
    echo -e "${GRAY}───────────────────────────────────────────────────────${NC}"
    echo -e "  ${CYAN}3000${NC}  Ana Uygulama (Next.js)"
    echo -e "  ${CYAN}8080${NC}  İhale Worker (Express)"
    echo -e "  ${CYAN}3001${NC}  API Server (Rezerve)"
    echo -e "  ${CYAN}3002${NC}  Monitoring (Rezerve)"
    echo ""
    echo -e "${YELLOW}💡 Pro Tip: 'tmux' veya 'screen' kullanarak arka planda çalıştırabilirsiniz${NC}"
}

# ═══════════════════════════════════════════════════════════════════════════════════
# MAIN ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════════

# Change to project root
cd "$PROJECT_ROOT"

# Parse command
case "${1:-help}" in
    start)
        cmd_start "${@:2}"
        ;;
    stop)
        cmd_stop
        ;;
    restart)
        cmd_restart "${@:2}"
        ;;
    status)
        show_banner
        show_status
        ;;
    logs)
        tail_logs
        ;;
    monitor)
        cmd_monitor
        ;;
    clean)
        cmd_clean
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac
