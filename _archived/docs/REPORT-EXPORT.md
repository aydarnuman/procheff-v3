# 📄 AI Teklif Raporu Modülü (PDF/Excel Export)

## 📋 Genel Bakış

Procheff v3'ün raporlama sistemi. Claude Sonnet 4.5'in ürettiği analiz verilerini kurumsal PDF ve Excel formatlarına dönüştürür.

## 🎯 Özellikler

### Rapor Formatları

- **📄 PDF** - pdfkit ile profesyonel layout
- **📊 Excel** - exceljs ile çok sayfalı workbook

### Rapor İçeriği

- 📋 İhale bilgileri (kurum, tür, süre, bütçe)
- 💰 Maliyet analizi (kişi maliyeti, toplam gider, dağılım)
- ⚠️ Riskli kalemler listesi
- 🧠 AI karar analizi (Katıl/Katılma/Dikkatli)
- 💡 Stratejik öneriler
- ⚠️ Kritik noktalar
- 🍽️ Menü listesi ve gramaj bilgileri
- 🤖 Meta bilgiler (model, tarih, token)

## 🔗 API Endpoints

### POST /api/export/pdf

PDF rapor oluşturur ve indirir.

**Request:**

```json
{
  "analysis": {
    "kurum": "Milli Eğitim Müdürlüğü",
    "ihale_turu": "Okul Yemeği",
    "sure": "12 ay",
    "butce": "500000 TL"
  },
  "cost": {
    "gunluk_kisi_maliyeti": "22.45 TL",
    "tahmini_toplam_gider": "463000 TL",
    "onerilen_karlilik_orani": "%7.5",
    "riskli_kalemler": ["Et", "Sebze"],
    "maliyet_dagilimi": {
      "hammadde": "%65",
      "iscilik": "%20",
      "genel_giderler": "%10",
      "kar": "%5"
    }
  },
  "decision": {
    "karar": "Katıl",
    "gerekce": "Bütçe yeterli, risk düşük",
    "risk_orani": "%15.2",
    "tahmini_kar_orani": "%8.2",
    "stratejik_oneriler": ["Öneri 1", "Öneri 2"],
    "kritik_noktalar": ["Nokta 1", "Nokta 2"]
  },
  "menu": [
    {
      "yemek": "Tavuk Sote",
      "gramaj": 180,
      "kisi": 250,
      "kategori": "ana yemek"
    }
  ]
}
```

**Response:**

- Content-Type: `application/pdf`
- Otomatik indirme başlatır
- Dosya adı: `procheff-rapor-YYYY-MM-DD-timestamp.pdf`

### POST /api/export/xlsx

Excel rapor oluşturur ve indirir.

**Request:** PDF ile aynı format

**Response:**

- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Otomatik indirme başlatır
- Dosya adı: `procheff-rapor-YYYY-MM-DD-timestamp.xlsx`
- Sheets: "Teklif Raporu", "Menü Listesi", "Meta Bilgi"

## 🖥️ UI Kullanımı

### Sayfa: `/reports`

```bash
# Tarayıcıda aç
http://localhost:3001/reports
```

**UI Özellikleri:**

- 📄 "PDF İndir" butonu
- 📊 "Excel İndir" butonu
- 📋 Rapor içeriği önizlemesi (4 kart)
- ℹ️ Rapor içeriği bilgilendirmesi
- ⚡ Otomatik indirme
- 🔄 Loading states
- ❌ Error handling

## 🧪 Test Komutları

### PDF Export Test

```bash
curl -X POST http://localhost:3001/api/export/pdf \
  -H "Content-Type: application/json" \
  -d '{
    "analysis": {"kurum": "MEB", "ihale_turu": "Yemek", "sure": "12 ay", "butce": "500K"},
    "cost": {"gunluk_kisi_maliyeti": "22.45 TL", "tahmini_toplam_gider": "463K TL"},
    "decision": {"karar": "Katıl", "risk_orani": "%15.2", "tahmini_kar_orani": "%8.2", "gerekce": "Uygun"}
  }' \
  --output test-rapor.pdf
```

### Excel Export Test

```bash
curl -X POST http://localhost:3001/api/export/xlsx \
  -H "Content-Type: application/json" \
  -d '{
    "analysis": {"kurum": "MEB", "ihale_turu": "Yemek", "sure": "12 ay", "butce": "500K"},
    "cost": {"gunluk_kisi_maliyeti": "22.45 TL", "tahmini_toplam_gider": "463K TL"},
    "decision": {"karar": "Katıl", "risk_orani": "%15.2", "tahmini_kar_orani": "%8.2", "gerekce": "Uygun"}
  }' \
  --output test-rapor.xlsx
```

## 📊 Veri Akışı

```
Menu Parser → Cost Analysis → Decision Engine → Report Builder → PDF/Excel
   (menu)        (cost)          (decision)        (unified)       (export)
```

## 🔧 Teknik Detaylar

### PDF Generation (pdfkit)

- **Dosya:** `src/app/api/export/pdf/route.ts`
- **Font:** Helvetica (Bold + Regular)
- **Sayfa:** A4, 50px margin
- **Renkler:**
  - Katıl: Green
  - Katılma: Red
  - Dikkatli: Orange
- **Sections:** Header, İhale, Maliyet, Karar, Menü, Footer

### Excel Generation (exceljs)

- **Dosya:** `src/app/api/export/xlsx/route.ts`
- **Sheets:** 3 adet (Teklif Raporu, Menü Listesi, Meta Bilgi)
- **Styling:** Header colors, cell fills, fonts
- **Columns:** Auto width
- **Features:** Merged cells, conditional colors

### Report Builder Utility

- **Dosya:** `src/lib/utils/report-builder.ts`
- **Function:** `buildReportPayload()`
- **Purpose:** Birleşik veri yapısı oluşturur
- **Types:** Full TypeScript interfaces
- **Helpers:** formatCurrency, formatPercentage, generateReportFilename

## 📈 Örnek Çıktılar

### PDF Yapısı

```
┌─────────────────────────────────────┐
│    PROCHEFF AI TEKLİF RAPORU        │
├─────────────────────────────────────┤
│ 📋 İHALE BİLGİLERİ                  │
│   Kurum: ...                        │
│   İhale Türü: ...                   │
├─────────────────────────────────────┤
│ 💰 MALİYET ANALİZİ                  │
│   Günlük Kişi: 22.45 TL             │
│   Toplam: 463K TL                   │
├─────────────────────────────────────┤
│ 🧠 AI KARAR ANALİZİ                 │
│   Katıl ✅                          │
│   Risk: %15.2 | Kâr: %8.2           │
└─────────────────────────────────────┘
```

### Excel Sheet Yapısı

```
Sheet 1: Teklif Raporu
┌──────────────────┬───────────────────┐
│ Alan             │ Değer             │
├──────────────────┼───────────────────┤
│ Kurum            │ MEB               │
│ Karar            │ Katıl (yeşil)     │
└──────────────────┴───────────────────┘

Sheet 2: Menü Listesi
┌───┬─────────────┬────────┬──────┐
│ # │ Yemek       │ Gramaj │ Kişi │
├───┼─────────────┼────────┼──────┤
│ 1 │ Tavuk Sote  │ 180    │ 250  │
└───┴─────────────┴────────┴──────┘

Sheet 3: Meta Bilgi
┌─────────┬──────────────────────┐
│ Model   │ claude-sonnet-4.5    │
│ Tarih   │ 10.11.2025 14:30     │
└─────────┴──────────────────────┘
```

## 🔒 Güvenlik

- ✅ Input validation (TypeScript types)
- ✅ Error handling (try-catch)
- ✅ Buffer management
- ✅ Memory cleanup
- ✅ No file system writes (in-memory streaming)

## 📝 Logger Entegrasyonu

Tüm rapor işlemleri loglanır:

```
📄 [INFO] PDF rapor oluşturma başlatıldı
✅ [SUCCESS] PDF rapor oluşturuldu (1.2s)
   - filename: procheff-rapor-2025-11-10-xxx.pdf
   - size: 45.2 KB
   - karar: Katıl
```

Dashboard'da görünür: `/monitor`

## 🚀 Deployment

### Vercel

```bash
vercel --prod
```

### Docker

```dockerfile
# pdfkit için fontconfig gerekli
RUN apt-get update && apt-get install -y fontconfig
```

## 🎓 Kullanım Senaryoları

### Senaryo 1: UI'dan Rapor İndir

1. `/reports` sayfasını aç
2. "PDF İndir" veya "Excel İndir" butonuna tık
3. Rapor otomatik indirilir

### Senaryo 2: API'den Rapor Oluştur

1. Maliyet analizi yap → `/api/ai/cost-analysis`
2. Karar motoru çalıştır → `/api/ai/decision`
3. Rapor oluştur → `/api/export/pdf` veya `/api/export/xlsx`

### Senaryo 3: Toplu Entegrasyon

```javascript
// 1. Menu parse
const menu = await parseMenu(file);

// 2. Cost analysis
const cost = await analyzeCost(menu);

// 3. Decision
const decision = await makeDecision(cost);

// 4. Export report
const pdf = await exportPDF({ menu, cost, decision });
```

## 📚 İlgili Modüller

- **Maliyet Analizi:** `/api/ai/cost-analysis` → cost data
- **Karar Motoru:** `/api/ai/decision` → decision data
- **Menü Parser:** `/api/parser/menu` → menu data
- **Dashboard:** `/monitor` → işlem logları
- **Logger:** `AILogger` → otomatik loglama

## 💡 İyileştirme Fikirleri

- [ ] PDF template sistemi (farklı formatlar)
- [ ] Excel chart integration (grafikler)
- [ ] Email gönderimi (SMTP)
- [ ] Cloud storage (S3/GCS)
- [ ] Bulk export (toplu rapor)
- [ ] Custom branding (logo, renk)

---

**📅 Oluşturulma:** 10 Kasım 2025  
**🤖 Model:** Claude Sonnet 4.5  
**⚡ Status:** Production Ready  
**📦 Dependencies:** pdfkit, exceljs
