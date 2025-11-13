#!/bin/bash

# 🔍 ProChef V3 Log Monitor
# Sürekli log takibi ve sistem durumu kontrolü

echo "🚀 ProChef V3 Log Monitor Başlatılıyor..."
echo "================================"
echo ""

# Renkli output için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log dosyası kontrolü
if [ ! -f "server.log" ]; then
    echo -e "${YELLOW}⚠️  server.log bulunamadı, oluşturuluyor...${NC}"
    touch server.log
fi

# Sistem durumu fonksiyonu
check_status() {
    echo -e "${BLUE}📊 Sistem Durumu:${NC}"
    
    # Server kontrolü
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Server: ÇALIŞIYOR${NC}"
    else
        echo -e "${RED}❌ Server: KAPALI${NC}"
    fi
    
    # Worker kontrolü
    if pgrep -f "ihale-worker" > /dev/null; then
        echo -e "${GREEN}✅ Worker: ÇALIŞIYOR${NC}"
    else
        echo -e "${YELLOW}⚠️  Worker: KAPALI${NC}"
    fi
    
    # Database kontrolü
    if [ -f "procheff.db" ]; then
        SIZE=$(du -h procheff.db | cut -f1)
        echo -e "${GREEN}✅ Database: $SIZE${NC}"
    else
        echo -e "${RED}❌ Database: BULUNAMADI${NC}"
    fi
    
    # Memory kullanımı
    if command -v node &> /dev/null; then
        NODE_MEM=$(ps aux | grep -E "node|next" | awk '{sum+=$4} END {printf "%.1f", sum}')
        echo -e "${BLUE}💾 Node Memory: ${NODE_MEM}%${NC}"
    fi
    
    echo "--------------------------------"
}

# İlk durum kontrolü
check_status

echo -e "\n${YELLOW}📝 Log Takibi Başlıyor...${NC}"
echo "================================"
echo ""

# Log takibi ve periyodik durum kontrolü
(
    while true; do
        sleep 30
        echo -e "\n${BLUE}[$(date '+%H:%M:%S')] Otomatik Durum Kontrolü:${NC}"
        check_status
    done
) &

# Ana log takibi
tail -f server.log 2>/dev/null | while IFS= read -r line; do
    # Renklendirme
    if echo "$line" | grep -q "ERROR\|❌\|failed\|crash\|FATAL"; then
        echo -e "${RED}❌ $line${NC}"
    elif echo "$line" | grep -q "WARN\|⚠️\|warning"; then
        echo -e "${YELLOW}⚠️  $line${NC}"
    elif echo "$line" | grep -q "✅\|success\|completed"; then
        echo -e "${GREEN}✅ $line${NC}"
    elif echo "$line" | grep -q "🔄\|processing\|starting"; then
        echo -e "${BLUE}🔄 $line${NC}"
    elif echo "$line" | grep -q "OCR\|Gemini\|Tesseract"; then
        echo -e "${BLUE}🔍 $line${NC}"
    elif echo "$line" | grep -q "Database\|Migration\|SQLite"; then
        echo -e "${GREEN}🗄️  $line${NC}"
    else
        echo "$line"
    fi
done
