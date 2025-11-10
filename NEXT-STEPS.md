# 🚀 DigitalOcean Deployment - Sonraki Adımlar

## ✅ Tamamlanan İşlemler

1. ✅ **doctl CLI kuruldu** (v1.147.0)
2. ✅ **19 deployment dosyası** oluşturuldu
3. ✅ **Cursor AI rules** ve **Copilot instructions** güncellendi
4. ✅ **GitHub Actions CI/CD** workflows hazır
5. ✅ **Health check API** endpoint eklendi
6. ✅ **Git'e eklendi** (commit bekleniyor)

---

## 📋 Şimdi Yapmanız Gerekenler

### Adım 1: DigitalOcean Authentication

```bash
/opt/homebrew/bin/doctl auth init
```

**API Token nasıl alınır:**
1. Git: https://cloud.digitalocean.com/account/api/tokens
2. **"Generate New Token"** butonuna tıkla
3. Token adı ver: "procheff-v3-deployment"
4. **Read & Write** yetkilerini seç
5. Token'ı kopyala ve `doctl auth init` komutuna yapıştır

### Adım 2: GitHub Repo Güncelle

`.do/app.yaml` dosyasını düzenle (satır 14):

```yaml
# ÖNCE:
repo: your-github-username/procheff-v3

# SONRA:
repo: aydarnuman/procheff-v3  # veya kendi kullanıcı adınız
```

### Adım 3: API Keyleri Hazırla

Bu keyleri hazırlayın (deployment sırasında gireceksiniz):

- ✅ **Anthropic API Key**: https://console.anthropic.com/
- ✅ **Google AI API Key**: https://aistudio.google.com/app/apikey
- ✅ **Upstash Redis**: https://console.upstash.com/ (ücretsiz hesap)
- ✅ **NextAuth Secret**: `openssl rand -base64 32`

### Adım 4: Git Commit & Push

```bash
git commit -m "Add DigitalOcean App Platform deployment with Docker"
git push origin main
```

### Adım 5: Deploy!

```bash
/opt/homebrew/bin/doctl apps create --spec .do/app.yaml
```

**Not:** Build 5-10 dakika sürer. App ID'yi not edin!

### Adım 6: Environment Variables (Secrets) Ekle

1. Go to: https://cloud.digitalocean.com/apps
2. Select: **procheff-v3** app
3. Go to: **Settings → App-Level Environment Variables**
4. Click: **"Edit"** → **"Add Variable"**

**Eklenecek secrets** (her birini **"Encrypt"** seçeneği ile):

```bash
NEXTAUTH_SECRET=<openssl rand -base64 32 ile üret>
ANTHROPIC_API_KEY=sk-ant-api03-...
GOOGLE_API_KEY=AIza...
GEMINI_API_KEY=AIza...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

**Not:** Her secret için **"Encrypt" checkbox'ını işaretle!**

### Adım 7: Test Et!

Build tamamlandıktan sonra:

```bash
# App URL'ini al
doctl apps list

# Health check test et
curl https://your-app.ondigitalocean.app/api/health

# Beklenen sonuç:
{
  "status": "healthy",
  "timestamp": "2025-11-10T...",
  "version": "3.0.0",
  "checks": {
    "redis": true,
    "database": true,
    "ai": true
  }
}
```

---

## 📚 Detaylı Rehberler

İhtiyacınıza göre seçin:

| Rehber | Ne zaman kullan? |
|--------|------------------|
| [START-HERE.md](START-HERE.md) | Hızlı genel bakış |
| [DEPLOY-NOW.md](DEPLOY-NOW.md) ⭐ | İlk deployment (önerilen) |
| [QUICK-DEPLOY-CHECKLIST.md](QUICK-DEPLOY-CHECKLIST.md) | Sadece checklist |
| [docs/DIGITALOCEAN-DEPLOYMENT.md](docs/DIGITALOCEAN-DEPLOYMENT.md) | Tam dokümantasyon |

---

## 🔄 Auto-Deploy (İsteğe Bağlı)

GitHub'a her push'da otomatik deploy için:

### GitHub Secret Ekle

1. Go to: **Repository → Settings → Secrets and variables → Actions**
2. Click: **"New repository secret"**
3. Name: `DIGITALOCEAN_ACCESS_TOKEN`
4. Value: DigitalOcean API token'ınız
5. Click: **"Add secret"**

Artık her `git push origin main` yaptığınızda otomatik deploy olacak! ✨

---

## 💰 Maliyet Tahmini

### App Platform (Professional XS)
- Instance: $24/ay (1 GB RAM, 1 vCPU)
- Storage: $0.10/ay (1 GB)
- **Toplam**: ~$24/ay

### External Services
- Upstash Redis: Ücretsiz tier
- Anthropic API: $10-50/ay (kullanıma göre)
- Google AI API: $5-20/ay (kullanıma göre)

**Grand Total**: ~$39-94/ay

---

## 🆘 Sorun Çözme

### Build başarısız olursa

```bash
# Logs'u görüntüle
doctl apps logs YOUR_APP_ID --follow

# Yaygın sebepler:
# - Missing dependencies
# - Build timeout (instance size artır)
# - Memory limit aşımı
```

### App crash oluyorsa

```bash
# Environment variables kontrol et
doctl apps list YOUR_APP_ID

# Dashboard'dan secrets'ları doğrula
# Tüm required variables eklenmiş mi?
```

### Yavaş çalışıyorsa

```bash
# Caching enabled mi kontrol et
# Environment Variables'da:
ENABLE_CACHING=true
ENABLE_RATE_LIMITING=true

# Instance size'ı artır:
# .do/app.yaml'da: instance_size_slug: professional-s
```

---

## ✅ Deployment Sonrası Checklist

Deployment tamamlandıktan sonra:

- [ ] Health check test et
- [ ] Login/authentication test et
- [ ] Dosya upload test et
- [ ] AI analiz test et
- [ ] Logs'u 24 saat izle
- [ ] (İsteğe bağlı) Custom domain ekle
- [ ] (İsteğe bağlı) Monitoring alerts kur

---

## 🎉 Tebrikler!

App'iniz live olduğunda:

**App URL**: `https://procheff-v3-XXXXX.ondigitalocean.app`

### İlk Hafta Yapılacaklar

1. Performance monitoring
2. Error tracking
3. Usage metrics kontrolü
4. Database backup stratejisi

---

**Hazırsınız!** Yukarıdaki adımları takip ederek deploy edebilirsiniz.

Başarılar! 🚀

---

*Created: 2025-11-10*
*Version: 3.0.0*
*doctl version: 1.147.0*
