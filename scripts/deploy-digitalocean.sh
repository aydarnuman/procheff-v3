#!/bin/bash

# ================================
# Procheff v3 - DigitalOcean Deployment Script
# ================================
# This script helps deploy your application to DigitalOcean
# Usage: ./scripts/deploy-digitalocean.sh [environment]
# Example: ./scripts/deploy-digitalocean.sh production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment
ENVIRONMENT=${1:-production}

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Procheff v3 - DigitalOcean Deployment${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo -e "${RED}❌ Error: doctl is not installed${NC}"
    echo -e "${YELLOW}Install it from: https://docs.digitalocean.com/reference/doctl/how-to/install/${NC}"
    exit 1
fi

echo -e "${GREEN}✓ doctl is installed${NC}"

# Check if authenticated
if ! doctl auth list &> /dev/null; then
    echo -e "${RED}❌ Error: Not authenticated with DigitalOcean${NC}"
    echo -e "${YELLOW}Run: doctl auth init${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Authenticated with DigitalOcean${NC}"
echo ""

# Get app name from .do/app.yaml or use default
APP_NAME="procheff-v3"

# Check if app exists
echo -e "${BLUE}Checking if app exists...${NC}"
if doctl apps list --format Name | grep -q "^${APP_NAME}$"; then
    echo -e "${GREEN}✓ App '${APP_NAME}' found${NC}"
    APP_ID=$(doctl apps list --format ID,Name --no-header | grep "${APP_NAME}" | awk '{print $1}')
    echo -e "${BLUE}App ID: ${APP_ID}${NC}"

    # Update existing app
    echo ""
    echo -e "${YELLOW}Updating existing app...${NC}"
    doctl apps update "${APP_ID}" --spec .do/app.yaml

    echo ""
    echo -e "${GREEN}✓ App updated successfully${NC}"
    echo -e "${BLUE}Triggering deployment...${NC}"
    doctl apps create-deployment "${APP_ID}"
else
    echo -e "${YELLOW}App '${APP_NAME}' not found. Creating new app...${NC}"

    # Create new app
    echo ""
    echo -e "${BLUE}Creating new app from spec...${NC}"
    doctl apps create --spec .do/app.yaml

    echo ""
    echo -e "${GREEN}✓ App created successfully${NC}"
fi

# Wait for deployment
echo ""
echo -e "${BLUE}Deployment started. Waiting for completion...${NC}"
echo -e "${YELLOW}This may take 5-10 minutes...${NC}"
echo ""

# Get the latest deployment ID
APP_ID=$(doctl apps list --format ID,Name --no-header | grep "${APP_NAME}" | awk '{print $1}')
sleep 5

# Monitor deployment status
MAX_ATTEMPTS=60
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    DEPLOYMENT_STATUS=$(doctl apps list-deployments "${APP_ID}" --format Phase --no-header | head -n1)

    if [ "$DEPLOYMENT_STATUS" = "ACTIVE" ]; then
        echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
        break
    elif [ "$DEPLOYMENT_STATUS" = "ERROR" ] || [ "$DEPLOYMENT_STATUS" = "CANCELED" ]; then
        echo -e "${RED}❌ Deployment failed with status: ${DEPLOYMENT_STATUS}${NC}"
        echo -e "${YELLOW}Check logs: doctl apps logs ${APP_ID}${NC}"
        exit 1
    else
        echo -e "${YELLOW}⏳ Status: ${DEPLOYMENT_STATUS} (${ATTEMPT}/${MAX_ATTEMPTS})${NC}"
        sleep 10
        ((ATTEMPT++))
    fi
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo -e "${YELLOW}⚠️  Deployment is still in progress. Check status manually:${NC}"
    echo -e "${BLUE}doctl apps list-deployments ${APP_ID}${NC}"
fi

# Get app URL
echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}Deployment Information:${NC}"
echo -e "${BLUE}================================${NC}"

APP_URL=$(doctl apps get "${APP_ID}" --format DefaultIngress --no-header)
echo -e "${GREEN}App URL: ${APP_URL}${NC}"
echo ""

echo -e "${BLUE}Useful commands:${NC}"
echo -e "  View logs:        ${YELLOW}doctl apps logs ${APP_ID} --follow${NC}"
echo -e "  View deployments: ${YELLOW}doctl apps list-deployments ${APP_ID}${NC}"
echo -e "  View app details: ${YELLOW}doctl apps get ${APP_ID}${NC}"
echo -e "  Delete app:       ${YELLOW}doctl apps delete ${APP_ID}${NC}"
echo ""

echo -e "${GREEN}✓ Deployment completed!${NC}"
echo -e "${BLUE}Visit your app at: ${APP_URL}${NC}"
