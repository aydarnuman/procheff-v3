# Deployment Documentation

**Complete deployment guide for Procheff-v3**

**Last Updated**: 2025-01-12

---

## 📚 Table of Contents

- [Deployment Options](#deployment-options)
- [DigitalOcean App Platform](#digitalocean-app-platform)
- [Docker Deployment](#docker-deployment)
- [Vercel Deployment](#vercel-deployment)
- [Environment Setup](#environment-setup)
- [Post-Deployment](#post-deployment)

---

## Deployment Options

### Option 1: DigitalOcean App Platform (Recommended)
- ✅ Fully managed (PaaS)
- ✅ Auto-scaling
- ✅ Zero-downtime deployments
- ✅ Built-in SSL
- 💰 Cost: ~$12-48/month

### Option 2: Docker Droplet (VPS)
- ✅ Full control
- ✅ Cost-effective
- ✅ Custom configurations
- 💰 Cost: ~$6-24/month

### Option 3: Vercel
- ✅ Easy Next.js deployment
- ✅ Free tier available
- ⚠️ Serverless limitations

---

## DigitalOcean App Platform

### Prerequisites

1. DigitalOcean account
2. GitHub repository
3. API keys ready

### Step 1: Create App

1. Go to DigitalOcean App Platform
2. Click "Create App"
3. Connect GitHub repository
4. Select branch: `main`

### Step 2: Configure Build

**Build Command**: `npm run build`  
**Run Command**: `npm start`  
**Output Directory**: `.next`

### Step 3: Environment Variables

Add all required variables (see [Environment Documentation](./ENVIRONMENT.md)):

- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `UPSTASH_REDIS_REST_URL` (optional)
- `UPSTASH_REDIS_REST_TOKEN` (optional)

### Step 4: Deploy

Click "Deploy" and wait for build to complete.

**See**: [DigitalOcean Deployment Guide](./DIGITALOCEAN-DEPLOYMENT.md) for detailed steps.

---

## Docker Deployment

### Build Image

```bash
docker build -t procheff-v3:latest .
```

### Run Container

```bash
docker run -d \
  --name procheff-v3 \
  -p 3001:8080 \
  -e ANTHROPIC_API_KEY=... \
  -e GOOGLE_API_KEY=... \
  -e NEXTAUTH_SECRET=... \
  -v procheff-data:/app/data \
  procheff-v3:latest
```

### Docker Compose

```bash
# Use production compose file
docker-compose -f docker-compose.digitalocean.yml up -d
```

**See**: `docker-compose.digitalocean.yml` for full configuration.

---

## Vercel Deployment

### Prerequisites

1. Vercel account
2. GitHub repository

### Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deploy
vercel --prod
```

### Environment Variables

Add in Vercel dashboard:
- Settings → Environment Variables

---

## Environment Setup

### Required Variables

See [Environment Documentation](./ENVIRONMENT.md) for complete list.

**Minimum for production**:
```bash
NODE_ENV=production
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://your-domain.com
```

### Optional (Recommended)

```bash
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
ENABLE_RATE_LIMITING=true
ENABLE_CACHING=true
SLACK_WEBHOOK_URL=https://...
```

---

## Post-Deployment

### Health Check

```bash
curl https://your-domain.com/api/health
```

Expected:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "services": {
    "database": "ok",
    "redis": "ok",
    "ai": "ok"
  }
}
```

### Verify Features

1. **Authentication**: Test login/register
2. **AI Analysis**: Upload a test document
3. **API Endpoints**: Test key endpoints
4. **Notifications**: Check notification system

### Monitoring

- Check `/api/metrics` for system stats
- Monitor `/api/health` for service status
- Review logs via `/api/logs`

---

## Troubleshooting

### Build Fails

- Check Node.js version (requires 18+)
- Verify all dependencies install
- Check for TypeScript errors

### App Won't Start

- Verify environment variables
- Check database permissions
- Review application logs

### Performance Issues

- Enable caching: `ENABLE_CACHING=true`
- Enable rate limiting: `ENABLE_RATE_LIMITING=true`
- Check Redis connection

---

**Last Updated**: 2025-01-12  
**See Also**: [DigitalOcean Deployment Guide](./DIGITALOCEAN-DEPLOYMENT.md)  
**Maintained By**: Procheff-v3 Development Team


