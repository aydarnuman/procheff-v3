# 🌊 PROCHEFF-V3 - DIGITALOCEAN DEPLOYMENT GUIDE

## ✅ BUILD FIX UYGULANMIŞ SÜRÜM

Bu deployment guide, PostgreSQL build timeout sorunları çözülmüş versiyonu içindir.

---

## 🎯 HANGİ DEĞİŞİKLİKLER YAPILDI?

### 1. **postgres-client.ts**
- ✅ Build sırasında DB bağlantısı açılmıyor
- ✅ `NEXT_PHASE === 'phase-production-build'` kontrolü eklendi
- ✅ Graceful shutdown sadece runtime'da çalışıyor

### 2. **logger-postgres.ts**
- ✅ Build sırasında logger initialization yok
- ✅ `DATABASE_URL` yoksa sessizce geç

### 3. **next.config.ts**
- ✅ `serverExternalPackages: ['pg', 'better-sqlite3']` eklendi
- ✅ DB modülleri client bundle'a dahil edilmiyor

### 4. **docker-compose.yml**
- ✅ PostgreSQL 15 servisi eklendi
- ✅ Health checks yapılandırıldı
- ✅ Environment variables güncellendi

---

## 📦 DIGITALOCEAN'A DEPLOY

### **ADIM 1: PostgreSQL Managed Database Oluştur**

1. DigitalOcean Console → **Databases** → **Create Database**
2. **PostgreSQL 15** seç
3. Region: En yakın data center (Frankfurt/Amsterdam/NYC)
4. Plan: **Basic** ($15/month) veya **Professional** ($50/month)
5. Database adı: `procheff`
6. **Create Database Cluster** tıkla

**Connection String'i kopyala:**
```
postgresql://doadmin:XXXX@db-postgresql-fra1-12345.ondigitalocean.com:25060/procheff?sslmode=require
```

---

### **ADIM 2: DigitalOcean App Oluştur**

1. DigitalOcean Console → **Apps** → **Create App**
2. **GitHub** seç → Repository'yi bağla
3. Branch: `main`
4. **Auto Deploy**: Enabled (her push'ta otomatik deploy)

**Build Ayarları:**
```bash
Build Command: npm run build
Run Command: npm start
HTTP Port: 8080
```

---

### **ADIM 3: Environment Variables Ekle**

Apps → Settings → App-Level Environment Variables

```bash
# Database
DATABASE_URL=postgresql://doadmin:XXXX@db-postgresql-fra1-12345.ondigitalocean.com:25060/procheff?sslmode=require
DB_MODE=postgres
DB_REQUIRE_SSL=true
DB_DISABLE_SSL=false

# NextAuth
NEXTAUTH_URL=https://your-app.ondigitalocean.app
NEXTAUTH_SECRET=generate-random-32-char-string-here

# AI Services
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
GOOGLE_API_KEY=AIzaSy-your-key-here

# Redis (Upstash öneriliyor)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here

# App Settings
NODE_ENV=production
PORT=8080
NEXT_PUBLIC_APP_VERSION=3.0.0

# Build Settings
SKIP_BUILD_DB_INIT=false
```

> 💡 **Not:** DigitalOcean Managed PostgreSQL SSL zorunludur. Local Docker veya VPS içindeki `postgres` servisine bağlanırken `DB_REQUIRE_SSL=false` ve `DB_DISABLE_SSL=true` ayarlayın; aksi halde `The server does not support SSL connections` hatası alırsınız.

**NEXTAUTH_SECRET Oluşturma:**
```bash
openssl rand -base64 32
```

---

### **ADIM 4: Redis Ekle (Upstash)**

1. [Upstash.com](https://upstash.com) → Create Account (Ücretsiz)
2. **Create Database** → Redis
3. Region: Aynı bölge seç (latency için)
4. **REST API** → Copy credentials
5. DigitalOcean App'e environment variables ekle

---

### **ADIM 5: Deploy & Monitor**

1. **Deploy** butonuna tıkla
2. Build logs'u izle (~5-10 dakika)
3. Deploy tamamlandığında URL'i kopyala
4. Health check: `https://your-app.ondigitalocean.app/api/health`

**Başarılı Response:**
```json
{
  "status": "healthy",
  "checks": {
    "database": true,
    "memory": true
  }
}
```

---

## 🐳 DOCKER İLE LOCAL TEST

### **1. Environment Dosyası Oluştur**

```bash
cp env.example .env.local
```

**.env.local düzenle:**
```bash
# PostgreSQL container kullanacağız
DATABASE_URL=postgresql://procheff_user:procheff_password_change_me@postgres:5432/procheff
DB_MODE=postgres
DB_REQUIRE_SSL=false
DB_DISABLE_SSL=true

# Diğer secrets'ları ekle
ANTHROPIC_API_KEY=sk-ant-your-key
NEXTAUTH_SECRET=$(openssl rand -base64 32)
```

### **2. Docker Compose Başlat**

```bash
# PostgreSQL, Redis, ve App'i başlat
docker-compose up -d

# Logları izle
docker-compose logs -f web

# Health check
curl http://localhost:3001/api/health
```

### **3. PostgreSQL'e Bağlan (Test)**

```bash
# Container'a gir
docker exec -it procheff-postgres psql -U procheff_user -d procheff

# Tabloları listele
\dt

# Çıkış
\q
```

---

## 🔧 TROUBLESHOOTING

### **Build Hatası: "PostgreSQL connection timeout"**

✅ **Çözüldü!** Artık build sırasında DB'ye bağlanmıyor.

Ama yine de olursa:
```bash
# Build logs'u kontrol et
DATABASE_URL değişkenini kontrol et
NEXT_PHASE=phase-production-build olduğundan emin ol
```

### **Runtime Hatası: "Cannot connect to PostgreSQL"**

```bash
# 1. DATABASE_URL doğru mu?
echo $DATABASE_URL

# 2. Firewall açık mı? (DigitalOcean DB → Trusted Sources)
# App'in IP'sini ekle veya "All addresses" seç (development için)

# 3. SSL mode doğru mu?
# Managed PostgreSQL için CONNECTION_STRING'de ?sslmode=require olmalı ve DB_REQUIRE_SSL=true olmalı
# Local Docker için DB_REQUIRE_SSL=false ve DB_DISABLE_SSL=true kullan
```

### **Yavaş Performans**

```bash
# 1. Redis cache'i kontrol et
curl https://your-app.com/api/cache/stats

# 2. Database connection pool artır
# postgres-client.ts → max: 20 → max: 50

# 3. DigitalOcean'da scale up
# Apps → your-app → Resources → Upgrade
```

---

## 📊 PRODUCTION CHECKLIST

- [ ] PostgreSQL Managed Database oluşturuldu
- [ ] DATABASE_URL environment variable eklendi
- [ ] NEXTAUTH_SECRET güvenli oluşturuldu
- [ ] Redis (Upstash) yapılandırıldı
- [ ] ANTHROPIC_API_KEY eklendi
- [ ] Custom domain bağlandı (isteğe bağlı)
- [ ] HTTPS otomatik aktif (DigitalOcean default)
- [ ] Health check endpoint test edildi
- [ ] Error monitoring aktif (Sentry/LogRocket)
- [ ] Database backup stratejisi belirlendi

---

## 💰 MALIYETLER (Tahmini)

| Servis | Plan | Fiyat/Ay |
|--------|------|----------|
| **App Platform** | Basic (512MB RAM) | $5 |
| **PostgreSQL DB** | Basic (1GB RAM) | $15 |
| **Redis** | Upstash Ücretsiz | $0 |
| **Bandwidth** | İlk 1TB ücretsiz | $0 |
| **TOPLAM** | | **$20/ay** |

**Professional Setup (Önerilen):**
- App: Professional ($12)
- PostgreSQL: Professional ($50)
- Redis: Upstash Pro ($10)
- **TOPLAM: $72/ay**

---

## 🚀 GİTHUB ACTIONS (CI/CD)

`.github/workflows/deploy.yml` oluştur:

```yaml
name: Deploy to DigitalOcean

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build
        run: npm run build
        env:
          SKIP_BUILD_DB_INIT: true
          
      - name: Deploy to DigitalOcean
        uses: digitalocean/app_action@v1
        with:
          app_name: procheff-v3
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
```

---

## 📧 DESTEK

Sorun yaşıyorsan:

1. **Logs kontrol et:** Apps → your-app → Runtime Logs
2. **Health check:** `/api/health` endpoint'ini test et
3. **Database:** PostgreSQL logs'u kontrol et

**İyi deployment'lar! 🎉**

