#!/bin/bash

# Procheff v3 - DigitalOcean App Platform Deployment
# After authentication with doctl

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🚀 Procheff v3 - DigitalOcean App Platform Deployment${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check authentication
if ! doctl auth list 2>/dev/null | grep -q "current"; then
    echo -e "${RED}❌ Not authenticated with DigitalOcean${NC}"
    echo -e "${YELLOW}Please run: doctl auth init${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Authenticated with DigitalOcean${NC}"
echo ""

# Check if app exists
APP_NAME="procheff-v3"

if doctl apps list --format Name --no-header | grep -q "^${APP_NAME}$"; then
    echo -e "${YELLOW}⚠️  App '${APP_NAME}' already exists${NC}"
    APP_ID=$(doctl apps list --format ID,Name --no-header | grep "${APP_NAME}" | awk '{print $1}')
    echo -e "${BLUE}App ID: ${APP_ID}${NC}"
    echo ""

    echo -e "${BLUE}Updating app spec...${NC}"
    doctl apps update "${APP_ID}" --spec .do/app.yaml

    echo -e "${BLUE}Triggering new deployment...${NC}"
    doctl apps create-deployment "${APP_ID}"

    echo -e "${GREEN}✅ App updated and deployment triggered${NC}"
else
    echo -e "${BLUE}Creating new app...${NC}"
    doctl apps create --spec .do/app.yaml

    # Get the new app ID
    sleep 5
    APP_ID=$(doctl apps list --format ID,Name --no-header | grep "${APP_NAME}" | awk '{print $1}')

    echo -e "${GREEN}✅ App created successfully!${NC}"
    echo -e "${BLUE}App ID: ${APP_ID}${NC}"
fi

echo ""
echo -e "${YELLOW}📋 Waiting for deployment to complete...${NC}"
echo -e "${BLUE}This may take 5-10 minutes...${NC}"
echo ""

# Wait for deployment
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

# Get app URL
echo ""
APP_URL=$(doctl apps get "${APP_ID}" --format DefaultIngress --no-header)

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}🌐 App URL: ${APP_URL}${NC}"
echo -e "${BLUE}📋 App ID: ${APP_ID}${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Set Environment Variables${NC}"
echo -e "${BLUE}───────────────────────────────────────────────${NC}"
echo ""
echo -e "Go to: ${YELLOW}https://cloud.digitalocean.com/apps/${APP_ID}/settings${NC}"
echo -e "Then: ${BLUE}Settings → App-Level Environment Variables${NC}"
echo ""
echo -e "Add these secrets (enable ${GREEN}Encrypt${NC}):"
echo ""
echo -e "1. ${YELLOW}NEXTAUTH_SECRET${NC}"
echo -e "   Value: $(openssl rand -base64 32)"
echo ""
echo -e "2. ${YELLOW}ANTHROPIC_API_KEY${NC}"
echo -e "   Value: Your Anthropic API key (sk-ant-...)"
echo ""
echo -e "3. ${YELLOW}GOOGLE_API_KEY${NC}"
echo -e "   Value: Your Google API key (AIza...)"
echo ""
echo -e "4. ${YELLOW}GEMINI_API_KEY${NC}"
echo -e "   Value: Your Gemini API key (same as Google API key)"
echo ""
echo -e "5. ${YELLOW}UPSTASH_REDIS_REST_URL${NC} (Optional)"
echo -e "   Value: Your Upstash Redis URL"
echo ""
echo -e "6. ${YELLOW}UPSTASH_REDIS_REST_TOKEN${NC} (Optional)"
echo -e "   Value: Your Upstash Redis token"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Useful Commands:${NC}"
echo -e "  View logs:        ${GREEN}doctl apps logs ${APP_ID} --follow${NC}"
echo -e "  View deployments: ${GREEN}doctl apps list-deployments ${APP_ID}${NC}"
echo -e "  View app details: ${GREEN}doctl apps get ${APP_ID}${NC}"
echo -e "  Test health:      ${GREEN}curl ${APP_URL}/api/health${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
