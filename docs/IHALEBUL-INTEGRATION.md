# İhalebul.com Entegrasyonu - Dokümantasyon

**Tarih:** 10 Kasım 2025
**Durum:** ✅ Tamamlandı ve Test Edildi

---

## 📋 Genel Bakış

İhalebul.com sitesinden "Hazır Yemek - Lokantacılık" kategorisindeki ihaleleri otomatik olarak çeken, parse eden, **SQLite'a kaydeden** ve UI'da gösteren tam stack entegrasyon.

### Sistem Mimarisi

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Next.js UI     │ ---> │  API Routes      │ ---> │  Worker Service │
│  /ihale         │      │  /api/ihale/*    │      │  :8080          │
│  "Yenile" btn   │      │  + SQLite        │      │                 │
└─────────────────┘      └──────────────────┘      └─────────────────┘
       ↑                         ↓                           │
       │                  ┌──────────────┐                   ↓
       └──────────────────│  SQLite DB   │          ┌─────────────────┐
                          │  tenders     │          │  Playwright     │
                          │  table       │          │  + Cheerio      │
                          └──────────────┘          │  (ihalebul.com) │
                                                    └─────────────────┘
```

### Veri Akışı

1. **İlk Yükleme**: Worker'dan çek → SQLite'a kaydet → UI'da göster
2. **Sonraki Yüklemeler**: SQLite'dan oku → UI'da göster (hızlı!)
3. **Yenile Butonu**: Worker'dan çek → SQLite'a upsert → UI'da göster
4. **Otomatik Arşivleme**: Geçmiş ihaleleri `status='archived'` yap

---

## 🔧 Teknik Detaylar

### 1. Worker Service (Port 8080)

**Lokasyon:** `/ihale-worker/`

**Temel Dosya:** `src/ihalebul.ts`

**Özellikler:**
- Playwright ile browser automation
- Session yönetimi (1 saat TTL)
- Cheerio ile HTML parsing
- 4 endpoint:
  - `POST /auth/login` - İhalebul login
  - `GET /list` - Tüm ihaleler (pagination)
  - `GET /detail/:id` - İhale detayı
  - `GET /proxy` - Doküman download

**Başlatma:**
```bash
cd ihale-worker
npm run dev
# Port 8080'de çalışır
```

---

### 2. Parse Edilen Veri Yapısı

**API Response:**
```typescript
{
  items: [
    {
      id: "1761512995734",                    // Unique ID
      tenderNumber: "2025/1845237",           // İlan numarası
      title: "Yemek Hizmeti Alınacaktır",     // Başlık (temizlenmiş)
      organization: "Adana Göç İdaresi...",   // Kurum adı
      city: "Adana",                          // Şehir
      tenderType: "Ekap Açık ihale usulü",    // İhale türü
      partialBidAllowed: false,               // Kısmi teklif verilebilir mi?
      publishDate: "27.10.2025",              // İlan yayın tarihi
      tenderDate: "25.11.2025",               // Teklif son tarihi (ÖNEMLİ!)
      daysRemaining: 15,                      // Kalan gün (otomatik hesaplanan)
      url: "https://www.ihalebul.com/..."    // Detay URL
    }
  ],
  count: 100
}
```

**Kritik Noktalar:**
- `tenderDate`: "Teklif tarihi" (en gelecekteki tarih değil, etiketli tarih!)
- `daysRemaining`: API'den geliyor, UI'da tekrar hesaplamaya gerek yok
- `tenderNumber`: Başlıktan ayrıştırılmış

---

### 3. Next.js API Routes

**Lokasyon:** `src/app/api/ihale/`

#### `/api/ihale/login`
```typescript
// Worker'a login isteği proxy'ler
POST /api/ihale/login
Response: { sessionId: "abc123" }
```

#### `/api/ihale/list`
```typescript
// Tüm ihaleleri çeker (cookies üzerinden session)
GET /api/ihale/list
Response: { items: [...], count: 100 }
```

#### `/api/ihale/detail/:id`
```typescript
// Tek ihale detayı + dokümanlar
GET /api/ihale/detail/1761512995734
Response: { id, title, html, documents: [...] }
```

---

### 4. UI Sayfası

**Lokasyon:** `src/app/ihale/page.tsx`

**Özellikler:**
- Kompakt tablo tasarımı (text-[10px], px-2 py-2)
- %100 ekran genişliği kullanımı
- Glassmorphism tema
- Aciliyet badge'leri (7 gün ve altı için)
- Responsive ve hover efektleri

**Tablo Sütunları:**
1. **Aciliyet** - Kalan gün badge (7 gün altı animate)
2. **Başlık** - İhale başlığı
3. **Kurum** - İdare adı
4. **Şehir** - İl
5. **İhale Türü** - Açık ihale, pazarlık vs
6. **Kısmi** - Kısmi teklif ✓/- badge
7. **Yayın** - İlan yayın tarihi
8. **Teklif** - Teklif son tarihi (BOLD)
9. **İşlem** - Detay butonu

**Styling:**
```css
/* Container */
min-h-screen p-2
w-full mx-auto

/* Table Card */
glass-card rounded-lg border border-indigo-500/30

/* Table Header */
text-[10px] px-2 py-2

/* Table Body */
text-xs px-2 py-2
max-w-[300px] truncate (başlık)
max-w-[250px] truncate (kurum)
```

---

## 🚀 Kullanım

### İlk Kurulum

```bash
# 1. Worker bağımlılıkları
cd ihale-worker
npm install

# 2. Worker başlat
npm run dev  # Port 8080

# 3. Ana uygulama (başka terminal)
cd ..
npm run dev  # Port 3000
```

### Test

```bash
# Worker test
curl http://localhost:8080/health

# Login test
curl -X POST http://localhost:3000/api/ihale/login

# Liste çek
curl http://localhost:3000/api/ihale/list | jq .
```

### UI Erişim

```
http://localhost:3000/ihale
```

---

## 📦 Değiştirilen/Eklenen Dosyalar

### ⭐ Yeni: Database Layer
- ✅ `src/lib/db/init-tenders.ts` - **YENİ DOSYA**
  - `initTendersTable()` - Tablo oluşturma
  - `upsertTender()` - Insert or Update
  - `getActiveTenders()` - Aktif ihaleleri getir
  - `archiveExpiredTenders()` - Geçmişleri arşivle
  - `getTenderStats()` - İstatistikler

### Worker Tarafı
- ✅ `ihale-worker/src/ihalebul.ts` - **TAM YENİDEN YAZILDI**
  - `parseList()` fonksiyonu genişletildi
  - Tüm kart bilgileri parse ediliyor
  - Tarih mantığı düzeltildi (etiket bazlı)

### API Tarafı
- ✅ `src/app/api/ihale/login/route.ts` - Değişiklik yok
- ✅ `src/app/api/ihale/list/route.ts` - **ÖNEMLİ DEĞİŞİKLİK**
  - `?refresh=true` parametresi eklendi
  - Worker'dan çek → SQLite'a kaydet → SQLite'dan döndür
  - Otomatik arşivleme
  - `source` field'i eklendi (worker/database)

### UI Tarafı
- ✅ `src/app/ihale/page.tsx` - **BÜYÜK DEĞİŞİKLİK**
  - Tablo header genişletildi (8 sütun)
  - **"Yenile" butonu** eklendi
  - **Veri kaynağı badge'i** eklendi (Worker/Database)
  - `fetchTenders(refresh)` fonksiyonu
  - İlk yükleme: Worker'dan çeker
  - Sonraki yüklemeler: SQLite'dan okur
  - API field mapping güncellendi
  - `item.tenderDate` ve `item.daysRemaining` kullanılıyor
  - Kompakt tasarım (text-[10px], px-2 py-2)
  - %100 genişlik optimizasyonu

---

## 💾 SQLite Database

### Tablo Yapısı

```sql
CREATE TABLE tenders (
  id TEXT PRIMARY KEY,              -- İhalebul ID
  tender_number TEXT,               -- İlan numarası (2025/1845237)
  title TEXT,                       -- Başlık
  organization TEXT,                -- Kurum
  city TEXT,                        -- Şehir
  tender_type TEXT,                 -- İhale türü
  partial_bid_allowed INTEGER,      -- Kısmi teklif (0/1)
  publish_date TEXT,                -- Yayın tarihi
  tender_date TEXT,                 -- Teklif tarihi
  days_remaining INTEGER,           -- Kalan gün
  url TEXT,                         -- Detay URL
  status TEXT DEFAULT 'active',     -- active, archived
  created_at DATETIME,              -- İlk eklenme
  updated_at DATETIME               -- Son güncelleme
);
```

### Upsert Mantığı

```typescript
// INSERT OR REPLACE kullanıyor
upsertTender({
  id: "1761512995734",
  tenderNumber: "2025/1845237",
  title: "Yemek Hizmeti",
  // ... diğer field'lar
});

// İlk seferde: INSERT
// Sonraki seferlerde: UPDATE (id match olursa)
```

### Kullanım Örnekleri

```typescript
// 1. Tüm aktif ihaleleri getir
const all = getActiveTenders();

// 2. Şehre göre filtrele
const ankara = getActiveTenders({ city: 'Ankara' });

// 3. Acil ihaleleri bul (7 gün ve altı)
const urgent = getActiveTenders({ maxDaysRemaining: 7 });

// 4. Geçmişleri arşivle
const count = archiveExpiredTenders();

// 5. İstatistikler
const stats = getTenderStats();
// { total: 150, active: 120, archived: 30, urgent: 15 }
```

---

## ⚠️ Önemli Notlar

### Tarih Mantığı
```typescript
// ❌ YANLIŞ (eski)
const allDates = [...];
const maxDate = Math.max(...allDates); // En uzak gelecek

// ✅ DOĞRU (yeni)
const publishMatch = cardText.match(/Yayın\s+tarihi:\s*(\d{1,2}[./]\d{1,2}[./]\d{4})/i);
const tenderMatch = cardText.match(/Teklif\s+tarihi:\s*(\d{1,2}[./]\d{1,2}[./]\d{4})/i);
```

### API Field Mapping
```typescript
// UI'da kullanılan field'lar
const tenderDate = item.tenderDate || item.date || item.ihaleTarihi;
const daysRemaining = item.daysRemaining !== undefined
  ? item.daysRemaining
  : getDaysRemaining(tenderDate);
```

### Session Yönetimi
- Login sonrası `sessionId` cookie'ye kaydediliyor
- Worker'da session 1 saat TTL
- Her 5 dakikada cleanup

---

## 🐛 Bilinen Sorunlar ve Çözümler

### 1. Worker Crash
**Sorun:** Playwright bazen crash oluyor
**Çözüm:** Worker'ı restart et
```bash
lsof -ti:8080 | xargs kill -9
cd ihale-worker && npm run dev
```

### 2. Tarihler Yanlış Geliyor
**Sorun:** İlan tarihi yerine ihale tarihi gösteriliyor
**Çözüm:** ✅ Çözüldü - Etiket bazlı parsing kullanılıyor

### 3. Sütunlar Karışıyor
**Sorun:** UI field mapping hatalı
**Çözüm:** ✅ Çözüldü - Yeni field isimleri kullanılıyor

---

## 🔮 Gelecek Geliştirmeler

- [ ] Redis cache (liste verisi 5 dakika)
- [ ] Pagination (şu an tüm sayfalar tek seferde)
- [ ] Filter (şehir, ihale türü, vs)
- [ ] Sort (tarihe göre, kalan güne göre)
- [ ] Export (Excel, PDF)
- [ ] Bildirim sistemi (yeni ihale eklenince)

---

## 📞 Destek

**Sorun Yaşarsanız:**

1. Worker çalışıyor mu kontrol et: `curl http://localhost:8080/health`
2. Next.js çalışıyor mu kontrol et: `curl http://localhost:3000/api/health`
3. Browser console'da hata var mı kontrol et
4. Worker loglarını kontrol et

**Log Konumları:**
- Worker: Terminal (ihale-worker dizininde)
- Next.js: Terminal (root dizinde)
- Browser: F12 → Console

---

## ✅ Test Checklist

### Worker & API
- [x] Worker başlıyor
- [x] Login çalışıyor
- [x] Liste çekiliyor (tüm sayfalar)
- [x] Tarihler doğru (Teklif tarihi)
- [x] Kalan gün doğru hesaplanıyor

### Database
- [x] SQLite tablosu oluşturuluyor
- [x] Upsert çalışıyor (insert + update)
- [x] Aktif ihaleler getiriliyor
- [x] Arşivleme çalışıyor
- [x] İndexler oluşturuluyor

### UI
- [x] Tüm sütunlar gösteriliyor
- [x] "Yenile" butonu çalışıyor
- [x] Veri kaynağı badge'i gösteriliyor
- [x] İlk yükleme: Worker'dan çekiyor
- [x] Sonraki yüklemeler: Database'den okuyor
- [x] Aciliyet badge'leri çalışıyor
- [x] Detay butonu tıklanabiliyor
- [x] Responsive tasarım çalışıyor
- [x] Hover efektleri çalışıyor

---

**Son Güncelleme:** 10 Kasım 2025
**Durum:** ✅ Production Ready
