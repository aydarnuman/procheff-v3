#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# Procheff v3 - Automatic DigitalOcean Deployment Script
# ═══════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🚀 Procheff v3 - Automatic DigitalOcean Deployment${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# ───────────────────────────────────────────────────────────────
# Step 0: Prerequisites Check
# ───────────────────────────────────────────────────────────────

echo -e "${YELLOW}📋 Step 0: Checking prerequisites...${NC}"
echo ""

# Check doctl
if ! command -v doctl &> /dev/null; then
    echo -e "${RED}❌ doctl not found${NC}"
    echo -e "${YELLOW}Installing doctl...${NC}"
    brew install doctl
    echo -e "${GREEN}✅ doctl installed${NC}"
else
    echo -e "${GREEN}✅ doctl found: $(doctl version | head -n1)${NC}"
fi

# Check git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ git not found. Please install git first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ git found${NC}"

# Check if authenticated
echo ""
echo -e "${YELLOW}Checking DigitalOcean authentication...${NC}"

if ! doctl auth list 2>/dev/null | grep -q "current"; then
    echo -e "${YELLOW}⚠️  Not authenticated with DigitalOcean${NC}"
    echo ""
    echo -e "${BLUE}Please authenticate first:${NC}"
    echo -e "  1. Get API token: ${YELLOW}https://cloud.digitalocean.com/account/api/tokens${NC}"
    echo -e "  2. Run: ${GREEN}doctl auth init${NC}"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Authenticated with DigitalOcean${NC}"
echo ""

# ───────────────────────────────────────────────────────────────
# Step 1: Check .do/app.yaml
# ───────────────────────────────────────────────────────────────

echo -e "${YELLOW}📋 Step 1: Checking .do/app.yaml configuration...${NC}"

if [ ! -f ".do/app.yaml" ]; then
    echo -e "${RED}❌ .do/app.yaml not found!${NC}"
    exit 1
fi

# Check if GitHub repo is configured
if grep -q "your-github-username" .do/app.yaml; then
    echo -e "${YELLOW}⚠️  GitHub repo not configured in .do/app.yaml${NC}"
    echo ""
    echo -e "${BLUE}Please update line 14 in .do/app.yaml:${NC}"
    echo -e "  ${YELLOW}repo: your-github-username/procheff-v3${NC}"
    echo -e "  ${GREEN}repo: aydarnuman/procheff-v3${NC}  # your actual repo"
    echo ""
    read -p "Open .do/app.yaml now? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ${EDITOR:-nano} .do/app.yaml
        echo ""
        echo -e "${GREEN}✅ Please run this script again after updating${NC}"
        exit 0
    else
        exit 1
    fi
fi

echo -e "${GREEN}✅ .do/app.yaml looks good${NC}"
echo ""

# ───────────────────────────────────────────────────────────────
# Step 2: Git Commit
# ───────────────────────────────────────────────────────────────

echo -e "${YELLOW}📋 Step 2: Committing changes to git...${NC}"

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${BLUE}Uncommitted changes detected. Committing...${NC}"

    git add .
    git commit -m "Add DigitalOcean App Platform deployment with Docker

- Add .do/app.yaml for App Platform configuration
- Add deployment scripts and documentation
- Add GitHub Actions CI/CD workflows
- Add health check endpoint
- Add Cursor AI rules and Copilot instructions

Ready for production deployment to DigitalOcean App Platform.
"
    echo -e "${GREEN}✅ Changes committed${NC}"
else
    echo -e "${GREEN}✅ No uncommitted changes${NC}"
fi

echo ""

# Ask to push
read -p "Push to GitHub? (Y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    git push origin main
    echo -e "${GREEN}✅ Pushed to GitHub${NC}"
fi

echo ""

# ───────────────────────────────────────────────────────────────
# Step 3: Deploy to DigitalOcean
# ───────────────────────────────────────────────────────────────

echo -e "${YELLOW}📋 Step 3: Deploying to DigitalOcean...${NC}"
echo ""

# Check if app already exists
APP_NAME="procheff-v3"

if doctl apps list --format Name --no-header | grep -q "^${APP_NAME}$"; then
    echo -e "${YELLOW}⚠️  App '${APP_NAME}' already exists${NC}"
    APP_ID=$(doctl apps list --format ID,Name --no-header | grep "${APP_NAME}" | awk '{print $1}')
    echo -e "${BLUE}App ID: ${APP_ID}${NC}"
    echo ""

    read -p "Update existing app? (Y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        echo -e "${BLUE}Updating app spec...${NC}"
        doctl apps update "${APP_ID}" --spec .do/app.yaml

        echo ""
        echo -e "${BLUE}Triggering new deployment...${NC}"
        doctl apps create-deployment "${APP_ID}"

        echo ""
        echo -e "${GREEN}✅ App updated and deployment triggered${NC}"
    fi
else
    echo -e "${BLUE}Creating new app...${NC}"
    doctl apps create --spec .do/app.yaml

    # Get the new app ID
    sleep 5
    APP_ID=$(doctl apps list --format ID,Name --no-header | grep "${APP_NAME}" | awk '{print $1}')

    echo ""
    echo -e "${GREEN}✅ App created successfully!${NC}"
    echo -e "${BLUE}App ID: ${APP_ID}${NC}"
fi

echo ""

# ───────────────────────────────────────────────────────────────
# Step 4: Wait for deployment
# ───────────────────────────────────────────────────────────────

echo -e "${YELLOW}📋 Step 4: Waiting for deployment to complete...${NC}"
echo -e "${BLUE}This may take 5-10 minutes...${NC}"
echo ""

MAX_ATTEMPTS=60
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    DEPLOYMENT_STATUS=$(doctl apps list-deployments "${APP_ID}" --format Phase --no-header | head -n1)

    if [ "$DEPLOYMENT_STATUS" = "ACTIVE" ]; then
        echo ""
        echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
        break
    elif [ "$DEPLOYMENT_STATUS" = "ERROR" ] || [ "$DEPLOYMENT_STATUS" = "CANCELED" ]; then
        echo ""
        echo -e "${RED}❌ Deployment failed with status: ${DEPLOYMENT_STATUS}${NC}"
        echo -e "${YELLOW}Check logs: doctl apps logs ${APP_ID}${NC}"
        exit 1
    else
        echo -ne "${YELLOW}⏳ Status: ${DEPLOYMENT_STATUS} (${ATTEMPT}/${MAX_ATTEMPTS})\r${NC}"
        sleep 10
        ((ATTEMPT++))
    fi
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Deployment is still in progress${NC}"
    echo -e "${BLUE}Check status: doctl apps list-deployments ${APP_ID}${NC}"
fi

# ───────────────────────────────────────────────────────────────
# Step 5: Get app URL and show next steps
# ───────────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Deployment Information${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

APP_URL=$(doctl apps get "${APP_ID}" --format DefaultIngress --no-header)
echo -e "${GREEN}App URL: ${APP_URL}${NC}"
echo -e "${BLUE}App ID: ${APP_ID}${NC}"

echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Configure Environment Variables${NC}"
echo -e "${BLUE}───────────────────────────────────────────────${NC}"
echo ""
echo -e "Go to: ${YELLOW}https://cloud.digitalocean.com/apps/${APP_ID}/settings${NC}"
echo -e "Then: ${BLUE}Settings → App-Level Environment Variables${NC}"
echo ""
echo -e "Add these secrets (with ${GREEN}Encrypt${NC} option):"
echo -e "  • ${YELLOW}NEXTAUTH_SECRET${NC}=$(openssl rand -base64 32)"
echo -e "  • ${YELLOW}ANTHROPIC_API_KEY${NC}=sk-ant-..."
echo -e "  • ${YELLOW}GOOGLE_API_KEY${NC}=AIza..."
echo -e "  • ${YELLOW}GEMINI_API_KEY${NC}=AIza..."
echo -e "  • ${YELLOW}UPSTASH_REDIS_REST_URL${NC}=https://..."
echo -e "  • ${YELLOW}UPSTASH_REDIS_REST_TOKEN${NC}=..."

echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo -e "  View logs:        ${GREEN}doctl apps logs ${APP_ID} --follow${NC}"
echo -e "  View deployments: ${GREEN}doctl apps list-deployments ${APP_ID}${NC}"
echo -e "  View app details: ${GREEN}doctl apps get ${APP_ID}${NC}"
echo -e "  Test health:      ${GREEN}curl ${APP_URL}/api/health${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Deployment completed! Visit your app at:${NC}"
echo -e "${BLUE}   ${APP_URL}${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
