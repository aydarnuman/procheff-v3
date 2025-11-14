#!/bin/bash

# Server Configuration Template
# Copy this file to server-config.sh and fill in your actual values
# Add server-config.sh to .gitignore - NEVER commit it!

# Production Server Details
export SERVER_IP="your.server.ip.here"
export SSH_USER="root"
export APP_DIR="/var/www/procheff"

# VPS Docker Deployment (DigitalOcean)
export VPS_SERVER_IP="your.vps.ip.here"
export VPS_SSH_USER="root"
export VPS_APP_DIR="/root/procheff-v3"
export VPS_PORT_APP="3001"
export VPS_PORT_WORKER="8081"

# Old Production Server (for migrations)
export OLD_SERVER_IP="your.old.server.ip"
export OLD_APP_DIR="/var/www/procheff"

# Usage in scripts:
# source ./server-config.sh
# ssh $SSH_USER@$SERVER_IP
