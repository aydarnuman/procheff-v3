/**
 * Ürün adı normalizasyonu - Türkçe karakterleri düzelt ve standartlaştır
 */

const PRODUCT_DICT: Record<string, string> = {
  'tavuk gogus': 'tavuk eti',
  'tavuk gogüs': 'tavuk eti',
  'tavuk göğüs': 'tavuk eti',
  'tavuk (gogus)': 'tavuk eti',
  'tavuk (göğüs)': 'tavuk eti',
  'zeytinyag': 'zeytinyağı',
  'zeytinyağ': 'zeytinyağı',
  'zeytin yagi': 'zeytinyağı',
  'zeytin yağı': 'zeytinyağı',
  'makarna(spagetti)': 'makarna',
  'makarna (spagetti)': 'makarna',
  'sut': 'süt',
  'yogurt': 'yoğurt',
  'peynir beyaz': 'beyaz peynir',
  'domates (salcalik)': 'domates',
  'domates salcalik': 'domates',
  'biber (sivri)': 'sivri biber',
  'biber sivri': 'sivri biber',
  'sogan': 'soğan',
  'sarimsak': 'sarımsak',
  'patates': 'patates',
  'pirinc': 'pirinç',
  'mercimek': 'mercimek',
  'nohut': 'nohut',
  'fasulye': 'fasulye',
  'un': 'un',
  'seker': 'şeker',
  'tuz': 'tuz',
  'karabiber': 'karabiber',
  'kirmizi biber': 'kırmızı biber',
  'kimyon': 'kimyon',
  'kekik': 'kekik',
  'limon': 'limon',
  'sizma zeytinyagi': 'zeytinyağı',
  'sizma zeytin yagi': 'zeytinyağı',
};

/**
 * Türkçe karakterleri normalize et (İ -> i, Ö -> o, vs.)
 */
function normalizeTurkish(text: string): string {
  return text
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'G')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 'S')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'O')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'U')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C');
}

/**
 * Ürün adını normalize et ve key oluştur
 */
export function normalizeProductName(input: string): { base: string; product_key: string; normalized: string } {
  if (!input || typeof input !== 'string') {
    return { base: '', product_key: '', normalized: '' };
  }

  // 1. Küçük harf + trim + çoklu boşlukları tek yap
  let normalized = input.toLowerCase().trim().replace(/\s+/g, ' ');

  // 2. Parantezleri temizle
  normalized = normalized.replace(/[()]/g, '');

  // 3. Türkçe karakterleri düzelt
  const turkishNormalized = normalizeTurkish(normalized);

  // 4. Sözlükten karşılığını bul
  const base = PRODUCT_DICT[turkishNormalized] || PRODUCT_DICT[normalized] || normalized;

  // 5. URL-safe key oluştur (boşlukları tire yap)
  const product_key = base.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return { base, product_key, normalized: turkishNormalized };
}

/**
 * Birim normalizasyonu
 */
export function normalizeUnit(unit?: string): 'kg' | 'lt' | 'adet' | string {
  if (!unit) return 'kg';

  const u = unit.toLowerCase().trim();

  const unitMap: Record<string, string> = {
    'kilogram': 'kg',
    'kilo': 'kg',
    'kg.': 'kg',
    'litre': 'lt',
    'l': 'lt',
    'lt.': 'lt',
    'adet': 'adet',
    'ad': 'adet',
    'ad.': 'adet',
    'piece': 'adet',
    'gram': 'gr',
    'gr.': 'gr',
    'mililitre': 'ml',
    'ml.': 'ml',
  };

  return unitMap[u] || u;
}
