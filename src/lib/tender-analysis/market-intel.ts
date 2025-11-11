/**
 * Market Intelligence Module
 * Analyzes costs and market prices for tender items
 */

import type {
  MarketAnalysis,
  CostItem,
  MenuItem,
  ExtractedFields,
  PriceData
} from './types';
import type { DataPool, ExtractedTable } from '@/lib/document-processor/types';
import { parseMenuFromTable } from '@/lib/document-processor/parser';
import { AILogger } from '@/lib/ai/logger';

// Mock price database (in production, this would connect to real APIs)
const MOCK_PRICE_DB: Record<string, number> = {
  'tavuk': 95,
  'kırmızı et': 450,
  'dana eti': 480,
  'kuzu eti': 520,
  'balık': 180,
  'pirinç': 45,
  'bulgur': 28,
  'makarna': 25,
  'mercimek': 38,
  'nohut': 42,
  'fasulye': 48,
  'domates': 25,
  'salatalık': 20,
  'biber': 35,
  'patlıcan': 30,
  'soğan': 15,
  'patates': 12,
  'havuç': 18,
  'zeytinyağı': 240,
  'ayçiçek yağı': 85,
  'tereyağı': 350,
  'beyaz peynir': 120,
  'kaşar peyniri': 180,
  'yumurta': 3.5,
  'süt': 28,
  'yoğurt': 32,
  'ekmek': 10,
  'un': 22,
  'şeker': 28,
  'tuz': 8,
  'salça': 65
};

/**
 * Extract menu items from data pool
 */
export function extractMenuItems(dataPool: DataPool): MenuItem[] {
  const menuItems: MenuItem[] = [];

  // Find menu tables
  for (const table of dataPool.tables) {
    const headerText = table.headers.join(' ').toLowerCase();

    // Check if this is likely a menu table
    if (headerText.includes('yemek') ||
        headerText.includes('menü') ||
        headerText.includes('öğün') ||
        headerText.includes('malzeme') ||
        headerText.includes('gramaj')) {

      const items = parseMenuFromTable(table.headers, table.rows);
      menuItems.push(...items);
    }
  }

  // If no menu tables, try to extract from text
  if (menuItems.length === 0) {
    menuItems.push(...extractMenuFromText(dataPool));
  }

  return menuItems;
}

/**
 * Extract menu items from text blocks
 */
function extractMenuFromText(dataPool: DataPool): MenuItem[] {
  const items: MenuItem[] = [];
  const foodKeywords = Object.keys(MOCK_PRICE_DB);

  for (const block of dataPool.textBlocks) {
    const lowerText = block.text.toLowerCase();

    for (const food of foodKeywords) {
      if (lowerText.includes(food)) {
        // Try to extract quantity if mentioned nearby
        const quantityMatch = lowerText.match(new RegExp(`(\\d+)\\s*(kg|gr|lt|adet)?\\s*${food}`));

        items.push({
          name: food,
          portion: quantityMatch ? parseFloat(quantityMatch[1]) : undefined,
          unit: quantityMatch?.[2] || 'kg',
          category: categorizeFood(food)
        });
      }
    }
  }

  // Deduplicate
  const uniqueItems = items.reduce((acc, item) => {
    if (!acc.find(i => i.name === item.name)) {
      acc.push(item);
    }
    return acc;
  }, [] as MenuItem[]);

  return uniqueItems;
}

/**
 * Categorize food items
 */
function categorizeFood(foodName: string): string {
  const categories: Record<string, string[]> = {
    'et_grubu': ['tavuk', 'kırmızı et', 'dana', 'kuzu', 'balık'],
    'tahil_grubu': ['pirinç', 'bulgur', 'makarna', 'un', 'ekmek'],
    'baklagil': ['mercimek', 'nohut', 'fasulye'],
    'sebze': ['domates', 'salatalık', 'biber', 'patlıcan', 'soğan', 'patates', 'havuç'],
    'yag_grubu': ['zeytinyağı', 'ayçiçek yağı', 'tereyağı'],
    'sut_grubu': ['süt', 'yoğurt', 'beyaz peynir', 'kaşar'],
    'diger': ['yumurta', 'şeker', 'tuz', 'salça']
  };

  for (const [category, foods] of Object.entries(categories)) {
    if (foods.some(food => foodName.includes(food))) {
      return category;
    }
  }

  return 'diger';
}

/**
 * Perform market analysis
 */
export async function performMarketAnalysis(
  dataPool: DataPool,
  extractedFields: ExtractedFields,
  menuItems?: MenuItem[]
): Promise<MarketAnalysis> {
  const startTime = Date.now();

  try {
    AILogger.info('Starting market analysis', {
      menuItems: menuItems?.length || 0,
      budget: extractedFields.tahmini_butce
    });

    // Extract menu items if not provided
    const items = menuItems || extractMenuItems(dataPool);

    // Calculate costs for each item
    const costItems = await calculateCostItems(items, extractedFields);

    // Calculate total costs
    const totalCost = costItems.reduce((sum, item) => sum + item.total_price, 0);

    // Calculate breakdown
    const costBreakdown = calculateCostBreakdown(totalCost, extractedFields);

    // Calculate forecast
    const forecast = calculateForecast(totalCost);

    // Compare with budget
    const comparison = compareWithBudget(
      totalCost,
      extractedFields.tahmini_butce || 0
    );

    // Generate warnings
    const warnings = generateWarnings(costItems, comparison);

    const analysis: MarketAnalysis = {
      cost_items: costItems,
      total_cost: totalCost,
      cost_breakdown: costBreakdown,
      price_sources: {
        tuik_used: false, // In production, would check actual sources
        web_used: false,
        db_used: true,
        manual_used: false
      },
      forecast,
      comparison,
      warnings
    };

    AILogger.success('Market analysis completed', {
      duration: Date.now() - startTime,
      totalCost,
      riskLevel: comparison.risk_level
    });

    return analysis;

  } catch (error) {
    AILogger.error('Market analysis failed', { error });
    throw error;
  }
}

/**
 * Calculate cost for each item
 */
async function calculateCostItems(
  menuItems: MenuItem[],
  extractedFields: ExtractedFields
): Promise<CostItem[]> {
  const costItems: CostItem[] = [];

  // Calculate daily portions
  const dailyPortions = (extractedFields.kisi_sayisi || 1000) *
                       (extractedFields.ogun_sayisi || 3);

  // Calculate total days
  const totalDays = extractedFields.gun_sayisi || 365;

  for (const item of menuItems) {
    const normalizedName = normalizeProductName(item.name);
    const pricePerKg = await getMarketPrice(normalizedName);

    // Estimate quantity if not specified
    let quantity = item.portion || 0;

    if (quantity === 0) {
      // Estimate based on category
      const portionSize = estimatePortionSize(item.category || 'diger');
      quantity = (portionSize * dailyPortions * totalDays) / 1000; // Convert to kg
    } else {
      // Scale up the quantity for total period
      quantity = (quantity * dailyPortions * totalDays) / 1000;
    }

    const totalPrice = pricePerKg * quantity;

    costItems.push({
      product_key: normalizedName.replace(/\s+/g, '_'),
      name_original: item.name,
      name_normalized: normalizedName,
      category: item.category,
      unit: 'kg',
      quantity: Math.round(quantity * 100) / 100,
      prices: {
        db: {
          value: pricePerKg,
          currency: 'TRY',
          date: new Date().toISOString(),
          source: 'internal_db'
        }
      },
      unit_price: pricePerKg,
      confidence: 0.8,
      total_price: Math.round(totalPrice * 100) / 100
    });
  }

  return costItems;
}

/**
 * Normalize product name for price lookup
 */
function normalizeProductName(name: string): string {
  const normalized = name.toLowerCase().trim();

  // Map variations to standard names
  const mappings: Record<string, string> = {
    'tavuk eti': 'tavuk',
    'tavuk but': 'tavuk',
    'tavuk göğsü': 'tavuk',
    'dana kıyma': 'dana eti',
    'kıyma': 'kırmızı et',
    'kuzu kuşbaşı': 'kuzu eti',
    'zeytinyağ': 'zeytinyağı',
    'ayçiçek yağ': 'ayçiçek yağı',
    'beyaz un': 'un'
  };

  return mappings[normalized] || normalized;
}

/**
 * Get market price for a product
 */
async function getMarketPrice(productName: string): Promise<number> {
  // In production, this would:
  // 1. Check cache
  // 2. Query TUIK API
  // 3. Scrape web prices
  // 4. Query internal database
  // 5. Apply fusion algorithm

  // For now, use mock prices
  for (const [key, price] of Object.entries(MOCK_PRICE_DB)) {
    if (productName.includes(key)) {
      return price;
    }
  }

  // Default price if not found
  return 50; // Average price as fallback
}

/**
 * Estimate portion size by category (grams per person per meal)
 */
function estimatePortionSize(category: string): number {
  const portions: Record<string, number> = {
    'et_grubu': 120,
    'tahil_grubu': 80,
    'baklagil': 60,
    'sebze': 150,
    'yag_grubu': 20,
    'sut_grubu': 200,
    'diger': 50
  };

  return portions[category] || 100;
}

/**
 * Calculate cost breakdown
 */
function calculateCostBreakdown(
  foodCost: number,
  extractedFields: ExtractedFields
): MarketAnalysis['cost_breakdown'] {
  // Estimate other costs as percentages of food cost
  const laborCost = foodCost * 0.35; // 35% for labor
  const operationalCost = foodCost * 0.20; // 20% for operations
  const overhead = foodCost * 0.15; // 15% for overhead
  const profitMargin = foodCost * 0.10; // 10% profit margin

  return {
    food_cost: Math.round(foodCost),
    labor_cost: Math.round(laborCost),
    operational_cost: Math.round(operationalCost),
    overhead: Math.round(overhead),
    profit_margin: Math.round(profitMargin)
  };
}

/**
 * Calculate price forecast
 */
function calculateForecast(currentTotal: number): MarketAnalysis['forecast'] {
  // Simple forecast based on inflation estimates
  const monthlyInflation = 0.03; // 3% monthly inflation estimate
  const seasonalFactor = 1.05; // 5% seasonal increase

  const nextMonth = currentTotal * (1 + monthlyInflation);
  const nextQuarter = currentTotal * Math.pow(1 + monthlyInflation, 3) * seasonalFactor;

  return {
    current_month: currentTotal,
    next_month: Math.round(nextMonth),
    next_quarter: Math.round(nextQuarter),
    trend: 'up',
    seasonal_factor: seasonalFactor,
    confidence: 0.7
  };
}

/**
 * Compare calculated cost with budget
 */
function compareWithBudget(
  totalCost: number,
  budget: number
): MarketAnalysis['comparison'] {
  const difference = budget - totalCost;
  const marginPercentage = budget > 0 ? (difference / budget) * 100 : 0;

  let riskLevel: 'safe' | 'tight' | 'risky';
  let recommendation: string;

  if (marginPercentage > 20) {
    riskLevel = 'safe';
    recommendation = 'Bütçe yeterli, güvenle teklif verilebilir';
  } else if (marginPercentage > 5) {
    riskLevel = 'tight';
    recommendation = 'Bütçe sıkı, maliyet optimizasyonu önerilir';
  } else {
    riskLevel = 'risky';
    recommendation = 'Bütçe yetersiz, teklif vermeden önce detaylı analiz gerekli';
  }

  return {
    budget_vs_calculated: difference,
    margin_percentage: Math.round(marginPercentage * 10) / 10,
    risk_level: riskLevel,
    recommendation
  };
}

/**
 * Generate warnings based on analysis
 */
function generateWarnings(
  costItems: CostItem[],
  comparison: MarketAnalysis['comparison']
): string[] {
  const warnings: string[] = [];

  // Check for high-cost items
  const highCostItems = costItems.filter(item => item.total_price > 1000000);
  if (highCostItems.length > 0) {
    warnings.push(`${highCostItems.length} kalem yüksek maliyetli ürün tespit edildi`);
  }

  // Check for low confidence prices
  const lowConfidence = costItems.filter(item => item.confidence < 0.6);
  if (lowConfidence.length > 0) {
    warnings.push(`${lowConfidence.length} ürün için fiyat güvenilirliği düşük`);
  }

  // Budget warnings
  if (comparison.risk_level === 'risky') {
    warnings.push('Bütçe riski yüksek! Detaylı inceleme gerekli');
  }

  // Seasonal warnings
  const now = new Date();
  const month = now.getMonth();
  if (month >= 10 || month <= 2) {
    warnings.push('Kış ayları için ısınma maliyetleri hesaba katılmalı');
  }

  return warnings;
}