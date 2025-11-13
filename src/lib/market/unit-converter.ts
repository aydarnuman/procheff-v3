/**
 * Advanced Unit Normalization & Conversion
 * Akıllı paket/birim dönüşümü ve fiyat normalizasyonu
 */

import type { PackagingInfo } from './schema';

export interface NormalizedPrice {
  unitPrice: number;           // Normalize edilmiş birim fiyat
  standardUnit: string;        // Standart birim (kg, lt, adet)
  originalPrice: number;       // Orijinal fiyat
  originalQuantity: number;    // Orijinal miktar
  conversionFactor: number;    // Dönüşüm çarpanı
  packaging?: PackagingInfo;
}

export interface ParsedPackaging {
  quantity: number;            // Miktar (5, 10, 18 gibi)
  unit: string;                // Birim (kg, lt, adet)
  baseUnit: string;            // Standart birim
  multiplier: number;          // Çarpan (5 kg = 5x)
  description: string;         // "5 kg çuval" gibi
}

/**
 * Birim dönüşüm tablosu
 */
const UNIT_CONVERSIONS: Record<string, { base: string; factor: number }> = {
  // Ağırlık birimleri -> kg
  'kg': { base: 'kg', factor: 1 },
  'kilogram': { base: 'kg', factor: 1 },
  'kilo': { base: 'kg', factor: 1 },
  'gr': { base: 'kg', factor: 0.001 },
  'gram': { base: 'kg', factor: 0.001 },
  'g': { base: 'kg', factor: 0.001 },
  'ton': { base: 'kg', factor: 1000 },
  
  // Hacim birimleri -> lt
  'lt': { base: 'lt', factor: 1 },
  'litre': { base: 'lt', factor: 1 },
  'l': { base: 'lt', factor: 1 },
  'ml': { base: 'lt', factor: 0.001 },
  'mililitre': { base: 'lt', factor: 0.001 },
  'cl': { base: 'lt', factor: 0.01 },
  
  // Adet
  'adet': { base: 'adet', factor: 1 },
  'ad': { base: 'adet', factor: 1 },
  'piece': { base: 'adet', factor: 1 },
  'pcs': { base: 'adet', factor: 1 },
  'tane': { base: 'adet', factor: 1 },
};

/**
 * Paketleme pattern'leri (regex ile tespit)
 */
const PACKAGING_PATTERNS = [
  // "5 kg çuval", "10 kg torba"
  { regex: /(\d+(?:[.,]\d+)?)\s*(kg|kilo|kilogram|gr|gram|g)\s*(?:çuval|torba|koli|paket)?/i, type: 'weight' },
  
  // "18 LT bidon", "5 lt şişe"
  { regex: /(\d+(?:[.,]\d+)?)\s*(lt|litre|l|ml)\s*(?:bidon|şişe|kova|teneke)?/i, type: 'volume' },
  
  // "30'lu koli", "100 adetlik paket"
  { regex: /(\d+)[''']?lu\s*(?:koli|paket)?/i, type: 'count' },
  { regex: /(\d+)\s*adet(?:lik)?/i, type: 'count' },
  
  // "5x1 kg", "6x500gr"
  { regex: /(\d+)\s*x\s*(\d+(?:[.,]\d+)?)\s*(kg|gr|g|lt|ml)/i, type: 'multi' },
];

/**
 * Paketleme bilgisini parse et
 */
export function parsePackaging(input: string): ParsedPackaging {
  const normalized = input.toLowerCase().trim();
  
  // Pattern matching
  for (const pattern of PACKAGING_PATTERNS) {
    const match = normalized.match(pattern.regex);
    
    if (match) {
      if (pattern.type === 'multi') {
        // "6x500gr" formatı
        const count = parseInt(match[1]);
        const quantity = parseFloat(match[2].replace(',', '.'));
        const unit = match[3];
        const conversion = UNIT_CONVERSIONS[unit] || { base: unit, factor: 1 };
        
        return {
          quantity: count * quantity * conversion.factor,
          unit: conversion.base,
          baseUnit: conversion.base,
          multiplier: count * quantity * conversion.factor,
          description: `${count}x${quantity}${unit}`
        };
      } else {
        // Standart format
        const quantity = parseFloat(match[1].replace(',', '.'));
        const unit = match[2];
        const conversion = UNIT_CONVERSIONS[unit] || { base: unit, factor: 1 };
        
        return {
          quantity: quantity * conversion.factor,
          unit: conversion.base,
          baseUnit: conversion.base,
          multiplier: quantity * conversion.factor,
          description: `${quantity}${unit}`
        };
      }
    }
  }
  
  // Default: birim tespit edilemedi
  return {
    quantity: 1,
    unit: 'kg',
    baseUnit: 'kg',
    multiplier: 1,
    description: input
  };
}

/**
 * Fiyatı normalize et (paket fiyatından birim fiyata)
 */
export function normalizePrice(
  totalPrice: number,
  packaging: string | ParsedPackaging
): NormalizedPrice {
  const parsed = typeof packaging === 'string' 
    ? parsePackaging(packaging) 
    : packaging;
  
  // Birim fiyat hesapla
  const unitPrice = totalPrice / parsed.multiplier;
  
  return {
    unitPrice: Number(unitPrice.toFixed(2)),
    standardUnit: parsed.baseUnit,
    originalPrice: totalPrice,
    originalQuantity: parsed.quantity,
    conversionFactor: parsed.multiplier,
    packaging: {
      size: parsed.quantity,
      unit: parsed.baseUnit,
      type: detectPackagingType(parsed.description),
      description: parsed.description
    }
  };
}

/**
 * Paketleme tipini tespit et
 */
function detectPackagingType(description: string): 'bulk' | 'retail' | 'wholesale' {
  const bulk = /çuval|torba|bidon|koli|teneke|kasa/i;
  const wholesale = /toptan|\dx\d|koli/i;
  
  if (bulk.test(description)) return 'bulk';
  if (wholesale.test(description)) return 'wholesale';
  return 'retail';
}

/**
 * İki birim arasında dönüşüm
 */
export function convertUnit(
  value: number,
  fromUnit: string,
  toUnit: string
): number | null {
  const from = UNIT_CONVERSIONS[fromUnit.toLowerCase()];
  const to = UNIT_CONVERSIONS[toUnit.toLowerCase()];
  
  if (!from || !to) return null;
  if (from.base !== to.base) return null; // Farklı tipler arası dönüşüm yok
  
  // Önce base unit'e çevir, sonra target unit'e
  const inBase = value * from.factor;
  const result = inBase / to.factor;
  
  return Number(result.toFixed(4));
}

/**
 * Fiyatları karşılaştırılabilir hale getir
 */
export function makeComparable(
  prices: Array<{ price: number; unit: string; packaging?: string }>
): Array<NormalizedPrice> {
  return prices.map(p => {
    if (p.packaging) {
      return normalizePrice(p.price, p.packaging);
    }
    
    // Packaging yoksa doğrudan birim fiyat olarak kabul et
    return {
      unitPrice: p.price,
      standardUnit: p.unit,
      originalPrice: p.price,
      originalQuantity: 1,
      conversionFactor: 1
    };
  });
}

/**
 * Örnekler:
 * - "Zeytinyağı 18 LT bidon 450 TL" -> 25 TL/lt
 * - "Pirinç 5 kg çuval 180 TL" -> 36 TL/kg
 * - "Yumurta 30'lu koli 180 TL" -> 6 TL/adet
 */
export function smartPriceExtraction(
  productText: string,
  totalPrice: number
): NormalizedPrice {
  // Önce packaging bilgisini bul
  const packaging = parsePackaging(productText);
  
  // Fiyatı normalize et
  return normalizePrice(totalPrice, packaging);
}

/**
 * Geriye dönük dönüşüm (birim fiyattan paket fiyatı)
 */
export function calculatePackagePrice(
  unitPrice: number,
  packaging: string | ParsedPackaging
): number {
  const parsed = typeof packaging === 'string' 
    ? parsePackaging(packaging) 
    : packaging;
  
  return Number((unitPrice * parsed.multiplier).toFixed(2));
}

/**
 * Debug: Dönüşüm bilgilerini yazdır
 */
export function debugConversion(input: string, price: number): string {
  const normalized = smartPriceExtraction(input, price);
  
  return [
    `Girdi: "${input}" = ${price} TL`,
    `Paket: ${normalized.packaging?.description}`,
    `Miktar: ${normalized.originalQuantity} ${normalized.standardUnit}`,
    `Dönüşüm: ${normalized.conversionFactor}x`,
    `Birim Fiyat: ${normalized.unitPrice} TL/${normalized.standardUnit}`,
  ].join('\n');
}

/**
 * Birim validasyonu
 */
export function isValidUnit(unit: string): boolean {
  return unit.toLowerCase() in UNIT_CONVERSIONS;
}

/**
 * Desteklenen birimleri listele
 */
export function getSupportedUnits(): string[] {
  return Object.keys(UNIT_CONVERSIONS);
}

/**
 * Birim kategorisini al (weight, volume, count)
 */
export function getUnitCategory(unit: string): 'weight' | 'volume' | 'count' | null {
  const conversion = UNIT_CONVERSIONS[unit.toLowerCase()];
  if (!conversion) return null;
  
  if (conversion.base === 'kg') return 'weight';
  if (conversion.base === 'lt') return 'volume';
  if (conversion.base === 'adet') return 'count';
  
  return null;
}

