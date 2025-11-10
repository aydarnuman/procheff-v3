# 🚀 Quick Start: DigitalOcean Deployment

This guide will help you deploy Procheff v3 to DigitalOcean in under 10 minutes.

## 📦 What You Need

1. **DigitalOcean Account** - [Sign up here](https://cloud.digitalocean.com/registrations/new)
2. **GitHub Account** - Push your code
3. **API Keys**:
   - [Anthropic API Key](https://console.anthropic.com/)
   - [Google API Key](https://aistudio.google.com/app/apikey)
   - [Upstash Redis](https://upstash.com/) (free tier available)

## 🎯 Choose Your Deployment Method

### Option A: App Platform (Recommended) - 5 Minutes ⚡

**Best for:** Production-ready, zero-config deployment

```bash
# 1. Install doctl CLI
brew install doctl  # macOS
# or
snap install doctl  # Linux

# 2. Authenticate
doctl auth init

# 3. Deploy!
cd /path/to/procheff-v3
doctl apps create --spec .do/app.yaml

# 4. Configure secrets in DigitalOcean dashboard
# Go to: Apps → Your App → Settings → Environment Variables
```

**Cost:** ~$24-48/month for production

### Option B: Docker Droplet - 10 Minutes 🖥️

**Best for:** Full control, cost-effective

```bash
# 1. Create droplet (via DigitalOcean dashboard)
# - Ubuntu 24.04 LTS
# - 2 GB RAM / 2 vCPUs
# - Frankfurt region

# 2. SSH into droplet
ssh root@YOUR_DROPLET_IP

# 3. Run setup script
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
apt install docker-compose-plugin -y

# 4. Clone and deploy
git clone https://github.com/your-username/procheff-v3.git
cd procheff-v3
cp .env.production.example .env.production
nano .env.production  # Add your API keys
docker-compose up -d
```

**Cost:** ~$12-24/month

## 🔑 Required Environment Variables

Add these in DigitalOcean → App Settings → Environment Variables:

```bash
# Generate NextAuth secret
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# AI APIs (required)
ANTHROPIC_API_KEY=sk-ant-api03-...
GOOGLE_API_KEY=AIza...
GEMINI_API_KEY=AIza...

# Redis (required for production)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# App URL (update after deployment)
NEXTAUTH_URL=https://your-app.ondigitalocean.app
```

## ✅ Verify Deployment

```bash
# Check health
curl https://your-app.ondigitalocean.app/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-11-10T...",
  "version": "3.0.0"
}
```

## 🔄 Enable Auto-Deploy (GitHub Actions)

1. Add secret to GitHub:
   - Go to: **Repository → Settings → Secrets → Actions**
   - Add: `DIGITALOCEAN_ACCESS_TOKEN`

2. Push to main branch:
```bash
git push origin main
```

GitHub Actions will automatically deploy your app!

## 📖 Full Documentation

- **Detailed Guide**: [docs/DIGITALOCEAN-DEPLOYMENT.md](docs/DIGITALOCEAN-DEPLOYMENT.md)
- **Architecture**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Production Features**: [docs/PRODUCTION-FEATURES.md](docs/PRODUCTION-FEATURES.md)

## 🆘 Need Help?

### Quick Troubleshooting

**Build fails:**
```bash
# Check logs
doctl apps logs YOUR_APP_ID --follow
```

**Can't connect:**
```bash
# Verify secrets are set
doctl apps list YOUR_APP_ID
```

**App crashes:**
```bash
# Check environment variables in dashboard
# Common issue: Missing ANTHROPIC_API_KEY or Redis credentials
```

### Support Resources

- [GitHub Issues](https://github.com/your-username/procheff-v3/issues)
- [DigitalOcean Docs](https://docs.digitalocean.com/products/app-platform/)
- [Community Forum](https://www.digitalocean.com/community/)

## 🎉 You're Done!

Your app is now live at: `https://your-app.ondigitalocean.app`

**Next Steps:**
1. ✅ Test the application
2. ✅ Set up monitoring
3. ✅ Configure custom domain (optional)
4. ✅ Enable backups

---

*Need the full deployment guide? See [DIGITALOCEAN-DEPLOYMENT.md](docs/DIGITALOCEAN-DEPLOYMENT.md)*
