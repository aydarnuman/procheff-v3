#!/bin/bash

# ================================
# Global Commands Setup
# ================================
# Bu script komutları global olarak erişilebilir hale getirir

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Procheff project path
PROCHEFF_PATH="/Users/numanaydar/procheff-v3"

echo -e "${BLUE}🌐 Global Commands Kurulumu${NC}"
echo ""

# Create global bin directory if it doesn't exist
mkdir -p "$HOME/.local/bin"

# Create global wrapper scripts
echo -e "${YELLOW}📝 Global komutlar oluşturuluyor...${NC}"

# Procheff Menu
cat > "$HOME/.local/bin/procheff" << EOF
#!/bin/bash
cd "$PROCHEFF_PATH" && ./scripts/menu.sh
EOF
chmod +x "$HOME/.local/bin/procheff"

# Development
cat > "$HOME/.local/bin/pdev" << EOF
#!/bin/bash
cd "$PROCHEFF_PATH" && ./scripts/dev-utils.sh dev
EOF
chmod +x "$HOME/.local/bin/pdev"

# Build
cat > "$HOME/.local/bin/pbuild" << EOF
#!/bin/bash
cd "$PROCHEFF_PATH" && ./scripts/dev-utils.sh build
EOF
chmod +x "$HOME/.local/bin/pbuild"

# Test
cat > "$HOME/.local/bin/ptest" << EOF
#!/bin/bash
cd "$PROCHEFF_PATH" && ./scripts/dev-utils.sh test
EOF
chmod +x "$HOME/.local/bin/ptest"

# Monitor
cat > "$HOME/.local/bin/pmon" << EOF
#!/bin/bash
cd "$PROCHEFF_PATH" && ./scripts/monitor.sh all
EOF
chmod +x "$HOME/.local/bin/pmon"

# Live Monitor
cat > "$HOME/.local/bin/plive" << EOF
#!/bin/bash
cd "$PROCHEFF_PATH" && ./scripts/monitor.sh live
EOF
chmod +x "$HOME/.local/bin/plive"

# Git Status
cat > "$HOME/.local/bin/pstatus" << EOF
#!/bin/bash
cd "$PROCHEFF_PATH" && ./scripts/git-helpers.sh status
EOF
chmod +x "$HOME/.local/bin/pstatus"

# Quick Commit
cat > "$HOME/.local/bin/pcommit" << EOF
#!/bin/bash
cd "$PROCHEFF_PATH" && ./scripts/git-helpers.sh commit "\$*"
EOF
chmod +x "$HOME/.local/bin/pcommit"

# Clean
cat > "$HOME/.local/bin/pclean" << EOF
#!/bin/bash
cd "$PROCHEFF_PATH" && ./scripts/dev-utils.sh clean
EOF
chmod +x "$HOME/.local/bin/pclean"

# Logs
cat > "$HOME/.local/bin/plogs" << EOF
#!/bin/bash
cd "$PROCHEFF_PATH" && tail -f logs/*.log 2>/dev/null || echo "Log dosyası bulunamadı"
EOF
chmod +x "$HOME/.local/bin/plogs"

# Help
cat > "$HOME/.local/bin/phelp" << EOF
#!/bin/bash
echo -e "\033[0;34m🚀 Procheff-v3 Global Commands:\033[0m"
echo ""
echo -e "\033[1;33mAna Komutlar:\033[0m"
echo "  procheff    - Ana menü (herhangi bir yerden)"
echo "  pdev        - Development server başlat"
echo "  pbuild      - Production build"
echo "  ptest       - Test suite çalıştır"
echo "  pmon        - Sistem bilgileri"
echo "  plive       - Canlı monitoring"
echo ""
echo -e "\033[1;33mGit:\033[0m"
echo "  pstatus     - Git durumu"
echo "  pcommit     - Git commit (örn: pcommit \"fix bug\")"
echo ""
echo -e "\033[1;33mYardımcılar:\033[0m"
echo "  pclean      - Cache temizle"
echo "  plogs       - Logları takip et"
echo "  phelp       - Bu yardımı göster"
echo ""
EOF
chmod +x "$HOME/.local/bin/phelp"

# Add to PATH if not already there
if ! grep -q '$HOME/.local/bin' ~/.zshrc; then
    echo '' >> ~/.zshrc
    echo '# Procheff Global Commands' >> ~/.zshrc
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
    echo -e "${YELLOW}📝 PATH'e ~/.local/bin eklendi${NC}"
fi

echo -e "${GREEN}✅ Global komutlar oluşturuldu!${NC}"
echo ""
echo -e "${CYAN}🔄 Değişiklikleri aktif etmek için:${NC}"
echo "source ~/.zshrc"
echo ""
echo -e "${CYAN}💡 Artık herhangi bir dizinden kullanabilirsiniz:${NC}"
echo "  procheff    # Ana menü"
echo "  pdev        # Development"
echo "  pmon        # Monitoring"
echo "  phelp       # Yardım"
echo ""