# 🚀 Procheff-v3 Development Scripts

Modern ve güçlü geliştirme ortamı yönetimi için geliştirilmiş script koleksiyonu.

## 📋 İçindekiler

- [Yeni Özellikler](#-yeni-özellikler)
- [Kurulum](#-kurulum)
- [Script'ler](#-scriptler)
- [Kullanım Örnekleri](#-kullanım-örnekleri)
- [Port Yönetimi](#-port-yönetimi)
- [Sorun Giderme](#-sorun-giderme)

## ✨ Yeni Özellikler

### 🎯 Eski Durum (Sorunlar)
- ❌ 3001 ve 3002 portlarında karışıklık
- ❌ Manuel port temizleme gerekliliği
- ❌ Servisler arası koordinasyon eksikliği
- ❌ Log takibi zorluğu

### ✅ Yeni Sistem (Çözümler)
- ✅ **Otomatik port yönetimi** - Çakışma yok
- ✅ **Concurrent çalıştırma** - Tüm servisler tek komutta
- ✅ **Canlı monitoring** - CPU, Memory, Log takibi
- ✅ **Hızlı komutlar** - Alias'lar ile tek kelime yeterli
- ✅ **Debug desteği** - Chrome DevTools entegrasyonu

## 🔧 Kurulum

### 1. Script'leri Çalıştırılabilir Yapma
```bash
chmod +x scripts/*.sh
```

### 2. Alias'ları Yükleme (Opsiyonel)

#### Bash için (~/.bashrc)
```bash
echo 'source ~/procheff-v3/scripts/dev-aliases.sh' >> ~/.bashrc
source ~/.bashrc
```

#### Zsh için (~/.zshrc)
```bash
echo 'source ~/procheff-v3/scripts/dev-aliases.sh' >> ~/.zshrc
source ~/.zshrc
```

## 📚 Script'ler

### 1. **dev-master.sh** - Ana Kontrol Script'i
Tüm servisleri yönetir, monitoring sağlar, log takibi yapar.

```bash
# Başlatma
./scripts/dev-master.sh start

# Cache temizleyerek başlatma
./scripts/dev-master.sh start --clean

# Durdurma
./scripts/dev-master.sh stop

# Durum kontrolü
./scripts/dev-master.sh status

# Canlı log takibi
./scripts/dev-master.sh logs

# Sistem monitörü
./scripts/dev-master.sh monitor

# Yeniden başlatma
./scripts/dev-master.sh restart
```

### 2. **dev-concurrent.sh** - Paralel Çalıştırma
Tüm servisleri aynı anda tek terminal'de çalıştırır.

```bash
# Normal başlatma
./scripts/dev-concurrent.sh

# Monitoring ile
./scripts/dev-concurrent.sh monitor

# Debug mode
./scripts/dev-concurrent.sh debug
```

### 3. **dev-aliases.sh** - Hızlı Komutlar
Shell alias'ları ile tek kelimelik komutlar.

```bash
# Alias'ları yükledikten sonra:
pstart        # Başlat
pstop         # Durdur
pstatus       # Durum
plogs         # Loglar
pmon          # Monitor
pinfo         # Proje bilgisi
phelp         # Tüm komutları göster
```

## 💻 Kullanım Örnekleri

### Hızlı Başlangıç
```bash
# NPM script ile
npm run master

# Veya doğrudan
./scripts/dev-master.sh start
```

### Concurrent Mode (Önerilen)
```bash
# Tüm servisler tek terminal'de
./scripts/dev-concurrent.sh

# Output:
# [MAIN]   Next.js başlatılıyor...
# [WORKER] İhale Worker başlatılıyor...
# [MAIN]   ✓ Ready at http://localhost:3000
# [WORKER] ✓ Ready at http://localhost:8080
```

### Debug Mode
```bash
# Chrome DevTools ile debugging
./scripts/dev-concurrent.sh debug

# Chrome'da:
# - chrome://inspect
# - Remote Target'ları göreceksiniz
```

### Monitoring Mode
```bash
# Sistem kaynakları ile birlikte
./scripts/dev-concurrent.sh monitor

# Her 30 saniyede:
# [SYS] CPU: 12.5% | Memory Free: 1024MB
```

## 🔌 Port Yönetimi

### Kullanılan Portlar
| Port | Servis | Açıklama |
|------|---------|----------|
| 3000 | Main App | Next.js Ana Uygulama |
| 8080 | Worker | İhale Worker Servisi |
| 3001 | API | Rezerve (Gelecek kullanım) |
| 3002 | Monitor | Rezerve (Dashboard için) |

### Port Temizleme
```bash
# Tek port temizle
pkill-port 3000

# Tüm portları temizle
pkill-all-ports

# Port durumunu kontrol et
pcheck-ports
```

## 🛠️ Sorun Giderme

### Port Çakışması
```bash
# Otomatik çözüm
./scripts/dev-master.sh restart

# Manuel çözüm
lsof -ti:3000 | xargs kill -9
```

### Cache Sorunları
```bash
# Hızlı temizlik
pclean

# Derin temizlik
pclean-deep

# Full reset (node_modules dahil)
preset
```

### Process Takılması
```bash
# Tüm Node process'leri durdur
pkill -f node
pkill -f "next dev"

# Fresh başlat
./scripts/dev-master.sh start --clean
```

## 📊 Performans İpuçları

1. **Concurrent Mode Kullanın** - Daha hızlı başlatma
2. **Monitoring'i açık tutun** - Sorunları erken yakalayın
3. **Log rotation kullanın** - Disk alanı tasarrufu
4. **Cache'i düzenli temizleyin** - Hız optimizasyonu

## 🎯 Best Practices

### Development Workflow
```bash
# Sabah rutini
pstart-clean      # Temiz başlangıç
pstatus           # Durum kontrolü
pinfo             # Proje bilgisi

# Çalışma sırasında
plogs             # Log takibi
pmon              # Performance monitoring

# Gün sonu
pstop             # Servisleri durdur
pdb-backup        # Database yedekle
```

### Team Collaboration
```bash
# Pull sonrası
git pull
pclean            # Cache temizle
npm install       # Dependencies güncelle
pstart            # Fresh başlat
```

## 📝 Notlar

- Script'ler macOS ve Linux uyumlu
- Windows için WSL2 kullanın
- tmux veya screen ile arka planda çalıştırabilirsiniz
- Docker support yakında eklenecek

## 🚀 Gelecek Özellikler

- [ ] Docker entegrasyonu
- [ ] Auto-restart on file change
- [ ] Performance profiling
- [ ] Test coverage monitoring
- [ ] Production deployment scripts

---

**Sorun mu var?** Issue açın veya `phelp` komutunu kullanın.
