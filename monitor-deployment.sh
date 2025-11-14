#!/bin/bash

# Monitor DigitalOcean App Platform Deployment

APP_ID="2359f749-65d0-4500-a4c5-e34baa6dee69"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  📊 Monitoring Procheff v3 Deployment${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}App ID: ${APP_ID}${NC}"
echo ""

# Monitor deployment
MAX_ATTEMPTS=60
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    # Get deployment status
    DEPLOYMENT_STATUS=$(doctl apps list-deployments "${APP_ID}" --format Phase --no-header | head -n1)
    
    if [ "$DEPLOYMENT_STATUS" = "ACTIVE" ]; then
        echo ""
        echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
        break
    elif [ "$DEPLOYMENT_STATUS" = "ERROR" ] || [ "$DEPLOYMENT_STATUS" = "CANCELED" ]; then
        echo ""
        echo -e "${RED}❌ Deployment failed with status: ${DEPLOYMENT_STATUS}${NC}"
        echo ""
        echo -e "${YELLOW}Checking deployment logs...${NC}"
        doctl apps logs "${APP_ID}" --type build --tail 50
        exit 1
    else
        echo -ne "${YELLOW}⏳ Status: ${DEPLOYMENT_STATUS} (${ATTEMPT}/${MAX_ATTEMPTS})\r${NC}"
        sleep 10
        ((ATTEMPT++))
    fi
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Deployment is still in progress after 10 minutes${NC}"
    echo -e "${BLUE}Check status: doctl apps list-deployments ${APP_ID}${NC}"
    exit 1
fi

# Get app details
echo ""
echo -e "${BLUE}Getting app details...${NC}"
echo ""

# Get app URL
APP_URL=$(doctl apps get "${APP_ID}" --format DefaultIngress --no-header)

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Deployment Successful!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}🌐 App URL: https://${APP_URL}${NC}"
echo -e "${BLUE}📋 App ID: ${APP_ID}${NC}"
echo ""

# Test health endpoint
echo -e "${YELLOW}Testing health endpoint...${NC}"
if curl -s "https://${APP_URL}/api/health" | grep -q "ok"; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
else
    echo -e "${YELLOW}⚠️  Health check failed. App might still be starting...${NC}"
fi

echo ""
echo -e "${YELLOW}⚠️  NEXT STEPS: Configure Environment Variables${NC}"
echo -e "${BLUE}───────────────────────────────────────────────${NC}"
echo ""
echo -e "1. Go to: ${YELLOW}https://cloud.digitalocean.com/apps/${APP_ID}/settings${NC}"
echo -e "2. Click: ${BLUE}Settings → App-Level Environment Variables → Edit${NC}"
echo -e "3. Add these variables (enable ${GREEN}Encrypt${NC} for each):"
echo ""
echo -e "   ${YELLOW}NEXTAUTH_SECRET${NC}"
echo -e "   Value: $(openssl rand -base64 32)"
echo ""
echo -e "   ${YELLOW}ANTHROPIC_API_KEY${NC}"
echo -e "   Value: Your Anthropic API key"
echo ""
echo -e "   ${YELLOW}GOOGLE_API_KEY${NC}"
echo -e "   Value: Your Google API key"
echo ""
echo -e "   ${YELLOW}GEMINI_API_KEY${NC}"
echo -e "   Value: Same as Google API key"
echo ""
echo -e "4. Click ${GREEN}Save${NC} to apply changes"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Useful Commands:${NC}"
echo -e "  View logs:    ${GREEN}doctl apps logs ${APP_ID} --follow${NC}"
echo -e "  View deploy:  ${GREEN}doctl apps list-deployments ${APP_ID}${NC}"
echo -e "  View details: ${GREEN}doctl apps get ${APP_ID}${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
