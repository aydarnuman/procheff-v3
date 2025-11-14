/**
 * Product Normalization Pipeline
 * AI + Fuzzy Matching + Dictionary ile akıllı ürün normalizasyonu
 */

import { normalizeProductName as basicNormalize } from './normalize';
import { AILogger } from '@/lib/ai/logger';

export interface NormalizedProduct {
  input: string;                    // Orijinal girdi
  canonical: string;                // Standart ürün adı
  productKey: string;               // URL-safe key
  confidence: number;               // 0-1 güven skoru
  method: 'exact' | 'fuzzy' | 'ai' | 'fallback';
  
  // Detaylar
  category?: string;                // Kategori (et, sebze, vb.)
  variant?: string;                 // Varyant (seçilen tek varyant)
  variants?: string[];              // 🔥 EKLENDİ — tüm varyant listesi
  alternatives?: string[];          // Alternatif eşleşmeler
  suggestions?: string[];           // Öneriler
}

export interface ProductDatabase {
  [key: string]: {
    canonical: string;
    category: string;
    variants: string[];
    aliases: string[];              // Alternatif adlar
    tags: string[];                 // Arama için etiketler
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
 * Ürün veritabanı (genişletilmiş - kategori bazlı filtreleme için)
 */
const PRODUCT_DB: ProductDatabase = {
  // ET KATEGORİSİ
  'tavuk-eti': {
    canonical: 'Tavuk Eti',
    category: 'et',
    variants: ['göğüs', 'but', 'kanat', 'bütün', 'parça'],
    aliases: ['tavuk', 'piliç', 'chicken'],
    tags: ['beyaz-et', 'kümes-hayvani']
  },
  'dana-eti': {
    canonical: 'Dana Eti',
    category: 'et',
    variants: ['kuşbaşı', 'kıyma', 'biftek', 'antrikot'],
    aliases: ['sığır', 'beef'],
    tags: ['kırmızı-et']
  },
  'kuzu-eti': {
    canonical: 'Kuzu Eti',
    category: 'et',
    variants: ['kuşbaşı', 'kıyma', 'pirzola', 'but'],
    aliases: ['kuzu', 'lamb'],
    tags: ['kırmızı-et']
  },
  'hindi-eti': {
    canonical: 'Hindi Eti',
    category: 'et',
    variants: ['göğüs', 'but', 'kıyma'],
    aliases: ['hindi', 'turkey'],
    tags: ['beyaz-et']
  },

  // YAĞ KATEGORİSİ
  'zeytinyagi': {
    canonical: 'Zeytinyağı',
    category: 'yag',
    variants: ['sızma', 'naturel', 'rafine'],
    aliases: ['zeytinyağ', 'zeytin-yagi', 'olive-oil'],
    tags: ['sivi-yag', 'yemeklik-yag']
  },
  'ayçiçek-yagi': {
    canonical: 'Ayçiçek Yağı',
    category: 'yag',
    variants: ['rafine', 'naturel'],
    aliases: ['aycicek', 'sunflower-oil'],
    tags: ['sivi-yag', 'yemeklik-yag']
  },
  'misir-yagi': {
    canonical: 'Mısır Yağı',
    category: 'yag',
    variants: ['rafine'],
    aliases: ['misir', 'corn-oil'],
    tags: ['sivi-yag', 'yemeklik-yag']
  },
  'tereyagi': {
    canonical: 'Tereyağı',
    category: 'yag',
    variants: ['tuzsuz', 'tuzlu', 'organik'],
    aliases: ['tereyag', 'butter'],
    tags: ['katı-yag', 'süt-ürünü']
  },

  // SEBZE KATEGORİSİ
  'domates': {
    canonical: 'Domates',
    category: 'sebze',
    variants: ['salçalık', 'salkım', 'cherry'],
    aliases: ['tomato'],
    tags: ['taze-sebze', 'kırmızı']
  },
  'patates': {
    canonical: 'Patates',
    category: 'sebze',
    variants: ['kırmızı', 'beyaz', 'granül'],
    aliases: ['potato'],
    tags: ['taze-sebze', 'kök-sebze']
  },
  'sogan': {
    canonical: 'Soğan',
    category: 'sebze',
    variants: ['kuru', 'taze', 'kırmızı'],
    aliases: ['onion'],
    tags: ['taze-sebze']
  },
  'salatalik': {
    canonical: 'Salatalık',
    category: 'sebze',
    variants: ['taze', 'sera'],
    aliases: ['cucumber'],
    tags: ['taze-sebze', 'yeşil']
  },

  // TAHIL KATEGORİSİ
  'pirinc': {
    canonical: 'Pirinç',
    category: 'tahil',
    variants: ['baldo', 'osmancık', 'basmati', 'jasmine'],
    aliases: ['rice'],
    tags: ['tahıl', 'pilav']
  },
  'makarna': {
    canonical: 'Makarna',
    category: 'tahil',
    variants: ['spagetti', 'penne', 'fettuccine', 'burgu'],
    aliases: ['pasta'],
    tags: ['tahıl', 'hamur-işi']
  },
  'bulgur': {
    canonical: 'Bulgur',
    category: 'tahil',
    variants: ['pilavlık', 'köftelik', 'ince'],
    aliases: ['bulgur'],
    tags: ['tahıl']
  },

  // SÜT ÜRÜNLERİ KATEGORİSİ
  'sut': {
    canonical: 'Süt',
    category: 'sut-urunleri',
    variants: ['yağlı', 'yarım-yağlı', 'yağsız'],
    aliases: ['milk'],
    tags: ['içecek', 'süt-ürünleri']
  },
  'yogurt': {
    canonical: 'Yoğurt',
    category: 'sut-urunleri',
    variants: ['tam-yağlı', 'yağsız', 'süzme'],
    aliases: ['yoghurt'],
    tags: ['süt-ürünleri']
  },
  'peynir': {
    canonical: 'Peynir',
    category: 'sut-urunleri',
    variants: ['beyaz', 'kaşar', 'tulum', 'lor'],
    aliases: ['cheese'],
    tags: ['süt-ürünleri']
  },

  // BAKLİYAT KATEGORİSİ
  'kuru-fasulye': {
    canonical: 'Kuru Fasulye',
    category: 'bakliyat',
    variants: ['dermason', 'barbunya', 'horoz'],
    aliases: ['fasulye', 'bean'],
    tags: ['bakliyat', 'kurubaklagil']
  },
  'nohut': {
    canonical: 'Nohut',
    category: 'bakliyat',
    variants: ['orta', 'ince', 'kabuklu'],
    aliases: ['chickpea'],
    tags: ['bakliyat', 'kurubaklagil']
  },
  'mercimek': {
    canonical: 'Mercimek',
    category: 'bakliyat',
    variants: ['kırmızı', 'yeşil', 'sarı'],
    aliases: ['lentil'],
    tags: ['bakliyat', 'kurubaklagil']
  }
};

/**
 * Ana normalization pipeline
 */
export async function normalizeProductPipeline(
  rawInput: string
): Promise<NormalizedProduct> {
  // 1. Tidy text
  let text = tidyText(rawInput);
  
  // 2. Remove stop words
  text = removeStopWords(text);
  
  // 3. Basic normalization (mevcut sistem)
  const basic = basicNormalize(text);
  
  // 4. Dictionary lookup (exact match)
  const dictMatch = dictionaryLookup(basic.product_key);
  if (dictMatch) {
    return {
      input: rawInput,
      canonical: dictMatch.canonical,
      productKey: basic.product_key,
      confidence: 0.95,
      method: 'exact',
      category: dictMatch.category,
      variant: extractVariant(rawInput, dictMatch.variants),
      alternatives: getAlternativesByCategory(dictMatch.category, basic.product_key),
      suggestions: dictMatch.variants.map(v => `${dictMatch.canonical} (${v})`)
    };
  }
  
  // 5. Fuzzy matching
  const fuzzyMatches = fuzzyMatchProducts(basic.product_key, 3);
  if (fuzzyMatches.length > 0 && fuzzyMatches[0].score > 0.7) {
    const best = fuzzyMatches[0];
    const productData = PRODUCT_DB[best.key];

    return {
      input: rawInput,
      canonical: productData.canonical,
      productKey: best.key,
      confidence: best.score,
      method: 'fuzzy',
      category: productData.category,
      variant: extractVariant(rawInput, productData.variants),
      alternatives: getAlternativesByCategory(productData.category, best.key),
      suggestions: productData.variants.map(v => `${productData.canonical} (${v})`)
    };
  }
  
  // 6. AI classification (fallback)
  // TODO: API'ye bağlanacak
  const aiResult = await aiClassification(text);
  if (aiResult) {
    return aiResult;
  }
  
  // 7. Fallback (hiçbir şey bulunamadı)
  return {
    input: rawInput,
    canonical: basic.base || text,
    productKey: basic.product_key || text,
    confidence: 0.3,
    method: 'fallback',
    alternatives: [],
    suggestions: getSuggestions(text)
  };
}

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
function dictionaryLookup(productKey: string): ProductDatabase[string] | null {
  return PRODUCT_DB[productKey] || null;
}

/**
 * Fuzzy matching (Levenshtein distance)
 */
function fuzzyMatchProducts(
  query: string,
  limit = 5
): Array<{ key: string; score: number }> {
  const matches: Array<{ key: string; score: number }> = [];
  
  for (const [key, data] of Object.entries(PRODUCT_DB)) {
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

/**
 * Varyant çıkar
 */
function extractVariant(text: string, variants: string[]): string | undefined {
  const lower = text.toLowerCase();
  
  for (const variant of variants) {
    if (lower.includes(variant.toLowerCase())) {
      return variant;
    }
  }
  
  return undefined;
}

/**
 * AI classification (placeholder - API'ye bağlanacak)
 */
async function aiClassification(text: string): Promise<NormalizedProduct | null> {
  try {
    // TODO: /api/ai/detect-product endpoint'ine istek at
    // Şimdilik null dön
    return null;
  } catch (error) {
    AILogger.warn('[ProductNormalizer] AI classification hatası', {
      text,
      error: error instanceof Error ? error.message : 'Unknown'
    });
    return null;
  }
}

/**
 * Öneriler oluştur
 */
function getSuggestions(text: string): string[] {
  // En popüler ürünlerden öner
  const popular = ['tavuk-eti', 'zeytinyagi', 'domates', 'pirinc', 'makarna'];
  
  return popular.map(key => PRODUCT_DB[key].canonical).slice(0, 5);
}

/**
 * Toplu normalizasyon
 */
export async function normalizeBulk(
  inputs: string[]
): Promise<NormalizedProduct[]> {
  const results = [];
  
  for (const input of inputs) {
    const normalized = await normalizeProductPipeline(input);
    results.push(normalized);
  }
  
  return results;
}

/**
 * Ürün veritabanına yeni ürün ekle
 */
export function addProductToDB(
  key: string,
  data: ProductDatabase[string]
): void {
  PRODUCT_DB[key] = data;
  AILogger.info('[ProductNormalizer] Yeni ürün eklendi', { key, data });
}

/**
 * Kategori bazlı filtreleme
 */
export function getProductsByCategory(category: string): string[] {
  return Object.entries(PRODUCT_DB)
    .filter(([_, data]) => data.category === category)
    .map(([key]) => key);
}

/**
 * Tüm kategorileri listele
 */
export function getAllCategories(): string[] {
  const categories = new Set<string>();
  
  for (const data of Object.values(PRODUCT_DB)) {
    categories.add(data.category);
  }
  
  return Array.from(categories).sort();
}

/**
 * Kategori bazlı alternatif ürünler getir
 * Aynı kategorideki diğer ürünleri döner (kendisi hariç)
 */
export function getAlternativesByCategory(
  category: string,
  excludeKey?: string
): string[] {
  return Object.entries(PRODUCT_DB)
    .filter(([key, data]) =>
      data.category === category && key !== excludeKey
    )
    .map(([_, data]) => data.canonical)
    .slice(0, 5); // Max 5 alternatif
}

/**
 * Debug: Normalization sonucunu yazdır
 */
export function debugNormalization(result: NormalizedProduct): string {
  return [
    `Girdi: "${result.input}"`,
    `Canonical: ${result.canonical}`,
    `Confidence: ${(result.confidence * 100).toFixed(0)}% (${result.method})`,
    result.category ? `Kategori: ${result.category}` : '',
    result.variant ? `Varyant: ${result.variant}` : '',
    result.alternatives?.length ? `Alternatifler: ${result.alternatives.join(', ')}` : '',
    result.suggestions?.length ? `Öneriler: ${result.suggestions.slice(0, 3).join(', ')}` : ''
  ].filter(Boolean).join('\n');
}

