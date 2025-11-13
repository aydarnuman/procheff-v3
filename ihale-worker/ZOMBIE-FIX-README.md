# 🧟 İhale Worker - Zombie Process Fix

## ✅ Çözülen Sorun

`tsx watch` zombie process bırakıyordu ve Ctrl+C ile düzgün kapanmıyordu.

## 🔧 Yapılan Değişiklikler

### 1. Graceful Shutdown (server.ts)
- `SIGTERM` ve `SIGINT` signal handler'ları eklendi
- HTTP server düzgün kapatılıyor
- 10 saniye timeout ile force exit
- Uncaught exception handling

### 2. Browser Cleanup (ihalebul.ts)
- Tüm aktif Playwright browser'lar takip ediliyor
- `cleanupBrowsers()` fonksiyonu eklendi
- Shutdown sırasında tüm browser'lar kapatılıyor
- Browser disconnect eventi ile otomatik cleanup

### 3. Yeni Komutlar (package.json)

```bash
# Temiz başlatma (zombie'leri öldür + başlat)
npm run dev:clean

# Sadece zombie'leri öldür
npm run kill

# Normal başlatma
npm run dev
```

### 4. Helper Script (start-clean.sh)
- Mevcut tsx process'lerini öldürür
- Port 8080'i temizler
- Worker'ı temiz başlatır

## 🚀 Kullanım

### Önerilen Yöntem: Temiz Başlatma
```bash
cd ihale-worker
npm run dev:clean
```

Bu komut:
1. ✅ Eski tsx process'lerini öldürür
2. ✅ Port 8080'i temizler
3. ✅ Worker'ı başlatır

### Normal Başlatma
```bash
cd ihale-worker
npm run dev
```

### Zombie Process Temizleme
```bash
cd ihale-worker
npm run kill
```

## 🛑 Düzgün Kapatma

Worker çalışırken **Ctrl+C** tuşuna basın:

```
👋 SIGINT signal received: starting graceful shutdown...
✅ HTTP server closed
🧹 Cleaning up 2 active browser(s)...
✅ All browsers closed
✅ Graceful shutdown complete
```

## 🐛 Zombie Process Kontrolü

### Çalışan tsx process'lerini göster
```bash
ps aux | grep tsx
```

### Port 8080'i kullanan process'i göster
```bash
lsof -i:8080
```

### Manuel olarak öldür
```bash
# tsx process'lerini öldür
pkill -f "tsx.*server.ts"

# Port 8080'i öldür
lsof -ti:8080 | xargs kill -9
```

## 📊 Davranış Değişiklikleri

### Öncesi (Sorunlu)
```
npm run dev
# Ctrl+C
[tsx] Previous process hasn't exited yet. Force killing...
[tsx] Process didn't exit in 5s. Force killing...
# Zombie process'ler kalıyor ❌
# Browser'lar açık kalıyor ❌
```

### Sonrası (Düzeltilmiş)
```
npm run dev
# Ctrl+C
👋 SIGINT signal received: starting graceful shutdown...
✅ HTTP server closed
🧹 Cleaning up 2 active browser(s)...
✅ All browsers closed
✅ Graceful shutdown complete
# Temiz kapanış ✅
```

## 🔍 Monitoring

Worker çalışırken aktif browser sayısını görebilirsiniz:

```javascript
// ihalebul.ts içinde
console.log(`Active browsers: ${ACTIVE_BROWSERS.size}`);
```

## ⚠️ Önemli Notlar

1. **tsx watch kullanımı:** Hot reload için hala tsx watch kullanılıyor, ama artık düzgün kapanıyor
2. **10 saniye timeout:** Shutdown 10 saniyeden uzun sürerse force exit yapılıyor
3. **Browser tracking:** Her browser launch'da tracking'e ekleniyor, close'da çıkarılıyor
4. **Session cleanup:** 8 saatlik session'lar hala otomatik temizleniyor

## 🎯 Sonuç

- ✅ Zombie process sorunu çözüldü
- ✅ Graceful shutdown eklendi
- ✅ Browser cleanup otomatik
- ✅ Yeni komutlarla kolay yönetim
- ✅ Error handling iyileştirildi

## 🚀 Hemen Test Edin

```bash
cd ihale-worker
npm run dev:clean

# Birkaç saniye bekleyin, sonra Ctrl+C
# Temiz kapandığını göreceksiniz!
```

