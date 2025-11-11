#!/bin/bash

# ================================
# Git & Deployment Helpers
# ================================
# Git işlemleri ve deployment için yardımcı araçlar

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

function show_git_status() {
    echo -e "${BLUE}📊 Git Durumu${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Current branch
    BRANCH=$(git branch --show-current)
    echo -e "${CYAN}Mevcut Branch:${NC} $BRANCH"
    
    # Status
    git status --porcelain | while read line; do
        STATUS="${line:0:2}"
        FILE="${line:3}"
        
        case "$STATUS" in
            "M ")  echo -e "${YELLOW}📝 Modified:${NC} $FILE" ;;
            "A ")  echo -e "${GREEN}➕ Added:${NC} $FILE" ;;
            "D ")  echo -e "${RED}➖ Deleted:${NC} $FILE" ;;
            "??")  echo -e "${PURPLE}❓ Untracked:${NC} $FILE" ;;
            " M")  echo -e "${BLUE}📝 Modified (unstaged):${NC} $FILE" ;;
        esac
    done
    
    # Commits ahead/behind
    if git rev-parse --abbrev-ref HEAD@{upstream} &>/dev/null; then
        AHEAD=$(git rev-list --count HEAD ^HEAD@{upstream})
        BEHIND=$(git rev-list --count HEAD@{upstream} ^HEAD)
        
        if [ "$AHEAD" -gt "0" ]; then
            echo -e "${GREEN}⬆️  $AHEAD commits ahead${NC}"
        fi
        
        if [ "$BEHIND" -gt "0" ]; then
            echo -e "${YELLOW}⬇️  $BEHIND commits behind${NC}"
        fi
    fi
    
    echo ""
}

function quick_commit() {
    MESSAGE="${1:-Quick update $(date '+%Y-%m-%d %H:%M')}"
    
    echo -e "${BLUE}⚡ Quick Commit: $MESSAGE${NC}"
    
    # Add all changes
    git add .
    
    # Show what will be committed
    echo -e "${CYAN}Commit edilecek dosyalar:${NC}"
    git status --porcelain | grep -E "^[AM]" | cut -c4- | sed 's/^/  /'
    
    # Confirm
    echo -e "\n${YELLOW}Bu değişiklikleri commit etmek istiyor musunuz? (y/n)${NC}"
    read -r CONFIRM
    
    if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
        git commit -m "$MESSAGE"
        echo -e "${GREEN}✅ Commit başarılı!${NC}"
        
        # Ask for push
        echo -e "\n${YELLOW}Origin'e push etmek istiyor musunuz? (y/n)${NC}"
        read -r PUSH_CONFIRM
        
        if [[ "$PUSH_CONFIRM" =~ ^[Yy]$ ]]; then
            git push
            echo -e "${GREEN}✅ Push başarılı!${NC}"
        fi
    else
        echo -e "${YELLOW}⏸️  İşlem iptal edildi${NC}"
    fi
}

function create_feature_branch() {
    BRANCH_NAME="$1"
    
    if [ -z "$BRANCH_NAME" ]; then
        echo -e "${YELLOW}Branch adı girin:${NC}"
        read -r BRANCH_NAME
    fi
    
    if [ -z "$BRANCH_NAME" ]; then
        echo -e "${RED}❌ Branch adı gerekli!${NC}"
        return 1
    fi
    
    # Add feature/ prefix if not present
    if [[ "$BRANCH_NAME" != feature/* ]]; then
        BRANCH_NAME="feature/$BRANCH_NAME"
    fi
    
    echo -e "${BLUE}🌟 Yeni feature branch oluşturuluyor: $BRANCH_NAME${NC}"
    
    # Make sure we're on main
    git checkout main
    git pull origin main
    
    # Create and switch to new branch
    git checkout -b "$BRANCH_NAME"
    
    echo -e "${GREEN}✅ Branch oluşturuldu ve aktif edildi: $BRANCH_NAME${NC}"
    echo -e "${CYAN}💡 Development başlatmak için: ./scripts/dev-utils.sh dev${NC}"
}

function merge_feature() {
    CURRENT_BRANCH=$(git branch --show-current)
    
    if [[ "$CURRENT_BRANCH" != feature/* ]]; then
        echo -e "${RED}❌ Bu komut sadece feature branch'lerinde kullanılabilir${NC}"
        return 1
    fi
    
    echo -e "${BLUE}🔄 Feature branch'i main'e merge ediliyor...${NC}"
    
    # Commit any pending changes
    if [ -n "$(git status --porcelain)" ]; then
        echo -e "${YELLOW}Bekleyen değişiklikler commit ediliyor...${NC}"
        git add .
        git commit -m "Final changes before merge"
    fi
    
    # Switch to main and pull
    git checkout main
    git pull origin main
    
    # Merge feature branch
    git merge "$CURRENT_BRANCH" --no-ff
    
    # Push changes
    git push origin main
    
    # Delete feature branch
    echo -e "${YELLOW}Feature branch silinsin mi? (y/n)${NC}"
    read -r DELETE_CONFIRM
    
    if [[ "$DELETE_CONFIRM" =~ ^[Yy]$ ]]; then
        git branch -d "$CURRENT_BRANCH"
        git push origin --delete "$CURRENT_BRANCH" 2>/dev/null || true
        echo -e "${GREEN}✅ Feature branch silindi${NC}"
    fi
    
    echo -e "${GREEN}✅ Merge tamamlandı!${NC}"
}

function release_version() {
    VERSION="$1"
    
    if [ -z "$VERSION" ]; then
        echo -e "${YELLOW}Version numarası girin (örn: 1.2.0):${NC}"
        read -r VERSION
    fi
    
    if [ -z "$VERSION" ]; then
        echo -e "${RED}❌ Version numarası gerekli!${NC}"
        return 1
    fi
    
    echo -e "${BLUE}🚀 Version $VERSION release ediliyor...${NC}"
    
    # Make sure we're on main with latest changes
    git checkout main
    git pull origin main
    
    # Update package.json version
    if [ -f "package.json" ]; then
        echo -e "${YELLOW}📦 package.json güncelleniyor...${NC}"
        npm version "$VERSION" --no-git-tag-version
        git add package.json package-lock.json 2>/dev/null || true
        git commit -m "chore: bump version to $VERSION"
    fi
    
    # Create and push tag
    git tag "v$VERSION"
    git push origin main
    git push origin "v$VERSION"
    
    echo -e "${GREEN}✅ Version $VERSION başarıyla release edildi!${NC}"
    echo -e "${CYAN}💡 Deployment için: ./scripts/deploy-digitalocean.sh production${NC}"
}

function hotfix_branch() {
    HOTFIX_NAME="$1"
    
    if [ -z "$HOTFIX_NAME" ]; then
        echo -e "${YELLOW}Hotfix adı girin:${NC}"
        read -r HOTFIX_NAME
    fi
    
    if [ -z "$HOTFIX_NAME" ]; then
        echo -e "${RED}❌ Hotfix adı gerekli!${NC}"
        return 1
    fi
    
    # Add hotfix/ prefix if not present
    if [[ "$HOTFIX_NAME" != hotfix/* ]]; then
        HOTFIX_NAME="hotfix/$HOTFIX_NAME"
    fi
    
    echo -e "${RED}🆘 Hotfix branch oluşturuluyor: $HOTFIX_NAME${NC}"
    
    # Create from main
    git checkout main
    git pull origin main
    git checkout -b "$HOTFIX_NAME"
    
    echo -e "${GREEN}✅ Hotfix branch oluşturuldu: $HOTFIX_NAME${NC}"
    echo -e "${YELLOW}⚠️  Fix'i tamamladıktan sonra: ./scripts/git-helpers.sh merge-hotfix${NC}"
}

function merge_hotfix() {
    CURRENT_BRANCH=$(git branch --show-current)
    
    if [[ "$CURRENT_BRANCH" != hotfix/* ]]; then
        echo -e "${RED}❌ Bu komut sadece hotfix branch'lerinde kullanılabilir${NC}"
        return 1
    fi
    
    echo -e "${RED}🆘 Hotfix main'e merge ediliyor...${NC}"
    
    # Commit pending changes
    if [ -n "$(git status --porcelain)" ]; then
        git add .
        git commit -m "Hotfix: $(echo $CURRENT_BRANCH | sed 's/hotfix\///')"
    fi
    
    # Merge to main
    git checkout main
    git pull origin main
    git merge "$CURRENT_BRANCH" --no-ff
    git push origin main
    
    # Create patch version
    echo -e "${YELLOW}Patch version oluşturulsun mu? (y/n)${NC}"
    read -r VERSION_CONFIRM
    
    if [[ "$VERSION_CONFIRM" =~ ^[Yy]$ ]]; then
        CURRENT_VERSION=$(grep '"version"' package.json | head -1 | awk -F'"' '{print $4}')
        NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{$NF = $NF + 1;} 1' | sed 's/ /./g')
        npm version patch --no-git-tag-version
        git add package.json package-lock.json 2>/dev/null || true
        git commit -m "chore: bump version to $NEW_VERSION (hotfix)"
        git tag "v$NEW_VERSION"
        git push origin main
        git push origin "v$NEW_VERSION"
    fi
    
    # Clean up hotfix branch
    git branch -d "$CURRENT_BRANCH"
    git push origin --delete "$CURRENT_BRANCH" 2>/dev/null || true
    
    echo -e "${GREEN}✅ Hotfix tamamlandı!${NC}"
}

function show_help() {
    echo -e "${BLUE}📋 Git & Deployment Helpers${NC}"
    echo ""
    echo -e "${YELLOW}Kullanım:${NC} ./scripts/git-helpers.sh [komut]"
    echo ""
    echo -e "${CYAN}Git Komutları:${NC}"
    echo "  status           - Detaylı git durumu"
    echo "  commit [message] - Hızlı commit ve push"
    echo "  feature [name]   - Yeni feature branch oluştur"
    echo "  merge-feature    - Feature branch'i main'e merge et"
    echo "  hotfix [name]    - Hotfix branch oluştur"
    echo "  merge-hotfix     - Hotfix'i main'e merge et"
    echo "  release [version]- Version release et"
    echo ""
    echo -e "${CYAN}Örnekler:${NC}"
    echo "  ./scripts/git-helpers.sh commit \"Add new feature\""
    echo "  ./scripts/git-helpers.sh feature user-auth"
    echo "  ./scripts/git-helpers.sh release 1.2.0"
    echo ""
}

# Ana komut işlemcisi
case "${1:-help}" in
    "status")
        show_git_status
        ;;
    "commit")
        quick_commit "$2"
        ;;
    "feature")
        create_feature_branch "$2"
        ;;
    "merge-feature")
        merge_feature
        ;;
    "hotfix")
        hotfix_branch "$2"
        ;;
    "merge-hotfix")
        merge_hotfix
        ;;
    "release")
        release_version "$2"
        ;;
    "help"|*)
        show_help
        ;;
esac