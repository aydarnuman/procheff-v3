# 🚀 İhale Worker Servisi Başlatma

## Sorun
İhale listesi açılmıyor çünkü **ihale-worker servisi çalışmıyor**.

## Çözüm

### 1. Worker Servisini Başlat

**Yeni bir terminal açın ve şunu çalıştırın:**

```bash
cd ihale-worker
npm run dev
```

Worker servisi **port 8080**'de çalışacak.

### 2. Environment Variables Kontrol Et

`.env.local` dosyasında şu değişkenler olmalı:

```env
IHALE_WORKER_URL=http://localhost:8080
IHALEBUL_USERNAME=your_username
IHALEBUL_PASSWORD=your_password
```

### 3. Test Et

Worker servisi çalışıyorsa:
```bash
curl http://localhost:8080/health
# {"ok":true,"service":"ihale-worker",...}
```

### 4. İhale Listesi Sayfasını Aç

Browser'da:
```
http://localhost:3001/ihale
```

**İlk açılışta:**
- Otomatik login yapılır
- İhaleler worker'dan çekilir
- SQLite'a kaydedilir
- UI'da gösterilir

## Nasıl Çalışıyor?

1. **Worker Servisi** (`ihale-worker/`):
   - Playwright ile ihalebul.com'dan scraping yapar
   - Port 8080'de Express API sunar
   - Login, list, detail, proxy endpoint'leri var

2. **Next.js API** (`src/app/api/ihale/`):
   - Worker'a proxy yapar
   - SQLite'a cache eder
   - UI'ya veri sağlar

3. **UI** (`src/app/ihale/page.tsx`):
   - İhale listesini gösterir
   - "Yenile" butonu ile worker'dan yeni veri çeker

## Sorun Giderme

### Worker başlamıyorsa:
```bash
# Port 8080'i kontrol et
lsof -ti:8080

# Port doluysa temizle
lsof -ti:8080 | xargs kill -9

# Tekrar başlat
cd ihale-worker && npm run dev
```

### Environment variables eksikse:
`.env.local` dosyasına ekleyin:
```env
IHALE_WORKER_URL=http://localhost:8080
IHALEBUL_USERNAME=your_username
IHALEBUL_PASSWORD=your_password
```

### Database boşsa:
İlk açılışta otomatik olarak worker'dan veri çekilir. Eğer çekilmezse "Yenile" butonuna basın.

## Önemli Notlar

- ✅ Worker servisi **ayrı bir terminal'de** çalışmalı
- ✅ Worker servisi **port 8080**'de çalışmalı
- ✅ Environment variables **mutlaka** olmalı
- ✅ İlk açılışta otomatik login yapılır
- ✅ Veriler SQLite'a cache edilir (hızlı!)






