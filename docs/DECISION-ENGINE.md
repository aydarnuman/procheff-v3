# 🧠 AI Teklif Karar Motoru (Decision Engine)

## 📋 Genel Bakış

Procheff v3'ün karar mekanizması. Claude Sonnet 4.5 kullanarak maliyet, menü ve risk verilerini analiz eder ve ihale katılım kararı üretir.

## 🎯 Özellikler

### Karar Türleri

- **✅ Katıl** - Bütçe yeterli, risk düşük, karlılık uygun
- **❌ Katılma** - Bütçe yetersiz, risk çok yüksek, zarar riski var
- **⚠️ Dikkatli Katıl** - Orta risk, dikkatli planlama gerekiyor

### Analiz Kriterleri

- 💰 Maliyet analizi sonuçları
- 📊 Bütçe yeterliliği
- ⚠️ Risk seviyesi
- 📈 Karlılık potansiyeli
- 🏆 Rekabet durumu
- ⚙️ Operasyonel kapasite

## 🔗 API Endpoint

### POST /api/ai/decision

**Request Body:**

```json
{
  "cost_analysis": {
    "gunluk_kisi_maliyeti": "22.45 TL",
    "tahmini_toplam_gider": "463000 TL",
    "onerilen_karlilik_orani": "%7.5",
    "riskli_kalemler": ["Et", "Sebze", "Yağ"],
    "maliyet_dagilimi": {
      "hammadde": "%65",
      "iscilik": "%20",
      "genel_giderler": "%10",
      "kar": "%5"
    }
  },
  "menu_data": [
    {
      "yemek": "Tavuk Sote",
      "gramaj": 180,
      "kisi": 250,
      "kategori": "ana yemek"
    }
  ],
  "ihale_bilgileri": {
    "kurum": "Milli Eğitim Müdürlüğü",
    "ihale_turu": "Okul Yemeği",
    "sure": "12 ay",
    "butce": "500000 TL"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "karar": "Katıl",
    "gerekce": "Bütçe yeterli, risk düşük, maliyetler dengede.",
    "risk_orani": "%12.4",
    "tahmini_kar_orani": "%8.5",
    "stratejik_oneriler": [
      "Sebze alımlarını mevsimsel yapın",
      "Tedarikçi sayısını artırın"
    ],
    "kritik_noktalar": [
      "Et fiyatlarını takip edin",
      "Depo kapasitesini kontrol edin"
    ]
  },
  "meta": {
    "duration_ms": 2245,
    "model": "claude-sonnet-4-20250514",
    "estimated_tokens": 1200,
    "timestamp": "2025-11-10T14:30:00.000Z"
  }
}
```

## 🖥️ UI Kullanımı

### Sayfa: `/decision`

```bash
# Tarayıcıda aç
http://localhost:3001/decision
```

**UI Özellikleri:**

- 📊 Maliyet, menü ve ihale bilgilerinin özeti
- 🎯 "Karar Oluştur" butonu
- ✅ Renkli karar kartı (yeşil/kırmızı/sarı)
- 📈 Risk ve kâr oranı göstergeleri
- 💡 Stratejik öneriler listesi
- ⚠️ Kritik noktalar uyarıları
- 🤖 AI işlem bilgileri (süre, token, model)

## 🧪 Test Komutları

### cURL ile Test

```bash
curl -X POST http://localhost:3001/api/ai/decision \
  -H "Content-Type: application/json" \
  -d '{
    "cost_analysis": {
      "gunluk_kisi_maliyeti": "22.45 TL",
      "tahmini_toplam_gider": "463000 TL",
      "onerilen_karlilik_orani": "%7.5",
      "riskli_kalemler": ["Et", "Sebze", "Yağ"]
    },
    "menu_data": [
      {"yemek": "Tavuk Sote", "gramaj": 180, "kisi": 250}
    ],
    "ihale_bilgileri": {
      "kurum": "Milli Eğitim",
      "butce": "500000 TL"
    }
  }' | jq
```

## 📊 Veri Akışı

```
Menü Parser → Maliyet Motoru → Karar Motoru → Dashboard
   (menu)         (cost)         (decision)      (logs)
```

## 🔧 Teknik Detaylar

### Backend

- **Dosya:** `src/app/api/ai/decision/route.ts`
- **Model:** Claude Sonnet 4.5
- **Validation:** Zod schema
- **Logging:** AILogger entegrasyonu
- **Token Estimation:** Otomatik tahmin

### Frontend

- **Dosya:** `src/app/decision/page.tsx`
- **Framework:** Next.js 16 (App Router)
- **State:** React useState hooks
- **Styling:** Tailwind CSS
- **Components:** Custom Card components

### Prompt

- **Dosya:** `src/lib/ai/prompts.ts`
- **Prompt:** `DECISION_PROMPT`
- **Temperature:** 0.5 (dengeli yaratıcılık)
- **Max Tokens:** 8000

## 📈 Örnek Senaryolar

### Senaryo 1: Düşük Riskli İhale

```json
{
  "karar": "Katıl",
  "risk_orani": "%8.2",
  "tahmini_kar_orani": "%12.5"
}
```

### Senaryo 2: Yüksek Riskli İhale

```json
{
  "karar": "Katılma",
  "risk_orani": "%45.8",
  "tahmini_kar_orani": "%-3.2"
}
```

### Senaryo 3: Orta Risk

```json
{
  "karar": "Dikkatli Katıl",
  "risk_orani": "%18.5",
  "tahmini_kar_orani": "%6.8"
}
```

## 🔒 Güvenlik

- ✅ Input validation (Zod)
- ✅ Error handling
- ✅ Type safety (TypeScript)
- ✅ API key protection (.env)

## 📝 Logger Entegrasyonu

Tüm karar işlemleri otomatik loglanır:

```
✅ [SUCCESS] Karar analizi tamamlandı (2.2s)
🧠 Karar: Katıl
📊 Risk: %12.4 | Kâr: %8.5
```

Dashboard'da görünür: `/monitor`

## 🚀 Production Deployment

### Vercel

```bash
vercel --prod
```

### Google Cloud Run

```bash
gcloud run deploy procheff-decision \
  --source . \
  --region europe-west1
```

## 📚 İlgili Modüller

- **Maliyet Analizi:** `/api/ai/cost-analysis`
- **Menü Parser:** `/api/parser/menu`
- **Dashboard:** `/monitor`
- **Loglar:** `/logs`

## 🎓 Kullanım Akışı

1. **Menü Yükle** → `/menu-parser` sayfasından CSV/TXT yükle
2. **Maliyet Hesapla** → `/cost-analysis` ile maliyetleri hesapla
3. **Karar Al** → `/decision` ile katılım kararı üret
4. **İzle** → `/monitor` ile tüm süreci takip et

---

**📅 Oluşturulma:** 10 Kasım 2025  
**🤖 Model:** Claude Sonnet 4.5  
**⚡ Status:** Production Ready
