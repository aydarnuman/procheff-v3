# Production Server Sorun Giderme ve Deployment Rehberi

## 🔧 Yapılan Düzeltmeler

### 1. SQLite Status Kolonu Sorunu ✅
- **Sorun**: Admin sayfası `users` tablosunda `status` kolonu bulamıyordu
- **Çözüm**: 
  - Migration dosyası oluşturuldu: `011_add_user_status.sql`
  - Admin queries defensive coding ile güncellendi (kolon kontrolü yapıyor)
  - Deployment script'e migration eklendi

### 2. SMTP Timeout Sorunu ✅
- **Sorun**: Email servisi SMTP bağlantısı yapamıyor ve timeout veriyor
- **Çözüm**:
  - SMTP credentials olmadan da çalışacak şekilde güncellendi
  - Connection timeout'ları eklendi (10 saniye)
  - Verification artık non-blocking (arka planda çalışıyor)
  - SMTP yoksa warning verip devam ediyor

### 3. Nginx Yapılandırması ✅
- **Sorun**: `/etc/nginx/sites-enabled/default` dosyası yok
- **Çözüm**: 
  - `nginx-production.conf` dosyası oluşturuldu
  - SSL, proxy, caching ayarları yapıldı
  - Deployment script'te otomatik kurulum

### 4. Production Build Optimizasyonu ✅
- **Sorun**: Next.js standalone mod uyarısı
- **Çözüm**: PM2 ile `npm start` kullanarak doğru çalıştırma

---

## 🚀 Server'a Deployment

### Sunucuya Bağlan

```bash
ssh root@104.248.254.171
cd /var/www/procheff
```

### Yeni Dosyaları Sunucuya Aktar

#### Yöntem 1: Git ile (Önerilen)

```bash
# Önce local'de commit yap
cd ~/procheff-v3
git add .
git commit -m "fix: Production deployment fixes"
git push origin main

# Sunucuda pull yap
ssh root@104.248.254.171
cd /var/www/procheff
git pull origin main
```

#### Yöntem 2: SCP ile (Alternatif)

```bash
# Local makinenden çalıştır
cd ~/procheff-v3

# Migration dosyasını aktar
scp src/lib/db/migrations/011_add_user_status.sql root@104.248.254.171:/var/www/procheff/src/lib/db/migrations/

# Admin queries'i aktar
scp src/lib/db/admin-queries.ts root@104.248.254.171:/var/www/procheff/src/lib/db/

# Email service'i aktar
scp src/lib/notifications/email-service.ts root@104.248.254.171:/var/www/procheff/src/lib/notifications/

# Nginx config'i aktar
scp nginx-production.conf root@104.248.254.171:/var/www/procheff/

# Deployment script'i aktar
scp deploy-production.sh root@104.248.254.171:/var/www/procheff/
```

### Deployment Script'i Çalıştır

```bash
# Sunucuda
cd /var/www/procheff
chmod +x deploy-production.sh
./deploy-production.sh
```

---

## 📋 Manuel Adımlar (Script Çalışmazsa)

### 1. Database Migration

```bash
cd /var/www/procheff

# Users tablosuna status kolonu ekle
sqlite3 procheff.db <<EOF
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN last_login_at TEXT;
ALTER TABLE users ADD COLUMN last_ip TEXT;
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
.quit
EOF

# Kontrol et
sqlite3 procheff.db "PRAGMA table_info(users);"
```

### 2. Build ve Restart

```bash
# Build yap
npm run build

# PM2'yi restart et
pm2 delete procheff
pm2 start npm --name "procheff" -- start
pm2 save
```

### 3. Nginx Setup (İsteğe Bağlı)

```bash
# Nginx config'i kopyala
sudo cp nginx-production.conf /etc/nginx/sites-available/procheff

# Enable site
sudo ln -s /etc/nginx/sites-available/procheff /etc/nginx/sites-enabled/procheff

# Test ve reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## ✅ Deployment Sonrası Kontroller

### 1. Uygulama Çalışıyor mu?

```bash
# PM2 status
pm2 list

# Logs kontrol
pm2 logs procheff --lines 50

# Health check
curl http://localhost:3000/api/health
```

### 2. Database Migration Başarılı mı?

```bash
cd /var/www/procheff
sqlite3 procheff.db "SELECT * FROM users LIMIT 1;"
```

### 3. Admin Sayfası Çalışıyor mu?

Tarayıcıda: `https://procheff.app/admin`

### 4. Error Yok mu?

```bash
pm2 logs procheff --err --lines 20
```

---

## 🐛 Sorun Giderme

### SQLite Error: duplicate column name

```bash
# Status kolonu zaten varsa bu hatayı alabilirsin
# Normal, sadece devam et:
cd /var/www/procheff
npm run build
pm2 restart procheff
```

### SMTP Connection Timeout

```bash
# Normal - SMTP credentials yoksa bu uyarıyı görebilirsin
# Email servisi optional olduğu için sorun değil
# Eğer email göndermek istersen .env'e ekle:
nano .env

# Ekle:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="ProCheff <your-email@gmail.com>"
```

### Nginx 404

```bash
# Nginx config test et
sudo nginx -t

# Log kontrol
sudo tail -f /var/log/nginx/procheff-error.log
```

### Port 3000 Already in Use

```bash
# Eski process'i bul ve öldür
lsof -ti:3000 | xargs kill -9

# PM2'yi temizle
pm2 delete all
pm2 start npm --name "procheff" -- start
pm2 save
```

---

## 📊 Monitoring

### Real-time Logs

```bash
pm2 logs procheff --lines 100
```

### Process Status

```bash
pm2 monit
```

### Restart if Crashed

```bash
pm2 restart procheff
```

---

## 🎯 Beklenen Sonuç

✅ Uygulama sorunsuz başlıyor
✅ Admin sayfası çalışıyor
✅ SMTP timeout hatası yok (veya sadece warning)
✅ Database migration başarılı
✅ Nginx proxy çalışıyor (opsiyonel)

---

## 📞 Acil Durum

Eğer bir şeyler ters giderse:

```bash
# Eski haline dön
cd /var/www/procheff
git log  # Son commit'i bul
git reset --hard <commit-hash>
npm run build
pm2 restart procheff
```

---

## 🔗 Yararlı Linkler

- Health Check: http://localhost:3000/api/health
- Admin Dashboard: https://procheff.app/admin
- Logs: `pm2 logs procheff`
- Database: `/var/www/procheff/procheff.db`

