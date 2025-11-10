# 🚀 Procheff v3 - Deployment & Integration Guide

**Complete guide for deploying Procheff v3 to production environments**

## 📋 Table of Contents

1. [System Architecture](#system-architecture)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [GitHub Setup](#github-setup)
4. [Google Cloud Run Deployment](#google-cloud-run-deployment)
5. [DigitalOcean VPS Worker Setup](#digitalocean-vps-worker-setup)
6. [Tailscale Network Configuration](#tailscale-network-configuration)
7. [Environment Configuration](#environment-configuration)
8. [Monitoring & Health Checks](#monitoring--health-checks)
9. [Troubleshooting](#troubleshooting)

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Production Architecture                    │
└──────────────────────────────────────────────────────────────┘

┌─────────────────┐          ┌──────────────────────┐
│   GitHub Repo   │─────────▶│  Cloud Build Trigger │
│ procheff-v3-ent │          │  (Auto-Deploy)       │
└─────────────────┘          └──────────┬───────────┘
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │   Google Cloud Run   │
                             │   procheff-v3-web    │
                             │   (Main Application) │
                             └──────────┬───────────┘
                                        │
                ┌───────────────────────┼───────────────────────┐
                │                       │                       │
                ▼                       ▼                       ▼
        ┌───────────────┐      ┌──────────────┐      ┌─────────────────┐
        │ Upstash Redis │      │   Secrets    │      │  Cloud Storage  │
        │ (Cache+Queue) │      │   Manager    │      │  (Uploads/Logs) │
        └───────────────┘      └──────────────┘      └─────────────────┘

                ┌──────────────────────────────┐
                │      Tailscale VPN           │
                └──────────────┬───────────────┘
                               │
                               ▼
                ┌────────────────────────────┐
                │  DigitalOcean VPS Worker   │
                │  - Background Jobs         │
                │  - Batch Processing        │
                │  - Redis Queue Consumer    │
                └────────────────────────────┘
```

---

## ✅ Pre-Deployment Checklist

### Required Services

- [x] **GitHub Account** - For repository and CI/CD
- [x] **Google Cloud Platform** - For Cloud Run deployment
- [x] **Upstash Redis** - For caching and rate limiting
- [x] **Anthropic API** - For Claude Sonnet 4.5
- [x] **Google AI Studio** - For Gemini Vision OCR
- [x] **DigitalOcean Account** - For worker VPS (optional)
- [x] **Tailscale Account** - For secure VPN networking (optional)

### API Keys Needed

```bash
✅ ANTHROPIC_API_KEY
✅ GOOGLE_API_KEY
✅ NEXTAUTH_SECRET (generate: openssl rand -base64 32)
✅ UPSTASH_REDIS_REST_URL
✅ UPSTASH_REDIS_REST_TOKEN
✅ SLACK_WEBHOOK_URL (optional)
```

---

## 🔐 Step 1: GitHub Setup

### 1.1 Create New Repository

```bash
# Create repo on GitHub: procheff-v3-enterprise
# Then initialize locally:

cd /Users/numanaydar/procheff-v3
git init
git add .
git commit -m "Initial enterprise version - Production ready"
git branch -M main
git remote add origin git@github.com:aydarnuman/procheff-v3-enterprise.git
git push -u origin main
```

### 1.2 Set Repository Secrets

Go to: **Settings → Secrets and variables → Actions**

Add these secrets:

```
GCP_PROJECT_ID=your-project-id
GCP_SA_KEY=<service-account-json-key>
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
NEXTAUTH_SECRET=<generated-secret>
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## ☁️ Step 2: Google Cloud Run Deployment

### 2.1 Install Google Cloud SDK

```bash
# macOS
brew install --cask google-cloud-sdk

# Initialize
gcloud init
gcloud config set project YOUR_PROJECT_ID
```

### 2.2 Enable Required APIs

```bash
gcloud services enable \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    containerregistry.googleapis.com \
    secretmanager.googleapis.com
```

### 2.3 Create Secrets in Secret Manager

```bash
# Create secrets
echo -n "YOUR_ANTHROPIC_KEY" | gcloud secrets create anthropic-api-key --data-file=-
echo -n "YOUR_GOOGLE_KEY" | gcloud secrets create google-api-key --data-file=-
echo -n "YOUR_NEXTAUTH_SECRET" | gcloud secrets create nextauth-secret --data-file=-
echo -n "YOUR_REDIS_URL" | gcloud secrets create upstash-redis-url --data-file=-
echo -n "YOUR_REDIS_TOKEN" | gcloud secrets create upstash-redis-token --data-file=-

# Grant access to Cloud Run service account
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding anthropic-api-key \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# Repeat for all secrets
```

### 2.4 Connect Cloud Build to GitHub

1. Go to: **Cloud Build → Triggers**
2. Click **Connect Repository**
3. Select **GitHub** → Authenticate
4. Select repository: `aydarnuman/procheff-v3-enterprise`
5. Create trigger:
   - **Name**: `procheff-v3-deploy`
   - **Event**: Push to branch `main`
   - **Configuration**: Cloud Build configuration file
   - **Location**: `/cloudbuild.yaml`

### 2.5 Manual Deployment (First Time)

```bash
# Build and deploy
gcloud builds submit --config cloudbuild.yaml

# Check deployment
gcloud run services describe procheff-v3 --region europe-west1
```

### 2.6 Set Custom Domain (Optional)

```bash
# Map custom domain
gcloud run domain-mappings create --service procheff-v3 \
    --domain procheff.app \
    --region europe-west1

# Update DNS records as shown in the output
```

---

## 🖥️ Step 3: DigitalOcean VPS Worker Setup

### 3.1 Create Droplet

1. Go to DigitalOcean Dashboard
2. Create Droplet:
   - **Image**: Ubuntu 24.04 LTS
   - **Plan**: Basic (2 GB RAM, 2 vCPUs) - $18/month
   - **Datacenter**: Frankfurt (closest to Cloud Run europe-west1)
   - **Hostname**: `procheff-worker`

### 3.2 Initial Server Setup

```bash
# SSH into server
ssh root@YOUR_DROPLET_IP

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Create app directory
mkdir -p /opt/procheff
cd /opt/procheff
```

### 3.3 Setup Environment

```bash
# Create .env file
cat > .env.production << 'EOF'
NODE_ENV=production
WORKER_MODE=true
DATABASE_PATH=/app/data/procheff.db
REDIS_URL=redis://redis:6379

# API Keys
ANTHROPIC_API_KEY=your-key-here
GOOGLE_API_KEY=your-key-here

# Upstash Redis (for coordination)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
EOF

chmod 600 .env.production
```

### 3.4 Deploy Worker

```bash
# Clone repository (or copy docker-compose.yml)
git clone https://github.com/aydarnuman/procheff-v3-enterprise.git .

# Start worker services
docker-compose -f docker-compose.yml --env-file .env.production up -d worker redis

# Check status
docker-compose ps
docker-compose logs -f worker
```

---

## 🔗 Step 4: Tailscale Network Configuration

### 4.1 Setup Tailscale on Cloud Run

```bash
# Add Tailscale sidecar to Cloud Run (via Cloud Run YAML)
# Create tailscale-cloudrun.yaml:

apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: procheff-v3
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/execution-environment: gen2
    spec:
      containers:
      - name: procheff-app
        image: gcr.io/YOUR_PROJECT/procheff-v3:latest
        env:
        - name: TAILSCALE_AUTHKEY
          valueFrom:
            secretKeyRef:
              name: tailscale-auth-key
              key: key
```

### 4.2 Setup Tailscale on VPS

```bash
# Install Tailscale on DigitalOcean VPS
curl -fsSL https://tailscale.com/install.sh | sh

# Generate auth key from https://login.tailscale.com/admin/settings/keys
# Then connect:
sudo tailscale up --authkey=tskey-auth-XXXXX --hostname=procheff-worker

# Verify connection
tailscale status
```

### 4.3 Configure Private Networking

```bash
# On Cloud Run, set environment variable:
WORKER_URL=http://100.x.x.x:3001  # Tailscale IP of worker

# On VPS, whitelist Cloud Run IP:
ufw allow from 100.x.x.x  # Cloud Run Tailscale IP
```

---

## ⚙️ Step 5: Environment Configuration

### 5.1 Production Environment Variables

**Cloud Run** (.env.production for Cloud Run):

```bash
NODE_ENV=production
PORT=8080
DATABASE_PATH=/app/data/procheff.db

# NextAuth
NEXTAUTH_URL=https://procheff.app
NEXTAUTH_SECRET=<generated-secret>

# AI APIs
ANTHROPIC_API_KEY=<from-secret-manager>
GOOGLE_API_KEY=<from-secret-manager>

# Redis
UPSTASH_REDIS_REST_URL=<from-secret-manager>
UPSTASH_REDIS_REST_TOKEN=<from-secret-manager>

# Feature Flags
ENABLE_RATE_LIMITING=true
ENABLE_CACHING=true
ENABLE_BATCH=true

# Worker Integration (Tailscale)
WORKER_URL=http://100.x.x.x:3001
```

**VPS Worker** (.env.production for VPS):

```bash
NODE_ENV=production
WORKER_MODE=true
DATABASE_PATH=/app/data/procheff.db
REDIS_URL=redis://redis:6379

# AI APIs
ANTHROPIC_API_KEY=<your-key>
GOOGLE_API_KEY=<your-key>

# Upstash (for coordination)
UPSTASH_REDIS_REST_URL=<your-url>
UPSTASH_REDIS_REST_TOKEN=<your-token>
```

### 5.2 Feature Flag Configuration

```bash
# Enable all production features
ENABLE_RATE_LIMITING=true  # Protects API from abuse
ENABLE_CACHING=true        # 100x faster AI responses
ENABLE_BATCH=true          # Multi-file processing
```

---

## 📊 Step 6: Monitoring & Health Checks

### 6.1 Health Check Endpoint

Add health check endpoint (already configured):

```typescript
// src/app/api/health/route.ts
export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '3.0.0',
  });
}
```

### 6.2 Cloud Run Health Checks

```bash
# Health check is auto-configured in Dockerfile:
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

### 6.3 Monitoring Dashboard

Access at: `https://procheff.app/monitor`

**Metrics Tracked:**
- Request rate & latency
- Error rates & types
- AI token usage
- Cache hit rates
- Queue depth

### 6.4 Set Up Alerts

```bash
# Configure Slack webhook for alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Automatic alerts for:
# - Error rate >5%
# - Slow performance >30s
# - High token usage >100k/day
# - Server errors (500)
# - Authentication failures
```

---

## 🔧 Step 7: Troubleshooting

### Common Issues

#### Issue 1: Cloud Build Fails

```bash
# Check build logs
gcloud builds list --limit=5
gcloud builds log BUILD_ID

# Common causes:
# - Missing secrets in Secret Manager
# - Insufficient permissions
# - Docker build errors

# Fix permissions:
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:YOUR_PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
    --role="roles/run.admin"
```

#### Issue 2: Worker Can't Connect

```bash
# Check Tailscale status
tailscale status

# Restart Tailscale
sudo systemctl restart tailscaled

# Check Docker logs
docker-compose logs worker
```

#### Issue 3: Database Locked

```bash
# Cloud Run SQLite issue - use persistent volume
# Already configured in cloudbuild.yaml with:
# --volumes=name=procheff-data,type=cloud-storage,bucket=procheff-data
```

#### Issue 4: High Memory Usage

```bash
# Increase Cloud Run memory
gcloud run services update procheff-v3 \
    --memory=4Gi \
    --region=europe-west1
```

### Logs Access

```bash
# Cloud Run logs
gcloud run services logs read procheff-v3 --region=europe-west1 --limit=50

# VPS worker logs
ssh root@YOUR_DROPLET_IP
cd /opt/procheff
docker-compose logs -f --tail=100 worker
```

---

## 🚀 Step 8: Deployment Checklist

### Pre-Launch

- [ ] GitHub repository created and pushed
- [ ] Cloud Build trigger configured
- [ ] Secrets added to Secret Manager
- [ ] Environment variables configured
- [ ] DigitalOcean VPS created and configured
- [ ] Tailscale network established
- [ ] Redis configured (Upstash)
- [ ] Health checks passing

### Launch

- [ ] Deploy to Cloud Run (manual first time)
- [ ] Verify deployment: `curl https://procheff.app/api/health`
- [ ] Test authentication flow
- [ ] Upload test document
- [ ] Verify Auto-Pipeline execution
- [ ] Check monitoring dashboard
- [ ] Verify worker connectivity

### Post-Launch

- [ ] Monitor logs for first 24 hours
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure DNS (if custom domain)
- [ ] SSL certificate verification
- [ ] Performance testing
- [ ] Backup strategy implemented

---

## 📈 Performance Optimization

### Recommended Settings

**Cloud Run:**
```yaml
Memory: 2 Gi
CPU: 2
Min Instances: 1
Max Instances: 10
Concurrency: 80
Timeout: 300s
```

**VPS Worker:**
```yaml
RAM: 2 GB
vCPUs: 2
Storage: 50 GB SSD
Region: Same as Cloud Run
```

**Redis (Upstash):**
```yaml
Plan: Pay as you go
Region: EU-West-1
Max Memory: 1 GB
Eviction: LRU
```

---

## 🔒 Security Best Practices

1. **API Keys**: Store in Secret Manager, never in code
2. **Rate Limiting**: Always enabled in production
3. **HTTPS Only**: Enforce SSL/TLS
4. **CORS**: Configure allowed origins
5. **Authentication**: Enable NextAuth in production
6. **Firewall**: Only allow necessary ports
7. **Tailscale**: Use for private worker communication
8. **Regular Updates**: Keep dependencies updated
9. **Monitoring**: Set up alerts for suspicious activity
10. **Backups**: Regular database backups

---

## 📞 Support & Resources

- **Documentation**: [/docs](../docs/)
- **GitHub Issues**: https://github.com/aydarnuman/procheff-v3-enterprise/issues
- **Cloud Run Docs**: https://cloud.google.com/run/docs
- **Tailscale Docs**: https://tailscale.com/kb/
- **Upstash Docs**: https://docs.upstash.com/

---

## 🎉 Deployment Complete!

Your Procheff v3 instance is now running in production!

**Access Points:**
- Main App: https://procheff.app
- API Health: https://procheff.app/api/health
- Monitoring: https://procheff.app/monitor
- Logs: https://procheff.app/logs

**Next Steps:**
1. Set up custom domain
2. Configure monitoring alerts
3. Run performance tests
4. Create user documentation
5. Train team on new features

---

*Last Updated: 2025-11-10*
*Version: 3.0.0 - Enterprise Edition*
