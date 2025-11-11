#!/bin/bash

# ================================
# macOS Keyboard Shortcuts Setup
# ================================
# Bu script macOS'ta keyboard shortcut'ları oluşturur

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}⌨️  macOS Keyboard Shortcuts Kurulumu${NC}"
echo ""

# Create AppleScript files for shortcuts
SCRIPTS_DIR="$HOME/Library/Scripts/Procheff"
mkdir -p "$SCRIPTS_DIR"

echo -e "${YELLOW}📝 AppleScript dosyaları oluşturuluyor...${NC}"

# Procheff Menu (Cmd+Opt+P)
cat > "$SCRIPTS_DIR/Procheff_Menu.scpt" << 'EOF'
tell application "Terminal"
    activate
    do script "cd ~/procheff-v3 && ./scripts/menu.sh"
end tell
EOF

# Development Server (Cmd+Opt+D)  
cat > "$SCRIPTS_DIR/Procheff_Dev.scpt" << 'EOF'
tell application "Terminal"
    activate
    do script "cd ~/procheff-v3 && ./scripts/dev-utils.sh dev"
end tell
EOF

# Live Monitoring (Cmd+Opt+M)
cat > "$SCRIPTS_DIR/Procheff_Monitor.scpt" << 'EOF'
tell application "Terminal"
    activate
    do script "cd ~/procheff-v3 && ./scripts/monitor.sh live"
end tell
EOF

# Git Status (Cmd+Opt+G)
cat > "$SCRIPTS_DIR/Procheff_Git.scpt" << 'EOF'
tell application "Terminal"
    activate
    do script "cd ~/procheff-v3 && ./scripts/git-helpers.sh status"
end tell
EOF

echo -e "${GREEN}✅ AppleScript dosyaları oluşturuldu!${NC}"
echo ""
echo -e "${CYAN}📋 Manuel Kurulum Adımları:${NC}"
echo ""
echo -e "${YELLOW}1. System Preferences > Keyboard > Shortcuts${NC}"
echo -e "${YELLOW}2. Services seçin${NC}"
echo -e "${YELLOW}3. 'Add' butonuna tıklayın${NC}"
echo -e "${YELLOW}4. Bu scriptleri seçin:${NC}"
echo ""
echo -e "${CYAN}   📁 $SCRIPTS_DIR/${NC}"
echo ""
echo -e "${YELLOW}5. Keyboard shortcut'ları atayın:${NC}"
echo "   • Procheff_Menu.scpt    → ⌘⌥P"
echo "   • Procheff_Dev.scpt     → ⌘⌥D" 
echo "   • Procheff_Monitor.scpt → ⌘⌥M"
echo "   • Procheff_Git.scpt     → ⌘⌥G"
echo ""
echo -e "${BLUE}💡 Alternatif: Automator ile Service oluşturun${NC}"
echo ""

# Create Automator workflow instructions
cat > "$SCRIPTS_DIR/Automator_Instructions.md" << 'EOF'
# Automator ile Keyboard Shortcuts

## Adımlar:

1. **Automator** uygulamasını açın
2. **Quick Action** seçin
3. **Workflow receives:** "no input" seçin
4. **in:** "any application" seçin
5. **Run Shell Script** action'ını sürükleyin
6. Shell script içeriği:

### Procheff Menu (⌘⌥P)
```bash
cd /Users/numanaydar/procheff-v3 && ./scripts/menu.sh
```

### Development Server (⌘⌥D)
```bash
cd /Users/numanaydar/procheff-v3 && ./scripts/dev-utils.sh dev
```

### Live Monitor (⌘⌥M)
```bash
cd /Users/numanaydar/procheff-v3 && ./scripts/monitor.sh live
```

7. **File > Save** ile kaydedin
8. **System Preferences > Keyboard > Shortcuts > Services** 
9. Oluşturduğunuz service'i bulun ve keyboard shortcut atayın

## Keyboard Shortcuts:
- ⌘⌥P → Procheff Menu
- ⌘⌥D → Development Server  
- ⌘⌥M → Live Monitor
- ⌘⌥G → Git Status
EOF

echo -e "${GREEN}📖 Detaylı talimatlar oluşturuldu:${NC}"
echo "   $SCRIPTS_DIR/Automator_Instructions.md"
echo ""