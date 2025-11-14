# GitHub Secrets Configuration Guide

## 🔐 Required GitHub Secrets

GitHub repository'nize aşağıdaki secrets'ları eklemeniz gerekiyor:

### 1. Server Connection Secrets
```bash
DEPLOY_HOST         # Server IP: 134.209.203.198
DEPLOY_USER         # Server user: root
DEPLOY_SSH_KEY      # SSH private key (aşağıda nasıl oluşturulacağı var)
```

### 2. Application Secrets
```bash
ANTHROPIC_API_KEY   # Claude API key
DATABASE_URL        # SQLite connection string: file:./procheff.db
JWT_SECRET          # Random secret (generate with: openssl rand -base64 32)
NEXTAUTH_URL        # http://134.209.203.198:3000
NEXTAUTH_SECRET     # Random secret (generate with: openssl rand -base64 32)
```

### 3. Email Configuration
```bash
SMTP_HOST           # Gmail: smtp.gmail.com
SMTP_PORT           # Gmail: 587
SMTP_USER           # Your email address
SMTP_PASS           # App-specific password (not regular password!)
SMTP_FROM           # ProCheff <noreply@procheff.com>
```

## 🔑 SSH Deploy Key Setup

### Sunucuda (DigitalOcean):
```bash
# 1. SSH key pair oluştur
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N ""

# 2. Public key'i authorized_keys'e ekle
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys

# 3. Private key'i göster (bunu GitHub'a ekleyeceğiz)
cat ~/.ssh/github_deploy
```

### GitHub'da:
1. Repository → Settings → Secrets and variables → Actions
2. "New repository secret" tıkla
3. Name: `DEPLOY_SSH_KEY`
4. Value: Yukarıdaki private key içeriği (-----BEGIN ile -----END dahil)

## 📝 Secrets Ekleme Adımları

### GitHub UI üzerinden:
1. Repository'ye git: https://github.com/your-username/procheff-v3
2. Settings → Secrets and variables → Actions
3. Her secret için "New repository secret" tıkla
4. Name ve Value gir, "Add secret" tıkla

### GitHub CLI ile (alternatif):
```bash
# GitHub CLI kurulu değilse:
brew install gh  # macOS
gh auth login

# Secrets ekle
gh secret set DEPLOY_HOST --body "134.209.203.198"
gh secret set DEPLOY_USER --body "root"
gh secret set DEPLOY_SSH_KEY < ~/.ssh/github_deploy

# Application secrets
gh secret set ANTHROPIC_API_KEY --body "your-api-key"
gh secret set DATABASE_URL --body "file:./procheff.db"
gh secret set JWT_SECRET --body "$(openssl rand -base64 32)"
gh secret set NEXTAUTH_URL --body "http://134.209.203.198:3000"
gh secret set NEXTAUTH_SECRET --body "$(openssl rand -base64 32)"

# Email secrets
gh secret set SMTP_HOST --body "smtp.gmail.com"
gh secret set SMTP_PORT --body "587"
gh secret set SMTP_USER --body "your-email@gmail.com"
gh secret set SMTP_PASS --body "your-app-password"
gh secret set SMTP_FROM --body "ProCheff <noreply@procheff.com>"
```

## 🔍 Secrets Doğrulama

Tüm secrets'ların eklendiğini kontrol et:
```bash
gh secret list
```

Beklenen çıktı:
```
ANTHROPIC_API_KEY    Updated 2025-11-14
DATABASE_URL         Updated 2025-11-14
DEPLOY_HOST          Updated 2025-11-14
DEPLOY_SSH_KEY       Updated 2025-11-14
DEPLOY_USER          Updated 2025-11-14
JWT_SECRET           Updated 2025-11-14
NEXTAUTH_SECRET      Updated 2025-11-14
NEXTAUTH_URL         Updated 2025-11-14
SMTP_FROM            Updated 2025-11-14
SMTP_HOST            Updated 2025-11-14
SMTP_PASS            Updated 2025-11-14
SMTP_PORT            Updated 2025-11-14
SMTP_USER            Updated 2025-11-14
```

## 🚀 Deploy Tetikleyiciler

### Otomatik Deploy
- `main` branch'e her push'ta otomatik deploy olur

### Manuel Deploy
1. Actions sekmesine git
2. "Deploy to DigitalOcean" workflow'u seç
3. "Run workflow" → "Run workflow" tıkla

## 🔄 Rollback Strategy

Eğer deployment başarısız olursa:
```bash
# Sunucuda
cd /root/procheff-v3
git log --oneline -5  # Son 5 commit'i gör
git checkout <previous-commit-hash>
npm ci
npm run build
pm2 restart procheff-v3
```

## 📊 Monitoring

Deploy sonrası kontrol:
```bash
# PM2 durumu
pm2 status

# Logları izle
pm2 logs procheff-v3

# Health check
curl http://134.209.203.198:3000/api/health
```

## ⚠️ Önemli Notlar

1. **SMTP_PASS**: Gmail için normal şifrenizi KULLANMAYIN! App-specific password oluşturun:
   - Google Account → Security → 2-Step Verification → App passwords

2. **SSH Key Security**: Private key'i ASLA public repo'ya commit etmeyin!

3. **Secrets Rotation**: JWT_SECRET ve NEXTAUTH_SECRET'ı düzenli olarak yenileyin

4. **Test First**: Önce staging/test ortamında deneyin

## 📝 Troubleshooting

### SSH Connection Failed
```bash
# Sunucuda SSH servisini kontrol et
systemctl status sshd
```

### Build Failed
```bash
# Node version kontrol
node --version  # Should be 20.x
```

### PM2 Not Found
```bash
# PM2 kurulumu
npm install -g pm2
```

## ✅ Checklist

- [ ] SSH deploy key oluşturuldu
- [ ] GitHub secrets eklendi
- [ ] Workflow dosyası commit edildi
- [ ] İlk deploy testi yapıldı
- [ ] Health check çalışıyor
- [ ] PM2 monitoring aktif
