# Piyasa Robotu v2.0 - Entegrasyon Kılavuzu

## 🎯 Genel Bakış

Piyasa Robotu modeli tamamen yenilendi ve aşağıdaki gelişmiş özelliklerle güçlendirildi:

### ✨ Yeni Özellikler

1. **3-Seviye Confidence System** - Category + Variant + MarketPrice breakdown
2. **PriceGuard Validation** - Anormal fiyat tespiti ve filtreleme
3. **Advanced Unit Normalization** - Akıllı paket/birim dönüşümü
4. **Dynamic Trust Scores** - Öğrenen kaynak güvenilirlik sistemi
5. **Product Normalization Pipeline** - AI + Fuzzy matching + Dictionary
6. **Portion Calculator** - Gramaj/maliyet hesaplama (catering özel)
7. **Price Volatility Tracking** - Fiyat değişkenlik analizi
8. **Brand-Aware Pricing** - Marka bazlı fiyat karşılaştırma
9. **Enhanced Database Schema** - Gelişmiş veri modeli

---

## 📦 Yeni Modüller

### 1. Schema Güncellemeleri (`schema.ts`)

```typescript
// Yeni tipler
export type BrandTier = 'premium' | 'standard' | 'economy';
export type PackagingType = 'bulk' | 'retail' | 'wholesale';

// Gelişmiş MarketQuote
interface MarketQuote {
  // ... mevcut alanlar
  brand?: string;
  brandTier?: BrandTier;
  packaging?: PackagingInfo;
  sourceTrust?: number;
}

// Yeni: Confidence Breakdown
interface ConfidenceBreakdown {
  category: number;
  variant: number;
  marketPrice: number;
  weighted: number;
  explanation?: string;
}

// Gelişmiş MarketFusion
interface MarketFusion {
  // ... mevcut alanlar
  confidenceBreakdown?: ConfidenceBreakdown;
  priceByBrand?: BrandPriceOption[];
  volatility?: PriceVolatility;
}
```

### 2. PriceGuard (`price-guard.ts`)

Fiyat validasyonu ve doğrulama sistemi.

```typescript
import { validatePrice } from '@/lib/market/price-guard';

const quote = { /* ... */ };
const validation = validatePrice(quote, priceHistory);

if (validation.isValid) {
  console.log('Fiyat geçerli, skor:', validation.score);
} else {
  console.log('Fiyat reddedildi:', validation.warnings);
}
```

**Validasyon Kuralları:**
- ❌ Sıfır veya negatif fiyat
- ⚠️ Çok düşük fiyatlar (< 2 TL)
- ⚠️ Aşırı yüksek fiyatlar (> 1000 TL)
- ⚠️ Outlier tespiti (3 sigma)
- ⚠️ Eski veri kontrolü (90+ gün)

### 3. Unit Converter (`unit-converter.ts`)

Akıllı paket/birim dönüşüm sistemi.

```typescript
import { smartPriceExtraction, normalizePrice } from '@/lib/market/unit-converter';

// Örnek: "Zeytinyağı 18 LT bidon 450 TL"
const result = smartPriceExtraction("18 LT bidon", 450);
console.log(result.unitPrice); // 25 TL/lt
console.log(result.packaging); // { size: 18, unit: 'lt', type: 'bulk' }

// Manuel normalizasyon
const normalized = normalizePrice(180, "5 kg çuval");
// => { unitPrice: 36, standardUnit: 'kg', multiplier: 5 }
```

**Desteklenen Formatlar:**
- `"5 kg çuval"` → 5x kg
- `"18 LT bidon"` → 18x lt
- `"30'lu koli"` → 30x adet
- `"6x500gr"` → 3 kg

### 4. Confidence System (`confidence.ts`)

3-seviye güven hesaplama.

```typescript
import { calculateConfidenceBreakdown } from '@/lib/market/confidence';

const breakdown = calculateConfidenceBreakdown(
  categoryConf,   // 0.85 - Kategori tespiti güveni
  variantConf,    // 0.70 - Varyant match güveni
  marketPriceConf // 0.90 - Fiyat füzyon güveni
);

// Sonuç:
// {
//   category: 0.85,
//   variant: 0.70,
//   marketPrice: 0.90,
//   weighted: 0.83,  // 0.4*cat + 0.2*var + 0.4*market
//   explanation: "Yüksek güven: 3 kaynak uyumlu"
// }
```

**UI Badge:**
```typescript
import { getConfidenceBadge } from '@/lib/market/confidence';

const badge = getConfidenceBadge(0.83);
// { color: 'green', label: 'Çok Yüksek', emoji: '🟢' }
```

### 5. Dynamic Trust Scores (`trust-score.ts`)

Öğrenen kaynak güvenilirlik sistemi.

```typescript
import { getDynamicWeights, getSourceReliabilityReport } from '@/lib/market/trust-score';

// Dinamik ağırlıkları al
const weights = await getDynamicWeights();
// {
//   TUIK: 0.47,  // %95 doğruluk → artmış
//   WEB: 0.15,   // %50 doğruluk → azalmış
//   DB: 0.35,
//   AI: 0.10
// }

// Detaylı rapor
const report = await getSourceReliabilityReport();
for (const [source, reliability] of report) {
  console.log(`${source}: ${reliability.finalTrust}`);
}
```

**Validation Kaydı:**
```typescript
import { recordValidation } from '@/lib/market/trust-score';

// Gerçek fiyat bulunduğunda kaydet
await recordValidation('WEB', 'tavuk-eti', 95.0, 98.0);
// Sistem zamanla öğrenir ve WEB kaynağının güvenilirliğini ayarlar
```

### 6. Product Normalizer (`product-normalizer.ts`)

AI + Fuzzy matching + Dictionary pipeline.

```typescript
import { normalizeProductPipeline } from '@/lib/market/product-normalizer';

const result = await normalizeProductPipeline("Tavuk gogus 1kg");

// Sonuç:
// {
//   input: "Tavuk gogus 1kg",
//   canonical: "Tavuk Eti",
//   productKey: "tavuk-eti",
//   confidence: 0.95,
//   method: 'fuzzy',  // 'exact' | 'fuzzy' | 'ai' | 'fallback'
//   category: 'et',
//   variant: 'göğüs',
//   alternatives: ['Tavuk But', 'Tavuk Kanat'],
//   suggestions: ['Tavuk Eti (göğüs)', 'Tavuk Eti (but)']
// }
```

**Pipeline Adımları:**
1. ✅ Tidy text (trim, lowercase, clean)
2. ✅ Remove stop words
3. ✅ Dictionary lookup (exact match)
4. ✅ Fuzzy matching (Levenshtein distance)
5. ✅ AI classification (fallback)

### 7. Portion Calculator (`portion-calculator.ts`)

Catering özel gramaj/maliyet hesaplama.

```typescript
import { calculatePortionCost, quickCalculate } from '@/lib/market/portion-calculator';

// Manuel hesaplama
const portion = calculatePortionCost(
  95,      // 95 TL/kg
  'kg',    // birim
  250,     // 250 gram
  'g'      // porsiyon birimi
);
// => { costPerPortion: 23.75, breakdown: "250g × 95 TL/kg = 23.75 TL" }

// Standart porsiyon (hızlı)
const quickPortion = quickCalculate(95, 'kg', 'chicken_main');
// => 180g x 95 TL/kg = 17.10 TL (standart tavuk porsiyonu)

// Toplu hesaplama
const bulk = calculateBulkPortions(95, 'kg', 250, 'g', 100); // 100 kişilik
// => { totalCost: 2375 TL, servings: 100, totalQuantity: 25 kg }
```

**Standart Porsiyonlar:**
- `meat_main`: 150g (ana yemek et)
- `chicken_main`: 180g (ana yemek tavuk)
- `rice`: 80g (pilav)
- `soup`: 250ml (çorba)
- ... ve daha fazlası

### 8. Volatility Tracker (`volatility.ts`)

Fiyat değişkenliği ve trend analizi.

```typescript
import { analyzeVolatility, calculatePriceChange } from '@/lib/market/volatility';

const history = [
  { date: '2025-01-01', price: 90 },
  { date: '2025-01-08', price: 95 },
  { date: '2025-01-15', price: 93 },
  // ...
];

const volatility = analyzeVolatility(history);
// {
//   score: 0.35,  // 0-1 (yüksek = değişken)
//   trend: 'rising',
//   avgDailyChange: 2.5,  // %2.5
//   maxSpike: 8.2,        // %8.2
//   recommendation: "🔼 Şimdi alın: Fiyat stabil yükselişte"
// }

// Periyodik değişim
const change = calculatePriceChange(history, '7d');
// { amount: 5, percentage: 5.55, direction: 'up', period: '7d' }
```

**Volatility Badge:**
- 🟢 Stabil (< 0.3)
- 🔵 Normal (0.3-0.5)
- 🟡 Değişken (0.5-0.7)
- 🔴 Çok Değişken (> 0.7)

### 9. Database Migration (`migration.ts`)

Yeni özellikler için database güncellemeleri.

```typescript
import { runAllMigrations, checkMigrationStatus } from '@/lib/market/migration';

// Tüm migration'ları çalıştır
runAllMigrations();

// Durum kontrolü
const status = checkMigrationStatus();
console.log(status);
// {
//   market_prices_v2: true,
//   price_validations: true,
//   price_history: true,
//   product_catalog: true,
//   current_prices_view: true
// }
```

**Yeni Tablolar:**
- `market_prices_v2` - Gelişmiş fiyat tablosu (brand, packaging)
- `price_validations` - Trust score için validation geçmişi
- `price_history` - Volatility tracking için fiyat geçmişi
- `product_catalog` - Normalization için ürün kataloğu

---

## 🚀 Kullanım Örnekleri

### Örnek 1: Basit Fiyat Sorgulama

```typescript
// API çağrısı
const response = await fetch('/api/market/price', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ product: 'tavuk gogus' })
});

const result = await response.json();

// Sonuç:
// {
//   ok: true,
//   data: {
//     product_key: 'tavuk-eti',
//     unit: 'kg',
//     price: 95.50,
//     conf: 0.87,
//     
//     // YENİ: Detaylı confidence
//     confidenceBreakdown: {
//       category: 0.95,
//       variant: 0.75,
//       marketPrice: 0.90,
//       weighted: 0.87,
//       explanation: "Yüksek güven: 3 kaynak uyumlu"
//     },
//     
//     // YENİ: Marka bazlı fiyatlar
//     priceByBrand: [
//       { brand: 'Piliç Dünyası', price: 93.50, availability: 'in_stock' },
//       { brand: 'Banvit', price: 97.00, availability: 'in_stock' }
//     ],
//     
//     // YENİ: Volatility
//     volatility: {
//       score: 0.25,
//       trend: 'stable',
//       recommendation: "✅ İyi fiyat: Stabil piyasa"
//     },
//     
//     forecast: {
//       nextMonth: 97.50,
//       conf: 0.75,
//       method: 'exp_smoothing',
//       trend: 'rising'
//     }
//   },
//   
//   // YENİ: Detaylı normalizasyon bilgisi
//   normalized: {
//     product_key: 'tavuk-eti',
//     canonical: 'Tavuk Eti',
//     confidence: 0.95,
//     method: 'fuzzy',
//     category: 'et',
//     variant: 'göğüs'
//   }
// }
```

### Örnek 2: Porsiyon Maliyeti Hesaplama

```typescript
import { calculateMealCost } from '@/lib/market/portion-calculator';

// Tavuk sote maliyeti
const meal = calculateMealCost([
  { name: 'Tavuk Göğüs', unitPrice: 95, unit: 'kg', portionSize: 180, portionUnit: 'g' },
  { name: 'Soğan', unitPrice: 15, unit: 'kg', portionSize: 50, portionUnit: 'g' },
  { name: 'Biber', unitPrice: 35, unit: 'kg', portionSize: 30, portionUnit: 'g' },
  { name: 'Zeytinyağı', unitPrice: 285, unit: 'lt', portionSize: 20, portionUnit: 'ml' }
]);

console.log(meal.totalCostPerServing); // 19.55 TL/porsiyon
console.log(meal.breakdown);
// [
//   "Tavuk Göğüs: 180g × 95 TL/kg = 17.10 TL",
//   "Soğan: 50g × 15 TL/kg = 0.75 TL",
//   "Biber: 30g × 35 TL/kg = 1.05 TL",
//   "Zeytinyağı: 20ml × 285 TL/lt = 5.70 TL",
//   "TOPLAM: 19.55 TL"
// ]
```

### Örnek 3: Marka Karşılaştırma

```typescript
// Zeytinyağı markalarını karşılaştır
const response = await fetch('/api/market/price', {
  method: 'POST',
  body: JSON.stringify({ product: 'zeytinyagi 5lt' })
});

const { data } = await response.json();

// Marka fiyatlarını göster
data.priceByBrand?.forEach(brand => {
  console.log(`${brand.brand}: ${brand.price} TL`);
});

// Çıktı:
// Orkide: 165 TL
// Komili: 172 TL
// Yudum: 180 TL
```

### Örnek 4: Volatility İzleme

```typescript
import { analyzeVolatility } from '@/lib/market/volatility';
import { seriesOf } from '@/lib/market/provider/db';

// Son 90 günün fiyat geçmişi
const history = await seriesOf('domates', 90);

const volatility = analyzeVolatility(history);

if (volatility.score > 0.7) {
  console.log('⚠️ Fiyat çok değişken, bekleyin!');
} else if (volatility.trend === 'falling') {
  console.log('✅ Fırsat: Fiyat düşüyor!');
}

console.log(volatility.recommendation);
```

---

## 🔧 Migration Talimatları

### 1. Database Migration

Migration'ları otomatik çalıştırmak için:

```typescript
// Server başlangıcında (örn: layout.tsx veya middleware)
import { runAllMigrations } from '@/lib/market/migration';

// Production'da sadece bir kez çalıştır
if (process.env.NODE_ENV === 'production') {
  runAllMigrations();
}
```

### 2. Mevcut Kodu Güncelleme

**Eski kod:**
```typescript
import { fuse } from '@/lib/market/fuse';

const fusion = fuse(quotes);
```

**Yeni kod (tam özellik):**
```typescript
import { fuse } from '@/lib/market/fuse';

const fusion = await fuse(quotes, {
  enableValidation: true,
  enableBrandPrices: true,
  useDynamicTrust: true,
  priceHistory: await last12Months(product_key)
});
```

**Backward compatible (async değilse):**
```typescript
import { fuseSync } from '@/lib/market/fuse';

const fusion = fuseSync(quotes); // Eski API
```

---

## 📊 Performance Considerations

### Caching Strategy

Yeni sistemde cache'leme daha akıllı:

```typescript
// Cache key'e confidence ekle
const cacheKey = `${product_key}:${confidence > 0.8 ? 'high' : 'low'}`;

// Yüksek confidence = uzun TTL (24 saat)
// Düşük confidence = kısa TTL (1 saat)
const ttl = confidence > 0.8 ? 86400 : 3600;

await cacheSet(cacheKey, fusion, ttl);
```

### Database Indexing

Yeni indeksler:

```sql
-- Timeseries query'leri için
CREATE INDEX idx_market_prices_v2_timeseries 
  ON market_prices_v2(product_key, year_month, created_at);

-- Brand filtering için
CREATE INDEX idx_market_prices_v2_brand
  ON market_prices_v2(product_key, brand);
```

---

## 🧪 Test Örnekleri

### Unit Tests

```typescript
// price-guard.test.ts
import { validatePrice } from '@/lib/market/price-guard';

test('rejects zero price', () => {
  const quote = { unit_price: 0, /* ... */ };
  const result = validatePrice(quote);
  expect(result.isValid).toBe(false);
});

// unit-converter.test.ts
import { smartPriceExtraction } from '@/lib/market/unit-converter';

test('parses 18 LT bidon correctly', () => {
  const result = smartPriceExtraction("18 LT bidon", 450);
  expect(result.unitPrice).toBe(25);
  expect(result.standardUnit).toBe('lt');
});
```

---

## 🎨 UI Integration

### Confidence Badge

```tsx
import { getConfidenceBadge } from '@/lib/market/confidence';

function PriceDisplay({ fusion }: { fusion: MarketFusion }) {
  const badge = getConfidenceBadge(fusion.conf);
  
  return (
    <div>
      <span className="price">{fusion.price} TL</span>
      <span className={`badge badge-${badge.color}`}>
        {badge.emoji} {badge.label}
      </span>
    </div>
  );
}
```

### Volatility Indicator

```tsx
import { getVolatilityBadge } from '@/lib/market/volatility';

function VolatilityIndicator({ volatility }: { volatility: PriceVolatility }) {
  const badge = getVolatilityBadge(volatility.score);
  
  return (
    <div className="volatility-card">
      <div className="indicator">
        {badge.emoji} {badge.label}
      </div>
      <div className="recommendation">
        {volatility.recommendation}
      </div>
    </div>
  );
}
```

### Brand Comparison

```tsx
function BrandPriceList({ brands }: { brands: BrandPriceOption[] }) {
  const sorted = [...brands].sort((a, b) => a.price - b.price);
  
  return (
    <div className="brand-list">
      {sorted.map(brand => (
        <div key={brand.brand} className="brand-item">
          <span className="name">{brand.brand}</span>
          <span className="price">{brand.price} TL</span>
          <span className={`availability ${brand.availability}`}>
            {brand.availability === 'in_stock' ? '✅' : '⚠️'}
          </span>
        </div>
      ))}
    </div>
  );
}
```

---

## 🐛 Troubleshooting

### Migration Hatası

```typescript
import { getMigrationReport } from '@/lib/market/migration';

// Migration durumunu kontrol et
console.log(getMigrationReport());

// Eksik migration varsa
if (!status.market_prices_v2) {
  runAllMigrations();
}
```

### Trust Score Güncelleme

```typescript
import { getSourcePerformanceSummary } from '@/lib/market/trust-score';

// Kaynak performansını izle
console.log(await getSourcePerformanceSummary());

// Manuel validation ekle
await recordValidation('WEB', 'product-key', quotedPrice, actualPrice);
```

---

## 📈 Roadmap

### Gelecek Geliştirmeler

1. **Real-time WebSocket** - Canlı fiyat güncellemeleri
2. **ARIMA/SARIMA Forecasting** - Daha gelişmiş tahmin modelleri
3. **ML Price Prediction** - TensorFlow.js ile browser-side ML
4. **GraphQL API** - Daha esnek sorgulama
5. **Redis Cache** - Multi-level caching
6. **Notification System** - Fiyat alert'leri

---

## 📝 Changelog

### v2.0.0 (2025-01-15)

#### Added
- ✅ 3-seviye confidence breakdown sistemi
- ✅ PriceGuard validation engine
- ✅ Advanced unit normalization
- ✅ Dynamic trust scores
- ✅ Product normalization pipeline (AI + fuzzy)
- ✅ Portion calculator (catering özel)
- ✅ Price volatility tracking
- ✅ Brand-aware pricing
- ✅ Enhanced database schema

#### Changed
- 🔄 `fuse()` fonksiyonu async oldu (backward compatible `fuseSync()`)
- 🔄 API response'ları genişletildi (normalized, confidenceBreakdown, volatility)
- 🔄 Database schema güncellendi (market_prices_v2)

#### Deprecated
- ⚠️ `normalizeProductName()` yerine `normalizeProductPipeline()` kullanın

---

## 🤝 Contributing

Yeni özellik eklerken:

1. Schema'yı güncelle (`schema.ts`)
2. Helper fonksiyon yaz (örn: `my-feature.ts`)
3. Test ekle (`my-feature.test.ts`)
4. API'ye entegre et (`route.ts`)
5. Dokümantasyon güncelle (bu dosya)

---

## 📧 İletişim

Sorularınız için: [GitHub Issues](https://github.com/your-repo/issues)

---

**Son Güncelleme:** 2025-01-15
**Versiyon:** 2.0.0
**Durum:** ✅ Production Ready

