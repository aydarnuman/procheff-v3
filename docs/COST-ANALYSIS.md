# 💰 Procheff v3 - AI Cost Analysis Engine

## 🎯 Genel Bakış

AI Maliyet Analiz Motoru, Claude Sonnet 4.5 kullanarak kamu ihalelerinde detaylı maliyet hesaplaması, karlılık analizi ve optimizasyon önerileri sunan akıllı bir sistemdir.

---

## ✨ Özellikler

### 📊 Hesaplanan Metrikler

- **Günlük Kişi Başı Maliyet** - Detaylı birim maliyet analizi
- **Tahmini Toplam Gider** - Proje toplam maliyeti
- **Önerilen Karlılık Oranı** - Piyasa koşullarına göre kar marjı
- **Riskli Kalemler** - Fiyat volatilitesi yüksek ürünler
- **Maliyet Dağılımı** - Hammadde, işçilik, genel gider, kar
- **Optimizasyon Önerileri** - Maliyet düşürme stratejileri

### 🧠 AI Destekli Analiz

- Claude Sonnet 4.5 ile gerçek zamanlı hesaplama
- Piyasa koşullarını dikkate alan akıllı tahminler
- Sektör standartlarına uygun öneriler
- Gerçekçi ve uygulanabilir sonuçlar

---

## 🚀 Kullanım

### 1. Web Arayüzü

```
http://localhost:3001/cost-analysis
```

#### Form Alanları:

- **Kurum**: İhaleyi açan kurum (Örn: Milli Eğitim Bakanlığı)
- **İhale Türü**: Hizmet türü (Örn: Yemek Hizmeti)
- **Kişilik**: Günlük kişi sayısı (Örn: 250)
- **Bütçe**: Toplam bütçe (Örn: 500000 TL)

### 2. API Endpoint

**URL**: `POST /api/ai/cost-analysis`

**Request Body**:

```json
{
  "extracted_data": {
    "kurum": "Milli Eğitim Bakanlığı",
    "ihale_turu": "Yemek Hizmeti",
    "kisilik": "250",
    "butce": "500000 TL"
  }
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "gunluk_kisi_maliyeti": "5.48 TL",
    "tahmini_toplam_gider": "425000 TL",
    "onerilen_karlilik_orani": "%15.0",
    "riskli_kalemler": [
      "Et ve Et Ürünleri",
      "Süt ve Süt Ürünleri",
      "Sebze ve Meyve"
    ],
    "maliyet_dagilimi": {
      "hammadde": "%65",
      "iscilik": "%20",
      "genel_giderler": "%10",
      "kar": "%5"
    },
    "optimizasyon_onerileri": [
      "Mevsimlik ürünlerde yerel tedarikçilerle anlaşma yapın",
      "Toplu alım ile hammadde maliyetlerini %8-12 düşürün",
      "Menü planlamasında maliyet etkin protein kaynaklarını tercih edin"
    ]
  },
  "meta": {
    "duration_ms": 6217,
    "model": "claude-sonnet-4-20250514",
    "estimated_tokens": 400
  }
}
```

---

## 🏗️ Mimari

### Backend

```
src/app/api/ai/cost-analysis/route.ts
├── Request validation (Zod)
├── AILogger integration
├── Claude API çağrısı
├── JSON cleaning & parsing
├── Performance tracking
└── Structured response
```

### Prompt System

```
src/lib/ai/prompts.ts
├── COST_ANALYSIS_PROMPT
├── DEEP_ANALYSIS_PROMPT
└── PRICE_PREDICTION_PROMPT
```

### Frontend

```
src/app/cost-analysis/page.tsx
├── Form input handling
├── API communication
├── Result visualization
├── Card-based UI
└── Responsive design
```

---

## 📊 UI Bileşenleri

### 1. İhale Bilgileri Formu

- Kurum seçimi
- İhale türü girişi
- Kişi sayısı
- Bütçe tanımlama

### 2. Ana Metrik Kartları

- **Günlük Kişi Başı Maliyet** (Yeşil)
- **Tahmini Toplam Gider** (Mavi)
- **Önerilen Karlılık** (Mor)

### 3. Maliyet Dağılımı

Grid layout ile yüzdesel dağılım:

- Hammadde
- İşçilik
- Genel Giderler
- Kar

### 4. Riskli Kalemler

- Kırmızı vurgulu uyarı kartları
- Volatilite yüksek ürünler listesi

### 5. Optimizasyon Önerileri

- Yeşil vurgulu öneri kartları
- Uygulama stratejileri

### 6. Meta Bilgiler

- Analiz süresi (ms)
- Kullanılan model
- Tahmini token sayısı

---

## 🧪 Test

### CURL ile Test

```bash
curl -X POST http://localhost:3001/api/ai/cost-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "extracted_data": {
      "kurum": "MEB",
      "ihale_turu": "Yemek Hizmeti",
      "kisilik": "250",
      "butce": "500000 TL"
    }
  }' | python3 -m json.tool
```

### Tarayıcı Testi

1. `http://localhost:3001/cost-analysis` adresine git
2. Form alanlarını doldur
3. "💵 Maliyet Hesapla" butonuna tıkla
4. Sonuçları incele

### Log Kontrol

```bash
sqlite3 procheff.db "SELECT * FROM logs WHERE message LIKE '%Maliyet%';"
```

---

## 📈 Performans

- ✅ **API Response Time**: 6-8 saniye (Claude API)
- ✅ **Token Usage**: ~400 token/analiz
- ✅ **UI Load Time**: <1 saniye
- ✅ **Real-time Updates**: Instant
- ✅ **Error Handling**: Comprehensive

---

## 🎨 UI/UX Özellikleri

- ✅ **Modern Dark Theme** - Slate renk paleti
- ✅ **Responsive Design** - Mobil uyumlu
- ✅ **Card-based Layout** - Organize görünüm
- ✅ **Color-coded Results** - Hızlı okuma
- ✅ **Loading States** - Kullanıcı feedback
- ✅ **Error Messages** - Anlaşılır hata gösterimi
- ✅ **Gradient Buttons** - Modern tasarım

---

## 🔧 Teknolojiler

- **AI Model**: Claude Sonnet 4.5
- **Framework**: Next.js 16
- **Validation**: Zod
- **Logger**: Custom AILogger
- **Styling**: Tailwind CSS
- **Components**: Custom Card UI
- **Database**: SQLite (logs)

---

## 💡 Kullanım Senaryoları

### 1. İhale Hazırlık

- Teklif fiyatı belirleme
- Maliyet tahmini
- Kar marjı planlama

### 2. Risk Analizi

- Volatil ürün tespiti
- Bütçe kontrolü
- Maliyet optimizasyonu

### 3. Karar Destek

- Teklif verme kararı
- Rekabet analizi
- Strateji belirleme

---

## 📝 Örnek Senaryolar

### Senaryo 1: Okul Yemek İhalesi

**Girdi**:

- Kurum: Milli Eğitim Bakanlığı
- İhale Türü: Yemek Hizmeti
- Kişilik: 250
- Bütçe: 500,000 TL

**Çıktı**:

- Günlük Maliyet: 5.48 TL/kişi
- Toplam Gider: 425,000 TL
- Karlılık: %15
- Risk: Et, süt, sebze fiyatları

### Senaryo 2: Hastane Temizlik İhalesi

**Girdi**:

- Kurum: Sağlık Bakanlığı
- İhale Türü: Temizlik Hizmeti
- Alan: 5000 m²
- Bütçe: 300,000 TL

**Çıktı**:

- Aylık m² Maliyet: 5 TL/m²
- Toplam Gider: 270,000 TL
- Karlılık: %10
- Risk: Kimyasal fiyatları, personel maliyeti

---

## 🔮 Gelecek Geliştirmeler

- [ ] **Tarihsel Veri Karşılaştırma** - Geçmiş ihalelerle mukayese
- [ ] **Çoklu Senaryo Analizi** - Farklı bütçe simülasyonları
- [ ] **Excel Export** - Rapor indirme
- [ ] **PDF Oluşturma** - Profesyonel sunum
- [ ] **Template System** - Hazır ihale şablonları
- [ ] **Batch Analysis** - Çoklu ihale karşılaştırma
- [ ] **AI Learning** - Geçmiş verilerden öğrenme
- [ ] **Real-time Market Data** - Güncel piyasa fiyatları

---

## 🎯 Entegrasyon

### Logger Sistemi ile

- ✅ Tüm analizler loglanır
- ✅ Performance metrics kaydedilir
- ✅ Token usage izlenir

### Monitoring Dashboard ile

- ✅ Maliyet analizleri metriklere dahildir
- ✅ Real-time tracking
- ✅ Grafiklerde görünür

### Deep Analysis ile

- ✅ Kombine analiz yapılabilir
- ✅ Çapraz referans mümkün

---

## 📚 Dokümantasyon Bağlantıları

- [AI Logger System](./AI-LOGGER-README.md)
- [Monitoring Dashboard](./MONITORING-DASHBOARD.md)
- [Main README](./README.md)

---

## ✅ Status

**🟢 PRODUCTION READY**

- ✅ API Endpoint aktif
- ✅ UI fully functional
- ✅ Logger entegrasyonu çalışıyor
- ✅ Error handling complete
- ✅ Performance optimized

**Erişim URL**: http://localhost:3001/cost-analysis

---

## 🎉 Sonuç

Procheff v3 Cost Analysis Engine, ihalelerde maliyet planlama ve optimizasyon için kapsamlı bir AI destekli çözümdür. Claude Sonnet 4.5'in güçlü analiz yetenekleri ile gerçekçi ve uygulanabilir sonuçlar üretir.

**Sistem Durumu**: 🟢 Aktif ve Hazır!
