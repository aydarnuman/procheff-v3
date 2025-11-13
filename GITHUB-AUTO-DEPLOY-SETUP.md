# GitHub Auto-Deploy Setup (VPS)

**Target Server**: 161.35.217.113  
**Deploy Method**: GitHub Actions + SSH  
**Time**: 10 dakika kurulum

---

## 🎯 Nasıl Çalışır?

```
GitHub'a Push → GitHub Actions Tetiklenir → 
SSH ile Server'a Bağlanır → Git Pull → Docker Build → Container Restart
```

**Sonuç**: Otomatik deployment! 🚀

---

## ⚙️ Kurulum (Tek Seferlik)

### Adım 1: SSH Key Oluştur (Server'da)

**Server'a bağlan**:
```bash
ssh root@161.35.217.113
```

**Dedicated deploy key oluştur**:
```bash
# Deploy için özel SSH key
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_deploy

# Public key'i authorized_keys'e ekle
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys

# Private key'i göster (kopyalayacaksın)
cat ~/.ssh/github_deploy
```

**Private key'i kopyala** (baştan sona, `-----BEGIN` den `-----END` e kadar)

---

### Adım 2: GitHub Secrets Ekle

**GitHub'da**:
1. Repository'nize gidin
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret** butonuna tıklayın

**3 Secret Ekleyin**:

#### Secret 1: VPS_SSH_KEY
```
Value: (Kopyaladığınız private key - tamamı)
```
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
...
-----END OPENSSH PRIVATE KEY-----
```

#### Secret 2: VPS_USER
```
Value: root
```
(veya farklı kullanıcı adınız)

#### Secret 3: VPS_PROJECT_PATH
```
Value: /root/procheff-v3
```
(veya sunucudaki proje yolunuz)

---

### Adım 3: Server'da Hazırlık

**Git kurulu mu kontrol et**:
```bash
ssh root@161.35.217.113

# Git versiyonu
git --version

# Yoksa kur:
apt update && apt install -y git
```

**Proje klasörünü hazırla**:
```bash
# Eğer yoksa klonla
cd /root
git clone https://github.com/YOUR-USERNAME/procheff-v3.git

# Eğer varsa, git remote kontrol et
cd /root/procheff-v3
git remote -v
# origin  https://github.com/YOUR-USERNAME/procheff-v3.git (fetch)
```

**Docker kurulu mu kontrol et**:
```bash
docker --version
docker-compose --version

# Yoksa kur:
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

**Environment variables**:
```bash
# .env dosyası oluştur
cd /root/procheff-v3
nano .env
```

`.env` içeriği:
```bash
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
GOOGLE_API_KEY=AIzaxxxxx
NEXTAUTH_SECRET=your-random-secret-here
NEXTAUTH_URL=http://161.35.217.113:3001
NEXT_PUBLIC_APP_URL=http://161.35.217.113:3001
```

Kaydet: `Ctrl+O`, Enter, `Ctrl+X`

---

## ✅ Test Et

### Manuel Deployment Testi

**Server'da**:
```bash
cd /root/procheff-v3

# Test git pull
git pull origin main

# Test docker build
docker build -t procheff-v3:latest .

# Test container start
docker-compose -f docker-compose.digitalocean.yml up -d

# Log kontrol
docker logs -f procheff-v3
```

**Tarayıcıda**:
```
http://161.35.217.113:3001
```

### GitHub Actions Testi

**1. Küçük değişiklik yap** (test için):
```bash
# Mac'inizde
cd /Users/numanaydar/procheff-v3
echo "# Test deployment" >> README.md
git add README.md
git commit -m "test: trigger auto-deploy"
git push origin main
```

**2. GitHub'da izleyin**:
- Repository → **Actions** tab
- "Deploy to VPS" workflow'u çalışacak
- 3-5 dakika sürer
- ✅ yeşil olursa başarılı

**3. Kontrol edin**:
```
http://161.35.217.113:3001
```

---

## 🔍 Troubleshooting

### GitHub Actions hatası: "Permission denied"

**Sebep**: SSH key yanlış veya authorized_keys'e eklenmemiş

**Çözüm**:
```bash
ssh root@161.35.217.113
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### GitHub Actions hatası: "Project directory not found"

**Sebep**: `VPS_PROJECT_PATH` yanlış

**Çözüm**:
- GitHub Secrets'ta `VPS_PROJECT_PATH` güncelleyin
- Doğru path: `/root/procheff-v3` veya projenizin gerçek yolu

### Server'da "git pull" hatası

**Sebep**: Local değişiklikler var

**Çözüm**:
```bash
ssh root@161.35.217.113
cd /root/procheff-v3
git stash  # Local değişiklikleri geçici sakla
git pull origin main
```

### Docker build hatası

**Sebep**: Bellek yetersiz veya disk dolu

**Çözüm**:
```bash
# Disk temizle
docker system prune -a -f

# Swap memory ekle (eğer yoksa)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

---

## 📊 Monitoring

### GitHub Actions Logları

Repository → **Actions** tab → Son workflow → Tıkla

Her adımın detaylı logunu görebilirsiniz.

### Server Logları

```bash
ssh root@161.35.217.113
docker logs -f procheff-v3
```

---

## 🎉 Başarı Kriterleri

Deploy başarılı olmuştur eğer:

- [x] GitHub Actions ✅ yeşil
- [x] Health check: `curl http://161.35.217.113:3001/api/health` → `{"status":"ok"}`
- [x] Ana sayfa açılıyor
- [x] Login çalışıyor
- [x] Container running: `docker ps | grep procheff-v3`

---

## 🔄 Her Push'ta Otomatik Çalışacak

Artık:
```bash
git add .
git commit -m "feat: yeni özellik"
git push origin main
```

Yaptığınızda → **Otomatik deploy edilecek!** 🎯

---

## 📚 İlgili Dosyalar

- [GitHub Workflow](./.github/workflows/deploy-vps.yml)
- [Docker Compose](./docker-compose.digitalocean.yml)
- [Dockerfile](./Dockerfile)

---

**Kurulum Süresi**: 10 dakika  
**Deploy Süresi**: 3-5 dakika (her push'ta)  
**Maliyet**: Ücretsiz (GitHub Actions 2000 dakika/ay bedava)






