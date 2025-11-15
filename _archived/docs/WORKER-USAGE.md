# 🤖 İhale Worker - Kullanım Kılavuzu

## 🚀 Hızlı Başlatma

### Temiz Başlatma (Önerilen)
```bash
cd ihale-worker
npm run dev:clean
```

Bu komut:
- ✅ Eski zombie process'leri öldürür
- ✅ Port 8080'i temizler
- ✅ Worker'ı temiz başlatır

### Normal Başlatma
```bash
cd ihale-worker
npm run dev
```

### Sadece Temizlik
```bash
cd ihale-worker
npm run kill
```

## 🛑 Düzgün Kapatma

Worker çalışırken **Ctrl+C** ile kapatın:

```
👋 SIGINT signal received: starting graceful shutdown...
✅ HTTP server closed
🧹 Cleaning up active browser(s)...
✅ All browsers closed
✅ Graceful shutdown complete
```

## 📍 Endpoints

Worker çalıştığında şu endpoint'ler kullanılabilir:

- `http://localhost:8080/health` - Health check
- `http://localhost:8080/ihalebul/*` - İhale API'leri

## 🐛 Sorun Giderme

### Zombie Process Kontrolü
```bash
# Çalışan tsx process'lerini göster
ps aux | grep tsx

# Port 8080'i kontrol et
lsof -i:8080
```

### Manuel Temizlik
```bash
# tsx process'lerini öldür
pkill -f "tsx.*server.ts"

# Port 8080'i öldür
lsof -ti:8080 | xargs kill -9

# Veya tek komutla
cd ihale-worker && npm run kill
```

### Worker Başlamıyorsa
```bash
# 1. Temizlik yap
cd ihale-worker
npm run kill

# 2. 2 saniye bekle
sleep 2

# 3. Tekrar başlat
npm run dev:clean
```

## ⚙️ Environment Variables

Worker için gerekli environment variables (ana `.env.local` dosyasında):

```env
IHALE_WORKER_URL=http://localhost:8080
IHALEBUL_USERNAME=your_username
IHALEBUL_PASSWORD=your_password
```

## 📊 Monitoring

Worker çalışırken console'da görecekleriniz:

```
🚀 Ihale Worker running on 0.0.0.0:8080
📍 Health check: http://localhost:8080/health
✅ Ihalebul routes mounted
```

## 🔧 Geliştirme

### Hot Reload
Worker `tsx watch` ile çalışır, değişiklikler otomatik yüklenir.

### Browser Cleanup
Tüm Playwright browser'lar otomatik olarak track edilir ve shutdown sırasında temizlenir.

### Graceful Shutdown
- SIGTERM/SIGINT signal'leri yakalar
- HTTP server'ı düzgün kapatır
- Tüm browser'ları temizler
- 10 saniye timeout ile force exit

## 📚 Daha Fazla Bilgi

- 📖 `ihale-worker/ZOMBIE-FIX-README.md` - Zombie process fix detayları
- 📖 `ihale-worker/README.md` - Worker genel dokümantasyonu
- 📖 `IHALE-WORKER-BASLAT.md` - İlk kurulum rehberi

## 🎯 Özet

```bash
# Başlatma
cd ihale-worker && npm run dev:clean

# Kapatma
Ctrl+C (Otomatik graceful shutdown)

# Temizlik
npm run kill
```

**Worker artık zombie process bırakmıyor!** 🎉

