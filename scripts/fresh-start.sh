#!/bin/bash

# ================================
# Procheff-v3 Fresh Start Script
# ================================
# Her şeyi temizleyip fresh dev ortamı başlatır
# Kullanım: ./scripts/fresh-start.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

function show_banner() {
    echo -e "${PURPLE}"
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════════════╗
║                        FRESH START SCRIPT                           ║
║                   Kill → Clean → Restart → Launch                   ║
╚══════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

function kill_processes() {
    echo -e "${RED}🔪 Running processes kill ediliyor...${NC}"
    
    # Next.js dev server
    if pgrep -f "next dev" > /dev/null; then
        echo -e "${YELLOW}  📦 Next.js dev server durduruluyor...${NC}"
        pkill -f "next dev" 2>/dev/null || true
        sleep 2
    else
        echo -e "${GREEN}  ✅ Next.js dev server zaten durmuş${NC}"
    fi
    
    # Node processes on common ports
    PORTS=(3000 3001 8000 8080 5000 5173 4000)
    
    for port in "${PORTS[@]}"; do
        PID=$(lsof -ti tcp:$port 2>/dev/null || echo "")
        if [ ! -z "$PID" ]; then
            echo -e "${YELLOW}  🔌 Port $port'u kullanan process ($PID) durduruluyor...${NC}"
            kill -9 $PID 2>/dev/null || true
        fi
    done
    
    # Other Node.js processes
    if pgrep -f "node" > /dev/null; then
        echo -e "${YELLOW}  🟢 Diğer Node.js processes durduruluyor...${NC}"
        pkill -f "node.*procheff" 2>/dev/null || true
        pkill -f "npm.*dev" 2>/dev/null || true
        pkill -f "npm.*start" 2>/dev/null || true
    fi
    
    # VS Code terminal processes
    pkill -f "code.*procheff" 2>/dev/null || true
    
    echo -e "${GREEN}✅ Processes temizlendi!${NC}"
}

function clean_cache() {
    echo -e "${BLUE}🧹 Cache temizleniyor...${NC}"
    
    # Next.js cache
    if [ -d ".next" ]; then
        echo -e "${YELLOW}  📁 .next klasörü siliniyor...${NC}"
        rm -rf .next
    fi
    
    # Build output
    if [ -d "out" ]; then
        echo -e "${YELLOW}  📁 out klasörü siliniyor...${NC}"
        rm -rf out
    fi
    
    # Node modules cache
    if [ -d "node_modules/.cache" ]; then
        echo -e "${YELLOW}  💾 node_modules/.cache siliniyor...${NC}"
        rm -rf node_modules/.cache
    fi
    
    # npm cache
    echo -e "${YELLOW}  📦 npm cache temizleniyor...${NC}"
    npm cache clean --force 2>/dev/null || true
    
    # Temporary files
    rm -f *.log 2>/dev/null || true
    rm -f .env.local.backup.* 2>/dev/null || true
    
    # Next.js lock files
    rm -f .next/dev/lock 2>/dev/null || true
    
    echo -e "${GREEN}✅ Cache temizlendi!${NC}"
}

function clean_zombies() {
    echo -e "${PURPLE}👻 Zombie processes temizleniyor...${NC}"
    
    # Find and kill zombie processes
    ZOMBIES=$(ps aux | grep '[Zz]ombie\|<defunct>' | grep -v grep | wc -l | tr -d ' ')
    
    if [ "$ZOMBIES" -gt "0" ]; then
        echo -e "${YELLOW}  🧟 $ZOMBIES zombie process bulundu, temizleniyor...${NC}"
        
        # Kill parent processes that might have zombie children
        ps aux | grep '[Zz]ombie\|<defunct>' | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true
        
        # Wait and recheck
        sleep 2
        REMAINING=$(ps aux | grep '[Zz]ombie\|<defunct>' | grep -v grep | wc -l | tr -d ' ')
        if [ "$REMAINING" -gt "0" ]; then
            echo -e "${YELLOW}  ⚠️  $REMAINING zombie kaldı (normal olabilir)${NC}"
        else
            echo -e "${GREEN}  ✅ Tüm zombiler temizlendi!${NC}"
        fi
    else
        echo -e "${GREEN}  ✅ Zombie process bulunamadı${NC}"
    fi
}

function reset_database() {
    echo -e "${CYAN}🗄️ Database sıfırlanıyor...${NC}"
    
    # Backup existing DB if exists
    if [ -f "procheff.db" ]; then
        BACKUP_NAME="procheff.db.backup.$(date +%s)"
        echo -e "${YELLOW}  💾 Mevcut DB yedekleniyor: $BACKUP_NAME${NC}"
        cp procheff.db "$BACKUP_NAME"
        rm -f procheff.db
    fi
    
    # Clear logs
    if [ -d "logs" ]; then
        echo -e "${YELLOW}  📋 Log dosyaları temizleniyor...${NC}"
        rm -f logs/*.log 2>/dev/null || true
    else
        mkdir -p logs
    fi
    
    echo -e "${GREEN}✅ Database sıfırlandı!${NC}"
}

function check_dependencies() {
    echo -e "${BLUE}📦 Dependencies kontrol ediliyor...${NC}"
    
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}  📥 node_modules bulunamadı, installing...${NC}"
        npm install
    else
        echo -e "${GREEN}  ✅ Dependencies OK${NC}"
    fi
    
    # Check environment file
    if [ ! -f ".env.local" ]; then
        echo -e "${YELLOW}  ⚙️  .env.local oluşturuluyor...${NC}"
        if [ -f ".env.example" ]; then
            cp .env.example .env.local
        else
            echo "# Procheff-v3 Environment Variables" > .env.local
        fi
    else
        echo -e "${GREEN}  ✅ Environment file OK${NC}"
    fi
}

function start_dev_server() {
    echo -e "${GREEN}🚀 Dev server başlatılıyor...${NC}"
    
    # Final check - make sure no processes are running
    if pgrep -f "next dev" > /dev/null; then
        echo -e "${YELLOW}  ⚠️  Hala çalışan process var, tekrar durduruluyor...${NC}"
        pkill -f "next dev" 2>/dev/null || true
        sleep 3
    fi
    
    # Remove any remaining lock files
    rm -f .next/dev/lock 2>/dev/null || true
    
    echo -e "${CYAN}  🌟 Fresh development server başlatılıyor...${NC}"
    echo -e "${PURPLE}  📱 http://localhost:3000 adresinde açılacak${NC}"
    echo -e "${YELLOW}  ⚠️  Durdurmak için Ctrl+C kullanın${NC}"
    echo ""
    
    # Start in background and show output
    npm run dev
}

function show_summary() {
    echo ""
    echo -e "${GREEN}🎉 Fresh Start Tamamlandı!${NC}"
    echo ""
    echo -e "${CYAN}📊 Özet:${NC}"
    echo -e "  🔪 Processes killed"
    echo -e "  🧹 Cache cleaned"  
    echo -e "  👻 Zombies eliminated"
    echo -e "  🗄️ Database reset"
    echo -e "  📦 Dependencies checked"
    echo -e "  🚀 Dev server started"
    echo ""
    echo -e "${PURPLE}💡 Development server: http://localhost:3000${NC}"
    echo -e "${YELLOW}⚠️  Durdurmak için: Ctrl+C${NC}"
    echo ""
}

function confirm_action() {
    echo -e "${YELLOW}⚠️  Bu işlem şunları yapacak:${NC}"
    echo "  • Tüm running processes'i kill edecek"
    echo "  • Cache'leri temizleyecek" 
    echo "  • Zombie processes'leri temizleyecek"
    echo "  • Database'i sıfırlayacak (yedek alınacak)"
    echo "  • Fresh dev server başlatacak"
    echo ""
    echo -e "${RED}❓ Devam etmek istiyor musunuz? (y/n)${NC}"
    read -r CONFIRM
    
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}🚪 İşlem iptal edildi${NC}"
        exit 0
    fi
}

# Ana script
function main() {
    show_banner
    
    # Quick mode check
    if [[ "$1" == "--quick" || "$1" == "-q" ]]; then
        echo -e "${BLUE}⚡ Quick mode: Onay istenmeyecek${NC}"
    else
        confirm_action
    fi
    
    echo ""
    echo -e "${BLUE}🔄 Fresh start işlemi başlatılıyor...${NC}"
    echo ""
    
    kill_processes
    clean_cache  
    clean_zombies
    reset_database
    check_dependencies
    
    show_summary
    
    echo -e "${GREEN}▶️  Dev server başlatılıyor...${NC}"
    sleep 2
    
    start_dev_server
}

# Help function
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo -e "${BLUE}🚀 Fresh Start Script${NC}"
    echo ""
    echo -e "${YELLOW}Kullanım:${NC}"
    echo "  ./scripts/fresh-start.sh           # Normal mode (onay ister)"
    echo "  ./scripts/fresh-start.sh --quick   # Quick mode (onay istemez)" 
    echo "  ./scripts/fresh-start.sh --help    # Bu yardımı göster"
    echo ""
    echo -e "${CYAN}Ne yapar:${NC}"
    echo "  🔪 Running processes'i kill eder"
    echo "  🧹 Cache'leri temizler"
    echo "  👻 Zombie processes'leri öldürür"  
    echo "  🗄️ Database'i sıfırlar (yedek alır)"
    echo "  🚀 Fresh dev server başlatır"
    echo ""
    exit 0
fi

# Run main function
main "$@"