# ⚡ Quick Deploy Checklist

Hızlı deployment için bu listeyi takip edin:

## 🎯 Ön Hazırlık (2 dakika)

- [ ] ✅ Tüm deployment dosyaları hazır (otomatik oluşturuldu)
- [ ] GitHub hesabınız var
- [ ] DigitalOcean hesabınız var

## 🔧 Setup (5 dakika)

### 1. doctl CLI Kur
```bash
brew install doctl
```

### 2. DigitalOcean'a Bağlan
```bash
doctl auth init
# Token: https://cloud.digitalocean.com/account/api/tokens
```

### 3. GitHub Repo Güncelle
```bash
# .do/app.yaml dosyasında satır 14'ü düzenle:
repo: aydarnuman/procheff-v3  # kendi repo'nuz
```

### 4. API Keyleri Hazırla
- [ ] Anthropic API Key: https://console.anthropic.com/
- [ ] Google API Key: https://aistudio.google.com/app/apikey
- [ ] Upstash Redis: https://upstash.com/ (ücretsiz)
- [ ] NextAuth Secret: `openssl rand -base64 32`

## 🚀 Deployment (3 dakika)

### 5. GitHub'a Push
```bash
git add .
git commit -m "Add DigitalOcean deployment"
git push origin main
```

### 6. Deploy Et
```bash
doctl apps create --spec .do/app.yaml
# App ID'yi not et
```

### 7. Secrets Ekle
Dashboard → Apps → procheff-v3 → Settings → Environment Variables

Ekle:
- NEXTAUTH_SECRET
- ANTHROPIC_API_KEY
- GOOGLE_API_KEY
- GEMINI_API_KEY
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN

### 8. Test Et
```bash
curl https://your-app.ondigitalocean.app/api/health
```

## ✅ Tamamlandı!

Toplam süre: ~10 dakika

App URL'iniz: `https://procheff-v3-XXXXX.ondigitalocean.app`

---

Detaylı bilgi: [DEPLOY-NOW.md](DEPLOY-NOW.md)
