# 🚀 DigitalOcean App Platform - Deploy Now!

## ✅ Hazırlık Durumu

Tüm dosyalar hazır! Şimdi deploy edebilirsiniz.

---

## 📋 Deployment Adımları (5-10 dakika)

### Adım 1: doctl CLI Kurulumu

```bash
# macOS
brew install doctl

# Kurulumu doğrula
doctl version
```

### Adım 2: DigitalOcean Authentication

```bash
# DigitalOcean'a giriş yap
doctl auth init

# API token'ınızı girin
# Token almak için: https://cloud.digitalocean.com/account/api/tokens
```

### Adım 3: GitHub Repository Güncelle

**ÖNEMLİ:** `.do/app.yaml` dosyasını düzenleyin:

```bash
# Dosyayı açın
nano .do/app.yaml

# Satır 14'ü düzenleyin:
# ÖNCE: repo: your-github-username/procheff-v3
# SONRA: repo: aydarnuman/procheff-v3  # veya kendi repo'nuz

# Kaydet ve çık (Ctrl+X, Y, Enter)
```

### Adım 4: GitHub'a Push

```bash
# Tüm dosyaları ekle
git add .

# Commit oluştur
git commit -m "Add DigitalOcean App Platform deployment configuration"

# GitHub'a push et
git push origin main
```

### Adım 5: Deploy!

```bash
# App Platform'a deploy et
doctl apps create --spec .do/app.yaml

# Deployment başlayacak, App ID'yi not edin
```

### Adım 6: Environment Variables (Secrets) Ekle

DigitalOcean dashboard'a git:
1. Go to: https://cloud.digitalocean.com/apps
2. Select your app: `procheff-v3`
3. Go to: **Settings → App-Level Environment Variables**
4. Add secrets:

```bash
# Required Secrets (Click "Encrypt" for each)
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
ANTHROPIC_API_KEY=sk-ant-api03-...
GOOGLE_API_KEY=AIza...
GEMINI_API_KEY=AIza...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

**Secrets nasıl generate edilir:**

```bash
# NextAuth secret
openssl rand -base64 32

# Diğer API keyleri:
# - Anthropic: https://console.anthropic.com/
# - Google: https://aistudio.google.com/app/apikey
# - Upstash: https://upstash.com/ (ücretsiz tier)
```

### Adım 7: Deployment İzle

```bash
# App ID'nizi alın (eğer not etmediyseniz)
doctl apps list

# Deployment durumunu izleyin
doctl apps list-deployments YOUR_APP_ID

# Logları takip edin
doctl apps logs YOUR_APP_ID --follow
```

### Adım 8: Test Et!

```bash
# App URL'inizi alın
doctl apps list --format Name,DefaultIngress

# Health check test et
curl https://your-app.ondigitalocean.app/api/health

# Beklenen sonuç:
{
  "status": "healthy",
  "timestamp": "2025-11-10T...",
  "version": "3.0.0",
  "environment": "production",
  "uptime": 123,
  "checks": {
    "redis": true,
    "database": true,
    "ai": true
  }
}
```

---

## 🔄 Auto-Deploy Setup (Optional)

GitHub Actions ile otomatik deployment için:

### 1. GitHub Secret Ekle

```bash
# DigitalOcean API token oluştur:
# https://cloud.digitalocean.com/account/api/tokens

# GitHub'da:
# Settings → Secrets and variables → Actions → New repository secret
# Name: DIGITALOCEAN_ACCESS_TOKEN
# Value: dop_v1_xxxxx...
```

### 2. Push to Deploy!

```bash
# Artık her push'da otomatik deploy olacak
git add .
git commit -m "Your changes"
git push origin main

# GitHub Actions otomatik çalışacak!
```

---

## 📊 Monitoring & Management

### Useful Commands

```bash
# List all apps
doctl apps list

# Get app details
doctl apps get YOUR_APP_ID

# View logs
doctl apps logs YOUR_APP_ID --follow

# List deployments
doctl apps list-deployments YOUR_APP_ID

# Trigger new deployment
doctl apps create-deployment YOUR_APP_ID

# Update app (after changing app.yaml)
doctl apps update YOUR_APP_ID --spec .do/app.yaml
```

### Dashboard URLs

- **Apps Dashboard**: https://cloud.digitalocean.com/apps
- **Your App**: https://cloud.digitalocean.com/apps/YOUR_APP_ID
- **Metrics**: App → Insights
- **Logs**: App → Runtime Logs
- **Settings**: App → Settings

---

## 💰 Cost Estimate

### Professional XS Plan (Recommended)
- **Instance**: $24/month (1 GB RAM, 1 vCPU, dedicated)
- **Volume**: $0.10/month (1 GB storage)
- **Bandwidth**: Free (1 TB included)
- **Total**: ~$24.10/month

### Basic XS Plan (Budget)
- **Instance**: $12/month (1 GB RAM, 1 vCPU, shared)
- **Volume**: $0.10/month (1 GB storage)
- **Total**: ~$12.10/month

### External Services
- **Upstash Redis**: Free tier (sufficient for most use)
- **AI APIs**: Pay-per-use (~$10-50/month depending on usage)

**Grand Total**: ~$22-74/month

---

## 🆘 Troubleshooting

### Build Fails

```bash
# Check build logs
doctl apps logs YOUR_APP_ID

# Common issues:
# 1. Missing dependencies → Check package.json
# 2. Build timeout → Upgrade instance size
# 3. Out of memory → Increase memory limit
```

### App Crashes

```bash
# View runtime logs
doctl apps logs YOUR_APP_ID --follow

# Common causes:
# 1. Missing environment variables
# 2. Database connection issues
# 3. API key problems

# Fix: Verify all secrets in dashboard
```

### Slow Performance

```bash
# Verify caching is enabled
# Check Settings → Environment Variables
# ENABLE_CACHING=true
# ENABLE_RATE_LIMITING=true

# Upgrade instance size if needed
doctl apps update YOUR_APP_ID --spec .do/app.yaml
# (Edit app.yaml first: instance_size_slug: professional-s)
```

---

## ✅ Success Checklist

- [ ] doctl CLI installed
- [ ] DigitalOcean authenticated
- [ ] `.do/app.yaml` GitHub repo updated
- [ ] Code pushed to GitHub
- [ ] App created on DigitalOcean
- [ ] Environment variables/secrets added
- [ ] Build completed successfully
- [ ] Health check passing
- [ ] App accessible in browser
- [ ] GitHub Actions configured (optional)

---

## 🎉 You're Live!

Once deployed, your app will be available at:

**App URL**: `https://procheff-v3-XXXXX.ondigitalocean.app`

### Next Steps

1. ✅ Test all features
2. ✅ Monitor logs for 24 hours
3. ✅ Set up custom domain (optional)
4. ✅ Configure monitoring alerts
5. ✅ Create database backups

### Custom Domain (Optional)

```bash
# Add custom domain in dashboard
# Settings → Domains → Add Domain
# Follow DNS configuration instructions

# Or via CLI
doctl apps update YOUR_APP_ID --spec .do/app.yaml
# (Add domains section in app.yaml)
```

---

## 📚 Documentation

- **Quick Start**: [README-DEPLOYMENT.md](README-DEPLOYMENT.md)
- **Full Guide**: [docs/DIGITALOCEAN-DEPLOYMENT.md](docs/DIGITALOCEAN-DEPLOYMENT.md)
- **Summary**: [DIGITALOCEAN-SETUP.md](DIGITALOCEAN-SETUP.md)

## 🆘 Support

- **DigitalOcean Docs**: https://docs.digitalocean.com/products/app-platform/
- **GitHub Issues**: Create an issue in your repository
- **Community**: https://www.digitalocean.com/community/

---

**Ready to deploy?** Start with Step 1! 🚀

---

*Created: 2025-11-10*
*Version: 3.0.0*
*Deployment: DigitalOcean App Platform*
