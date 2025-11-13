/**
 * Portion Calculator
 * Gramaj/maliyet hesaplama - Catering özel
 */

import { convertUnit } from './unit-converter';

export interface PortionCost {
  costPerPortion: number;      // Porsiyon maliyeti
  unit: string;                // Porsiyon birimi (g, ml, adet)
  basePrice: number;           // Birim fiyat (TL/kg, TL/lt)
  multiplier: number;          // Dönüşüm çarpanı
  breakdown: string;           // Açıklama
}

export interface PortionCalculation {
  productName: string;
  unitPrice: number;           // TL/kg veya TL/lt
  standardUnit: string;        // kg, lt, adet
  
  // Porsiyon bilgileri
  portionSize: number;         // 250, 150, vb.
  portionUnit: string;         // g, ml, adet
  servings: number;            // Kaç porsiyon
  
  // Hesaplanan değerler
  totalCost: number;           // Toplam maliyet
  costPerServing: number;      // Porsiyon başı maliyet
  totalQuantity: number;       // Toplam miktar (kg/lt cinsinden)
}

/**
 * Porsiyon maliyetini hesapla
 */
export function calculatePortionCost(
  unitPrice: number,
  unit: string,
  portionSize: number,
  portionUnit: string
): PortionCost {
  // Birim dönüşümü yap
  let multiplier = 1;
  
  // kg -> g dönüşümü
  if (unit === 'kg' && (portionUnit === 'g' || portionUnit === 'gr' || portionUnit === 'gram')) {
    multiplier = portionSize / 1000; // 250g = 0.25 kg
  }
  // lt -> ml dönüşümü
  else if (unit === 'lt' && (portionUnit === 'ml' || portionUnit === 'mililitre')) {
    multiplier = portionSize / 1000; // 500ml = 0.5 lt
  }
  // adet -> adet
  else if (unit === 'adet' && portionUnit === 'adet') {
    multiplier = portionSize;
  }
  // Aynı birim
  else if (unit === portionUnit) {
    multiplier = portionSize;
  }
  // Desteklenmeyen dönüşüm
  else {
    const converted = convertUnit(portionSize, portionUnit, unit);
    if (converted !== null) {
      multiplier = converted;
    }
  }
  
  const cost = unitPrice * multiplier;
  
  return {
    costPerPortion: Number(cost.toFixed(2)),
    unit: portionUnit,
    basePrice: unitPrice,
    multiplier,
    breakdown: `${portionSize}${portionUnit} × ${unitPrice} TL/${unit} = ${cost.toFixed(2)} TL`
  };
}

/**
 * Çoklu porsiyon hesaplama (bir yemek için)
 */
export function calculateMealCost(
  ingredients: Array<{
    name: string;
    unitPrice: number;
    unit: string;
    portionSize: number;
    portionUnit: string;
  }>
): {
  ingredients: Array<PortionCost & { name: string }>;
  totalCostPerServing: number;
  breakdown: string[];
} {
  const calculatedIngredients = ingredients.map(ing => ({
    name: ing.name,
    ...calculatePortionCost(
      ing.unitPrice,
      ing.unit,
      ing.portionSize,
      ing.portionUnit
    )
  }));
  
  const totalCost = calculatedIngredients.reduce(
    (sum, ing) => sum + ing.costPerPortion,
    0
  );
  
  const breakdown = calculatedIngredients.map(ing => 
    `${ing.name}: ${ing.breakdown}`
  );
  
  breakdown.push(`TOPLAM: ${totalCost.toFixed(2)} TL`);
  
  return {
    ingredients: calculatedIngredients,
    totalCostPerServing: Number(totalCost.toFixed(2)),
    breakdown
  };
}

/**
 * Toplu porsiyon hesaplama (kaç kişilik?)
 */
export function calculateBulkPortions(
  unitPrice: number,
  unit: string,
  portionSize: number,
  portionUnit: string,
  numberOfServings: number
): PortionCalculation {
  const singlePortion = calculatePortionCost(
    unitPrice,
    unit,
    portionSize,
    portionUnit
  );
  
  const totalCost = singlePortion.costPerPortion * numberOfServings;
  const totalQuantity = singlePortion.multiplier * numberOfServings;
  
  return {
    productName: '',
    unitPrice,
    standardUnit: unit,
    portionSize,
    portionUnit,
    servings: numberOfServings,
    totalCost: Number(totalCost.toFixed(2)),
    costPerServing: singlePortion.costPerPortion,
    totalQuantity: Number(totalQuantity.toFixed(3))
  };
}

/**
 * Ters hesaplama: Bütçeden porsiyon sayısını bul
 */
export function calculateServingsFromBudget(
  budget: number,
  unitPrice: number,
  unit: string,
  portionSize: number,
  portionUnit: string
): {
  maxServings: number;
  costPerServing: number;
  remainingBudget: number;
} {
  const singlePortion = calculatePortionCost(
    unitPrice,
    unit,
    portionSize,
    portionUnit
  );
  
  const maxServings = Math.floor(budget / singlePortion.costPerPortion);
  const totalCost = maxServings * singlePortion.costPerPortion;
  
  return {
    maxServings,
    costPerServing: singlePortion.costPerPortion,
    remainingBudget: Number((budget - totalCost).toFixed(2))
  };
}

/**
 * Kar marjı hesaplama (satış fiyatı belirlemek için)
 */
export function calculateProfitMargin(
  costPerServing: number,
  marginPercentage: number
): {
  costPerServing: number;
  sellingPrice: number;
  profit: number;
  marginPercentage: number;
} {
  const sellingPrice = costPerServing * (1 + marginPercentage / 100);
  const profit = sellingPrice - costPerServing;
  
  return {
    costPerServing,
    sellingPrice: Number(sellingPrice.toFixed(2)),
    profit: Number(profit.toFixed(2)),
    marginPercentage
  };
}

/**
 * Standart porsiyonlar (yaygın kullanım)
 */
export const STANDARD_PORTIONS = {
  // Et ürünleri
  meat_main: { size: 150, unit: 'g', description: 'Ana yemek (et)' },
  meat_side: { size: 80, unit: 'g', description: 'Yan yemek (et)' },
  chicken_main: { size: 180, unit: 'g', description: 'Ana yemek (tavuk)' },
  
  // Sebzeler
  vegetable_main: { size: 200, unit: 'g', description: 'Ana sebze yemeği' },
  vegetable_side: { size: 100, unit: 'g', description: 'Garnitür sebze' },
  salad: { size: 120, unit: 'g', description: 'Salata' },
  
  // Tahıllar
  rice: { size: 80, unit: 'g', description: 'Pilav' },
  pasta: { size: 80, unit: 'g', description: 'Makarna' },
  bulgur: { size: 80, unit: 'g', description: 'Bulgur' },
  
  // Sıvılar
  soup: { size: 250, unit: 'ml', description: 'Çorba' },
  beverage: { size: 200, unit: 'ml', description: 'İçecek' },
  
  // Ekmek ve diğer
  bread: { size: 1, unit: 'adet', description: 'Ekmek' },
  dessert: { size: 100, unit: 'g', description: 'Tatlı' },
};

/**
 * Standart porsiyona göre hızlı hesaplama
 */
export function quickCalculate(
  unitPrice: number,
  unit: string,
  portionType: keyof typeof STANDARD_PORTIONS
): PortionCost {
  const standard = STANDARD_PORTIONS[portionType];
  
  return calculatePortionCost(
    unitPrice,
    unit,
    standard.size,
    standard.unit
  );
}

/**
 * Yemek kartı maliyet özeti
 */
export function generateCostSummary(
  portions: PortionCalculation[]
): {
  totalIngredients: number;
  totalCost: number;
  totalServings: number;
  avgCostPerServing: number;
  mostExpensive: PortionCalculation | null;
  cheapest: PortionCalculation | null;
} {
  if (portions.length === 0) {
    return {
      totalIngredients: 0,
      totalCost: 0,
      totalServings: 0,
      avgCostPerServing: 0,
      mostExpensive: null,
      cheapest: null
    };
  }
  
  const totalCost = portions.reduce((sum, p) => sum + p.totalCost, 0);
  const totalServings = portions[0].servings; // Aynı servis sayısı varsayımı
  
  const sorted = [...portions].sort((a, b) => 
    b.costPerServing - a.costPerServing
  );
  
  return {
    totalIngredients: portions.length,
    totalCost: Number(totalCost.toFixed(2)),
    totalServings,
    avgCostPerServing: Number((totalCost / totalServings).toFixed(2)),
    mostExpensive: sorted[0] || null,
    cheapest: sorted[sorted.length - 1] || null
  };
}

/**
 * Debug: Porsiyon hesaplama sonucunu yazdır
 */
export function debugPortion(calc: PortionCalculation): string {
  return [
    `Ürün: ${calc.productName}`,
    `Birim Fiyat: ${calc.unitPrice} TL/${calc.standardUnit}`,
    `Porsiyon: ${calc.portionSize}${calc.portionUnit}`,
    `Servis: ${calc.servings} kişi`,
    ``,
    `Porsiyon Başı: ${calc.costPerServing} TL`,
    `Toplam Maliyet: ${calc.totalCost} TL`,
    `Toplam Miktar: ${calc.totalQuantity} ${calc.standardUnit}`
  ].join('\n');
}

