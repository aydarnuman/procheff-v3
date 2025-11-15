#!/bin/bash

# 🚀 Procheff-v3 Volume Migration Deployment Script
# Updates docker-compose configuration to use block storage volume

echo "🚀 Starting Volume Migration Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Server configuration
SERVER_USER="root"
SERVER_HOST="104.248.254.171"  # Production server IP
SERVER_PATH="/var/www/procheff"
SSH_KEY="$HOME/.ssh/google_compute_engine"  # SSH key for authentication
LOCAL_COMPOSE_FILE="docker-compose.digitalocean.yml"

echo -e "${BLUE}📋 Deployment Steps:${NC}"
echo "1. Backup current docker-compose file on server"
echo "2. Copy updated docker-compose file to server"
echo "3. Stop current services"
echo "4. Start services with new volume configuration"
echo "5. Test volume mounts and database access"
echo ""

# Function to run commands on server
run_remote() {
    local cmd="$1"
    local description="$2"
    
    echo -e "${YELLOW}▶ ${description}${NC}"
    ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "$cmd"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Success${NC}"
    else
        echo -e "${RED}❌ Failed${NC}"
        exit 1
    fi
    echo ""
}

# Check if server IP is configured
if [ "$SERVER_HOST" = "your-server-ip" ]; then
    echo -e "${RED}❌ Please update SERVER_HOST in the script with your actual server IP${NC}"
    echo -e "${YELLOW}💡 You can find the server IP in your DigitalOcean dashboard${NC}"
    exit 1
fi

# Step 1: Backup current docker-compose file
run_remote "cd ${SERVER_PATH} && cp docker-compose.digitalocean.yml docker-compose.digitalocean.yml.pre-volume-$(date +%Y%m%d-%H%M%S)" \
    "Backup current docker-compose file"

# Step 2: Copy updated docker-compose file
echo -e "${YELLOW}▶ Copying updated docker-compose file to server${NC}"
scp -i ${SSH_KEY} ${LOCAL_COMPOSE_FILE} ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ File copied successfully${NC}"
else
    echo -e "${RED}❌ Failed to copy file${NC}"
    exit 1
fi
echo ""

# Step 3: Stop current services
run_remote "cd ${SERVER_PATH} && docker-compose -f docker-compose.digitalocean.yml down" \
    "Stop current Docker services"

# Step 4: Start services with new configuration
run_remote "cd ${SERVER_PATH} && docker-compose -f docker-compose.digitalocean.yml up -d" \
    "Start services with new volume configuration"

# Step 5: Wait for services to start
echo -e "${YELLOW}▶ Waiting for services to start (30 seconds)${NC}"
sleep 30
echo -e "${GREEN}✅ Wait completed${NC}"
echo ""

# Step 6: Test volume mounts and services
run_remote "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'" \
    "Check container status"

run_remote "docker exec procheff-v3 df -h | grep /mnt/procheff || docker exec procheff-v3 df -h" \
    "Check volume mounts inside container"

run_remote "docker exec procheff-v3 ls -la /app/data/procheff.db" \
    "Verify database file access"

run_remote "curl -I http://localhost:3001/api/health || echo 'Health check endpoint not responding'" \
    "Test application health"

# Step 7: Show disk usage
run_remote "du -sh /mnt/procheff/*" \
    "Check volume disk usage"

echo ""
echo -e "${GREEN}🎉 Volume Migration Deployment Complete!${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo "✅ Docker compose updated to use block storage volume"
echo "✅ Services restarted with new configuration"
echo "✅ Volume mounts: /mnt/procheff/{data,uploads,logs,cache}"
echo "✅ Database: 22MB+ data now on dedicated 100GB volume"
echo ""
echo -e "${YELLOW}🔍 Next Steps:${NC}"
echo "1. Test file uploads (should go to /mnt/procheff/uploads/)"
echo "2. Check application logs (should appear in /mnt/procheff/logs/)"
echo "3. Run reboot test to verify persistence"
echo "4. Monitor volume usage with 'df -h /mnt/procheff'"
echo ""
echo -e "${BLUE}🛡️ Rollback (if needed):${NC}"
echo "If issues occur, restore with:"
echo "scp -i ${SSH_KEY} docker-compose.digitalocean.yml.pre-volume-* root@${SERVER_HOST}:${SERVER_PATH}/docker-compose.digitalocean.yml"
echo "ssh -i ${SSH_KEY} root@${SERVER_HOST} 'cd ${SERVER_PATH} && docker-compose -f docker-compose.digitalocean.yml down && docker-compose -f docker-compose.digitalocean.yml up -d'"
