# 🚀 İhalebul Entegrasyonu - Hızlı Başlangıç

## Servisleri Başlat

```bash
# Terminal 1 - Worker (Port 8080)
cd ihale-worker && npm run dev

# Terminal 2 - Next.js (Port 3000)
npm run dev
```

## Test Et

```bash
# Browser'da aç
http://localhost:3000/ihale

# İlk açılışta otomatik:
# 1. İhalebul'a login
# 2. Tüm ihaleleri çek
# 3. SQLite'a kaydet
# 4. UI'da göster

# "Yenile" butonuna basınca:
# - Worker'dan yeni veriler çek
# - SQLite'a upsert et
# - UI'yı güncelle

# Sayfa yenilediğinde:
# - SQLite'dan oku (HIZLI!)
# - Worker'a gitme
```

## SQLite Veritabanı

```bash
# Veritabanı konumu
ls -lh procheff.db

# Verileri görmek için (opsiyonel)
sqlite3 procheff.db "SELECT id, title, city, tender_date, days_remaining FROM tenders LIMIT 5;"
```

## Sorun Giderme

```bash
# Worker crash olduysa
lsof -ti:8080 | xargs kill -9
cd ihale-worker && npm run dev

# Next.js crash olduysa
lsof -ti:3000 | xargs kill -9
npm run dev

# Database sıfırlamak için
rm procheff.db
# (Tekrar açılınca otomatik oluşturulur)
```

## Önemli Dosyalar

### Database Layer (⭐ YENİ!)
- `src/lib/db/init-tenders.ts` - SQLite tablo + CRUD işlemleri
- `procheff.db` - SQLite veritabanı dosyası

### Worker
- `ihale-worker/src/ihalebul.ts` - Parser (TARİH MANTIĞI BURADA!)

### API
- `src/app/api/ihale/list/route.ts` - Worker → SQLite → UI akışı
- `src/app/api/ihale/login/route.ts` - Login proxy

### UI
- `src/app/ihale/page.tsx` - Tablo + Yenile butonu

## Kritik Noktalar

⚠️ **TARİH:** "Teklif tarihi" etiketini kullan, en büyük tarihi alma!
⚠️ **UI MAPPING:** `item.tenderDate` ve `item.daysRemaining` kullan
⚠️ **WORKER:** Her değişiklikten sonra restart et
⚠️ **DATABASE:** INSERT OR REPLACE kullanıyor (upsert)
⚠️ **REFRESH:** `?refresh=true` parametresi worker'ı tetikler

## Veri Akışı

```
1. İlk Yükleme:
   Worker → SQLite → UI

2. Sayfa Yenileme:
   SQLite → UI (hızlı!)

3. "Yenile" Butonu:
   Worker → SQLite (upsert) → UI
```

## Detaylı Dökümantasyon

📖 `docs/IHALEBUL-INTEGRATION.md`
