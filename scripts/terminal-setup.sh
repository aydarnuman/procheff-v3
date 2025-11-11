#!/bin/bash

# ================================
# Ultimate Terminal Setup Script
# ================================
# Bu script terminal deneyiminizi süper-charge eder!

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

function install_homebrew() {
    if ! command -v brew &> /dev/null; then
        echo -e "${YELLOW}🍺 Homebrew kuruluyor...${NC}"
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    else
        echo -e "${GREEN}✅ Homebrew zaten kurulu${NC}"
    fi
}

function install_essential_tools() {
    echo -e "${BLUE}🔧 Temel araçlar kuruluyor...${NC}"
    
    TOOLS=(
        "git"
        "curl"
        "wget"
        "tree"
        "htop"
        "jq"
        "fzf"
        "ripgrep"
        "bat"
        "exa"
        "zoxide"
        "fd"
        "tldr"
    )
    
    for tool in "${TOOLS[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            echo -e "${YELLOW}📦 $tool kuruluyor...${NC}"
            brew install "$tool"
        else
            echo -e "${GREEN}✅ $tool zaten kurulu${NC}"
        fi
    done
}

function setup_zsh_config() {
    echo -e "${BLUE}⚡ Gelişmiş Zsh yapılandırması...${NC}"
    
    # Backup existing .zshrc
    if [ -f "$HOME/.zshrc" ]; then
        cp "$HOME/.zshrc" "$HOME/.zshrc.backup.$(date +%s)"
    fi
    
    cat > "$HOME/.zshrc" << 'EOF'
# ===================================
# Ultimate Zsh Configuration
# ===================================

# Oh My Zsh
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="powerlevel10k/powerlevel10k"

# Plugins
plugins=(
    git
    docker
    docker-compose
    node
    npm
    yarn
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
    fzf
    zsh-autosuggestions
    zsh-syntax-highlighting
)

source $ZSH/oh-my-zsh.sh

# ===================================
# Custom Aliases
# ===================================

# System
alias ll='exa -la --icons'
alias la='exa -a --icons'
alias ls='exa --icons'
alias tree='exa --tree --icons'
alias cat='bat'
alias grep='rg'
alias find='fd'
alias top='htop'
alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'

# Git aliases
alias g='git'
alias gs='git status'
alias ga='git add'
alias gaa='git add .'
alias gc='git commit'
alias gcm='git commit -m'
alias gp='git push'
alias gpl='git pull'
alias gl='git log --oneline --graph --decorate'
alias gd='git diff'
alias gb='git branch'
alias gco='git checkout'
alias gcb='git checkout -b'

# Docker
alias d='docker'
alias dc='docker-compose'
alias dps='docker ps'
alias dpa='docker ps -a'
alias di='docker images'
alias dcu='docker-compose up'
alias dcd='docker-compose down'
alias dcb='docker-compose build'
alias dex='docker exec -it'

# Node.js & npm
alias n='npm'
alias ni='npm install'
alias nid='npm install --save-dev'
alias ns='npm start'
alias nt='npm test'
alias nb='npm run build'
alias nd='npm run dev'
alias nl='npm run lint'

# Project helpers
alias dev='npm run dev'
alias build='npm run build'
alias test='npm test'
alias lint='npm run lint'
alias serve='npm run serve'

# Utilities
alias cls='clear'
alias c='clear'
alias h='history'
alias j='jobs -l'
alias path='echo -e ${PATH//:/\\n}'
alias now='date +"%T"'
alias nowdate='date +"%d-%m-%Y"'
alias reload='source ~/.zshrc'
alias weather='curl wttr.in'
alias myip='curl ipinfo.io/ip'
alias speed='speedtest-cli'

# Quick edit
alias zshconfig='code ~/.zshrc'
alias ohmyzsh='code ~/.oh-my-zsh'

# Quick navigation
alias projects='cd ~/Projects'
alias downloads='cd ~/Downloads'
alias desktop='cd ~/Desktop'
alias documents='cd ~/Documents'

# Procheff specific
alias procheff='cd ~/procheff-v3'
alias pdev='cd ~/procheff-v3 && npm run dev'
alias pbuild='cd ~/procheff-v3 && npm run build'
alias ptest='cd ~/procheff-v3 && npm test'
alias plogs='cd ~/procheff-v3 && tail -f logs/*.log'

# ===================================
# Functions
# ===================================

# Create and enter directory
mkcd() {
    mkdir -p "$1" && cd "$1"
}

# Extract any archive
extract() {
    if [ -f $1 ] ; then
        case $1 in
            *.tar.bz2)   tar xjf $1     ;;
            *.tar.gz)    tar xzf $1     ;;
            *.bz2)       bunzip2 $1     ;;
            *.rar)       unrar e $1     ;;
            *.gz)        gunzip $1      ;;
            *.tar)       tar xf $1      ;;
            *.tbz2)      tar xjf $1     ;;
            *.tgz)       tar xzf $1     ;;
            *.zip)       unzip $1       ;;
            *.Z)         uncompress $1  ;;
            *.7z)        7z x $1        ;;
            *)     echo "'$1' cannot be extracted via extract()" ;;
        esac
    else
        echo "'$1' is not a valid file"
    fi
}

# Quick git commit and push
qcommit() {
    git add .
    git commit -m "$1"
    git push
}

# Find and kill process
killport() {
    kill -9 $(lsof -ti tcp:$1)
}

# Weather for city
weather() {
    curl -s "wttr.in/$1?format=3"
}

# ===================================
# Environment Variables
# ===================================

export EDITOR='code'
export VISUAL='code'
export PAGER='bat'

# Add local bin to PATH
export PATH="$HOME/.local/bin:$PATH"
export PATH="/usr/local/bin:$PATH"

# Node.js
export NODE_OPTIONS="--max-old-space-size=4096"

# History
export HISTFILE=~/.zsh_history
export HISTSIZE=10000
export SAVEHIST=10000

# FZF
export FZF_DEFAULT_COMMAND='fd --type f'
export FZF_CTRL_T_COMMAND="$FZF_DEFAULT_COMMAND"

# Zoxide
eval "$(zoxide init zsh)"

# FZF key bindings
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

# ===================================
# Auto-completion
# ===================================

# Case insensitive auto-completion
zstyle ':completion:*' matcher-list 'm:{a-zA-Z}={A-Za-z}' 'r:|[._-]=* r:|=*' 'l:|=* r:|=*'

# Better SSH hostname completion
zstyle ':completion:*:ssh:*' hosts off

# ===================================
# Startup Message
# ===================================

echo -e "${CYAN}🚀 Welcome to your supercharged terminal!${NC}"
echo -e "${YELLOW}💡 Type 'help-aliases' for custom aliases${NC}"

# Function to show custom aliases
help-aliases() {
    echo -e "${BLUE}📋 Custom Aliases:${NC}"
    echo "System: ll, tree, cat, grep, find, top"
    echo "Git: g, gs, ga, gc, gp, gl, gd"
    echo "Docker: d, dc, dps, dcu, dcd"
    echo "Node: n, ni, ns, nt, nb, nd"
    echo "Utils: cls, reload, weather, myip"
    echo "Navigation: projects, downloads, desktop"
    echo "Procheff: procheff, pdev, pbuild, ptest"
}
EOF

    echo -e "${GREEN}✅ Gelişmiş Zsh yapılandırması tamamlandı!${NC}"
}

function install_fonts() {
    echo -e "${BLUE}🔤 Powerline fontları kuruluyor...${NC}"
    
    # Nerd Fonts
    brew tap homebrew/cask-fonts
    brew install --cask font-meslo-lg-nerd-font
    brew install --cask font-fira-code-nerd-font
    
    echo -e "${GREEN}✅ Fontlar kuruldu!${NC}"
    echo -e "${YELLOW}💡 Terminal uygulamanızda font olarak 'MesloLGS Nerd Font' seçin${NC}"
}

function install_powerlevel10k() {
    if [ ! -d "${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k" ]; then
        echo -e "${BLUE}⚡ Powerlevel10k theme kuruluyor...${NC}"
        git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k
    else
        echo -e "${GREEN}✅ Powerlevel10k zaten kurulu${NC}"
    fi
}

function install_zsh_plugins() {
    echo -e "${BLUE}🔌 Zsh pluginleri kuruluyor...${NC}"
    
    # Syntax highlighting
    if [ ! -d "${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting" ]; then
        git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
    fi
    
    # Auto suggestions
    if [ ! -d "${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions" ]; then
        git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
    fi
    
    echo -e "${GREEN}✅ Zsh pluginleri kuruldu!${NC}"
}

function create_useful_scripts() {
    echo -e "${BLUE}📝 Yararlı scriptler oluşturuluyor...${NC}"
    
    # Quick server script
    cat > "$HOME/.local/bin/qserver" << 'EOF'
#!/bin/bash
# Quick HTTP server
PORT=${1:-8000}
echo "Starting server on http://localhost:$PORT"
python3 -m http.server $PORT
EOF
    chmod +x "$HOME/.local/bin/qserver"
    
    # Quick file search
    cat > "$HOME/.local/bin/qfind" << 'EOF'
#!/bin/bash
# Quick file find
find . -name "*$1*" -type f 2>/dev/null
EOF
    chmod +x "$HOME/.local/bin/qfind"
    
    # Quick process killer
    cat > "$HOME/.local/bin/qkill" << 'EOF'
#!/bin/bash
# Quick process kill
ps aux | grep "$1" | grep -v grep | awk '{print $2}' | xargs kill -9
EOF
    chmod +x "$HOME/.local/bin/qkill"
    
    echo -e "${GREEN}✅ Yararlı scriptler oluşturuldu!${NC}"
}

function show_completion_message() {
    echo ""
    echo -e "${GREEN}🎉 Terminal kurulumu tamamlandı!${NC}"
    echo ""
    echo -e "${CYAN}📋 Sonraki adımlar:${NC}"
    echo "1. Terminal'i yeniden başlatın"
    echo "2. Powerlevel10k yapılandırması otomatik başlayacak"
    echo "3. Font olarak 'MesloLGS Nerd Font' seçin"
    echo ""
    echo -e "${YELLOW}💡 Yararlı komutlar:${NC}"
    echo "  help-aliases  - Özel aliasları göster"
    echo "  qserver 3000  - Port 3000'de HTTP server başlat"
    echo "  qfind text    - Dosyalarda metin ara"
    echo "  weather       - Hava durumu göster"
    echo ""
    echo -e "${BLUE}🚀 Keyifli kodlamalar!${NC}"
}

function main() {
    echo -e "${PURPLE}🌟 Ultimate Terminal Setup Başlatılıyor...${NC}"
    echo ""
    
    # Create local bin directory
    mkdir -p "$HOME/.local/bin"
    
    # Install everything
    install_homebrew
    install_essential_tools
    
    # Setup Oh My Zsh if not exists
    if [ ! -d "$HOME/.oh-my-zsh" ]; then
        ./scripts/setup-ohmyzsh.sh
    fi
    
    install_powerlevel10k
    install_zsh_plugins
    install_fonts
    setup_zsh_config
    create_useful_scripts
    
    show_completion_message
}

# Ana fonksiyonu çalıştır
main