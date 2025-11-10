# ⚡ Quick Deployment Guide - Procheff v3

**Target:** DigitalOcean Droplet (161.35.217.113)
**Method:** Direct build on server (no Docker Hub needed)
**Time:** ~15-20 minutes

---

## 🎯 Quick Start (3 Commands)

```bash
# 1. SSH to your droplet
ssh root@161.35.217.113

# 2. Download and run deployment script
curl -fsSL https://raw.githubusercontent.com/aydarnuman/procheff-v3-enterprise/main/deploy-from-github.sh | bash

# 3. Done! Access at http://161.35.217.113:3001
```

---

## 📋 Manual Step-by-Step

If you prefer manual deployment:

### Step 1: SSH to Droplet

```bash
ssh root@161.35.217.113
```

### Step 2: Clone Repository

```bash
# Create directory
mkdir -p /root/procheff-v3
cd /root/procheff-v3

# Clone repository
git clone https://github.com/aydarnuman/procheff-v3-enterprise.git .
```

### Step 3: Create Environment File

```bash
# Create .env file
cat > .env <<'EOF'
# API KEYS
ANTHROPIC_API_KEY=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
GOOGLE_API_KEY=AIzaSyB3Fz7u9dD5i9BAooTJGCnFzTkTiWPrHT8
NEXTAUTH_SECRET=f4d41086daa6d1036794c8b81758b0b6840045ac28b9fee9208f01f4f2c65fc7

# UPSTASH REDIS (optional - use placeholders for now)
UPSTASH_REDIS_REST_URL=https://placeholder.upstash.io
UPSTASH_REDIS_REST_TOKEN=placeholder-token

# APPLICATION URLS (update with your actual domain)
NEXTAUTH_URL=http://161.35.217.113:3001
NEXT_PUBLIC_APP_URL=http://161.35.217.113:3001

# SCRAPER
SCRAPER_ENABLED=true
SCRAPER_API_KEY=932ded3c1efbbc14e5cb82e319c4d966
SCRAPER_CRON_SECRET=procheff-ihale-scraper-secret-2025-secure-key-32chars
EOF
```

### Step 4: Copy Docker Compose Config

```bash
# Use the DigitalOcean-specific docker-compose file
cp docker-compose.digitalocean.yml docker-compose.yml
```

### Step 5: Build and Deploy

```bash
# Build Docker image (10-15 minutes)
docker build -t procheff-v3:latest .

# Start the application
docker-compose up -d

# View logs
docker-compose logs -f procheff-v3
```

### Step 6: Verify Deployment

```bash
# Check container status
docker ps

# Test health endpoint
curl http://localhost:3001/api/health

# Expected: {"status":"ok"}
```

---

## 🌐 Access Your Application

**Development Access (immediate):**
- http://161.35.217.113:3001

**Production Access (after Nginx + SSL):**
- https://v3.procheff.com (or your domain)

---

## 🔧 Configure Nginx (Optional but Recommended)

### Quick Nginx Setup

```bash
# Create Nginx config
cat > /etc/nginx/sites-available/procheff-v3 <<'EOF'
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

        # Timeouts for AI processing
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/procheff-v3 /etc/nginx/sites-enabled/

# Test and reload
nginx -t
systemctl reload nginx
```

### Setup SSL Certificate

```bash
# Install certbot (if not installed)
apt update && apt install certbot python3-certbot-nginx -y

# Get certificate
certbot --nginx -d v3.procheff.com

# Certificate will auto-renew
```

---

## 🔄 Update Application

```bash
# SSH to droplet
ssh root@161.35.217.113

# Navigate to directory
cd /root/procheff-v3

# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# View logs
docker-compose logs -f procheff-v3
```

---

## 🐛 Troubleshooting

### Container won't start

```bash
# View detailed logs
docker-compose logs procheff-v3

# Check container status
docker ps -a | grep procheff

# Restart container
docker-compose restart procheff-v3
```

### Port already in use

```bash
# Check what's using port 3001
lsof -i :3001

# Change port in docker-compose.yml
nano docker-compose.yml
# Change "3001:8080" to "3002:8080"

# Restart
docker-compose up -d
```

### Permission denied

```bash
# Fix Docker permissions
chmod 666 /var/run/docker.sock

# Or add user to docker group
usermod -aG docker $USER
```

### Build fails

```bash
# Clean Docker cache
docker system prune -a

# Rebuild from scratch
docker-compose down
docker build --no-cache -t procheff-v3:latest .
docker-compose up -d
```

---

## 📊 Monitoring

```bash
# View logs
docker-compose logs -f procheff-v3

# Container stats
docker stats procheff-v3

# Check health
curl http://localhost:3001/api/health

# View Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 🗄️ Database Backup

```bash
# Backup database
docker exec procheff-v3 sqlite3 /app/data/procheff.db ".backup '/app/data/backup.db'"

# Copy to host
docker cp procheff-v3:/app/data/backup.db /root/backups/procheff-v3-$(date +%Y%m%d).db

# Create automated backup script
cat > /root/backup-procheff.sh <<'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
docker exec procheff-v3 sqlite3 /app/data/procheff.db ".backup '/app/data/backup.db'"
docker cp procheff-v3:/app/data/backup.db /root/backups/procheff-v3-${DATE}.db
find /root/backups -name "procheff-v3-*.db" -mtime +7 -delete
echo "Backup completed: procheff-v3-${DATE}.db"
EOF

chmod +x /root/backup-procheff.sh

# Add to crontab (daily at 3 AM)
(crontab -l 2>/dev/null; echo "0 3 * * * /root/backup-procheff.sh") | crontab -
```

---

## ✅ Success Checklist

- [ ] SSH access to droplet working
- [ ] Repository cloned successfully
- [ ] .env file created with correct values
- [ ] Docker image built successfully
- [ ] Container running: `docker ps | grep procheff-v3`
- [ ] Health check passes: `curl http://localhost:3001/api/health`
- [ ] Web interface accessible: http://161.35.217.113:3001
- [ ] Nginx configured (optional)
- [ ] SSL certificate installed (optional)
- [ ] Both v2 and v3 running together (if needed)

---

## 🚀 Quick Commands Reference

```bash
# Deploy/Update
cd /root/procheff-v3 && git pull && docker-compose up -d --build

# Restart
docker-compose restart procheff-v3

# Stop
docker-compose down

# View logs
docker-compose logs -f procheff-v3

# Shell access
docker exec -it procheff-v3 sh

# Health check
curl http://localhost:3001/api/health

# Container stats
docker stats procheff-v3
```

---

## 📞 Support

**Droplet IP:** 161.35.217.113
**GitHub:** https://github.com/aydarnuman/procheff-v3-enterprise
**Port:** 3001 (v3) / 3000 (v2)

---

**Last Updated:** 2025-11-10
**Version:** 3.0.0
