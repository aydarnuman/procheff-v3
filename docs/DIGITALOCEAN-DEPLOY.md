# 🚀 DigitalOcean Deployment Guide - Procheff v3

**Droplet IP:** 161.35.217.113
**Current Setup:** procheff-v2 running on port 3000
**New Setup:** procheff-v3 will run on port 3001

---

## 📋 Prerequisites

- ✅ Docker Hub account: `aydarnuman`
- ✅ DigitalOcean droplet: 161.35.217.113
- ✅ SSH access to the droplet
- ✅ Docker and Docker Compose installed on droplet
- ✅ Image built and pushed to Docker Hub

---

## 🎯 Deployment Strategy

### Option 1: Side-by-Side Deployment (Recommended)
- procheff-v2: Port 3000 → `https://v2.procheff.com`
- procheff-v3: Port 3001 → `https://v3.procheff.com` or `https://procheff.com`

### Option 2: Replace v2
- Stop v2, deploy v3 on port 3000

---

## 🐳 Step 1: Build and Push to Docker Hub (Local Machine)

```bash
# Navigate to project directory
cd /Users/numanaydar/procheff-v3

# Login to Docker Hub (if not already logged in)
docker login

# Make script executable and run
chmod +x deploy-docker-hub.sh
./deploy-docker-hub.sh
```

**Expected Output:**
```
🐳 Procheff v3 - Docker Hub Deployment
======================================
1️⃣ Checking Docker Hub authentication...
✅ Authenticated as aydarnuman

2️⃣ Building Docker image...
   Image: aydarnuman/procheff-v3:3.0.0
[... build output ...]

3️⃣ Pushing to Docker Hub...
   Pushing: aydarnuman/procheff-v3:3.0.0
   Pushing: aydarnuman/procheff-v3:latest

🎉 Docker Hub Deployment Complete!
```

**Verify:** https://hub.docker.com/r/aydarnuman/procheff-v3

---

## 🖥️ Step 2: Prepare DigitalOcean Droplet

### 2.1. SSH to Droplet

```bash
ssh root@161.35.217.113
```

### 2.2. Create Project Directory

```bash
# Create directory for v3
mkdir -p /root/procheff-v3
cd /root/procheff-v3
```

### 2.3. Upload Configuration Files

**Option A: Using SCP (from local machine)**

```bash
# From your local machine
cd /Users/numanaydar/procheff-v3

scp docker-compose.digitalocean.yml root@161.35.217.113:/root/procheff-v3/docker-compose.yml
scp .env.digitalocean root@161.35.217.113:/root/procheff-v3/.env
```

**Option B: Create files manually on droplet**

```bash
# On the droplet
cd /root/procheff-v3

# Create .env file
nano .env
# Paste contents from .env.digitalocean
# Update NEXTAUTH_URL and NEXT_PUBLIC_APP_URL with your domain

# Create docker-compose.yml
nano docker-compose.yml
# Paste contents from docker-compose.digitalocean.yml
```

### 2.4. Update Environment Variables

```bash
# Edit .env file
nano .env

# Update these values:
# - NEXTAUTH_URL=https://your-domain.com
# - NEXT_PUBLIC_APP_URL=https://your-domain.com
# - UPSTASH_REDIS_REST_URL (if using Redis)
# - UPSTASH_REDIS_REST_TOKEN (if using Redis)
```

---

## 🚀 Step 3: Deploy Procheff v3

### 3.1. Pull Docker Image

```bash
cd /root/procheff-v3
docker pull aydarnuman/procheff-v3:latest
```

### 3.2. Start the Application

```bash
# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f procheff-v3
```

### 3.3. Verify Deployment

```bash
# Check running containers
docker ps

# Test health endpoint
curl http://localhost:3001/api/health

# Expected response: {"status":"ok"}
```

---

## 🌐 Step 4: Configure Nginx Reverse Proxy

### 4.1. Check Current Nginx Configuration

```bash
# View current Nginx config
cat /etc/nginx/sites-available/default
# or
cat /etc/nginx/conf.d/default.conf
```

### 4.2. Add v3 Configuration

**Option A: New subdomain (v3.procheff.com)**

```bash
# Create new Nginx config
nano /etc/nginx/sites-available/procheff-v3

# Add this configuration:
server {
    listen 80;
    server_name v3.procheff.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Increase timeouts for AI processing
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        send_timeout 300s;
    }
}

# Enable the site
ln -s /etc/nginx/sites-available/procheff-v3 /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

**Option B: Main domain (procheff.com)**

```bash
# Update existing config to point to v3
nano /etc/nginx/sites-available/procheff

# Change proxy_pass from 3000 to 3001
# proxy_pass http://localhost:3001;

# Test and reload
nginx -t
systemctl reload nginx
```

### 4.3. Setup SSL with Let's Encrypt

```bash
# Install certbot (if not already installed)
apt update
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d v3.procheff.com

# Or for multiple domains
certbot --nginx -d procheff.com -d www.procheff.com -d v3.procheff.com

# Auto-renewal is configured automatically
```

---

## ✅ Step 5: Verify Production Deployment

### 5.1. Health Check

```bash
# Local health check
curl http://localhost:3001/api/health

# Public health check (after Nginx setup)
curl https://v3.procheff.com/api/health
```

### 5.2. Access the Application

Open in browser:
- Development: `http://161.35.217.113:3001`
- Production: `https://v3.procheff.com` (after Nginx + SSL setup)

### 5.3. Test Key Features

- [ ] Main page loads
- [ ] Authentication works
- [ ] AI analysis (Claude Sonnet 4.5)
- [ ] OCR/Vision (Gemini 2.0)
- [ ] Menu parser
- [ ] Cost analysis
- [ ] Auto pipeline
- [ ] Decision engine

---

## 🔄 Step 6: Auto-Update Setup (Optional)

### Option A: Watchtower (Auto-pull from Docker Hub)

```bash
# Uncomment watchtower section in docker-compose.yml
nano docker-compose.yml

# Restart services
docker-compose up -d
```

### Option B: Manual Update Script

```bash
# Create update script
nano /root/procheff-v3/update.sh

#!/bin/bash
cd /root/procheff-v3
docker-compose pull
docker-compose up -d
docker image prune -f

# Make executable
chmod +x update.sh

# Run when needed
./update.sh
```

---

## 🗄️ Database Management

### Backup SQLite Database

```bash
# Backup script
docker exec procheff-v3 sqlite3 /app/data/procheff.db ".backup '/app/data/backup.db'"

# Copy to host
docker cp procheff-v3:/app/data/backup.db /root/backups/procheff-v3-$(date +%Y%m%d).db
```

### Restore Database

```bash
# Copy backup to container
docker cp /root/backups/procheff-v3-20250110.db procheff-v3:/app/data/restore.db

# Restore
docker exec procheff-v3 sqlite3 /app/data/procheff.db ".restore '/app/data/restore.db'"
```

---

## 🐛 Troubleshooting

### Container Won't Start

```bash
# View logs
docker-compose logs procheff-v3

# Check container status
docker ps -a

# Inspect container
docker inspect procheff-v3
```

### Permission Issues

```bash
# Fix volume permissions
docker-compose down
docker volume rm procheff-v3_procheff-v3-data
docker-compose up -d
```

### Port Conflicts

```bash
# Check what's using port 3001
lsof -i :3001
netstat -tulpn | grep 3001

# Change port in docker-compose.yml if needed
```

### Nginx Issues

```bash
# Test Nginx config
nginx -t

# View Nginx error logs
tail -f /var/log/nginx/error.log

# Restart Nginx
systemctl restart nginx
```

### Database Issues

```bash
# Check database file
docker exec procheff-v3 ls -lah /app/data/

# Reset database (CAUTION: Deletes all data)
docker-compose down
docker volume rm procheff-v3_procheff-v3-data
docker-compose up -d
```

---

## 📊 Monitoring

### View Logs

```bash
# Application logs
docker-compose logs -f procheff-v3

# Last 100 lines
docker-compose logs --tail=100 procheff-v3

# Nginx access logs
tail -f /var/log/nginx/access.log
```

### Resource Usage

```bash
# Container stats
docker stats procheff-v3

# Disk usage
docker system df

# Disk usage by container
docker ps -s
```

---

## 🚦 Managing Both Versions

### View All Running Containers

```bash
docker ps

# Expected output:
# procheff-v2 (port 3000)
# procheff-v3 (port 3001)
```

### Switch Between Versions

```bash
# Stop v2, keep v3 running
docker stop procheff-v2

# Stop v3, keep v2 running
docker-compose -f /root/procheff-v3/docker-compose.yml down

# Run both
docker start procheff-v2
docker-compose -f /root/procheff-v3/docker-compose.yml up -d
```

---

## 📝 Quick Reference Commands

```bash
# Deploy/Update
cd /root/procheff-v3
docker-compose pull
docker-compose up -d

# View logs
docker-compose logs -f procheff-v3

# Restart
docker-compose restart procheff-v3

# Stop
docker-compose down

# Full cleanup and redeploy
docker-compose down -v
docker pull aydarnuman/procheff-v3:latest
docker-compose up -d

# Backup database
docker exec procheff-v3 sqlite3 /app/data/procheff.db ".backup '/app/data/backup-$(date +%Y%m%d).db'"
```

---

## 🎯 Success Criteria

- [x] Docker image built and pushed to Docker Hub
- [ ] Container running on DigitalOcean droplet
- [ ] Health check returns 200 OK
- [ ] Web interface accessible
- [ ] Authentication working
- [ ] AI features functional (Claude + Gemini)
- [ ] Nginx reverse proxy configured
- [ ] SSL certificate installed
- [ ] Both v2 and v3 running simultaneously (if needed)

---

## 📞 Support

**Docker Hub:** https://hub.docker.com/r/aydarnuman/procheff-v3
**GitHub:** https://github.com/aydarnuman/procheff-v3-enterprise
**Droplet IP:** 161.35.217.113

---

**Last Updated:** 2025-11-10
**Version:** 3.0.0
**Deployment Target:** DigitalOcean VPS