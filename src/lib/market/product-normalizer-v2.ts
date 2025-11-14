/**
 * Product Normalization Pipeline V2
 *
 * 3-Layer Detection System:
 * - Layer 1: Normalization (input → canonical)
 * - Layer 2: Category + Attributes (kategori-filtreli varyant)
 * - Layer 3: SKU Suggestions (brand × size × variant)
 *
 * Fixes: Kategori-varyant tutarsızlığı ("salça" → "yeşil mercimek" ❌)
 */

import { normalizeProductName as basicNormalize } from './normalize';
import { AILogger } from '@/lib/ai/logger';
import type { NormalizedProductV2, SKUSuggestion } from './schema';

// ========================================
// ENHANCED PRODUCT DATABASE
// ========================================

export interface ProductDatabaseV2 {
  [key: string]: {
    canonical: string;
    category: string;
    variants: string[];
    aliases: string[];
    tags: string[];
    commonBrands?: string[];      // 🔥 YENİ: SKU suggestion için
    commonSizes?: string[];       // 🔥 YENİ: SKU suggestion için
  };
}

/**
 * Stop words (temizlenecek kelimeler)
 */
const STOP_WORDS = new Set([
  'ile', 've', 'için', 'lik', 'lı', 'li', 'lu', 'lü',
  'den', 'dan', 'ten', 'tan', 'de', 'da', 'te', 'ta',
  'nin', 'nın', 'nün', 'nun', 'in', 'ın', 'ün', 'un',
  'bir', 'iki', 'üç', 'dört', 'beş',
  'adet', 'kg', 'lt', 'gr', 'ml'
]);

/**
 * Enhanced Product Database (with new categories)
 */
export const PRODUCT_DB_V2: ProductDatabaseV2 = {
  // ========== ET KATEGORİSİ ==========
  'tavuk-eti': {
    canonical: 'Tavuk Eti',
    category: 'et',
    variants: ['göğüs', 'but', 'kanat', 'bütün', 'parça'],
    aliases: ['tavuk', 'piliç', 'chicken'],
    tags: ['beyaz-et', 'kümes-hayvani'],
    commonBrands: ['Banvit', 'Keskinoğlu', 'Aytaç'],
    commonSizes: ['1kg', '500g', '2kg']
  },
  'dana-eti': {
    canonical: 'Dana Eti',
    category: 'et',
    variants: ['kuşbaşı', 'kıyma', 'biftek', 'antrikot'],
    aliases: ['sığır', 'beef'],
    tags: ['kırmızı-et'],
    commonBrands: ['Namet', 'Aytaç', 'Pınar'],
    commonSizes: ['1kg', '500g']
  },
  'kuzu-eti': {
    canonical: 'Kuzu Eti',
    category: 'et',
    variants: ['kuşbaşı', 'kıyma', 'pirzola', 'but'],
    aliases: ['kuzu', 'lamb'],
    tags: ['kırmızı-et'],
    commonBrands: ['Namet', 'Aytaç'],
    commonSizes: ['1kg', '500g']
  },

  // ========== YAĞ KATEGORİSİ ==========
  'zeytinyagi': {
    canonical: 'Zeytinyağı',
    category: 'yag',
    variants: ['sızma', 'naturel', 'rafine'],
    aliases: ['zeytinyağ', 'zeytin-yagi', 'olive-oil'],
    tags: ['sivi-yag', 'yemeklik-yag'],
    commonBrands: ['Komili', 'Kristal', 'Beyoğlu'],
    commonSizes: ['1lt', '5lt', '10lt']
  },
  'ayçiçek-yagi': {
    canonical: 'Ayçiçek Yağı',
    category: 'yag',
    variants: ['rafine', 'naturel'],
    aliases: ['aycicek', 'sunflower-oil'],
    tags: ['sivi-yag', 'yemeklik-yag'],
    commonBrands: ['Yudum', 'Orkide', 'Komili'],
    commonSizes: ['1lt', '5lt', '10lt']
  },

  // ========== SEBZE KATEGORİSİ ==========
  'domates': {
    canonical: 'Domates',
    category: 'sebze',
    variants: ['salçalık', 'salkım', 'cherry'],
    aliases: ['tomato'],
    tags: ['taze-sebze', 'kırmızı'],
    commonSizes: ['1kg', '5kg', '10kg']
  },
  'patates': {
    canonical: 'Patates',
    category: 'sebze',
    variants: ['kırmızı', 'beyaz', 'granül'],
    aliases: ['potato'],
    tags: ['taze-sebze', 'kök-sebze'],
    commonSizes: ['1kg', '5kg', '10kg']
  },

  // ========== TAHIL KATEGORİSİ ==========
  'pirinc': {
    canonical: 'Pirinç',
    category: 'tahil',
    variants: ['baldo', 'osmancık', 'basmati', 'jasmine'],
    aliases: ['rice'],
    tags: ['tahıl', 'pilav'],
    commonBrands: ['Baldo', 'Osmancık', 'Yayla'],
    commonSizes: ['1kg', '5kg', '10kg']
  },

  // ========== SÜT ÜRÜNLERİ ==========
  'sut': {
    canonical: 'Süt',
    category: 'sut-urunleri',
    variants: ['yağlı', 'yarım-yağlı', 'yağsız'],
    aliases: ['milk'],
    tags: ['içecek', 'süt-ürünleri'],
    commonBrands: ['Pınar', 'Sütaş', 'Yayla'],
    commonSizes: ['1lt', '2lt', '500ml']
  },

  // ========== BAKLİYAT ==========
  'nohut': {
    canonical: 'Nohut',
    category: 'bakliyat',
    variants: ['orta', 'ince', 'kabuklu'],
    aliases: ['chickpea'],
    tags: ['bakliyat', 'kurubaklagil'],
    commonBrands: ['Yayla', 'Kızılelma'],
    commonSizes: ['1kg', '5kg', '10kg']
  },
  'mercimek': {
    canonical: 'Mercimek',
    category: 'bakliyat',
    variants: ['kırmızı', 'yeşil', 'sarı'],
    aliases: ['lentil'],
    tags: ['bakliyat', 'kurubaklagil'],
    commonBrands: ['Yayla', 'Kızılelma'],
    commonSizes: ['1kg', '5kg']
  },

  // ========== 🔥 SOSLAR / SALÇALAR (YENİ KATEGORI) ==========
  'domates-salcasi': {
    canonical: 'Domates Salçası',
    category: 'soslar-salcalar',
    variants: ['domates', 'acı', 'tatlı'],
    aliases: ['salça', 'domates-salça', 'salca'],
    tags: ['sos', 'salça', 'konserve'],
    commonBrands: ['Tariş', 'Tukaş', 'Yurt'],
    commonSizes: ['1kg', '830g', '700g']
  },
  'biber-salcasi': {
    canonical: 'Biber Salçası',
    category: 'soslar-salcalar',
    variants: ['acı', 'tatlı'],
    aliases: ['biber-salça'],
    tags: ['sos', 'salça', 'konserve'],
    commonBrands: ['Tariş', 'Tukaş', 'Yurt'],
    commonSizes: ['1kg', '830g', '700g']
  },

  // ========== BAHARATLAR ==========
  'tuz': {
    canonical: 'Tuz',
    category: 'baharat',
    variants: ['iyotlu', 'iyotsuz', 'kaya-tuzu', 'himalaya-tuzu'],
    aliases: ['salt'],
    tags: ['baharat', 'temel'],
    commonBrands: ['Billur', 'Kaya Tuzu'],
    commonSizes: ['1kg', '500g']
  },
  'karabiber': {
    canonical: 'Karabiber',
    category: 'baharat',
    variants: ['çekilmiş', 'tane'],
    aliases: ['black-pepper'],
    tags: ['baharat'],
    commonBrands: ['Bağdat', 'Knorr'],
    commonSizes: ['100g', '250g', '500g']
  },

  // ========== ŞEKERLER ==========
  'seker': {
    canonical: 'Şeker',
    category: 'tatlandirici',
    variants: ['toz', 'küp', 'esmer'],
    aliases: ['sugar'],
    tags: ['tatlandırıcı'],
    commonBrands: ['Şeker Fabrikası', 'Türk Şeker'],
    commonSizes: ['1kg', '5kg']
  }
};

// ========================================
// LAYER 1: ENHANCED NORMALIZATION
// ========================================

/**
 * Metni temizle ve normalize et
 */
function tidyText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')           // Çoklu boşlukları tek yap
    .replace(/[()]/g, '')           // Parantezleri kaldır
    .replace(/[,;.!?]/g, ' ')       // Noktalama işaretlerini boşluk yap
    .trim();
}

/**
 * Stop words'leri kaldır
 */
function removeStopWords(text: string): string {
  const words = text.split(' ');
  const filtered = words.filter(word =>
    word.length > 2 && !STOP_WORDS.has(word)
  );
  return filtered.join(' ');
}

/**
 * Dictionary lookup
 */
function dictionaryLookup(productKey: string): ProductDatabaseV2[string] | null {
  return PRODUCT_DB_V2[productKey] || null;
}

/**
 * Fuzzy matching (Levenshtein distance)
 */
function fuzzyMatchProducts(
  query: string,
  limit = 5
): Array<{ key: string; score: number }> {
  const matches: Array<{ key: string; score: number }> = [];

  for (const [key, data] of Object.entries(PRODUCT_DB_V2)) {
    // Key ile karşılaştır
    let score = calculateSimilarity(query, key);

    // Aliases ile de karşılaştır
    for (const alias of data.aliases) {
      const aliasScore = calculateSimilarity(query, alias.toLowerCase());
      score = Math.max(score, aliasScore);
    }

    matches.push({ key, score });
  }

  // Skora göre sırala ve limit'le
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .filter(m => m.score > 0.4); // Minimum threshold
}

/**
 * Similarity hesapla (Levenshtein distance bazlı)
 */
function calculateSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Levenshtein distance
 */
function levenshteinDistance(s1: string, s2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[s2.length][s1.length];
}

// ========================================
// LAYER 2: CATEGORY-AWARE VARIANT MATCHING
// ========================================

/**
 * Kategori bazlı varyant filtreleme
 *
 * 🔥 ÖNEMLİ: Bu fonksiyon "salça" → "yeşil mercimek" problemini çözer
 *
 * Eski mantık:
 * - extractVariant("salça", ALL_VARIANTS)
 * - "yeşil" kelimesi input'ta var
 * - Mercimek varyantı "yeşil" ile eşleşir ❌
 *
 * Yeni mantık:
 * - extractVariant("salça", CATEGORY_FILTERED_VARIANTS)
 * - Sadece "soslar-salcalar" kategorisindeki varyantlara bakar
 * - Mercimek varyantı listede yok, eşleşme olmaz ✅
 */
function extractVariantCategoryFiltered(
  input: string,
  category: string,
  validVariants: string[]
): string | undefined {
  const lower = input.toLowerCase();

  // Önce kesin eşleşmelere bak
  for (const variant of validVariants) {
    if (lower.includes(variant.toLowerCase())) {
      AILogger.info('[Product V2] Variant matched', {
        input,
        category,
        variant,
        method: 'exact'
      });
      return variant;
    }
  }

  // Fuzzy matching dene
  for (const variant of validVariants) {
    const similarity = calculateSimilarity(lower, variant.toLowerCase());
    if (similarity > 0.7) {
      AILogger.info('[Product V2] Variant matched (fuzzy)', {
        input,
        category,
        variant,
        similarity,
        method: 'fuzzy'
      });
      return variant;
    }
  }

  return undefined;
}

/**
 * Tüm kategorileri listele
 */
export function getAllCategories(): string[] {
  const categories = new Set<string>();

  for (const data of Object.values(PRODUCT_DB_V2)) {
    categories.add(data.category);
  }

  return Array.from(categories).sort();
}

/**
 * Kategori bazlı ürün listesi
 */
export function getProductsByCategory(category: string): string[] {
  return Object.entries(PRODUCT_DB_V2)
    .filter(([_, data]) => data.category === category)
    .map(([key]) => key);
}

// ========================================
// LAYER 3: SKU SUGGESTION ENGINE
// ========================================

/**
 * SKU oluştur (brand × size × variant)
 */
function generateSKU(brand: string, size: string, productKey: string): string {
  return `${brand.toLowerCase().replace(/\s+/g, '-')}-${size}-${productKey}`;
}

/**
 * Market coverage tahmini (basit heuristic)
 */
function estimateMarketCoverage(brand: string): number {
  const popularBrands = ['pınar', 'tariş', 'yayla', 'orkide', 'komili'];
  const lowerBrand = brand.toLowerCase();

  if (popularBrands.includes(lowerBrand)) {
    return 0.8 + Math.random() * 0.15; // 0.8-0.95
  }

  return 0.4 + Math.random() * 0.3; // 0.4-0.7
}

/**
 * Fiyat tahmini (basit heuristic - gerçek fiyat verisi olmadan)
 */
function estimatePrice(sku: string, category: string): number {
  // Kategori bazlı ortalama fiyatlar (TL/kg veya lt)
  const avgPrices: Record<string, number> = {
    'et': 200,
    'yag': 150,
    'sebze': 30,
    'tahil': 40,
    'sut-urunleri': 50,
    'bakliyat': 60,
    'soslar-salcalar': 80,
    'baharat': 120,
    'tatlandirici': 35
  };

  const basePrice = avgPrices[category] || 50;

  // Boyuta göre ayarlama
  if (sku.includes('5kg') || sku.includes('5lt')) {
    return basePrice * 4.5; // Toplu alım indirimi
  }
  if (sku.includes('10kg') || sku.includes('10lt')) {
    return basePrice * 8.5; // Daha fazla toplu alım indirimi
  }

  return basePrice;
}

/**
 * SKU öneri oluştur (brand × size × variant kombinasyonları)
 */
function generateSKUSuggestions(
  productKey: string,
  category: string,
  validVariants: string[],
  productData: ProductDatabaseV2[string]
): SKUSuggestion[] {
  const suggestions: SKUSuggestion[] = [];

  const brands = productData.commonBrands || ['Genel'];
  const sizes = productData.commonSizes || ['1kg'];

  // En fazla 10 SKU öner (top 2 brand × top 3 size × top 2 variant)
  const topBrands = brands.slice(0, 2);
  const topSizes = sizes.slice(0, 3);
  const topVariants = validVariants.slice(0, 2);

  for (const brand of topBrands) {
    for (const size of topSizes) {
      // Variant yoksa base ürün için SKU
      if (topVariants.length === 0) {
        const sku = generateSKU(brand, size, productKey);
        const coverage = estimateMarketCoverage(brand);

        suggestions.push({
          sku,
          brand,
          size,
          unit: size.replace(/[0-9.]+/, ''), // Extract unit (kg, lt, g)
          estimatedPrice: estimatePrice(sku, category),
          availability: coverage > 0.7 ? 'high' : coverage > 0.5 ? 'medium' : 'low',
          marketCoverage: coverage
        });
      } else {
        // Varyantlı ürün için SKU
        for (const variant of topVariants) {
          const sku = generateSKU(brand, size, `${productKey}-${variant}`);
          const coverage = estimateMarketCoverage(brand);

          suggestions.push({
            sku,
            brand,
            size,
            unit: size.replace(/[0-9.]+/, ''),
            estimatedPrice: estimatePrice(sku, category),
            availability: coverage > 0.7 ? 'high' : coverage > 0.5 ? 'medium' : 'low',
            marketCoverage: coverage
          });
        }
      }
    }
  }

  // Market coverage'a göre sırala
  return suggestions.sort((a, b) => b.marketCoverage - a.marketCoverage).slice(0, 10);
}

// ========================================
// MAIN: 3-LAYER PRODUCT DETECTION
// ========================================

/**
 * 3-Layer Product Detection Pipeline
 *
 * Layer 1: Normalization (input → canonical, productKey, confidence)
 * Layer 2: Category + Attributes (kategori-aware varyant matching)
 * Layer 3: SKU Suggestions (brand × size × variant)
 */
export async function normalizeProductV2(
  rawInput: string
): Promise<NormalizedProductV2> {
  AILogger.info('[Product V2] Starting 3-layer detection', { input: rawInput });

  // ===== LAYER 1: NORMALIZATION =====

  // 1. Tidy text
  let text = tidyText(rawInput);

  // 2. Remove stop words
  text = removeStopWords(text);

  // 3. Basic normalization (mevcut sistem)
  const basic = basicNormalize(text);

  // 4. Dictionary lookup (exact match)
  let dictMatch = dictionaryLookup(basic.product_key);

  // 5. Fuzzy matching (fallback)
  if (!dictMatch) {
    const fuzzyMatches = fuzzyMatchProducts(basic.product_key, 3);
    if (fuzzyMatches.length > 0 && fuzzyMatches[0].score > 0.7) {
      dictMatch = PRODUCT_DB_V2[fuzzyMatches[0].key];
      AILogger.info('[Product V2] Fuzzy match found', {
        input: rawInput,
        matched: fuzzyMatches[0].key,
        score: fuzzyMatches[0].score
      });
    }
  }

  // Eğer dictionary match yoksa, fallback
  if (!dictMatch) {
    AILogger.warn('[Product V2] No dictionary match, using fallback', {
      input: rawInput,
      productKey: basic.product_key
    });

    return {
      input: rawInput,
      canonical: basic.base || text,
      productKey: basic.product_key || text,
      confidence: 0.3,
      method: 'fallback',
      category: 'diger',
      categoryConfidence: 0.3,
      attributes: {},
      validVariants: [],
      skuSuggestions: []
    };
  }

  // ===== LAYER 2: CATEGORY + ATTRIBUTES =====

  const category = dictMatch.category;
  const categoryConfidence = 0.95; // Dictionary match olduğu için yüksek

  // 🔥 ÖNEMLİ: Kategori-filtreli varyant matching
  const validVariants = dictMatch.variants;
  const variant = extractVariantCategoryFiltered(rawInput, category, validVariants);

  // Attributes extraction (basit - gelecekte AI ile genişletilebilir)
  const attributes: NormalizedProductV2['attributes'] = {
    type: variant
  };

  // ===== LAYER 3: SKU SUGGESTIONS =====

  const skuSuggestions = generateSKUSuggestions(
    basic.product_key,
    category,
    validVariants,
    dictMatch
  );

  // ===== FINAL RESULT =====

  const result: NormalizedProductV2 = {
    // Layer 1
    input: rawInput,
    canonical: dictMatch.canonical,
    productKey: basic.product_key,
    confidence: 0.95, // Dictionary match
    method: 'exact',

    // Layer 2
    category,
    categoryConfidence,
    attributes,
    variant,
    validVariants,

    // Layer 3
    skuSuggestions
  };

  AILogger.success('[Product V2] 3-layer detection completed', {
    input: rawInput,
    canonical: result.canonical,
    category: result.category,
    variant: result.variant,
    skuCount: skuSuggestions.length
  });

  return result;
}

/**
 * Batch normalization
 */
export async function normalizeBulkV2(
  inputs: string[]
): Promise<NormalizedProductV2[]> {
  const results = [];

  for (const input of inputs) {
    const normalized = await normalizeProductV2(input);
    results.push(normalized);
  }

  return results;
}

/**
 * Debug: Normalization sonucunu yazdır
 */
export function debugNormalizationV2(result: NormalizedProductV2): string {
  return [
    `🔍 3-Layer Product Detection Result:`,
    ``,
    `Layer 1 - Normalization:`,
    `  Input: "${result.input}"`,
    `  Canonical: ${result.canonical}`,
    `  Product Key: ${result.productKey}`,
    `  Confidence: ${(result.confidence * 100).toFixed(0)}% (${result.method})`,
    ``,
    `Layer 2 - Category & Attributes:`,
    `  Category: ${result.category} (${(result.categoryConfidence * 100).toFixed(0)}% confident)`,
    `  Variant: ${result.variant || 'N/A'}`,
    `  Valid Variants: ${result.validVariants.join(', ')}`,
    result.invalidVariantsRemoved?.length
      ? `  ❌ Removed (category mismatch): ${result.invalidVariantsRemoved.join(', ')}`
      : '',
    ``,
    `Layer 3 - SKU Suggestions:`,
    result.skuSuggestions && result.skuSuggestions.length > 0
      ? result.skuSuggestions.slice(0, 3).map((sku, i) =>
          `  ${i + 1}. ${sku.sku} - ${sku.brand} ${sku.size} (₺${sku.estimatedPrice.toFixed(2)}, ${(sku.marketCoverage * 100).toFixed(0)}% coverage)`
        ).join('\n')
      : '  (No SKU suggestions)',
    ``
  ].filter(Boolean).join('\n');
}
