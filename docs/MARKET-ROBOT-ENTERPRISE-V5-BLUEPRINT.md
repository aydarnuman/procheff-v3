# 🏢 Market Robot Enterprise v5.0 - Comprehensive Blueprint

**Tarih**: 14 Kasım 2025
**Durum**: Design Phase → Awaiting Approval
**Hedef**: Kurumsal seviye ürün istihbaratı ve piyasa analiz sistemi

---

## 📋 İçindekiler

1. [Sistem Analizi](#1-sistem-analizi)
2. [Tespit Edilen Kritik Problemler](#2-tespit-edilen-kritik-problemler)
3. [3 Katmanlı Ürün Tespiti Sistemi](#3-3-katmanlı-ürün-tespiti-sistemi)
4. [AI Fiyat İstihbaratı - Enhanced](#4-ai-fiyat-istihbaratı---enhanced)
5. [Çok Boyutlu Market Skorlama](#5-çok-boyutlu-market-skorlama)
6. [Ürün Riski Analizi Modülü](#6-ürün-riski-analizi-modülü)
7. [Enhanced Veri Modelleri](#7-enhanced-veri-modelleri)
8. [API Endpoint Değişiklikleri](#8-api-endpoint-değişiklikleri)
9. [UI Component Blueprint](#9-ui-component-blueprint)
10. [Validation Schemas](#10-validation-schemas)
11. [Implementation Roadmap](#11-implementation-roadmap)

---

## 1. Sistem Analizi

### Mevcut Durum (v4.x)

**Güçlü Taraflar:**
- ✅ Multi-provider fusion engine (Web, AI, TÜİK, DB)
- ✅ Outlier detection (IQR method)
- ✅ Scraper health monitoring
- ✅ Basic confidence scoring (category, variant, market price)
- ✅ Product normalization pipeline (dictionary + fuzzy + AI)
- ✅ Price volatility tracking
- ✅ Brand-based price options

**Zayıf Taraflar:**
- ❌ **Kategori-varyant tutarsızlığı**: "salça" → variant: "yeşil mercimek"
- ❌ **Tek boyutlu market sıralaması**: Sadece fiyata göre
- ❌ **Fiyat güvenilirlik kaynağı eksik**: Hangi % market, hangi % AI?
- ❌ **Başarısız tarama nedenleri gizli**: "6/7 başarılı" ama neden başarısız?
- ❌ **Ürün riski analizi sığ**: Sadece volatilite, stok/tedarikçi riski yok
- ❌ **SKU-level tracking yok**: Tüm ürünler generic
- ❌ **Regional pricing support yok**: Bölgesel fiyat farkları takip edilmiyor

---

## 2. Tespit Edilen Kritik Problemler

### Problem #1: Kategori-Varyant Tutarsızlığı (CRITICAL)

**Senaryo:**
```typescript
Input: "salça"
Current Output:
  canonical: "Salça"
  category: "bakliyat"  ❌ YANLIŞ!
  variant: "yeşil mercimek"  ❌ YANLIŞ!
```

**Root Cause:**
- `extractVariant()` fonksiyonu input içinde tüm DB varyantlarını arıyor
- Kategori filtresi uygulanmıyor
- "yeşil" kelimesi input'ta varsa, mercimek varyantı "yeşil" ile eşleşiyor

**Çözüm:**
→ 3 Katmanlı Tespit Sistemi (bkz. Bölüm 3)

---

### Problem #2: Fiyat Güvenilirlik Kaynağı Belirsiz

**Senaryo:**
```typescript
confidence: 0.82
breakdown: {
  marketPrice: 0.85,
  sourceReliability: 0.80,
  // ❌ Ama bu 0.85'in kaynağı ne?
  // %50 market, %30 AI, %20 trend mi?
}
```

**Root Cause:**
- `fusion-engine.ts` çok kaynaklı veri birleştiriyor ama kaynak dağılımını saklıyor
- Kullanıcı "bu fiyat ne kadar gerçek market verisi?" sorusunu cevaplayamıyor

**Çözüm:**
→ Source Contribution Breakdown (bkz. Bölüm 4)

---

### Problem #3: Market Taraması Tek Boyutlu Sıralama

**Senaryo:**
```typescript
priceByBrand: [
  { brand: "Migros", price: 45.90 },  // En ucuz ama stok yok
  { brand: "A101", price: 48.50 },    // Pahalı ama güvenilir
]
// ❌ Sadece fiyata göre sıralanmış!
```

**Root Cause:**
- `extractBrandOptions()` sadece `avgPrice` ile sıralıyor
- Stok durumu, veri tamlığı, güvenilirlik hesaba katılmıyor

**Çözüm:**
→ Multi-Dimensional Market Scoring (bkz. Bölüm 5)

---

### Problem #4: Başarısız Tarama Nedenleri Gizli

**UI'da görülen:**
```
6/7 Başarılı Tarama
```

**Kullanıcı sorusu:**
"Kalan 1 market neden başarısız? Stok yok mu? API down mı?"

**Root Cause:**
- `MarketQuote` interface'inde failure reason yok
- Scraper hataları loglanıyor ama UI'a yansımıyor

**Çözüm:**
→ Failure Tracking + UI Feedback (bkz. Bölüm 7 ve 9)

---

### Problem #5: Ürün Riski Analizi Sığ

**Mevcut:**
```typescript
volatility: {
  score: 0.65,
  trend: 'rising'
}
```

**Eksik:**
- ❌ Stok riski (sık tükeniyor mu?)
- ❌ Tedarikçi konsantrasyonu (tek supplier'dan mı?)
- ❌ Sezonalite (mevsimsel fiyat değişimi)
- ❌ Genel risk skoru

**Çözüm:**
→ Comprehensive Risk Analysis Module (bkz. Bölüm 6)

---

## 3. 3 Katmanlı Ürün Tespiti Sistemi

### Mimari Overview

```
┌─────────────────────────────────────────────────────────┐
│                    INPUT LAYER                          │
│  User Input: "salça" / "domates salçası" / "salca"     │
└─────────────────┬───────────────────────────────────────┘
                  │
                  v
┌─────────────────────────────────────────────────────────┐
│              LAYER 1: NORMALIZATION                     │
│  • Text cleaning (stop words, typos)                   │
│  • Dictionary lookup (exact match)                     │
│  • Fuzzy matching (Levenshtein)                        │
│  • AI classification (fallback)                        │
│  Output: { canonical, productKey, confidence }         │
└─────────────────┬───────────────────────────────────────┘
                  │
                  v
┌─────────────────────────────────────────────────────────┐
│        LAYER 2: CATEGORY & ATTRIBUTE SET                │
│  • Category detection (semantic + dictionary)          │
│  • Attribute extraction (brand, size, type)            │
│  • Category-filtered variant matching                  │
│  • Consistency check (category ↔ variant)              │
│  Output: { category, attributes, validVariants[] }     │
└─────────────────┬───────────────────────────────────────┘
                  │
                  v
┌─────────────────────────────────────────────────────────┐
│         LAYER 3: SKU & MARKET MAPPING                   │
│  • SKU suggestion (brand × size × variant)             │
│  • Market availability check                           │
│  • Price range estimation                              │
│  • Regional mapping                                     │
│  Output: { skuOptions[], marketCoverage, priceRange }  │
└─────────────────────────────────────────────────────────┘
```

### Layer 1: Enhanced Normalization

**Mevcut sorun:**
```typescript
normalizeProductPipeline("salça")
// → { canonical: "Salça", variant: "yeşil mercimek" }  ❌
```

**Yeni yaklaşım:**
```typescript
// Step 1: Pure normalization (category-agnostic)
const normalized = await normalizeProductName("salça");
// → { canonical: "Domates Salçası", productKey: "domates-salcasi" }

// Step 2: Category detection ÖNCE yapılır
const category = await detectCategory(normalized.canonical, input);
// → { category: "soslar-salcalar", confidence: 0.95 }

// Step 3: Variant matching (CATEGORY-FILTERED)
const validVariants = getVariantsByCategory(category.category);
// → ["domates salçası", "biber salçası"] (mercimek YOK!)

const variant = extractVariant(input, validVariants);
// → "domates salçası" ✅
```

**Yeni interface:**
```typescript
interface NormalizedProductV2 {
  // Layer 1 outputs
  input: string;
  canonical: string;
  productKey: string;
  confidence: number;
  method: 'exact' | 'fuzzy' | 'ai' | 'fallback';

  // Layer 2 outputs (kategori kontrolü sonrası)
  category: string;
  categoryConfidence: number;
  attributes: {
    brand?: string;
    size?: string;
    packaging?: string;
    type?: string;  // "sızma", "rafine", etc.
  };

  // Validated variants (kategori içinde)
  variant?: string;
  validVariants: string[];  // Kategori-filtreli
  invalidVariantsRemoved?: string[];  // Debug için

  // Layer 3 outputs (SKU level)
  skuSuggestions?: SKUSuggestion[];
}

interface SKUSuggestion {
  sku: string;  // "taric-1kg-domates-salcasi"
  brand: string;
  size: string;
  unit: string;
  estimatedPrice: number;
  availability: 'high' | 'medium' | 'low';
  marketCoverage: number;  // Kaç markette mevcut (%)
}
```

### Layer 2: Category-Aware Attribute Extraction

**Yeni fonksiyon:**
```typescript
async function detectCategoryAndAttributes(
  canonical: string,
  rawInput: string
): Promise<CategoryResult> {
  // 1. Dictionary-based category lookup
  const dictCategory = PRODUCT_DB[productKey]?.category;

  // 2. Semantic similarity (eğer dictionary match yoksa)
  const semanticCategory = await classifyBySemantics(canonical);

  // 3. Attribute extraction
  const attributes = extractAttributes(rawInput, canonical);

  // 4. Category consistency check
  const isConsistent = validateCategoryAttributes(
    category,
    attributes
  );

  if (!isConsistent) {
    // Kategori-attribute uyumsuzluğu tespit edildi
    return {
      category: semanticCategory,
      attributes: {},
      warning: "Category-attribute mismatch detected"
    };
  }

  return {
    category: dictCategory || semanticCategory,
    categoryConfidence: dictCategory ? 0.95 : semanticCategory.confidence,
    attributes,
    consistencyCheck: 'passed'
  };
}
```

### Layer 3: SKU-Level Product Intelligence

**Yeni özellik: SKU suggestion engine**

```typescript
function generateSKUSuggestions(
  normalized: NormalizedProductV2
): SKUSuggestion[] {
  const { canonical, category, attributes, validVariants } = normalized;

  // Kombine et: brand × size × variant
  const combinations: SKUSuggestion[] = [];

  const commonBrands = getBrandsByCategory(category);
  const commonSizes = getSizesByCategory(category);

  for (const brand of commonBrands) {
    for (const size of commonSizes) {
      for (const variant of validVariants) {
        const sku = generateSKU(brand, size, variant);
        const availability = estimateAvailability(sku);

        combinations.push({
          sku,
          brand,
          size,
          unit: attributes.unit || 'kg',
          estimatedPrice: estimatePrice(sku),
          availability,
          marketCoverage: calculateMarketCoverage(sku)
        });
      }
    }
  }

  // Availability'ye göre sırala
  return combinations.sort((a, b) => {
    const scoreA = (
      (a.availability === 'high' ? 3 : a.availability === 'medium' ? 2 : 1) +
      a.marketCoverage
    );
    const scoreB = (
      (b.availability === 'high' ? 3 : b.availability === 'medium' ? 2 : 1) +
      b.marketCoverage
    );
    return scoreB - scoreA;
  }).slice(0, 10);  // Top 10 SKU
}
```

**Örnek output:**
```json
{
  "input": "salça",
  "canonical": "Domates Salçası",
  "category": "soslar-salcalar",
  "variant": "domates",
  "validVariants": ["domates", "biber", "ekşi"],
  "skuSuggestions": [
    {
      "sku": "taris-1kg-domates-salcasi",
      "brand": "Tariş",
      "size": "1kg",
      "estimatedPrice": 42.50,
      "availability": "high",
      "marketCoverage": 0.85
    },
    {
      "sku": "tukas-830g-domates-salcasi",
      "brand": "Tukaş",
      "size": "830g",
      "estimatedPrice": 38.90,
      "availability": "high",
      "marketCoverage": 0.78
    }
  ]
}
```

---

## 4. AI Fiyat İstihbaratı - Enhanced

### Source Contribution Breakdown

**Problem:**
Kullanıcı şu anda "confidence: 0.82" görüyor ama bu güvenin kaynağını bilmiyor.

**Çözüm:**
Her fiyat için kaynak dağılımını göster.

### Yeni Interface

```typescript
interface PriceIntelligence {
  finalPrice: number;
  currency: 'TRY';
  confidence: number;  // 0-1 (backward compatible)

  // 🔥 YENİ: Kaynak dağılımı
  sourceContribution: {
    realMarketData: {
      percentage: number;      // 0-100
      sourceCount: number;     // Kaç gerçek market
      avgPrice: number;
      weight: number;          // Fusion'daki ağırlık
    };
    aiEstimation: {
      percentage: number;
      model: string;           // "claude-sonnet-4"
      confidence: number;
      avgPrice: number;
      weight: number;
    };
    historicalTrend: {
      percentage: number;
      dataPoints: number;      // Kaç günlük veri
      trendDirection: 'rising' | 'falling' | 'stable';
      weight: number;
    };
    tuikData?: {
      percentage: number;
      lastUpdate: string;
      officialPrice: number;
      weight: number;
    };
  };

  // 🔥 YENİ: Veri tazeliği
  dataFreshness: {
    averageAge: number;        // hours
    oldestSource: string;      // "migros (3 days ago)"
    newestSource: string;      // "a101 (2 hours ago)"
    staleDataCount: number;    // > 7 days
  };

  // 🔥 YENİ: Tutarlılık skoru
  priceConsistency: {
    score: number;             // 0-1
    coefficientOfVariation: number;
    outlierCount: number;
    standardDeviation: number;
    explanation: string;
  };

  // Mevcut alanlar
  priceRange: { min: number; max: number; avg: number };
  volatility?: PriceVolatility;
}
```

### Hesaplama Algoritması

```typescript
function calculateSourceContribution(
  quotes: MarketQuote[]
): PriceIntelligence['sourceContribution'] {
  const realMarket = quotes.filter(q =>
    ['migros', 'a101', 'bim', 'sok', 'carrefour'].includes(q.source)
  );
  const ai = quotes.filter(q => q.source === 'ai');
  const historical = quotes.filter(q => q.source === 'DB');
  const tuik = quotes.filter(q => q.source === 'TUIK');

  // Weighted average kullanarak her kaynağın katkısını hesapla
  const totalWeight = quotes.reduce((sum, q) =>
    sum + (BASE_SOURCE_WEIGHTS[q.source] || 0.1), 0
  );

  return {
    realMarketData: {
      percentage: (realMarket.reduce((sum, q) =>
        sum + BASE_SOURCE_WEIGHTS[q.source], 0) / totalWeight) * 100,
      sourceCount: new Set(realMarket.map(q => q.source)).size,
      avgPrice: avg(realMarket.map(q => q.unit_price)),
      weight: realMarket.reduce((sum, q) =>
        sum + BASE_SOURCE_WEIGHTS[q.source], 0)
    },
    aiEstimation: {
      percentage: (ai.reduce((sum, q) =>
        sum + BASE_SOURCE_WEIGHTS[q.source], 0) / totalWeight) * 100,
      model: "claude-sonnet-4",
      confidence: ai[0]?.sourceTrust || 0,
      avgPrice: avg(ai.map(q => q.unit_price)),
      weight: ai.reduce((sum, q) =>
        sum + BASE_SOURCE_WEIGHTS[q.source], 0)
    },
    historicalTrend: {
      percentage: (historical.reduce((sum, q) =>
        sum + BASE_SOURCE_WEIGHTS[q.source], 0) / totalWeight) * 100,
      dataPoints: historical.length,
      trendDirection: determineTrend(historical),
      weight: historical.reduce((sum, q) =>
        sum + BASE_SOURCE_WEIGHTS[q.source], 0)
    },
    tuikData: tuik.length > 0 ? {
      percentage: (tuik.reduce((sum, q) =>
        sum + BASE_SOURCE_WEIGHTS[q.source], 0) / totalWeight) * 100,
      lastUpdate: tuik[0].asOf,
      officialPrice: tuik[0].unit_price,
      weight: tuik.reduce((sum, q) =>
        sum + BASE_SOURCE_WEIGHTS[q.source], 0)
    } : undefined
  };
}
```

---

## 5. Çok Boyutlu Market Skorlama

### Mevcut Sorun

```typescript
// Sadece fiyata göre sıralama
priceByBrand.sort((a, b) => a.avgPrice - b.avgPrice);
```

### Yeni Yaklaşım: Multi-Dimensional Scoring

**Skor formülü:**
```
MarketScore = (
  priceScore      × 0.35 +
  reliabilityScore × 0.25 +
  completenessScore × 0.15 +
  stockScore      × 0.15 +
  recencyScore    × 0.10
)
```

### Yeni Interface

```typescript
interface MarketQuoteV2 extends MarketQuote {
  // 🔥 YENİ: Multi-dimensional scoring
  marketScore?: {
    overall: number;         // 0-100
    priceScore: number;      // Fiyat rekabetçiliği
    reliabilityScore: number; // Kaynak güvenilirliği
    completenessScore: number; // Veri tamlığı
    stockScore: number;      // Stok durumu
    recencyScore: number;    // Veri güncelliği
    breakdown: string;       // Açıklama
  };

  // 🔥 YENİ: Failure tracking
  fetchStatus: 'success' | 'partial' | 'failed';
  failureReason?: 'timeout' | 'not_found' | 'out_of_stock' | 'api_error' | 'parsing_error';
  failureDetails?: string;

  // 🔥 YENİ: Data completeness
  dataCompleteness: {
    hasPrice: boolean;
    hasBrand: boolean;
    hasStock: boolean;
    hasImage: boolean;
    completenessScore: number;  // 0-1
  };

  // 🔥 YENİ: Regional pricing (opsiyonel)
  regionalPricing?: {
    region: string;  // "Marmara", "Ege", etc.
    city?: string;
    priceVariation: number;  // % fark (ülke ortalamasına göre)
  };
}
```

### Skorlama Fonksiyonları

```typescript
/**
 * Price Score: En düşük fiyat 100, en yüksek 0
 */
function calculatePriceScore(
  price: number,
  minPrice: number,
  maxPrice: number
): number {
  if (maxPrice === minPrice) return 100;

  // Normalize: en düşük fiyat = 100, en yüksek = 0
  const normalized = 1 - (price - minPrice) / (maxPrice - minPrice);
  return normalized * 100;
}

/**
 * Reliability Score: Kaynak güvenilirliği + scraper health
 */
function calculateReliabilityScore(quote: MarketQuote): number {
  const baseReliability = BASE_SOURCE_WEIGHTS[quote.source] || 0.1;
  const sourceTrust = quote.sourceTrust || 0.5;

  // Scraper health check
  const scraperName = getScraperName(quote.source);
  const health = scraperHealthMonitor.getHealth(scraperName);

  let healthMultiplier = 1.0;
  if (health) {
    if (health.status === 'healthy') healthMultiplier = 1.2;
    else if (health.status === 'degraded') healthMultiplier = 0.8;
    else if (health.status === 'down') healthMultiplier = 0.5;
  }

  const finalScore = (
    (baseReliability * 0.4) +
    (sourceTrust * 0.4) +
    ((health?.successRate || 50) / 100 * 0.2)
  ) * healthMultiplier;

  return Math.min(finalScore * 100, 100);
}

/**
 * Completeness Score: Veri tamlığı
 */
function calculateCompletenessScore(quote: MarketQuoteV2): number {
  const weights = {
    hasPrice: 0.4,     // En önemli
    hasBrand: 0.2,
    hasStock: 0.2,
    hasImage: 0.1,
    hasQuantity: 0.1
  };

  let score = 0;
  if (quote.unit_price) score += weights.hasPrice;
  if (quote.brand) score += weights.hasBrand;
  if (quote.stock_status) score += weights.hasStock;
  if (quote.meta?.image) score += weights.hasImage;
  if (quote.quantity) score += weights.hasQuantity;

  return score * 100;
}

/**
 * Stock Score: Stok durumu
 */
function calculateStockScore(quote: MarketQuote): number {
  const status = quote.stock_status || 'in_stock';

  if (status === 'in_stock') return 100;
  if (status === 'limited') return 50;
  return 0;  // out_of_stock
}

/**
 * Recency Score: Veri güncelliği
 */
function calculateRecencyScore(quote: MarketQuote): number {
  const now = new Date();
  const quoteDate = new Date(quote.asOf);
  const ageHours = (now.getTime() - quoteDate.getTime()) / (1000 * 60 * 60);

  // 0-24 hours: 100
  // 24-72 hours: 75
  // 72-168 hours: 50
  // > 168 hours: 25

  if (ageHours <= 24) return 100;
  if (ageHours <= 72) return 75;
  if (ageHours <= 168) return 50;
  return 25;
}

/**
 * Overall Market Score
 */
export function calculateMarketScore(
  quote: MarketQuoteV2,
  allQuotes: MarketQuoteV2[]
): MarketQuoteV2['marketScore'] {
  const prices = allQuotes.map(q => q.unit_price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const priceScore = calculatePriceScore(quote.unit_price, minPrice, maxPrice);
  const reliabilityScore = calculateReliabilityScore(quote);
  const completenessScore = calculateCompletenessScore(quote);
  const stockScore = calculateStockScore(quote);
  const recencyScore = calculateRecencyScore(quote);

  const overall = (
    priceScore * 0.35 +
    reliabilityScore * 0.25 +
    completenessScore * 0.15 +
    stockScore * 0.15 +
    recencyScore * 0.10
  );

  return {
    overall: Number(overall.toFixed(2)),
    priceScore: Number(priceScore.toFixed(2)),
    reliabilityScore: Number(reliabilityScore.toFixed(2)),
    completenessScore: Number(completenessScore.toFixed(2)),
    stockScore: Number(stockScore.toFixed(2)),
    recencyScore: Number(recencyScore.toFixed(2)),
    breakdown: generateScoreBreakdown(overall, {
      priceScore,
      reliabilityScore,
      completenessScore,
      stockScore,
      recencyScore
    })
  };
}

function generateScoreBreakdown(overall: number, scores: any): string {
  const parts: string[] = [];

  if (scores.priceScore >= 80) parts.push("rekabetçi fiyat");
  else if (scores.priceScore <= 40) parts.push("yüksek fiyat");

  if (scores.reliabilityScore >= 80) parts.push("yüksek güvenilirlik");
  else if (scores.reliabilityScore <= 50) parts.push("düşük güvenilirlik");

  if (scores.stockScore === 100) parts.push("stokta mevcut");
  else if (scores.stockScore === 0) parts.push("stok yok");

  if (scores.recencyScore >= 90) parts.push("güncel veri");
  else if (scores.recencyScore <= 40) parts.push("eski veri");

  const tier = overall >= 80 ? "Mükemmel" :
               overall >= 65 ? "İyi" :
               overall >= 50 ? "Orta" : "Zayıf";

  return `${tier} (${overall.toFixed(0)}/100): ${parts.join(", ")}`;
}
```

### Örnek Kullanım

```typescript
// Tüm marketlere skor hesapla
const scoredQuotes = allQuotes.map(quote => ({
  ...quote,
  marketScore: calculateMarketScore(quote, allQuotes)
}));

// Multi-dimensional score'a göre sırala
scoredQuotes.sort((a, b) =>
  (b.marketScore?.overall || 0) - (a.marketScore?.overall || 0)
);
```

**Örnek output:**
```json
[
  {
    "source": "migros",
    "unit_price": 47.90,
    "stock_status": "in_stock",
    "asOf": "2025-11-14T10:30:00Z",
    "marketScore": {
      "overall": 85.3,
      "priceScore": 72.0,
      "reliabilityScore": 95.0,
      "completenessScore": 90.0,
      "stockScore": 100.0,
      "recencyScore": 100.0,
      "breakdown": "Mükemmel (85/100): yüksek güvenilirlik, stokta mevcut, güncel veri"
    }
  },
  {
    "source": "a101",
    "unit_price": 45.50,
    "stock_status": "limited",
    "asOf": "2025-11-12T08:00:00Z",
    "marketScore": {
      "overall": 71.8,
      "priceScore": 100.0,
      "reliabilityScore": 70.0,
      "completenessScore": 60.0,
      "stockScore": 50.0,
      "recencyScore": 50.0,
      "breakdown": "İyi (72/100): rekabetçi fiyat, sınırlı stok, eski veri"
    }
  }
]
```

---

## 6. Ürün Riski Analizi Modülü

### Risk Kategorileri

1. **Price Volatility Risk** (Fiyat Oynaklığı)
2. **Stock Availability Risk** (Stok Riski)
3. **Supplier Concentration Risk** (Tedarikçi Konsantrasyonu)
4. **Seasonality Risk** (Mevsimsellik)
5. **Data Quality Risk** (Veri Kalitesi)

### Yeni Interface

```typescript
interface ProductRiskAnalysis {
  overallRiskScore: number;  // 0-100 (düşük = iyi)
  riskLevel: 'low' | 'medium' | 'high' | 'critical';

  risks: {
    priceVolatility: {
      score: number;           // 0-100
      level: 'low' | 'medium' | 'high';
      stdDev: number;          // TL
      coefficientOfVariation: number;
      trend: 'rising' | 'falling' | 'stable';
      maxSpike: number;        // %
      recommendation: string;
    };

    stockAvailability: {
      score: number;
      level: 'low' | 'medium' | 'high';
      availabilityRate: number;  // % (son 30 gün)
      avgStockDuration: number;  // hours
      frequentOutages: boolean;
      affectedMarkets: string[];
      recommendation: string;
    };

    supplierConcentration: {
      score: number;
      level: 'low' | 'medium' | 'high';
      dominantSupplier?: string;
      marketShare: number;      // % (tek supplier'ın)
      diversificationIndex: number;  // Herfindahl index
      recommendation: string;
    };

    seasonality: {
      score: number;
      level: 'low' | 'medium' | 'high';
      isSeasonal: boolean;
      peakMonths?: string[];
      priceVariation: number;   // % (sezon içi/dışı fark)
      currentPhase: 'peak' | 'off-peak' | 'transitioning';
      recommendation: string;
    };

    dataQuality: {
      score: number;
      level: 'low' | 'medium' | 'high';
      completeness: number;     // %
      freshness: number;        // %
      consistency: number;      // %
      sourceReliability: number; // %
      recommendation: string;
    };
  };

  alerts: RiskAlert[];
  mitigationStrategies: string[];
  lastUpdated: string;
}

interface RiskAlert {
  severity: 'info' | 'warning' | 'critical';
  category: string;
  message: string;
  actionable: boolean;
  suggestedAction?: string;
}
```

### Risk Hesaplama Fonksiyonları

```typescript
/**
 * 1. Price Volatility Risk
 */
function calculatePriceVolatilityRisk(
  priceHistory: Array<{ date: string; price: number }>
): ProductRiskAnalysis['risks']['priceVolatility'] {
  const prices = priceHistory.map(h => h.price);
  const mean = prices.reduce((s, p) => s + p, 0) / prices.length;
  const variance = prices.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean;

  // Max spike calculation
  const dailyChanges = [];
  for (let i = 1; i < prices.length; i++) {
    const change = ((prices[i] - prices[i - 1]) / prices[i - 1]) * 100;
    dailyChanges.push(Math.abs(change));
  }
  const maxSpike = Math.max(...dailyChanges);

  // Risk score (CV-based)
  let score = 0;
  if (cv < 0.1) score = 10;       // Düşük risk
  else if (cv < 0.2) score = 30;  // Orta-düşük risk
  else if (cv < 0.35) score = 60; // Orta-yüksek risk
  else score = 90;                // Yüksek risk

  // Trend
  const trend = determineTrend(priceHistory);

  // Recommendation
  let recommendation = "";
  if (score < 30) {
    recommendation = "Fiyat istikrarlı. Şimdi alın veya sözleşme yapın.";
  } else if (score < 60) {
    recommendation = "Orta seviye volatilite. Kısa vadeli alım önerilir.";
  } else {
    recommendation = "Yüksek volatilite. Spot alım riskli, alternatif ürünler değerlendirin.";
  }

  return {
    score,
    level: score < 35 ? 'low' : score < 65 ? 'medium' : 'high',
    stdDev: Number(stdDev.toFixed(2)),
    coefficientOfVariation: Number(cv.toFixed(3)),
    trend,
    maxSpike: Number(maxSpike.toFixed(2)),
    recommendation
  };
}

/**
 * 2. Stock Availability Risk
 */
function calculateStockAvailabilityRisk(
  stockHistory: Array<{ date: string; status: string; market: string }>
): ProductRiskAnalysis['risks']['stockAvailability'] {
  const inStockCount = stockHistory.filter(h =>
    h.status === 'in_stock' || h.status === 'available'
  ).length;

  const availabilityRate = (inStockCount / stockHistory.length) * 100;

  // Frequent outages check (son 30 günde 5+ kez tükenen)
  const outages = stockHistory.filter(h => h.status === 'out_of_stock');
  const frequentOutages = outages.length >= 5;

  // Affected markets
  const affectedMarkets = [...new Set(outages.map(h => h.market))];

  // Risk score
  let score = 0;
  if (availabilityRate >= 90) score = 10;
  else if (availabilityRate >= 70) score = 40;
  else if (availabilityRate >= 50) score = 70;
  else score = 95;

  if (frequentOutages) score += 15;  // Penalty

  let recommendation = "";
  if (score < 30) {
    recommendation = "Stok durumu iyi. Güvenle tedarik edilebilir.";
  } else if (score < 60) {
    recommendation = "Ara sıra stok problemi yaşanıyor. Yedek tedarikçi bulundurun.";
  } else {
    recommendation = "Kritik stok riski! Alternatif ürün veya tedarikçi bulun.";
  }

  return {
    score: Math.min(score, 100),
    level: score < 35 ? 'low' : score < 65 ? 'medium' : 'high',
    availabilityRate: Number(availabilityRate.toFixed(2)),
    avgStockDuration: calculateAvgStockDuration(stockHistory),
    frequentOutages,
    affectedMarkets,
    recommendation
  };
}

/**
 * 3. Supplier Concentration Risk (Herfindahl-Hirschman Index)
 */
function calculateSupplierConcentrationRisk(
  quotes: MarketQuote[]
): ProductRiskAnalysis['risks']['supplierConcentration'] {
  // Market share hesapla
  const marketShares = new Map<string, number>();

  for (const quote of quotes) {
    const market = quote.source;
    marketShares.set(market, (marketShares.get(market) || 0) + 1);
  }

  // HHI (Herfindahl-Hirschman Index)
  let hhi = 0;
  const totalQuotes = quotes.length;

  for (const [market, count] of marketShares.entries()) {
    const share = (count / totalQuotes) * 100;
    hhi += Math.pow(share, 2);
  }

  // HHI interpretation:
  // < 1500: Competitive market (low risk)
  // 1500-2500: Moderate concentration (medium risk)
  // > 2500: High concentration (high risk)

  let score = 0;
  if (hhi < 1500) score = 20;
  else if (hhi < 2500) score = 50;
  else score = 85;

  // Dominant supplier
  let dominantSupplier: string | undefined;
  let maxShare = 0;

  for (const [market, count] of marketShares.entries()) {
    const share = (count / totalQuotes) * 100;
    if (share > maxShare) {
      maxShare = share;
      dominantSupplier = market;
    }
  }

  let recommendation = "";
  if (score < 35) {
    recommendation = "Piyasa dengeli. Tedarik zinciri çeşitlendirilmiş.";
  } else if (score < 65) {
    recommendation = `${dominantSupplier} baskın (%${maxShare.toFixed(0)}). İkinci kaynak oluşturun.`;
  } else {
    recommendation = `Kritik bağımlılık (${dominantSupplier}, %${maxShare.toFixed(0)})! Acil çeşitlendirme gerekli.`;
  }

  return {
    score,
    level: score < 35 ? 'low' : score < 65 ? 'medium' : 'high',
    dominantSupplier: maxShare > 40 ? dominantSupplier : undefined,
    marketShare: Number(maxShare.toFixed(2)),
    diversificationIndex: Number((10000 / hhi).toFixed(2)),  // Normalized HHI
    recommendation
  };
}

/**
 * 4. Seasonality Risk
 */
function calculateSeasonalityRisk(
  priceHistory: Array<{ date: string; price: number }>
): ProductRiskAnalysis['risks']['seasonality'] {
  // Group by month
  const monthlyPrices = new Map<number, number[]>();

  for (const record of priceHistory) {
    const month = new Date(record.date).getMonth();
    if (!monthlyPrices.has(month)) {
      monthlyPrices.set(month, []);
    }
    monthlyPrices.get(month)!.push(record.price);
  }

  // Calculate monthly averages
  const monthlyAvgs = Array.from(monthlyPrices.entries()).map(([month, prices]) => ({
    month,
    avgPrice: prices.reduce((s, p) => s + p, 0) / prices.length
  }));

  // Variance check
  const overallAvg = monthlyAvgs.reduce((s, m) => s + m.avgPrice, 0) / monthlyAvgs.length;
  const variance = monthlyAvgs.reduce((s, m) =>
    s + Math.pow(m.avgPrice - overallAvg, 2), 0
  ) / monthlyAvgs.length;
  const cv = Math.sqrt(variance) / overallAvg;

  // Seasonality detection
  const isSeasonal = cv > 0.15;  // %15+ variation = seasonal

  // Peak months (top 3 most expensive months)
  const peakMonths = monthlyAvgs
    .sort((a, b) => b.avgPrice - a.avgPrice)
    .slice(0, 3)
    .map(m => getMonthName(m.month));

  // Current phase
  const currentMonth = new Date().getMonth();
  const currentAvg = monthlyPrices.get(currentMonth)?.[0] || overallAvg;
  const isPeak = currentAvg > overallAvg * 1.1;

  // Risk score
  let score = 0;
  if (!isSeasonal) score = 10;
  else if (cv < 0.25) score = 40;
  else score = 75;

  let recommendation = "";
  if (!isSeasonal) {
    recommendation = "Mevsimsel etki yok. Yıl boyunca stabil fiyat.";
  } else if (isPeak) {
    recommendation = `Şu an zirve dönem (${getMonthName(currentMonth)}). Mümkünse alımı erteleyin.`;
  } else {
    recommendation = `Mevsimsel ürün. Zirve aylar: ${peakMonths.join(", ")}. O dönemlerde stok yapın.`;
  }

  return {
    score,
    level: score < 35 ? 'low' : score < 65 ? 'medium' : 'high',
    isSeasonal,
    peakMonths: isSeasonal ? peakMonths : undefined,
    priceVariation: Number((cv * 100).toFixed(2)),
    currentPhase: isPeak ? 'peak' : 'off-peak',
    recommendation
  };
}

/**
 * 5. Data Quality Risk
 */
function calculateDataQualityRisk(
  quotes: MarketQuoteV2[]
): ProductRiskAnalysis['risks']['dataQuality'] {
  // Completeness
  const completeness = quotes.reduce((sum, q) =>
    sum + (q.dataCompleteness?.completenessScore || 0), 0
  ) / quotes.length * 100;

  // Freshness
  const now = new Date();
  const avgAge = quotes.reduce((sum, q) => {
    const age = (now.getTime() - new Date(q.asOf).getTime()) / (1000 * 60 * 60);
    return sum + age;
  }, 0) / quotes.length;

  const freshness = avgAge < 24 ? 100 :
                     avgAge < 72 ? 75 :
                     avgAge < 168 ? 50 : 25;

  // Consistency (price variance)
  const prices = quotes.map(q => q.unit_price);
  const mean = prices.reduce((s, p) => s + p, 0) / prices.length;
  const cv = Math.sqrt(
    prices.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / prices.length
  ) / mean;

  const consistency = cv < 0.15 ? 100 :
                       cv < 0.30 ? 75 :
                       cv < 0.50 ? 50 : 25;

  // Source reliability
  const sourceReliability = quotes.reduce((sum, q) =>
    sum + (BASE_SOURCE_WEIGHTS[q.source] || 0.1), 0
  ) / quotes.length * 100;

  // Overall score (lower = higher risk)
  const avgQuality = (completeness + freshness + consistency + sourceReliability) / 4;
  const score = 100 - avgQuality;  // Invert (düşük kalite = yüksek risk)

  let recommendation = "";
  if (score < 30) {
    recommendation = "Veri kalitesi mükemmel. Güvenle kullanılabilir.";
  } else if (score < 60) {
    recommendation = "Veri kalitesi orta. Ek doğrulama yapın.";
  } else {
    recommendation = "Düşük veri kalitesi! Alternatif kaynaklardan doğrulayın.";
  }

  return {
    score,
    level: score < 35 ? 'low' : score < 65 ? 'medium' : 'high',
    completeness: Number(completeness.toFixed(2)),
    freshness: Number(freshness.toFixed(2)),
    consistency: Number(consistency.toFixed(2)),
    sourceReliability: Number(sourceReliability.toFixed(2)),
    recommendation
  };
}

/**
 * Overall Risk Analysis
 */
export function analyzeProductRisk(
  quotes: MarketQuoteV2[],
  priceHistory: Array<{ date: string; price: number }>,
  stockHistory: Array<{ date: string; status: string; market: string }>
): ProductRiskAnalysis {
  const priceVolatility = calculatePriceVolatilityRisk(priceHistory);
  const stockAvailability = calculateStockAvailabilityRisk(stockHistory);
  const supplierConcentration = calculateSupplierConcentrationRisk(quotes);
  const seasonality = calculateSeasonalityRisk(priceHistory);
  const dataQuality = calculateDataQualityRisk(quotes);

  // Weighted overall risk
  const overallRiskScore = (
    priceVolatility.score * 0.25 +
    stockAvailability.score * 0.25 +
    supplierConcentration.score * 0.20 +
    seasonality.score * 0.15 +
    dataQuality.score * 0.15
  );

  const riskLevel = overallRiskScore < 35 ? 'low' :
                     overallRiskScore < 60 ? 'medium' :
                     overallRiskScore < 80 ? 'high' : 'critical';

  // Generate alerts
  const alerts: RiskAlert[] = [];

  if (priceVolatility.level === 'high') {
    alerts.push({
      severity: 'warning',
      category: 'Fiyat Oynaklığı',
      message: `Yüksek fiyat oynaklığı tespit edildi (CV: ${priceVolatility.coefficientOfVariation})`,
      actionable: true,
      suggestedAction: priceVolatility.recommendation
    });
  }

  if (stockAvailability.level === 'high') {
    alerts.push({
      severity: 'critical',
      category: 'Stok Riski',
      message: `Stok bulunabilirliği düşük (%${stockAvailability.availabilityRate})`,
      actionable: true,
      suggestedAction: stockAvailability.recommendation
    });
  }

  if (supplierConcentration.level === 'high' && supplierConcentration.dominantSupplier) {
    alerts.push({
      severity: 'warning',
      category: 'Tedarikçi Riski',
      message: `Tek tedarikçiye yüksek bağımlılık (${supplierConcentration.dominantSupplier}, %${supplierConcentration.marketShare})`,
      actionable: true,
      suggestedAction: supplierConcentration.recommendation
    });
  }

  // Mitigation strategies
  const mitigationStrategies: string[] = [];

  if (overallRiskScore >= 60) {
    mitigationStrategies.push("Alternatif ürün veya tedarikçi araştırın");
    mitigationStrategies.push("Stok politikasını gözden geçirin");
    mitigationStrategies.push("Spot alım yerine sözleşme yapmayı değerlendirin");
  }

  if (seasonality.isSeasonal && seasonality.currentPhase === 'peak') {
    mitigationStrategies.push(`Zirve dönem dışında (${seasonality.peakMonths?.join(", ")}) stok yapın`);
  }

  if (supplierConcentration.level === 'high') {
    mitigationStrategies.push("Tedarik zincirini çeşitlendirin (en az 2-3 kaynak)");
  }

  return {
    overallRiskScore: Number(overallRiskScore.toFixed(2)),
    riskLevel,
    risks: {
      priceVolatility,
      stockAvailability,
      supplierConcentration,
      seasonality,
      dataQuality
    },
    alerts,
    mitigationStrategies,
    lastUpdated: new Date().toISOString()
  };
}
```

---

## 7. Enhanced Veri Modelleri

### TypeScript Interfaces (schema.ts)

```typescript
// ===== ENHANCED MARKET QUOTE =====
export interface MarketQuoteV2 extends MarketQuote {
  // Multi-dimensional scoring
  marketScore?: {
    overall: number;
    priceScore: number;
    reliabilityScore: number;
    completenessScore: number;
    stockScore: number;
    recencyScore: number;
    breakdown: string;
  };

  // Failure tracking
  fetchStatus: 'success' | 'partial' | 'failed';
  failureReason?: 'timeout' | 'not_found' | 'out_of_stock' | 'api_error' | 'parsing_error';
  failureDetails?: string;

  // Data completeness
  dataCompleteness: {
    hasPrice: boolean;
    hasBrand: boolean;
    hasStock: boolean;
    hasImage: boolean;
    completenessScore: number;
  };

  // Regional pricing
  regionalPricing?: {
    region: string;
    city?: string;
    priceVariation: number;
  };
}

// ===== ENHANCED MARKET FUSION =====
export interface MarketFusionV2 extends MarketFusion {
  // Price intelligence
  priceIntelligence: {
    sourceContribution: {
      realMarketData: {
        percentage: number;
        sourceCount: number;
        avgPrice: number;
        weight: number;
      };
      aiEstimation: {
        percentage: number;
        model: string;
        confidence: number;
        avgPrice: number;
        weight: number;
      };
      historicalTrend: {
        percentage: number;
        dataPoints: number;
        trendDirection: 'rising' | 'falling' | 'stable';
        weight: number;
      };
      tuikData?: {
        percentage: number;
        lastUpdate: string;
        officialPrice: number;
        weight: number;
      };
    };
    dataFreshness: {
      averageAge: number;
      oldestSource: string;
      newestSource: string;
      staleDataCount: number;
    };
    priceConsistency: {
      score: number;
      coefficientOfVariation: number;
      outlierCount: number;
      standardDeviation: number;
      explanation: string;
    };
  };

  // Risk analysis
  riskAnalysis?: ProductRiskAnalysis;

  // Enhanced brand options (with scores)
  priceByBrandV2?: Array<{
    brand: string;
    avgPrice: number;
    marketScore: number;
    availability: string;
    source: Source;
    lastUpdated: string;
  }>;

  // Scan summary
  scanSummary: {
    totalScanned: number;
    successful: number;
    failed: number;
    failureReasons: Array<{
      source: Source;
      reason: string;
      details?: string;
    }>;
  };
}

// ===== NORMALIZED PRODUCT V2 =====
export interface NormalizedProductV2 {
  // Layer 1
  input: string;
  canonical: string;
  productKey: string;
  confidence: number;
  method: 'exact' | 'fuzzy' | 'ai' | 'fallback';

  // Layer 2
  category: string;
  categoryConfidence: number;
  attributes: {
    brand?: string;
    size?: string;
    packaging?: string;
    type?: string;
  };
  variant?: string;
  validVariants: string[];
  invalidVariantsRemoved?: string[];

  // Layer 3
  skuSuggestions?: Array<{
    sku: string;
    brand: string;
    size: string;
    unit: string;
    estimatedPrice: number;
    availability: 'high' | 'medium' | 'low';
    marketCoverage: number;
  }>;
}

// ===== PRODUCT RISK ANALYSIS =====
export interface ProductRiskAnalysis {
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  risks: {
    priceVolatility: {
      score: number;
      level: 'low' | 'medium' | 'high';
      stdDev: number;
      coefficientOfVariation: number;
      trend: 'rising' | 'falling' | 'stable';
      maxSpike: number;
      recommendation: string;
    };
    stockAvailability: {
      score: number;
      level: 'low' | 'medium' | 'high';
      availabilityRate: number;
      avgStockDuration: number;
      frequentOutages: boolean;
      affectedMarkets: string[];
      recommendation: string;
    };
    supplierConcentration: {
      score: number;
      level: 'low' | 'medium' | 'high';
      dominantSupplier?: string;
      marketShare: number;
      diversificationIndex: number;
      recommendation: string;
    };
    seasonality: {
      score: number;
      level: 'low' | 'medium' | 'high';
      isSeasonal: boolean;
      peakMonths?: string[];
      priceVariation: number;
      currentPhase: 'peak' | 'off-peak' | 'transitioning';
      recommendation: string;
    };
    dataQuality: {
      score: number;
      level: 'low' | 'medium' | 'high';
      completeness: number;
      freshness: number;
      consistency: number;
      sourceReliability: number;
      recommendation: string;
    };
  };
  alerts: Array<{
    severity: 'info' | 'warning' | 'critical';
    category: string;
    message: string;
    actionable: boolean;
    suggestedAction?: string;
  }>;
  mitigationStrategies: string[];
  lastUpdated: string;
}
```

---

## 8. API Endpoint Değişiklikleri

### 8.1. `/api/market/price` (Enhanced)

**Request:**
```typescript
POST /api/market/price
{
  "product": "domates salçası",
  "unit": "kg",
  "includeRiskAnalysis": true,  // 🔥 YENİ
  "includeSKUSuggestions": true, // 🔥 YENİ
  "includeRegionalPricing": false
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    // Normalized product (3-layer)
    "normalized": {
      "input": "domates salçası",
      "canonical": "Domates Salçası",
      "productKey": "domates-salcasi",
      "confidence": 0.95,
      "method": "exact",
      "category": "soslar-salcalar",
      "categoryConfidence": 0.95,
      "variant": "domates",
      "validVariants": ["domates", "biber", "ekşi"],
      "skuSuggestions": [
        {
          "sku": "taris-1kg-domates-salcasi",
          "brand": "Tariş",
          "size": "1kg",
          "estimatedPrice": 42.50,
          "availability": "high",
          "marketCoverage": 0.85
        }
      ]
    },

    // Market fusion (enhanced)
    "fusion": {
      "product_key": "domates-salcasi",
      "price": 43.20,
      "unit": "kg",
      "conf": 0.87,
      "sources": [...],

      // 🔥 YENİ: Price intelligence
      "priceIntelligence": {
        "sourceContribution": {
          "realMarketData": {
            "percentage": 62,
            "sourceCount": 5,
            "avgPrice": 43.80,
            "weight": 2.5
          },
          "aiEstimation": {
            "percentage": 28,
            "model": "claude-sonnet-4",
            "confidence": 0.75,
            "avgPrice": 41.50,
            "weight": 1.2
          },
          "historicalTrend": {
            "percentage": 10,
            "dataPoints": 30,
            "trendDirection": "stable",
            "weight": 0.5
          }
        },
        "dataFreshness": {
          "averageAge": 12,
          "oldestSource": "bim (2 days ago)",
          "newestSource": "migros (1 hour ago)",
          "staleDataCount": 0
        },
        "priceConsistency": {
          "score": 0.88,
          "coefficientOfVariation": 0.12,
          "outlierCount": 1,
          "standardDeviation": 5.2,
          "explanation": "Yüksek tutarlılık: fiyatlar %12 varyans içinde"
        }
      },

      // 🔥 YENİ: Enhanced brand options (with scores)
      "priceByBrandV2": [
        {
          "brand": "Migros",
          "avgPrice": 47.90,
          "marketScore": 85.3,
          "availability": "in_stock",
          "source": "migros",
          "lastUpdated": "2025-11-14T10:30:00Z"
        },
        {
          "brand": "A101",
          "avgPrice": 45.50,
          "marketScore": 71.8,
          "availability": "limited",
          "source": "a101",
          "lastUpdated": "2025-11-12T08:00:00Z"
        }
      ],

      // 🔥 YENİ: Scan summary
      "scanSummary": {
        "totalScanned": 7,
        "successful": 6,
        "failed": 1,
        "failureReasons": [
          {
            "source": "sok",
            "reason": "timeout",
            "details": "Scraper timeout after 10s"
          }
        ]
      },

      // 🔥 YENİ: Risk analysis
      "riskAnalysis": {
        "overallRiskScore": 32.5,
        "riskLevel": "low",
        "risks": {
          "priceVolatility": {
            "score": 25,
            "level": "low",
            "stdDev": 5.2,
            "coefficientOfVariation": 0.12,
            "trend": "stable",
            "maxSpike": 8.5,
            "recommendation": "Fiyat istikrarlı. Şimdi alın veya sözleşme yapın."
          },
          "stockAvailability": {
            "score": 15,
            "level": "low",
            "availabilityRate": 92.5,
            "avgStockDuration": 168,
            "frequentOutages": false,
            "affectedMarkets": [],
            "recommendation": "Stok durumu iyi. Güvenle tedarik edilebilir."
          },
          "supplierConcentration": {
            "score": 40,
            "level": "medium",
            "dominantSupplier": "migros",
            "marketShare": 42,
            "diversificationIndex": 6.8,
            "recommendation": "Migros baskın (%42). İkinci kaynak oluşturun."
          },
          "seasonality": {
            "score": 20,
            "level": "low",
            "isSeasonal": false,
            "priceVariation": 8.3,
            "currentPhase": "off-peak",
            "recommendation": "Mevsimsel etki yok. Yıl boyunca stabil fiyat."
          },
          "dataQuality": {
            "score": 12,
            "level": "low",
            "completeness": 88,
            "freshness": 92,
            "consistency": 85,
            "sourceReliability": 78,
            "recommendation": "Veri kalitesi mükemmel. Güvenle kullanılabilır."
          }
        },
        "alerts": [],
        "mitigationStrategies": [
          "Tedarik zincirini çeşitlendirin (en az 2-3 kaynak)"
        ],
        "lastUpdated": "2025-11-14T11:00:00Z"
      }
    }
  }
}
```

### 8.2. Yeni Endpoint: `/api/market/product/detect` (3-Layer Detection)

**Purpose:** Sadece ürün tespiti yapan endpoint (fiyat sorgulamadan)

**Request:**
```typescript
POST /api/market/product/detect
{
  "product": "salça",
  "includeSKU": true
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "input": "salça",
    "canonical": "Domates Salçası",
    "productKey": "domates-salcasi",
    "confidence": 0.95,
    "method": "fuzzy",
    "category": "soslar-salcalar",
    "categoryConfidence": 0.90,
    "attributes": {
      "type": "domates"
    },
    "variant": "domates",
    "validVariants": ["domates", "biber", "ekşi"],
    "invalidVariantsRemoved": ["yeşil mercimek"],  // ❌ Kategori dışı kaldırıldı
    "skuSuggestions": [
      {
        "sku": "taris-1kg-domates-salcasi",
        "brand": "Tariş",
        "size": "1kg",
        "unit": "kg",
        "estimatedPrice": 42.50,
        "availability": "high",
        "marketCoverage": 0.85
      },
      {
        "sku": "tukas-830g-domates-salcasi",
        "brand": "Tukaş",
        "size": "830g",
        "unit": "kg",
        "estimatedPrice": 38.90,
        "availability": "high",
        "marketCoverage": 0.78
      }
    ]
  }
}
```

### 8.3. Yeni Endpoint: `/api/market/risk/analyze`

**Purpose:** Sadece risk analizi yapan endpoint

**Request:**
```typescript
POST /api/market/risk/analyze
{
  "productKey": "domates-salcasi",
  "includePriceHistory": true,
  "includeStockHistory": true
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    // ProductRiskAnalysis interface (Bölüm 7)
    "overallRiskScore": 32.5,
    "riskLevel": "low",
    "risks": { ... },
    "alerts": [],
    "mitigationStrategies": [],
    "lastUpdated": "2025-11-14T11:00:00Z"
  }
}
```

---

## 9. UI Component Blueprint

### 9.1. Genel Layout (3-Panel Tasarım)

```
┌────────────────────────────────────────────────────────────┐
│  PANEL 1: ÜRÜN TESPİTİ (Collapse - Kapalı)               │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 📦 Domates Salçası              🟢 %95 Güven        │ │
│  │    soslar-salcalar                                   │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  PANEL 2: AI FİYAT İSTİHBARATI (Featured - Açık)         │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Fiyat: 43.20 TL/kg                                  │ │
│  │  ┌────────────────────────────────────────────────┐  │ │
│  │  │ Fiyat Kaynağı Dağılımı:                        │  │ │
│  │  │ ━━━━━━━━━━━━━ %62 Market Verisi                │  │ │
│  │  │ ━━━━━━━ %28 AI Tahmini                         │  │ │
│  │  │ ━━━ %10 Geçmiş Trend                            │  │ │
│  │  └────────────────────────────────────────────────┘  │ │
│  │                                                       │ │
│  │  Veri Güncelliği:                                    │ │
│  │  • Ortalama: 12 saat önce                           │ │
│  │  • En yeni: Migros (1 saat önce)                    │ │
│  │  • En eski: BİM (2 gün önce)                        │ │
│  │                                                       │ │
│  │  Tutarlılık Skoru: 88/100                           │ │
│  │  ━━━━━━━━━━━━━━━━━━━━ (Yüksek tutarlılık)         │ │
│  │  • Fiyat varyansı: %12                              │ │
│  │  • 1 outlier kaldırıldı                             │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  PANEL 3: GERÇEK ZAMANLI MARKET TARAMASI (Featured - Açık)│
│  ┌──────────────────────────────────────────────────────┐ │
│  │  6/7 Başarılı Tarama                                 │ │
│  │  ❌ ŞOK - Timeout (Scraper 10s sonra yanıt vermedi)│ │
│  │                                                       │ │
│  │  ┌────────────────────────────────────────────────┐  │ │
│  │  │ Market   Fiyat   Skor   Durum   Son Güncelleme│  │ │
│  │  ├────────────────────────────────────────────────┤  │ │
│  │  │ Migros   47.90  85.3↑  ✓ Stokta   1 saat önce │  │ │
│  │  │          (Mükemmel: yüksek güven, güncel veri) │  │ │
│  │  ├────────────────────────────────────────────────┤  │ │
│  │  │ A101     45.50  71.8   ⚠ Sınırlı  2 gün önce  │  │ │
│  │  │          (İyi: rekabetçi fiyat, eski veri)     │  │ │
│  │  ├────────────────────────────────────────────────┤  │ │
│  │  │ BİM      44.20  68.5   ✓ Stokta   3 saat önce │  │ │
│  │  │          (İyi: en ucuz, orta güven)            │  │ │
│  │  └────────────────────────────────────────────────┘  │ │
│  │                                                       │ │
│  │  Sıralama: Çok boyutlu skor (fiyat 35%, güven 25%,...) │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  PANEL 4: ÜRÜN RİSKİ ANALİZİ (Collapse - Kapalı)         │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 🟢 Düşük Risk (32.5/100)                            │ │
│  │                                                       │ │
│  │ Risk Dağılımı:                                       │ │
│  │ • Fiyat Oynaklığı:  25 (Düşük) ━━━━                │ │
│  │ • Stok Riski:       15 (Düşük) ━━                   │ │
│  │ • Tedarikçi Riski:  40 (Orta)  ━━━━━━━             │ │
│  │ • Mevsimsellik:     20 (Düşük) ━━━                  │ │
│  │ • Veri Kalitesi:    12 (Düşük) ━━                   │ │
│  │                                                       │ │
│  │ ⚠ 1 Uyarı:                                           │ │
│  │ Migros baskın (%42). İkinci kaynak oluşturun.       │ │
│  │                                                       │ │
│  │ ✅ Öneriler:                                         │ │
│  │ • Tedarik zincirini çeşitlendirin (en az 2-3 kaynak)│ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### 9.2. Component Hiyerarşisi

```typescript
<PriceRobotResultV6>
  {/* Panel 1: Ürün Tespiti */}
  <ProductDetectionCard
    normalized={normalizedV2}
    collapsible
    defaultClosed
  >
    <ProductInfo />
    <CategoryBadge />
    <VariantChips />
    <SKUSuggestions />  {/* 🔥 YENİ */}
  </ProductDetectionCard>

  {/* Panel 2: AI Fiyat İstihbaratı */}
  <PriceIntelligenceCard
    fusion={fusionV2}
    featured
  >
    <PriceDisplay />
    <SourceContributionChart />  {/* 🔥 YENİ */}
    <DataFreshnessIndicator />   {/* 🔥 YENİ */}
    <ConsistencyScoreBar />      {/* 🔥 YENİ */}
    <VolatilityChart />
  </PriceIntelligenceCard>

  {/* Panel 3: Market Taraması */}
  <MarketScanResultCard
    quotes={quotesV2}
    scanSummary={scanSummary}  {/* 🔥 YENİ */}
    featured
  >
    <ScanSummaryBadge />       {/* 🔥 YENİ: "6/7 başarılı" */}
    <FailureReasons />          {/* 🔥 YENİ */}
    <MarketComparisonTable
      sortBy="marketScore"     {/* 🔥 YENİ: Çok boyutlu skor */}
      showScoreBreakdown
    />
  </MarketScanResultCard>

  {/* Panel 4: Risk Analizi */}
  <ProductRiskCard
    riskAnalysis={riskAnalysis}
    collapsible
    defaultClosed
  >
    <RiskOverview />
    <RiskBreakdownChart />     {/* 🔥 YENİ */}
    <RiskAlerts />             {/* 🔥 YENİ */}
    <MitigationStrategies />   {/* 🔥 YENİ */}
  </ProductRiskCard>
</PriceRobotResultV6>
```

### 9.3. Yeni UI Components

#### 9.3.1. SourceContributionChart

```typescript
interface SourceContributionChartProps {
  contribution: PriceIntelligence['sourceContribution'];
}

export function SourceContributionChart({ contribution }: Props) {
  return (
    <div className="space-y-3">
      <h5 className="text-xs font-semibold text-slate-400 uppercase">
        Fiyat Kaynağı Dağılımı
      </h5>

      {/* Market data bar */}
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm text-slate-300">Gerçek Market Verisi</span>
          <span className="text-sm font-bold text-green-400">
            %{contribution.realMarketData.percentage.toFixed(0)}
          </span>
        </div>
        <div className="h-3 bg-slate-800/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500"
            style={{ width: `${contribution.realMarketData.percentage}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {contribution.realMarketData.sourceCount} kaynak,
          ortalama {contribution.realMarketData.avgPrice.toFixed(2)} TL
        </p>
      </div>

      {/* AI estimation bar */}
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm text-slate-300">AI Tahmini</span>
          <span className="text-sm font-bold text-blue-400">
            %{contribution.aiEstimation.percentage.toFixed(0)}
          </span>
        </div>
        <div className="h-3 bg-slate-800/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500"
            style={{ width: `${contribution.aiEstimation.percentage}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {contribution.aiEstimation.model},
          güven: %{(contribution.aiEstimation.confidence * 100).toFixed(0)}
        </p>
      </div>

      {/* Historical trend bar */}
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm text-slate-300">Geçmiş Trend</span>
          <span className="text-sm font-bold text-purple-400">
            %{contribution.historicalTrend.percentage.toFixed(0)}
          </span>
        </div>
        <div className="h-3 bg-slate-800/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500"
            style={{ width: `${contribution.historicalTrend.percentage}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {contribution.historicalTrend.dataPoints} veri noktası,
          trend: {contribution.historicalTrend.trendDirection}
        </p>
      </div>
    </div>
  );
}
```

#### 9.3.2. ScanSummaryBadge

```typescript
interface ScanSummaryBadgeProps {
  scanSummary: MarketFusionV2['scanSummary'];
}

export function ScanSummaryBadge({ scanSummary }: Props) {
  const { totalScanned, successful, failed, failureReasons } = scanSummary;

  return (
    <div className="space-y-2">
      {/* Success badge */}
      <div className="flex items-center gap-2">
        <div className="px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30">
          <span className="text-sm font-semibold text-green-300">
            {successful}/{totalScanned} Başarılı Tarama
          </span>
        </div>
        {failed > 0 && (
          <div className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30">
            <span className="text-sm font-semibold text-red-300">
              {failed} Başarısız
            </span>
          </div>
        )}
      </div>

      {/* Failure reasons */}
      {failed > 0 && failureReasons.length > 0 && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <h6 className="text-xs font-semibold text-red-300 mb-2">
            Başarısız Taramalar:
          </h6>
          <ul className="space-y-1">
            {failureReasons.map((fr, idx) => (
              <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="text-red-400">❌</span>
                <span>
                  <strong>{fr.source}</strong> - {formatFailureReason(fr.reason)}
                  {fr.details && <span className="text-slate-500"> ({fr.details})</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function formatFailureReason(reason: string): string {
  const map: Record<string, string> = {
    'timeout': 'Zaman aşımı',
    'not_found': 'Ürün bulunamadı',
    'out_of_stock': 'Stok yok',
    'api_error': 'API hatası',
    'parsing_error': 'Veri işleme hatası'
  };
  return map[reason] || reason;
}
```

#### 9.3.3. MarketComparisonTableV2 (Multi-Dimensional Scoring)

```typescript
interface MarketComparisonTableV2Props {
  quotes: MarketQuoteV2[];
  sortBy: 'price' | 'marketScore';
  showScoreBreakdown?: boolean;
}

export function MarketComparisonTableV2({ quotes, sortBy, showScoreBreakdown }: Props) {
  const sortedQuotes = [...quotes].sort((a, b) => {
    if (sortBy === 'marketScore') {
      return (b.marketScore?.overall || 0) - (a.marketScore?.overall || 0);
    }
    return a.unit_price - b.unit_price;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="text-left py-2 text-slate-400">Market</th>
            <th className="text-right py-2 text-slate-400">Fiyat</th>
            {sortBy === 'marketScore' && (
              <th className="text-right py-2 text-slate-400">Skor</th>
            )}
            <th className="text-center py-2 text-slate-400">Stok</th>
            <th className="text-right py-2 text-slate-400">Güncelleme</th>
          </tr>
        </thead>
        <tbody>
          {sortedQuotes.map((quote, idx) => {
            const isTop = idx === 0 && sortBy === 'marketScore';
            return (
              <tr
                key={idx}
                className={`border-b border-slate-800/50 ${
                  isTop ? 'bg-green-500/10' : 'hover:bg-slate-800/30'
                }`}
              >
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">
                      {quote.source}
                    </span>
                    {isTop && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/30 text-green-300 border border-green-500/50">
                        ⭐ En İyi
                      </span>
                    )}
                  </div>
                  {showScoreBreakdown && quote.marketScore && (
                    <p className="text-xs text-slate-500 mt-1">
                      {quote.marketScore.breakdown}
                    </p>
                  )}
                </td>
                <td className="text-right py-3">
                  <span className="text-lg font-bold text-white">
                    {quote.unit_price.toFixed(2)} TL
                  </span>
                </td>
                {sortBy === 'marketScore' && (
                  <td className="text-right py-3">
                    <span className={`text-base font-semibold ${
                      (quote.marketScore?.overall || 0) >= 80 ? 'text-green-400' :
                      (quote.marketScore?.overall || 0) >= 60 ? 'text-blue-400' :
                      'text-yellow-400'
                    }`}>
                      {quote.marketScore?.overall.toFixed(0) || '-'}
                    </span>
                  </td>
                )}
                <td className="text-center py-3">
                  {quote.stock_status === 'in_stock' && (
                    <span className="text-green-400">✓ Stokta</span>
                  )}
                  {quote.stock_status === 'limited' && (
                    <span className="text-yellow-400">⚠ Sınırlı</span>
                  )}
                  {quote.stock_status === 'out_of_stock' && (
                    <span className="text-red-400">✗ Yok</span>
                  )}
                </td>
                <td className="text-right py-3 text-slate-400 text-xs">
                  {formatTimeAgo(quote.asOf)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

#### 9.3.4. ProductRiskCard

```typescript
interface ProductRiskCardProps {
  riskAnalysis: ProductRiskAnalysis;
  collapsible?: boolean;
  defaultClosed?: boolean;
}

export function ProductRiskCard({
  riskAnalysis,
  collapsible = true,
  defaultClosed = true
}: Props) {
  const [isOpen, setIsOpen] = useState(!defaultClosed);

  const { overallRiskScore, riskLevel, risks, alerts, mitigationStrategies } = riskAnalysis;

  const riskColor = riskLevel === 'low' ? 'green' :
                     riskLevel === 'medium' ? 'yellow' :
                     riskLevel === 'high' ? 'orange' : 'red';

  return (
    <div className={`glass-card border border-${riskColor}-500/30`}>
      {collapsible ? (
        <>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-800/30"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className={`w-5 h-5 text-${riskColor}-400`} />
              <div className="text-left">
                <h3 className="text-base font-semibold text-white">
                  Ürün Riski Analizi
                </h3>
                <p className="text-xs text-slate-400">
                  {riskLevel === 'low' ? '🟢 Düşük Risk' :
                   riskLevel === 'medium' ? '🟡 Orta Risk' :
                   riskLevel === 'high' ? '🟠 Yüksek Risk' : '🔴 Kritik Risk'}
                  {' '}({overallRiskScore.toFixed(1)}/100)
                </p>
              </div>
            </div>
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-slate-700/50"
              >
                <div className="p-6 space-y-6">
                  <RiskBreakdownChart risks={risks} />
                  {alerts.length > 0 && <RiskAlerts alerts={alerts} />}
                  {mitigationStrategies.length > 0 && (
                    <MitigationStrategies strategies={mitigationStrategies} />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        <div className="p-6 space-y-6">
          <RiskBreakdownChart risks={risks} />
          {alerts.length > 0 && <RiskAlerts alerts={alerts} />}
          {mitigationStrategies.length > 0 && (
            <MitigationStrategies strategies={mitigationStrategies} />
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 10. Validation Schemas

### Zod Schemas (src/lib/validation/market-v2.ts)

```typescript
import { z } from 'zod';

// ===== MARKET QUOTE V2 =====
export const MarketQuoteV2Schema = z.object({
  product_key: z.string().min(1),
  raw_query: z.string().min(1),
  unit: z.string().min(1),
  unit_price: z.number().positive(),
  currency: z.literal('TRY'),
  market_key: z.enum(['migros', 'a101', 'bim', 'sok', 'carrefour', 'hepsiburada', 'trendyol']).optional(),
  stock_status: z.enum(['in_stock', 'out_of_stock', 'limited']).optional(),
  brand: z.string().optional(),
  brandTier: z.enum(['premium', 'standard', 'economy']).optional(),
  packaging: z.string().optional(),
  quantity: z.number().optional(),
  asOf: z.string().datetime(),
  source: z.string(),
  sourceTrust: z.number().min(0).max(1).optional(),
  meta: z.record(z.unknown()).optional(),

  // 🔥 YENİ: Multi-dimensional scoring
  marketScore: z.object({
    overall: z.number().min(0).max(100),
    priceScore: z.number().min(0).max(100),
    reliabilityScore: z.number().min(0).max(100),
    completenessScore: z.number().min(0).max(100),
    stockScore: z.number().min(0).max(100),
    recencyScore: z.number().min(0).max(100),
    breakdown: z.string()
  }).optional(),

  // 🔥 YENİ: Failure tracking
  fetchStatus: z.enum(['success', 'partial', 'failed']),
  failureReason: z.enum(['timeout', 'not_found', 'out_of_stock', 'api_error', 'parsing_error']).optional(),
  failureDetails: z.string().optional(),

  // 🔥 YENİ: Data completeness
  dataCompleteness: z.object({
    hasPrice: z.boolean(),
    hasBrand: z.boolean(),
    hasStock: z.boolean(),
    hasImage: z.boolean(),
    completenessScore: z.number().min(0).max(1)
  }),

  // 🔥 YENİ: Regional pricing
  regionalPricing: z.object({
    region: z.string(),
    city: z.string().optional(),
    priceVariation: z.number()
  }).optional()
});

// ===== NORMALIZED PRODUCT V2 =====
export const NormalizedProductV2Schema = z.object({
  input: z.string().min(1),
  canonical: z.string().min(1),
  productKey: z.string().min(1),
  confidence: z.number().min(0).max(1),
  method: z.enum(['exact', 'fuzzy', 'ai', 'fallback']),

  // Layer 2
  category: z.string().min(1),
  categoryConfidence: z.number().min(0).max(1),
  attributes: z.object({
    brand: z.string().optional(),
    size: z.string().optional(),
    packaging: z.string().optional(),
    type: z.string().optional()
  }),
  variant: z.string().optional(),
  validVariants: z.array(z.string()),
  invalidVariantsRemoved: z.array(z.string()).optional(),

  // Layer 3
  skuSuggestions: z.array(z.object({
    sku: z.string(),
    brand: z.string(),
    size: z.string(),
    unit: z.string(),
    estimatedPrice: z.number(),
    availability: z.enum(['high', 'medium', 'low']),
    marketCoverage: z.number().min(0).max(1)
  })).optional()
});

// ===== PRODUCT RISK ANALYSIS =====
export const ProductRiskAnalysisSchema = z.object({
  overallRiskScore: z.number().min(0).max(100),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  risks: z.object({
    priceVolatility: z.object({
      score: z.number().min(0).max(100),
      level: z.enum(['low', 'medium', 'high']),
      stdDev: z.number(),
      coefficientOfVariation: z.number(),
      trend: z.enum(['rising', 'falling', 'stable']),
      maxSpike: z.number(),
      recommendation: z.string()
    }),
    stockAvailability: z.object({
      score: z.number().min(0).max(100),
      level: z.enum(['low', 'medium', 'high']),
      availabilityRate: z.number().min(0).max(100),
      avgStockDuration: z.number(),
      frequentOutages: z.boolean(),
      affectedMarkets: z.array(z.string()),
      recommendation: z.string()
    }),
    supplierConcentration: z.object({
      score: z.number().min(0).max(100),
      level: z.enum(['low', 'medium', 'high']),
      dominantSupplier: z.string().optional(),
      marketShare: z.number().min(0).max(100),
      diversificationIndex: z.number(),
      recommendation: z.string()
    }),
    seasonality: z.object({
      score: z.number().min(0).max(100),
      level: z.enum(['low', 'medium', 'high']),
      isSeasonal: z.boolean(),
      peakMonths: z.array(z.string()).optional(),
      priceVariation: z.number(),
      currentPhase: z.enum(['peak', 'off-peak', 'transitioning']),
      recommendation: z.string()
    }),
    dataQuality: z.object({
      score: z.number().min(0).max(100),
      level: z.enum(['low', 'medium', 'high']),
      completeness: z.number().min(0).max(100),
      freshness: z.number().min(0).max(100),
      consistency: z.number().min(0).max(100),
      sourceReliability: z.number().min(0).max(100),
      recommendation: z.string()
    })
  }),
  alerts: z.array(z.object({
    severity: z.enum(['info', 'warning', 'critical']),
    category: z.string(),
    message: z.string(),
    actionable: z.boolean(),
    suggestedAction: z.string().optional()
  })),
  mitigationStrategies: z.array(z.string()),
  lastUpdated: z.string().datetime()
});

// ===== PRICE INTELLIGENCE =====
export const PriceIntelligenceSchema = z.object({
  finalPrice: z.number().positive(),
  currency: z.literal('TRY'),
  confidence: z.number().min(0).max(1),

  sourceContribution: z.object({
    realMarketData: z.object({
      percentage: z.number().min(0).max(100),
      sourceCount: z.number().int().nonnegative(),
      avgPrice: z.number().positive(),
      weight: z.number().nonnegative()
    }),
    aiEstimation: z.object({
      percentage: z.number().min(0).max(100),
      model: z.string(),
      confidence: z.number().min(0).max(1),
      avgPrice: z.number().positive(),
      weight: z.number().nonnegative()
    }),
    historicalTrend: z.object({
      percentage: z.number().min(0).max(100),
      dataPoints: z.number().int().nonnegative(),
      trendDirection: z.enum(['rising', 'falling', 'stable']),
      weight: z.number().nonnegative()
    }),
    tuikData: z.object({
      percentage: z.number().min(0).max(100),
      lastUpdate: z.string().datetime(),
      officialPrice: z.number().positive(),
      weight: z.number().nonnegative()
    }).optional()
  }),

  dataFreshness: z.object({
    averageAge: z.number().nonnegative(),
    oldestSource: z.string(),
    newestSource: z.string(),
    staleDataCount: z.number().int().nonnegative()
  }),

  priceConsistency: z.object({
    score: z.number().min(0).max(1),
    coefficientOfVariation: z.number().nonnegative(),
    outlierCount: z.number().int().nonnegative(),
    standardDeviation: z.number().nonnegative(),
    explanation: z.string()
  }),

  priceRange: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
    avg: z.number().positive()
  }),

  volatility: z.object({
    score: z.number().min(0).max(1),
    trend: z.enum(['rising', 'falling', 'stable']),
    avgDailyChange: z.number(),
    maxSpike: z.number(),
    recommendation: z.string()
  }).optional()
});

// ===== API REQUEST/RESPONSE SCHEMAS =====
export const EnhancedPriceRequestSchema = z.object({
  product: z.string().min(1, 'Ürün adı gerekli'),
  unit: z.string().optional(),
  includeRiskAnalysis: z.boolean().optional(),
  includeSKUSuggestions: z.boolean().optional(),
  includeRegionalPricing: z.boolean().optional()
});

export const ProductDetectRequestSchema = z.object({
  product: z.string().min(1, 'Ürün adı gerekli'),
  includeSKU: z.boolean().optional()
});

export const RiskAnalyzeRequestSchema = z.object({
  productKey: z.string().min(1, 'Product key gerekli'),
  includePriceHistory: z.boolean().optional(),
  includeStockHistory: z.boolean().optional()
});
```

---

## 11. Implementation Roadmap

### Phase 1: Backend Core (5-7 days)

**Öncelik: CRITICAL**

1. ✅ **Day 1-2: Enhanced Data Models**
   - `src/lib/market/schema.ts` güncelle (MarketQuoteV2, NormalizedProductV2, ProductRiskAnalysis)
   - `src/lib/validation/market-v2.ts` oluştur (Zod schemas)
   - TypeScript type exports düzenle

2. ✅ **Day 2-3: 3-Layer Product Detection**
   - `src/lib/market/product-normalizer-v2.ts` oluştur
   - Layer 1: Enhanced normalization
   - Layer 2: Category-aware attribute extraction
   - Layer 3: SKU suggestion engine
   - Kategori-varyant tutarlılık kontrolü ekle

3. ✅ **Day 3-4: Multi-Dimensional Market Scoring**
   - `src/lib/market/scoring.ts` oluştur
   - Price, reliability, completeness, stock, recency scoring fonksiyonları
   - `calculateMarketScore()` ana fonksiyonu
   - Test suite ekle

4. ✅ **Day 4-5: Risk Analysis Module**
   - `src/lib/market/risk-analysis.ts` oluştur
   - 5 risk kategorisi implementasyonu
   - Alert generation
   - Mitigation strategies

5. ✅ **Day 5-6: Price Intelligence System**
   - `src/lib/market/price-intelligence.ts` oluştur
   - Source contribution breakdown
   - Data freshness tracking
   - Consistency scoring

6. ✅ **Day 6-7: Fusion Engine V2**
   - `src/lib/market/fusion-engine-v2.ts` güncelle
   - Yeni scoring sistemini entegre et
   - Failure tracking ekle
   - Scan summary generation

### Phase 2: API Endpoints (3-4 days)

**Öncelik: HIGH**

1. ✅ **Day 8-9: Enhanced `/api/market/price`**
   - Validation ile request handling
   - 3-layer product detection entegrasyonu
   - Risk analysis entegrasyonu
   - Response format v2

2. ✅ **Day 9-10: Yeni `/api/market/product/detect`**
   - Standalone product detection endpoint
   - SKU suggestion support
   - Fast response optimization

3. ✅ **Day 10-11: Yeni `/api/market/risk/analyze`**
   - Standalone risk analysis endpoint
   - Historical data integration
   - Caching strategy

### Phase 3: Frontend UI (4-5 days)

**Öncelik: HIGH**

1. ✅ **Day 12-13: Core UI Components**
   - `SourceContributionChart.tsx`
   - `DataFreshnessIndicator.tsx`
   - `ConsistencyScoreBar.tsx`
   - `ScanSummaryBadge.tsx`
   - `MarketComparisonTableV2.tsx`

2. ✅ **Day 13-14: Risk UI Components**
   - `ProductRiskCard.tsx`
   - `RiskBreakdownChart.tsx`
   - `RiskAlerts.tsx`
   - `MitigationStrategies.tsx`

3. ✅ **Day 14-15: Main Component Integration**
   - `PriceRobotResultV6.tsx` oluştur
   - 4-panel layout
   - Collapse/expand states
   - Responsive design

4. ✅ **Day 15-16: SKU Components**
   - `SKUSuggestionPanel.tsx`
   - `ProductDetectionCardV2.tsx`
   - Category badge improvements

### Phase 4: Testing & Optimization (2-3 days)

**Öncelik: MEDIUM**

1. ✅ **Day 17: Integration Testing**
   - End-to-end flow test
   - API contract validation
   - UI component tests

2. ✅ **Day 18: Performance Optimization**
   - Caching strategy
   - Query optimization
   - Lazy loading

3. ✅ **Day 19: Documentation**
   - API documentation update
   - Component storybook
   - User guide

### Phase 5: Deployment & Monitoring (1 day)

**Öncelik: HIGH**

1. ✅ **Day 20: Deployment**
   - Staging deployment
   - Production rollout
   - Monitoring setup
   - Error tracking

---

## 12. Success Metrics

### Kullanıcı Deneyimi

- ✅ **Kategori-varyant tutarsızlığı**: %0 hata oranı
- ✅ **Fiyat güvenilirlik şeffaflığı**: Kaynak dağılımı her zaman görünür
- ✅ **Market skorlama doğruluğu**: Kullanıcı anketinde %80+ memnuniyet
- ✅ **Başarısız tarama açıklaması**: %100 başarısız tarama nedeni açıklansın

### Teknik Performans

- ✅ **API response time**: < 2s (p95)
- ✅ **Risk analizi hesaplama**: < 500ms
- ✅ **SKU suggestion generation**: < 300ms
- ✅ **UI render time**: < 100ms

### İş Hedefleri

- ✅ **Piyasa robot güvenilirliği**: %90+ doğruluk
- ✅ **Kullanıcı engagement**: %30+ artış (risk paneli kullanımı)
- ✅ **Maliyet analizi doğruluğu**: %95+ tutarlılık

---

## 13. Risk Mitigation

### Teknik Riskler

1. **Performans degradasyonu**
   - Mitigation: Aggressive caching, lazy loading
   - Monitoring: APM tools, alerting

2. **Backward compatibility kırılması**
   - Mitigation: V1 ve V2 endpoint'lerini paralel çalıştır
   - Deprecation timeline: 3 ay

3. **Veri kalitesi düşüklüğü**
   - Mitigation: Data quality scoring, fallback mechanisms
   - Monitoring: Quality metrics dashboard

### İş Riskleri

1. **Kullanıcı kafası karışıklığı (çok fazla metrik)**
   - Mitigation: Progressive disclosure, default collapsed panels
   - User testing: A/B test farklı layout'lar

2. **Yanlış iş kararları (risk skoruna körü körüne güvenme)**
   - Mitigation: Disclaimers, confidence intervals, human-in-the-loop
   - Training: Kullanıcı eğitimi dökümanları

---

## 14. Appendix

### A. Glossary

- **SKU (Stock Keeping Unit)**: Benzersiz ürün tanımlayıcı (marka × boyut × varyant)
- **HHI (Herfindahl-Hirschman Index)**: Pazar konsantrasyonu ölçütü
- **CV (Coefficient of Variation)**: Fiyat volatilite ölçütü (stdDev / mean)
- **IQR (Interquartile Range)**: Outlier detection yöntemi
- **Source Contribution**: Fiyatın hangi kaynaklardan geldiğinin dağılımı

### B. References

- [Herfindahl-Hirschman Index](https://en.wikipedia.org/wiki/Herfindahl%E2%80%93Hirschman_index)
- [Price Volatility Measures](https://www.investopedia.com/terms/v/volatility.asp)
- [Multi-Criteria Decision Analysis](https://en.wikipedia.org/wiki/Multiple-criteria_decision_analysis)

### C. Change Log

- **v5.0.0** (2025-11-14): Initial blueprint
  - 3-layer product detection
  - Multi-dimensional market scoring
  - Comprehensive risk analysis
  - Enhanced price intelligence
  - SKU-level tracking

---

**Blueprint Status**: ✅ Ready for Review
**Next Step**: Numan'ın onayı → Phase 1 implementasyonuna geçiş
**Estimated Total Time**: 20 gün (tam zamanlı)
**Team Size**: 1-2 developer

**Onaylandı mı?** → [Bekliyor]
