#!/bin/bash

# ================================
# Oh My Zsh Setup Script
# ================================
# Bu script Oh My Zsh'i kurar ve yararlı pluginleri etkinleştirir

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Oh My Zsh Kurulumu Başlatılıyor...${NC}"

# Oh My Zsh kurulumu
if [ ! -d "$HOME/.oh-my-zsh" ]; then
    echo -e "${YELLOW}📦 Oh My Zsh kuruluyor...${NC}"
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
else
    echo -e "${GREEN}✅ Oh My Zsh zaten kurulu${NC}"
fi

# Backup mevcut .zshrc
if [ -f "$HOME/.zshrc" ]; then
    cp "$HOME/.zshrc" "$HOME/.zshrc.backup.$(date +%s)"
    echo -e "${YELLOW}💾 Mevcut .zshrc yedeklendi${NC}"
fi

# Yararlı pluginleri etkinleştir
echo -e "${YELLOW}🔧 Pluginler yapılandırılıyor...${NC}"

cat > "$HOME/.zshrc" << 'EOF'
# Oh My Zsh configuration
export ZSH="$HOME/.oh-my-zsh"

# Theme
ZSH_THEME="agnoster"

# Plugins
plugins=(
    git
    docker
    docker-compose
    node
    npm
    vscode
    macos
    web-search
    history
    z
    sudo
    colorize
    command-not-found
    copyfile
    copypath
    extract
    jsontools
)

source $ZSH/oh-my-zsh.sh

# Custom aliases
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
alias ..='cd ..'
alias ...='cd ../..'
alias grep='grep --color=auto'
alias fgrep='fgrep --color=auto'
alias egrep='egrep --color=auto'

# Git aliases
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git pull'
alias gd='git diff'

# Docker aliases
alias dps='docker ps'
alias dpa='docker ps -a'
alias di='docker images'
alias dcu='docker-compose up'
alias dcd='docker-compose down'
alias dcb='docker-compose build'

# Project specific aliases
alias dev='npm run dev'
alias build='npm run build'
alias test='npm test'
alias lint='npm run lint'

# Utilities
alias cls='clear'
alias h='history'
alias j='jobs -l'
alias path='echo -e ${PATH//:/\\n}'
alias now='date +"%T"'
alias nowdate='date +"%d-%m-%Y"'

# Quick edit
alias zshconfig='code ~/.zshrc'
alias ohmyzsh='code ~/.oh-my-zsh'

export PATH="$HOME/.local/bin:$PATH"
EOF

echo -e "${GREEN}✅ Oh My Zsh kurulumu tamamlandı!${NC}"
echo -e "${YELLOW}⚡ Değişiklikleri aktif etmek için: source ~/.zshrc${NC}"
echo -e "${BLUE}💡 Tema değiştirmek için ~/.zshrc'de ZSH_THEME değerini düzenleyin${NC}"