# 🚀 DigitalOcean Deployment Guide - Procheff v3

**Complete guide for deploying Procheff v3 to DigitalOcean with Docker**

## 📋 Table of Contents

1. [Deployment Options](#deployment-options)
2. [Option 1: DigitalOcean App Platform](#option-1-digitalocean-app-platform-recommended)
3. [Option 2: Docker Droplet (VPS)](#option-2-docker-droplet-vps)
4. [GitHub Actions CI/CD](#github-actions-cicd)
5. [Environment Configuration](#environment-configuration)
6. [Monitoring & Scaling](#monitoring--scaling)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Deployment Options

### Option 1: App Platform (Recommended)
- ✅ Fully managed platform (PaaS)
- ✅ Auto-scaling and load balancing
- ✅ Zero-downtime deployments
- ✅ Built-in SSL certificates
- ✅ GitHub integration (auto-deploy)
- 💰 **Cost**: ~$12-48/month

### Option 2: Docker Droplet (VPS)
- ✅ Full control over infrastructure
- ✅ Cost-effective for larger workloads
- ✅ Custom Docker configurations
- ⚠️ Manual setup and maintenance
- 💰 **Cost**: ~$6-24/month

---

## 🚀 Option 1: DigitalOcean App Platform (Recommended)

### Prerequisites

1. **DigitalOcean Account**: [Sign up here](https://cloud.digitalocean.com/registrations/new)
2. **GitHub Repository**: Push your code to GitHub
3. **API Keys**:
   - Anthropic API Key (`ANTHROPIC_API_KEY`)
   - Google API Key (`GOOGLE_API_KEY`)
   - Upstash Redis credentials
   - NextAuth Secret (generate: `openssl rand -base64 32`)

### Step 1: Prepare Your Repository

```bash
# Ensure all required files are in your repo
git add .do/app.yaml
git add Dockerfile
git add docker-compose.yml
git add .dockerignore
git commit -m "Add DigitalOcean deployment configuration"
git push origin main
```

### Step 2: Install doctl CLI (Optional but Recommended)

```bash
# macOS
brew install doctl

# Ubuntu/Debian
snap install doctl

# Authenticate
doctl auth init
# Enter your DigitalOcean API token when prompted
```

### Step 3: Update App Configuration

Edit [.do/app.yaml](.do/app.yaml) and update these values:

```yaml
# Line 7: Update your GitHub repository
github:
  repo: your-github-username/procheff-v3
  branch: main

# Line 5: Choose your region
region: fra  # Options: nyc, sfo, ams, fra, sgp, blr, tor, lon
```

### Step 4: Deploy via App Platform Dashboard

#### Method A: Web UI (Easiest)

1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Click **"Create App"**
3. Choose **"GitHub"** as source
4. Select your repository: `your-username/procheff-v3`
5. Choose branch: `main`
6. DigitalOcean will auto-detect the [Dockerfile](Dockerfile)
7. Click **"Import from app.yaml"** and upload `.do/app.yaml`
8. Configure environment variables (see [Environment Variables](#environment-variables))
9. Click **"Next"** → Review → **"Create Resources"**

#### Method B: CLI (Recommended for automation)

```bash
# Create app from spec
doctl apps create --spec .do/app.yaml

# Or update existing app
doctl apps update YOUR_APP_ID --spec .do/app.yaml
```

### Step 5: Configure Secrets

In App Platform dashboard, go to **Settings → Environment Variables** and add:

```bash
# Required Secrets
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
ANTHROPIC_API_KEY=sk-ant-api03-...
GOOGLE_API_KEY=AIza...
GEMINI_API_KEY=AIza...

# Redis (Required for production)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here

# Optional: Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Optional: Scraper credentials
IHALEBUL_USERNAME=your-username
IHALEBUL_PASSWORD=your-password
SCRAPER_CRON_SECRET=your-secret
```

### Step 6: Deploy!

```bash
# Via CLI
doctl apps create-deployment YOUR_APP_ID

# Or push to GitHub (auto-deploy enabled)
git push origin main
```

### Step 7: Verify Deployment

```bash
# Get app URL
doctl apps list

# Test health endpoint
curl https://your-app.ondigitalocean.app/api/health

# View logs
doctl apps logs YOUR_APP_ID --follow
```

---

## 🖥️ Option 2: Docker Droplet (VPS)

### Step 1: Create Droplet

1. Go to [DigitalOcean → Droplets](https://cloud.digitalocean.com/droplets/new)
2. Choose configuration:
   - **Image**: Ubuntu 24.04 LTS
   - **Plan**: Basic
     - **Starter**: 1 GB RAM / 1 vCPU / 25 GB SSD - $6/month
     - **Recommended**: 2 GB RAM / 2 vCPUs / 50 GB SSD - $12/month
   - **Datacenter**: Frankfurt (or closest to your users)
   - **Authentication**: SSH key (recommended) or password
   - **Hostname**: `procheff-production`

3. Click **"Create Droplet"**

### Step 2: Initial Server Setup

```bash
# SSH into your droplet
ssh root@YOUR_DROPLET_IP

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Create app user (security best practice)
adduser --disabled-password --gecos "" procheff
usermod -aG docker procheff
su - procheff
```

### Step 3: Deploy Application

```bash
# Clone your repository
cd ~
git clone https://github.com/your-username/procheff-v3.git
cd procheff-v3

# Create production environment file
cp .env.production.example .env.production

# Edit environment variables
nano .env.production
# Fill in your API keys and configuration
```

### Step 4: Start Services

```bash
# Build and start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f web
```

### Step 5: Setup Nginx Reverse Proxy (Optional)

```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/procheff
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

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
    }
}
```

Enable the site:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/procheff /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Install SSL certificate (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

### Step 6: Setup Automatic Updates

```bash
# Create update script
nano ~/procheff-v3/update.sh
```

Add:

```bash
#!/bin/bash
cd ~/procheff-v3
git pull origin main
docker-compose pull
docker-compose up -d --build
docker system prune -f
```

Make executable:

```bash
chmod +x ~/procheff-v3/update.sh
```

---

## 🔄 GitHub Actions CI/CD

### Setup Automatic Deployments

Your repository already includes GitHub Actions workflows:

1. [.github/workflows/deploy-digitalocean.yml](.github/workflows/deploy-digitalocean.yml) - App Platform deployment
2. [.github/workflows/docker-build.yml](.github/workflows/docker-build.yml) - Docker image testing

### Configure GitHub Secrets

Go to **GitHub → Settings → Secrets and variables → Actions** and add:

```bash
# For App Platform deployment
DIGITALOCEAN_ACCESS_TOKEN=dop_v1_...

# For Docker registry (if using)
DOCKER_REGISTRY=registry.digitalocean.com/your-registry
DOCKER_USERNAME=your-token
DOCKER_PASSWORD=your-token
```

### Trigger Deployment

```bash
# Automatic: Push to main branch
git push origin main

# Manual: Via GitHub Actions UI
# Go to Actions → Deploy to DigitalOcean → Run workflow
```

---

## ⚙️ Environment Configuration

### Production Environment Variables

See [.env.production.example](.env.production.example) for complete reference.

**Required Variables:**

```bash
# Core
NODE_ENV=production
PORT=8080
DATABASE_PATH=/app/data/procheff.db

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<generated-secret>

# AI APIs
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514
GOOGLE_API_KEY=AIza...
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.0-flash-exp

# Redis (Required)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Features
ENABLE_RATE_LIMITING=true
ENABLE_CACHING=true
ENABLE_BATCH=true
```

### Get Your API Keys

1. **Anthropic Claude**: https://console.anthropic.com/
2. **Google AI Studio**: https://aistudio.google.com/app/apikey
3. **Upstash Redis**: https://upstash.com/
4. **NextAuth Secret**: `openssl rand -base64 32`

---

## 📊 Monitoring & Scaling

### Health Checks

```bash
# Check application health
curl https://your-app.ondigitalocean.app/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-11-10T12:00:00.000Z",
  "version": "3.0.0"
}
```

### View Logs

**App Platform:**
```bash
# Via CLI
doctl apps logs YOUR_APP_ID --follow

# Via dashboard
# Go to App → Runtime Logs
```

**Droplet:**
```bash
# Application logs
docker-compose logs -f web

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Scaling

**App Platform:**
```bash
# Update instance size
doctl apps update YOUR_APP_ID --spec .do/app.yaml

# Or via dashboard: Settings → Resources → Edit
```

Available sizes:
- `basic-xxs`: $5/month (512 MB RAM, 0.5 vCPU)
- `basic-xs`: $12/month (1 GB RAM, 1 vCPU)
- `professional-xs`: $24/month (1 GB RAM, 1 vCPU, dedicated)
- `professional-s`: $48/month (2 GB RAM, 2 vCPU, dedicated)

**Droplet:**
```bash
# Resize droplet
# Go to Droplet → Resize → Choose new size → Resize
```

### Performance Optimization

```bash
# Enable caching (set in environment)
ENABLE_CACHING=true
ENABLE_RATE_LIMITING=true

# Monitor Redis usage
# Go to Upstash dashboard

# Optimize Docker
docker system prune -a --volumes -f  # Clean unused data
```

---

## 🔧 Troubleshooting

### Issue 1: Build Fails

**App Platform:**
```bash
# Check build logs
doctl apps list-deployments YOUR_APP_ID

# View specific deployment logs
doctl apps logs YOUR_APP_ID --deployment YOUR_DEPLOYMENT_ID
```

**Common causes:**
- Missing dependencies in [package.json](package.json)
- Build timeout (increase in `.do/app.yaml`)
- Memory limit exceeded (upgrade instance size)

### Issue 2: Application Crashes

```bash
# Check logs
doctl apps logs YOUR_APP_ID --follow

# Common causes:
# - Missing environment variables
# - Database connection issues
# - Out of memory

# Fix: Verify all secrets are set
doctl apps list YOUR_APP_ID
```

### Issue 3: Database Issues

```bash
# SQLite database locked
# Solution: Use persistent volume (already configured)

# Check volume mount
docker-compose exec web ls -la /app/data

# Reset database (WARNING: deletes all data)
docker-compose exec web rm /app/data/procheff.db
docker-compose restart web
```

### Issue 4: High Memory Usage

```bash
# Monitor memory
docker stats

# Optimize Node.js
# Add to environment:
NODE_OPTIONS=--max-old-space-size=1536

# Or upgrade instance size
```

### Issue 5: Slow Performance

```bash
# Enable caching
ENABLE_CACHING=true

# Check Redis connection
curl -X POST https://your-app.com/api/cache/test

# Verify region proximity
# Use same region for:
# - App Platform
# - Upstash Redis
# - Your users
```

---

## 🎛️ Useful Commands

### App Platform

```bash
# List all apps
doctl apps list

# Get app details
doctl apps get YOUR_APP_ID

# List deployments
doctl apps list-deployments YOUR_APP_ID

# View logs
doctl apps logs YOUR_APP_ID --follow

# Create deployment
doctl apps create-deployment YOUR_APP_ID

# Delete app
doctl apps delete YOUR_APP_ID
```

### Docker (Droplet)

```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Rebuild and restart
docker-compose up -d --build

# Stop services
docker-compose down

# Clean up
docker system prune -a --volumes -f
```

### Deployment Scripts

```bash
# Build Docker image locally
./scripts/docker-build.sh v1.0.0

# Deploy to DigitalOcean App Platform
./scripts/deploy-digitalocean.sh production

# Manual deployment (Droplet)
ssh procheff@YOUR_IP 'cd ~/procheff-v3 && ./update.sh'
```

---

## 💰 Cost Estimation

### App Platform (Recommended)

| Plan | RAM | vCPU | Price/month | Use Case |
|------|-----|------|-------------|----------|
| Basic XS | 1 GB | 1 | $12 | Development |
| Professional XS | 1 GB | 1 | $24 | Small production |
| Professional S | 2 GB | 2 | $48 | Production (recommended) |

**Additional Costs:**
- Database volume: $0.10/GB/month (1 GB = $0.10)
- Bandwidth: Free 1TB, then $0.01/GB

**Example Total:** $48 + $0.10 = **$48.10/month**

### Droplet

| Plan | RAM | vCPU | Storage | Price/month |
|------|-----|------|---------|-------------|
| Basic | 1 GB | 1 | 25 GB | $6 |
| Recommended | 2 GB | 2 | 50 GB | $12 |
| Professional | 4 GB | 2 | 80 GB | $24 |

**Additional Costs:**
- Volumes: $0.10/GB/month (optional)
- Backups: +20% of droplet cost (optional)

**Example Total:** $12 + $2.40 (backup) = **$14.40/month**

---

## 🔒 Security Checklist

- [ ] All secrets stored in environment variables (not in code)
- [ ] HTTPS enabled (automatic with App Platform)
- [ ] Rate limiting enabled (`ENABLE_RATE_LIMITING=true`)
- [ ] Authentication configured (NextAuth)
- [ ] Firewall rules configured (if using Droplet)
- [ ] Regular security updates (`apt update && apt upgrade`)
- [ ] Database backups configured
- [ ] Monitoring alerts set up

---

## 📚 Additional Resources

### Official Documentation
- [DigitalOcean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [DigitalOcean Droplets Guide](https://docs.digitalocean.com/products/droplets/)
- [Docker Documentation](https://docs.docker.com/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

### Internal Documentation
- [Architecture Overview](ARCHITECTURE.md)
- [Database Schema](DATABASE.md)
- [Production Features](PRODUCTION-FEATURES.md)
- [Rate Limiting](RATE-LIMITING.md)
- [Caching Strategy](CACHING.md)

### Support
- **GitHub Issues**: [Create an issue](https://github.com/your-username/procheff-v3/issues)
- **DigitalOcean Support**: https://www.digitalocean.com/support/
- **Community**: https://www.digitalocean.com/community/

---

## 🎉 Deployment Complete!

Your Procheff v3 application is now deployed to DigitalOcean!

**Next Steps:**

1. ✅ Verify health check: `curl https://your-app.com/api/health`
2. ✅ Test authentication flow
3. ✅ Upload a test document
4. ✅ Monitor logs for first 24 hours
5. ✅ Set up custom domain (optional)
6. ✅ Configure monitoring alerts
7. ✅ Create backups

**Access Points:**
- 🌐 **Application**: https://your-app.ondigitalocean.app
- 🏥 **Health Check**: https://your-app.ondigitalocean.app/api/health
- 📊 **Monitoring**: https://your-app.ondigitalocean.app/monitor

---

*Last Updated: 2025-11-10*
*Version: 3.0.0*
*Deployment Target: DigitalOcean App Platform & Droplets*
