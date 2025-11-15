# 🚀 Market Robot v2.0 - Kurulum Kılavuzu

## ✅ Tamamlanan Adımlar

1. ✅ **Migration Çalıştırıldı** - Database tabloları oluşturuldu
2. ✅ **UI Components Entegre Edildi** - Piyasa Robotu sayfasına eklendi
3. ✅ **Provider'lar Güncellendi** - Real data desteği eklendi

---

## 🔧 Gerçek Veri İçin Kurulum

### 1. Environment Variables Ekleyin

`.env.local` dosyanızı düzenleyin (yoksa oluşturun):

```bash
# .env.local

# AI Classification (MEVCUT - Zaten çalışıyor)
ANTHROPIC_API_KEY=sk-ant-your-existing-key
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# TÜİK API (YENİ - Ekleyin)
TUIK_API_KEY=your-tuik-api-key-here
TUIK_API_URL=https://data.tuik.gov.tr/api

# Web Scraping (OPSİYONEL)
ENABLE_WEB_SCRAPING=false  # true yaparsanız Playwright gerekli
```

### 2. TÜİK API Key Alma

TÜİK gerçek API'si henüz public değil, ancak hazırlıklar yapıldı:

**Seçenek A: TÜİK API Bekleniyor**
- TÜİK'in resmi API'si açıldığında key alın
- `.env.local`'e ekleyin
- Sistem otomatik real data kullanacak

**Seçenek B: CSV Import (ŞİMDİ KULLANILABİLİR)**
```typescript
import { importTUIKCSV } from '@/lib/market/provider/tuik-real';

// TÜİK'ten indirdiğiniz CSV'yi import edin
await importTUIKCSV('./tuik-prices.csv');
```

CSV Format:
```csv
Ürün,Birim,Fiyat,Tarih
Tavuk Eti,kg,95.80,2025-01-15
Zeytinyağı,lt,285.50,2025-01-15
Domates,kg,28.90,2025-01-15
```

### 3. Web Scraping Kurulumu (Opsiyonel)

Gerçek hal fiyatları çekmek için:

```bash
# Playwright kur
npm install playwright
npx playwright install chromium
```

```bash
# .env.local'e ekle
ENABLE_WEB_SCRAPING=true
```

**DİKKAT:** Web scraping kullanmadan önce:
- robots.txt'i kontrol edin
- Rate limiting kullanın
- Terms of service'e uyun

---

## 📊 Sistem Durumu

### Şu Anda Çalışan
✅ **Migration**: Tüm tablolar oluşturuldu
✅ **UI Components**: 3 yeni component entegre
✅ **AI Classification**: Claude ile çalışıyor
✅ **Mock Data**: TÜİK + WEB mock verilerle çalışıyor
✅ **Validation**: PriceGuard aktif
✅ **Confidence**: 3-seviye sistem aktif
✅ **Volatility**: Analiz çalışıyor

### Real Data Durumu
🟡 **TÜİK**: Mock data (API key eklenince real'e geçer)
🟡 **WEB**: Mock data (scraping aktif edilince real'e geçer)
✅ **AI**: Real data (Claude key ile çalışıyor)
✅ **DB**: Real data (kendi verileriniz)

---

## 🧪 Test Etme

### 1. Migration Testi
```bash
curl http://localhost:3000/api/market/migrate
```

Beklenen Sonuç:
```json
{
  "ok": true,
  "message": "Tum migration'lar basarili!",
  "after": {
    "market_prices_v2": true,
    "price_validations": true,
    "price_history": true,
    "product_catalog": true,
    "current_prices_view": true
  }
}
```

### 2. Fiyat Sorgulama Testi
```bash
curl -X POST http://localhost:3000/api/market/price \
  -H "Content-Type: application/json" \
  -d '{"product":"tavuk eti"}'
```

Beklenen:
- ✅ `confidenceBreakdown` (3-seviye)
- ✅ `volatility` (varsa)
- ✅ `priceByBrand` (varsa)
- ✅ `normalized` bilgisi

### 3. UI Testi
1. http://localhost:3000/piyasa-robotu sayfasına gidin
2. "tavuk eti" yazın ve ara
3. Görmeli siniz:
   - **ProductSuggestionPanel** (üst kısımda)
   - **PriceCard** (fiyat kartı)
   - **VolatilityIndicator** (volatility varsa)
   - **BrandComparisonList** (marka varsa)

---

## 🎯 Kullanım Senaryoları

### Senaryo 1: Temel Kullanım (Mock Data)
```
1. Sayfa aç
2. "zeytinyağı" yaz
3. Sonuç: Mock data gösterir
```

### Senaryo 2: TÜİK API ile (Real Data)
```
1. .env.local'e TUIK_API_KEY ekle
2. Server restart
3. "zeytinyağı" ara
4. Console'da: "[TUIK] Real data kullanıldı"
```

### Senaryo 3: CSV Import
```typescript
// Script olarak çalıştır
import { importTUIKCSV } from '@/lib/market/provider/tuik-real';
await importTUIKCSV('./data/tuik-01-2025.csv');
// 100+ ürün database'e eklenir
```

---

## 📈 Veri Akışı

### Mock Data (Şu Anki Durum)
```
User Input → Normalize → 
  ├─ TUIK Provider (Mock) 
  ├─ WEB Provider (Mock) 
  ├─ DB Provider (Boş)
  └─ AI Provider (Real - Claude)
→ Fusion → Validation → Response
```

### Real Data (API Key Eklenince)
```
User Input → Normalize → 
  ├─ TUIK Provider (REAL API) ✅
  ├─ WEB Provider (Scraping) ✅
  ├─ DB Provider (Own Data) ✅
  └─ AI Provider (Claude) ✅
→ Fusion → Validation → Response
```

---

## 🔄 Güncelleme Stratejisi

### Otomatik Güncelleme (Gelecek)
```typescript
// Cron job ile günlük çalıştır
import { scheduledTUIKUpdate } from '@/lib/market/provider/tuik-real';

// Her gece 02:00'de
scheduledTUIKUpdate();
```

### Manuel Güncelleme
```bash
# Migration endpoint
curl http://localhost:3000/api/market/migrate

# CSV import
npx ts-node scripts/import-tuik-csv.ts
```

---

## ⚠️ Önemli Notlar

### 1. API Rate Limiting
- TÜİK: Henüz bilinmiyor (public olunca bellidir)
- WEB Scraping: 5 saniye delay var
- AI (Claude): Request limit'e dikkat

### 2. Cache Stratejisi
- Mock data: 1 saat cache
- Real data: 24 saat cache (yüksek confidence)
- Volatility yüksekse: 30 dakika cache

### 3. Maliyet
- TÜİK API: Muhtemelen ücretsiz (public olunca)
- Claude API: Token başına ücret
- Scraping: Bandwidth + Playwright hosting

### 4. Legal
- Web scraping için robots.txt kontrolü
- Terms of service uyumu
- Rate limiting zorunlu

---

## 🐛 Sorun Giderme

### Problem: Migration Hata Veriyor
```bash
# Çözüm: Database'i sıfırla
rm procheff.db
curl http://localhost:3000/api/market/migrate
```

### Problem: "Cannot find module 'tuik-real'"
```bash
# Çözüm: Build yap
npm run build
# veya dev mode'da restart
npm run dev
```

### Problem: UI Component'ler Görünmüyor
```bash
# Çözüm: Cache temizle
rm -rf .next
npm run dev
```

### Problem: Real Data Gelmiyor
```bash
# Kontrol:
console.log(process.env.TUIK_API_KEY); // undefined ise eklenmemiş
console.log(process.env.ANTHROPIC_API_KEY); // bu çalışıyorsa env OK
```

---

## 📞 Destek

### Dokümantasyon
- [README](./MARKET-ROBOT-V2-README.md) - Kapsamlı kılavuz
- [Integration Summary](./MARKET-ROBOT-INTEGRATION-SUMMARY.md) - Özet
- [Complete Report](./MARKET-ROBOT-COMPLETE.md) - Tamamlama raporu

### API Endpoints
- `GET /api/market/migrate` - Migration çalıştır
- `POST /api/market/price` - Fiyat sorgula
- `POST /api/ai/classify-product` - AI classification
- `GET /api/ai/classify-product` - Health check

---

## ✅ Checklist

### Hemen Yapılacaklar
- [x] Migration çalıştırıldı
- [x] UI components entegre edildi
- [x] Provider'lar güncellendi
- [ ] `.env.local`'e TÜİK key ekleyin (siz yapacaksınız)
- [ ] Test edin (sayfa açın)

### İsteğe Bağlı
- [ ] Playwright kurun (scraping için)
- [ ] TÜİK CSV import edin
- [ ] Redis ekleyin (cache için)
- [ ] Monitoring setup

---

**🎉 Sistem hazır! `.env.local`'e TÜİK key ekleyip test edebilirsiniz.**

API key olmasa bile mock data ile tüm özellikler çalışıyor!

