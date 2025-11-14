# Procheff v3 - Production Deployment Kılavuzu

## 🚨 ÖNEMLİ: İhale Worker Production'da Eksikti!

### Problem
- Docker eski v2 sistemine bağlıydı
- v3 hiç production'a deploy edilmedi  
- İhale worker servisi docker-compose'da yoktu
- Bu yüzden production'da ihale scraping çalışmıyordu

### Çözüm
Docker-compose'a ihale worker servisi eklendi ve deployment scriptleri hazırlandı.

---

## 🚀 Hızlı Deployment (VPS Docker)

### 1. Local'de Build & Push

```bash
# Tüm sistemleri build et ve Docker Hub'a yükle
./deploy-vps-docker.sh
```

### 2. VPS'de Deploy

SSH ile bağlan:
```bash
ssh root@161.35.217.113
```

Proje dizinine git:
```bash
cd /root/procheff-v3
```

Git'ten son güncellemeleri al:
```bash
git pull origin main
```

Environment dosyasını oluştur/güncelle:
```bash
nano .env
```

Gerekli değişkenler:
```env
# NextAuth
NEXTAUTH_URL=https://procheff.yourdomain.com
NEXTAUTH_SECRET=your-32-char-secret-here

# AI API Keys
ANTHROPIC_API_KEY=sk-ant-xxx
GOOGLE_API_KEY=AIzaxxx

# İhalebul (İhale scraping için ZORUNLU!)
IHALEBUL_USERNAME=your-username
IHALEBUL_PASSWORD=your-password

# Upstash Redis (Optional)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

Docker container'ları güncelle:
```bash
# Mevcut container'ları durdur
docker-compose -f docker-compose.digitalocean.yml down

# Yeni image'leri çek
docker-compose -f docker-compose.digitalocean.yml pull

# Container'ları başlat
docker-compose -f docker-compose.digitalocean.yml up -d
```

### 3. Kontrol

Container durumu:
```bash
docker ps
```

Health check:
```bash
# Ana uygulama
curl http://localhost:3001/api/health

# İhale Worker
curl http://localhost:8081/health
```

Logları kontrol:
```bash
# Ana uygulama logları
docker logs procheff-v3 -f

# İhale worker logları
docker logs ihale-worker -f
```

---

## 📦 Docker Image'leri Ayrı Build Etme

### Ana Uygulama
```bash
docker build -t aydarnuman/procheff-v3:latest .
docker push aydarnuman/procheff-v3:latest
```

### İhale Worker
```bash
cd ihale-worker
npm run build
docker build -t aydarnuman/ihale-worker:latest .
docker push aydarnuman/ihale-worker:latest
```

---

## 🌐 Nginx Reverse Proxy Kurulumu

`/etc/nginx/sites-available/procheff-v3`:
```nginx
server {
    listen 80;
    server_name procheff.yourdomain.com;
    
    # Ana uygulama
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # İhale Worker API (internal)
    location /worker/ {
        proxy_pass http://localhost:8081/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout ayarları (büyük dosyalar için)
        proxy_connect_timeout 120;
        proxy_send_timeout 120;
        proxy_read_timeout 120;
    }
}
```

SSL eklemek için:
```bash
sudo certbot --nginx -d procheff.yourdomain.com
```

---

## 🔧 Sorun Giderme

### İhale Worker Çalışmıyor

1. Container durumunu kontrol et:
```bash
docker ps -a | grep ihale-worker
```

2. Logları kontrol et:
```bash
docker logs ihale-worker --tail 50
```

3. Environment variables kontrol:
```bash
docker exec ihale-worker env | grep IHALEBUL
```

4. Network bağlantısını test et:
```bash
docker exec procheff-v3 curl http://ihale-worker:8080/health
```

### Ana Uygulama İhale Worker'a Bağlanamıyor

1. Docker network'ü kontrol et:
```bash
docker network ls
docker network inspect procheff-network
```

2. Container'lar aynı network'te mi:
```bash
docker inspect procheff-v3 | grep -A 10 Networks
docker inspect ihale-worker | grep -A 10 Networks
```

3. Environment variable doğru mu:
```bash
docker exec procheff-v3 env | grep IHALE_WORKER_URL
# Beklenen: IHALE_WORKER_URL=http://ihale-worker:8080
```

### Memory/CPU Sorunları

Container resource kullanımı:
```bash
docker stats
```

Limit eklemek için docker-compose.digitalocean.yml'e ekle:
```yaml
services:
  procheff-v3:
    # ...
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
          
  ihale-worker:
    # ...
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

---

## 📊 Monitoring

### Docker Container Monitoring
```bash
# Basit monitoring scripti
cat > monitor.sh << 'EOF'
#!/bin/bash
while true; do
  clear
  echo "=== PROCHEFF V3 MONITORING ==="
  echo "Time: $(date)"
  echo ""
  echo "Container Status:"
  docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  echo ""
  echo "Resource Usage:"
  docker stats --no-stream
  echo ""
  echo "Recent Logs (procheff-v3):"
  docker logs procheff-v3 --tail 5
  echo ""
  echo "Recent Logs (ihale-worker):"
  docker logs ihale-worker --tail 5
  sleep 5
done
EOF

chmod +x monitor.sh
./monitor.sh
```

### Uptime Monitoring (UptimeRobot)
1. https://uptimerobot.com hesabı oluştur
2. Yeni monitor ekle:
   - Ana uygulama: http://161.35.217.113:3001/api/health
   - İhale Worker: http://161.35.217.113:8081/health

---

## 🔄 Otomatik Güncelleme (Watchtower)

docker-compose.digitalocean.yml'de watchtower'ı aktif et:
```yaml
watchtower:
  image: containrrr/watchtower
  container_name: watchtower-procheff
  restart: unless-stopped
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
  environment:
    - WATCHTOWER_CLEANUP=true
    - WATCHTOWER_POLL_INTERVAL=3600
    - WATCHTOWER_LABEL_ENABLE=true
  networks:
    - procheff-network
```

Bu sayede Docker Hub'a yeni image push edildiğinde otomatik güncellenir.

---

## 📝 Deployment Checklist

- [ ] Environment variables (.env) dosyası hazır
- [ ] IHALEBUL_USERNAME ve IHALEBUL_PASSWORD tanımlı
- [ ] Docker images Docker Hub'a push edildi
- [ ] docker-compose.digitalocean.yml güncel
- [ ] VPS'de Docker ve Docker Compose kurulu
- [ ] Nginx reverse proxy yapılandırıldı
- [ ] SSL sertifikası kuruldu
- [ ] Health check endpoint'leri çalışıyor
- [ ] İhale worker container'ı çalışıyor
- [ ] Ana uygulama worker'a bağlanabiliyor
- [ ] Monitoring kuruldu

---

## 🆘 Acil Durumlar

### Tüm Sistemi Yeniden Başlat
```bash
docker-compose -f docker-compose.digitalocean.yml restart
```

### Eski Versiyona Geri Dön
```bash
docker-compose -f docker-compose.digitalocean.yml down
docker pull aydarnuman/procheff-v3:previous-tag
docker pull aydarnuman/ihale-worker:previous-tag
docker-compose -f docker-compose.digitalocean.yml up -d
```

### Database Backup
```bash
docker exec procheff-v3 cp /app/data/procheff.db /app/data/procheff.db.backup
docker cp procheff-v3:/app/data/procheff.db.backup ./backups/
```

---

## 📞 Destek

Sorun yaşarsanız:
1. Logları kontrol edin
2. Environment variables'ları doğrulayın
3. Network bağlantılarını test edin
4. Container health check'lerini kontrol edin

Son güncelleme: 14 Kasım 2025
