# 🚀 Procheff-v3 Production Deployment Guide

## Hızlı Deployment

### 1. Otomatik Deployment Script
```bash
# Lokal makinenizden çalıştırın
chmod +x deploy-production.sh
./deploy-production.sh
```

## Manuel Deployment Adımları

### 1. Sunucuya Bağlanın
```bash
ssh root@178.62.193.50
cd /var/www/procheff
```

### 2. Kodu Güncelleyin
```bash
git pull origin main
npm install
npm run build
```

### 3. Docker Container'ları Güncelleyin
```bash
docker-compose -f docker-compose.digitalocean.yml down
docker-compose -f docker-compose.digitalocean.yml up -d --build
```

### 4. Durumu Kontrol Edin
```bash
docker ps
docker logs procheff-v3 --tail=50
docker logs ihale-worker --tail=50
```

## Domain & SSL Kurulumu

### 1. Domain DNS Ayarları
DNS kayıtlarınızı şu şekilde ayarlayın:
- A Record: `@` → `178.62.193.50`
- A Record: `www` → `178.62.193.50`

### 2. Nginx & SSL Kurulumu
```bash
# Sunucuda çalıştırın
chmod +x setup-nginx-ssl.sh
./setup-nginx-ssl.sh
```

## GitHub Actions CI/CD

### 1. Repository Secrets Ekleyin
GitHub repo ayarlarında şu secret'ları ekleyin:
- `SERVER_IP`: 178.62.193.50
- `SERVER_USER`: root
- `SERVER_SSH_KEY`: Sunucu SSH private key
- `SLACK_WEBHOOK`: (Opsiyonel) Slack bildirimleri için

### 2. SSH Key Oluşturma
```bash
# Lokal makinede
ssh-keygen -t rsa -b 4096 -C "deploy@procheff"
# Public key'i sunucuya ekleyin
ssh-copy-id -i ~/.ssh/id_rsa.pub root@178.62.193.50
```

## Environment Variables

### Production .env Dosyası
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/procheff
DATABASE_MODE=POSTGRES

# Auth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://procheff.com

# AI
ANTHROPIC_API_KEY=your-api-key

# Email (Opsiyonel)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Monitoring & Logs

### Container Logları
```bash
# Tüm loglar
docker-compose -f docker-compose.digitalocean.yml logs -f

# Belirli servis
docker logs procheff-v3 -f --tail=100
docker logs ihale-worker -f --tail=100
```

### Sistem Metrikleri
```bash
# CPU & Memory
docker stats

# Disk kullanımı
df -h
du -sh /var/lib/docker

# Network connections
netstat -tulpn | grep -E ':(3001|8081)'
```

## Troubleshooting

### Container Başlamazsa
```bash
# Container durumunu kontrol et
docker ps -a
docker logs <container_name>

# Image'ları yeniden build et
docker-compose -f docker-compose.digitalocean.yml build --no-cache
docker-compose -f docker-compose.digitalocean.yml up -d
```

### Memory Sorunları
```bash
# Docker temizlik
docker system prune -a -f --volumes
docker builder prune -a -f

# Swap ekle (gerekirse)
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

### Port Sorunları
```bash
# Portları kontrol et
lsof -i :3001
lsof -i :8081

# Firewall ayarları
ufw allow 3001
ufw allow 8081
ufw allow 80
ufw allow 443
```

## Backup & Recovery

### Database Backup
```bash
# PostgreSQL backup
docker exec postgres pg_dump -U user procheff > backup_$(date +%Y%m%d).sql

# Volume backup
docker run --rm -v procheff_data:/data -v $(pwd):/backup alpine tar czf /backup/data_backup_$(date +%Y%m%d).tar.gz /data
```

### Restore
```bash
# Database restore
docker exec -i postgres psql -U user procheff < backup.sql

# Volume restore
docker run --rm -v procheff_data:/data -v $(pwd):/backup alpine tar xzf /backup/data_backup.tar.gz -C /
```

## Security Checklist

- [ ] Güçlü şifreler kullanın
- [ ] SSH key authentication aktif
- [ ] Firewall (UFW) yapılandırması
- [ ] SSL sertifikası kurulu
- [ ] Rate limiting aktif (Nginx)
- [ ] Environment variables güvenli
- [ ] Düzenli backup alınıyor
- [ ] Monitoring aktif
- [ ] Logs saklanıyor

## Destek & İletişim

Sorun yaşarsanız:
1. Logları kontrol edin
2. GitHub Issues açın
3. Deployment backup'larını kontrol edin

---
📅 Son güncelleme: Kasım 2024
