/**
 * Cost Expert Module
 * Domain-specific knowledge for cost calculation and optimization
 */

import { AILogger } from '@/lib/ai/logger';

// Ingredient price database with seasonal variations
export const INGREDIENT_PRICES = {
  // Et Grubu
  'dana_eti': {
    name: 'Dana Eti (Kuşbaşı)',
    unit: 'kg',
    basePrice: 380,
    quality: {
      premium: 450,
      standard: 380,
      economy: 320
    },
    seasonalVariation: {
      summer: 0.95,
      autumn: 1.0,
      winter: 1.05,
      spring: 0.98
    },
    wastageRate: 0.15,
    cookingLoss: 0.25,
    shelfLife: 3,
    suppliers: ['Metro', 'Makro', 'Yerel Kasap']
  },
  'tavuk_eti': {
    name: 'Tavuk Eti (But)',
    unit: 'kg',
    basePrice: 45,
    quality: {
      premium: 55,
      standard: 45,
      economy: 38
    },
    seasonalVariation: {
      summer: 1.05,
      autumn: 1.0,
      winter: 0.95,
      spring: 1.0
    },
    wastageRate: 0.10,
    cookingLoss: 0.20,
    shelfLife: 2,
    suppliers: ['Banvit', 'Şenpiliç', 'Erpiliç']
  },
  'kiyma': {
    name: 'Kıyma (Dana)',
    unit: 'kg',
    basePrice: 320,
    quality: {
      premium: 380,
      standard: 320,
      economy: 280
    },
    seasonalVariation: {
      summer: 0.98,
      autumn: 1.0,
      winter: 1.02,
      spring: 1.0
    },
    wastageRate: 0.05,
    cookingLoss: 0.15,
    shelfLife: 1,
    suppliers: ['Metro', 'Makro', 'Yerel Kasap']
  },

  // Sebze Grubu
  'domates': {
    name: 'Domates',
    unit: 'kg',
    basePrice: 15,
    quality: {
      premium: 20,
      standard: 15,
      economy: 10
    },
    seasonalVariation: {
      summer: 0.60,
      autumn: 0.80,
      winter: 1.50,
      spring: 1.10
    },
    wastageRate: 0.08,
    cookingLoss: 0.05,
    shelfLife: 5,
    suppliers: ['Hal', 'Metro', 'Yerel Üretici']
  },
  'patates': {
    name: 'Patates',
    unit: 'kg',
    basePrice: 10,
    quality: {
      premium: 12,
      standard: 10,
      economy: 8
    },
    seasonalVariation: {
      summer: 0.90,
      autumn: 0.85,
      winter: 1.10,
      spring: 1.15
    },
    wastageRate: 0.15,
    cookingLoss: 0.10,
    shelfLife: 14,
    suppliers: ['Hal', 'Metro', 'Yerel Üretici']
  },
  'sogan': {
    name: 'Soğan',
    unit: 'kg',
    basePrice: 8,
    quality: {
      premium: 10,
      standard: 8,
      economy: 6
    },
    seasonalVariation: {
      summer: 0.95,
      autumn: 0.90,
      winter: 1.05,
      spring: 1.10
    },
    wastageRate: 0.10,
    cookingLoss: 0.15,
    shelfLife: 21,
    suppliers: ['Hal', 'Metro']
  },

  // Bakliyat Grubu
  'pirinc': {
    name: 'Pirinç (Baldo)',
    unit: 'kg',
    basePrice: 45,
    quality: {
      premium: 55,
      standard: 45,
      economy: 35
    },
    seasonalVariation: {
      summer: 1.0,
      autumn: 1.0,
      winter: 1.0,
      spring: 1.0
    },
    wastageRate: 0.02,
    cookingLoss: -1.5, // Volume gain when cooked
    shelfLife: 365,
    suppliers: ['Metro', 'Makro', 'Toptan Gıda']
  },
  'bulgur': {
    name: 'Bulgur (Pilavlık)',
    unit: 'kg',
    basePrice: 20,
    quality: {
      premium: 25,
      standard: 20,
      economy: 16
    },
    seasonalVariation: {
      summer: 1.0,
      autumn: 1.0,
      winter: 1.0,
      spring: 1.0
    },
    wastageRate: 0.02,
    cookingLoss: -1.8,
    shelfLife: 365,
    suppliers: ['Metro', 'Makro', 'Toptan Gıda']
  },
  'mercimek': {
    name: 'Kırmızı Mercimek',
    unit: 'kg',
    basePrice: 35,
    quality: {
      premium: 40,
      standard: 35,
      economy: 30
    },
    seasonalVariation: {
      summer: 1.0,
      autumn: 0.95,
      winter: 1.05,
      spring: 1.0
    },
    wastageRate: 0.03,
    cookingLoss: -1.2,
    shelfLife: 365,
    suppliers: ['Metro', 'Makro', 'Toptan Gıda']
  },

  // Yağ ve Süt Ürünleri
  'zeytinyagi': {
    name: 'Zeytinyağı',
    unit: 'lt',
    basePrice: 180,
    quality: {
      premium: 250,
      standard: 180,
      economy: 120
    },
    seasonalVariation: {
      summer: 1.0,
      autumn: 0.90,
      winter: 1.05,
      spring: 1.05
    },
    wastageRate: 0.01,
    cookingLoss: 0,
    shelfLife: 730,
    suppliers: ['Metro', 'Marmarabirlik', 'Tariş']
  },
  'ayvalik': {
    name: 'Ayvalık Zeytinyağı',
    unit: 'lt',
    basePrice: 100,
    quality: {
      premium: 140,
      standard: 100,
      economy: 80
    },
    seasonalVariation: {
      summer: 1.0,
      autumn: 1.0,
      winter: 1.0,
      spring: 1.0
    },
    wastageRate: 0.01,
    cookingLoss: 0,
    shelfLife: 365,
    suppliers: ['Metro', 'Makro', 'Yudum']
  },
  'tereyagi': {
    name: 'Tereyağı',
    unit: 'kg',
    basePrice: 280,
    quality: {
      premium: 350,
      standard: 280,
      economy: 220
    },
    seasonalVariation: {
      summer: 0.95,
      autumn: 1.0,
      winter: 1.05,
      spring: 1.0
    },
    wastageRate: 0.02,
    cookingLoss: 0.10,
    shelfLife: 60,
    suppliers: ['Sütaş', 'Pınar', 'İçim']
  }
};

// Recipe cost calculations
export const RECIPE_TEMPLATES = {
  'karniyarik': {
    name: 'Karnıyarık',
    category: 'Ana Yemek',
    servings: 100,
    ingredients: [
      { item: 'patlican', amount: 20, unit: 'kg' },
      { item: 'kiyma', amount: 8, unit: 'kg' },
      { item: 'domates', amount: 3, unit: 'kg' },
      { item: 'sogan', amount: 2, unit: 'kg' },
      { item: 'zeytinyagi', amount: 1, unit: 'lt' }
    ],
    laborMinutes: 180,
    energyCost: 15,
    difficulty: 'orta'
  },
  'tavuk_sote': {
    name: 'Tavuk Sote',
    category: 'Ana Yemek',
    servings: 100,
    ingredients: [
      { item: 'tavuk_eti', amount: 15, unit: 'kg' },
      { item: 'biber', amount: 3, unit: 'kg' },
      { item: 'domates', amount: 2, unit: 'kg' },
      { item: 'sogan', amount: 2, unit: 'kg' },
      { item: 'ayvalik', amount: 0.5, unit: 'lt' }
    ],
    laborMinutes: 120,
    energyCost: 10,
    difficulty: 'kolay'
  },
  'mercimek_corbasi': {
    name: 'Mercimek Çorbası',
    category: 'Çorba',
    servings: 100,
    ingredients: [
      { item: 'mercimek', amount: 4, unit: 'kg' },
      { item: 'sogan', amount: 1, unit: 'kg' },
      { item: 'havuc', amount: 1, unit: 'kg' },
      { item: 'tereyagi', amount: 0.3, unit: 'kg' }
    ],
    laborMinutes: 60,
    energyCost: 8,
    difficulty: 'kolay'
  },
  'pilav': {
    name: 'Pirinç Pilavı',
    category: 'Yan Yemek',
    servings: 100,
    ingredients: [
      { item: 'pirinc', amount: 6, unit: 'kg' },
      { item: 'tereyagi', amount: 0.5, unit: 'kg' },
      { item: 'ayvalik', amount: 0.2, unit: 'lt' }
    ],
    laborMinutes: 45,
    energyCost: 5,
    difficulty: 'kolay'
  }
};

// Portion standards by institution type
export const PORTION_STANDARDS = {
  'hastane': {
    name: 'Hastane',
    portions: {
      corba: { min: 250, standard: 300, max: 350, unit: 'ml' },
      ana_yemek_et: { min: 120, standard: 150, max: 180, unit: 'gr' },
      ana_yemek_sebze: { min: 200, standard: 250, max: 300, unit: 'gr' },
      pilav_makarna: { min: 150, standard: 200, max: 250, unit: 'gr' },
      salata: { min: 100, standard: 150, max: 200, unit: 'gr' },
      meyve: { min: 150, standard: 200, max: 250, unit: 'gr' },
      tatli: { min: 100, standard: 120, max: 150, unit: 'gr' },
      ekmek: { min: 100, standard: 150, max: 200, unit: 'gr' }
    },
    dailyCalories: { min: 2200, standard: 2500, max: 2800 },
    mealDistribution: {
      sabah: 0.25,
      ogle: 0.40,
      aksam: 0.35
    }
  },
  'okul': {
    name: 'Okul',
    portions: {
      corba: { min: 200, standard: 250, max: 300, unit: 'ml' },
      ana_yemek_et: { min: 80, standard: 100, max: 120, unit: 'gr' },
      ana_yemek_sebze: { min: 150, standard: 200, max: 250, unit: 'gr' },
      pilav_makarna: { min: 120, standard: 150, max: 180, unit: 'gr' },
      salata: { min: 80, standard: 100, max: 120, unit: 'gr' },
      meyve: { min: 150, standard: 200, max: 200, unit: 'gr' },
      tatli: { min: 80, standard: 100, max: 120, unit: 'gr' },
      ekmek: { min: 75, standard: 100, max: 125, unit: 'gr' }
    },
    dailyCalories: { min: 1800, standard: 2100, max: 2400 },
    mealDistribution: {
      sabah: 0.30,
      ogle: 0.70
    }
  },
  'fabrika': {
    name: 'Fabrika/İşyeri',
    portions: {
      corba: { min: 300, standard: 350, max: 400, unit: 'ml' },
      ana_yemek_et: { min: 150, standard: 180, max: 220, unit: 'gr' },
      ana_yemek_sebze: { min: 250, standard: 300, max: 350, unit: 'gr' },
      pilav_makarna: { min: 200, standard: 250, max: 300, unit: 'gr' },
      salata: { min: 120, standard: 150, max: 180, unit: 'gr' },
      meyve: { min: 150, standard: 200, max: 250, unit: 'gr' },
      tatli: { min: 120, standard: 150, max: 180, unit: 'gr' },
      ekmek: { min: 150, standard: 200, max: 250, unit: 'gr' }
    },
    dailyCalories: { min: 2800, standard: 3200, max: 3600 },
    mealDistribution: {
      ogle: 1.0
    }
  }
};

// Cost optimization strategies
export const OPTIMIZATION_STRATEGIES = {
  ingredient_substitution: {
    name: 'Malzeme İkamesi',
    description: 'Pahalı malzemelerin uygun alternatiflerle değiştirilmesi',
    potential_savings: '10-15%',
    examples: [
      { original: 'Dana eti', substitute: 'Dana-kuzu karışımı', saving: '12%' },
      { original: 'Tereyağı', substitute: 'Tereyağı-margarin karışımı', saving: '25%' },
      { original: 'Zeytinyağı', substitute: 'Ayvalık', saving: '40%' }
    ],
    risks: ['Tat değişimi', 'Müşteri tepkisi', 'Beslenme değeri']
  },
  seasonal_menu: {
    name: 'Mevsimsel Menü',
    description: 'Mevsiminde olan ürünlerin kullanımını artırma',
    potential_savings: '15-20%',
    examples: [
      { season: 'Yaz', focus: 'Sebze ağırlıklı yemekler', saving: '18%' },
      { season: 'Kış', focus: 'Kuru baklagil ve kök sebzeler', saving: '15%' }
    ],
    risks: ['Menü çeşitliliği', 'Planlama zorluğu']
  },
  bulk_purchasing: {
    name: 'Toplu Alım',
    description: 'Büyük miktarlarda alım yaparak birim fiyat düşürme',
    potential_savings: '8-12%',
    requirements: ['Depolama alanı', 'Nakit akışı', 'Stok yönetimi'],
    risks: ['Bozulma riski', 'Nakit bağlama', 'Fiyat düşüşü riski']
  },
  waste_reduction: {
    name: 'Fire Azaltma',
    description: 'İsraf ve kayıpların minimize edilmesi',
    potential_savings: '5-10%',
    methods: [
      'Porsiyon kontrolü',
      'FIFO stok yönetimi',
      'Hazırlık optimizasyonu',
      'Artık değerlendirme'
    ],
    metrics: ['Fire oranı', 'Porsiyon sapması', 'Artık miktarı']
  },
  energy_optimization: {
    name: 'Enerji Optimizasyonu',
    description: 'Pişirme ve hazırlık süreçlerinde enerji tasarrufu',
    potential_savings: '3-5%',
    methods: [
      'Toplu pişirme',
      'Ekipman verimliliği',
      'Off-peak kullanım',
      'Isı geri kazanımı'
    ]
  }
};

/**
 * Cost Expert Class
 */
export class CostExpert {
  /**
   * Calculate meal cost
   */
  calculateMealCost(
    menuItems: string[],
    personCount: number,
    qualityLevel: 'economy' | 'standard' | 'premium' = 'standard',
    season?: 'summer' | 'autumn' | 'winter' | 'spring'
  ): any {
    const currentSeason = season || this.getCurrentSeason();
    let totalCost = 0;
    const breakdown = [];

    menuItems.forEach(item => {
      const recipe = this.findRecipe(item);
      if (recipe) {
        const recipeCost = this.calculateRecipeCost(recipe, qualityLevel, currentSeason);
        const scaledCost = (recipeCost.totalCost / recipe.servings) * personCount;

        totalCost += scaledCost;
        breakdown.push({
          item: recipe.name,
          unitCost: recipeCost.totalCost / recipe.servings,
          totalCost: scaledCost,
          details: recipeCost
        });
      }
    });

    // Add overhead costs
    const overheadCosts = this.calculateOverheadCosts(totalCost);
    const finalCost = totalCost + overheadCosts.total;

    return {
      mealCost: totalCost,
      overheadCosts,
      totalCost: finalCost,
      perPersonCost: finalCost / personCount,
      breakdown,
      season: currentSeason,
      qualityLevel
    };
  }

  /**
   * Calculate recipe cost
   */
  calculateRecipeCost(recipe: any, qualityLevel: string, season: string): any {
    let ingredientCost = 0;
    const ingredientBreakdown = [];

    recipe.ingredients.forEach((ing: any) => {
      const ingredient = INGREDIENT_PRICES[ing.item];
      if (ingredient) {
        const basePrice = ingredient.quality[qualityLevel] || ingredient.basePrice;
        const seasonalPrice = basePrice * (ingredient.seasonalVariation[season] || 1);
        const wastageMultiplier = 1 + ingredient.wastageRate;
        const finalPrice = seasonalPrice * wastageMultiplier;
        const totalCost = finalPrice * ing.amount;

        ingredientCost += totalCost;
        ingredientBreakdown.push({
          item: ingredient.name,
          amount: ing.amount,
          unit: ing.unit,
          unitPrice: finalPrice,
          totalCost
        });
      }
    });

    // Labor cost
    const laborCost = this.calculateLaborCost(recipe.laborMinutes, recipe.servings);

    // Energy cost
    const energyCost = recipe.energyCost || 0;

    return {
      ingredientCost,
      laborCost,
      energyCost,
      totalCost: ingredientCost + laborCost + energyCost,
      ingredientBreakdown,
      costPerServing: (ingredientCost + laborCost + energyCost) / recipe.servings
    };
  }

  /**
   * Optimize menu cost
   */
  optimizeMenuCost(currentMenu: any[], targetReduction: number = 0.15): any {
    const currentCost = this.calculateTotalMenuCost(currentMenu);
    const targetCost = currentCost * (1 - targetReduction);
    const optimizations = [];

    // Try different optimization strategies
    Object.values(OPTIMIZATION_STRATEGIES).forEach(strategy => {
      const potentialSaving = this.estimateStrategySaving(strategy, currentMenu);
      if (potentialSaving > 0) {
        optimizations.push({
          strategy: strategy.name,
          description: strategy.description,
          estimatedSaving: potentialSaving,
          percentageSaving: (potentialSaving / currentCost) * 100,
          implementation: this.getImplementationSteps(strategy)
        });
      }
    });

    // Sort by potential savings
    optimizations.sort((a, b) => b.estimatedSaving - a.estimatedSaving);

    // Select optimal combination
    const selectedStrategies = this.selectOptimalStrategies(optimizations, targetReduction);

    return {
      currentCost,
      targetCost,
      targetReduction: targetReduction * 100,
      recommendedStrategies: selectedStrategies,
      estimatedNewCost: currentCost - selectedStrategies.reduce((sum, s) => sum + s.estimatedSaving, 0),
      achievableReduction: (selectedStrategies.reduce((sum, s) => sum + s.percentageSaving, 0)),
      implementation: this.createImplementationPlan(selectedStrategies)
    };
  }

  /**
   * Calculate portion cost
   */
  calculatePortionCost(
    institutionType: string,
    mealType: string,
    personCount: number
  ): any {
    const standards = PORTION_STANDARDS[institutionType] || PORTION_STANDARDS['fabrika'];
    const portions = standards.portions;
    let totalCost = 0;
    const breakdown = [];

    Object.entries(portions).forEach(([category, portion]: [string, any]) => {
      const ingredientCost = this.estimatePortionIngredientCost(category, portion.standard);
      const cost = ingredientCost * personCount;

      totalCost += cost;
      breakdown.push({
        category,
        portion: `${portion.standard} ${portion.unit}`,
        unitCost: ingredientCost,
        totalCost: cost
      });
    });

    return {
      institutionType: standards.name,
      personCount,
      portionStandards: portions,
      totalCost,
      perPersonCost: totalCost / personCount,
      breakdown,
      dailyCalories: standards.dailyCalories,
      mealDistribution: standards.mealDistribution
    };
  }

  /**
   * Forecast seasonal costs
   */
  forecastSeasonalCosts(menuItems: string[], personCount: number): any {
    const seasons = ['summer', 'autumn', 'winter', 'spring'];
    const forecasts = [];

    seasons.forEach(season => {
      const cost = this.calculateMealCost(menuItems, personCount, 'standard', season as any);
      forecasts.push({
        season,
        totalCost: cost.totalCost,
        perPersonCost: cost.perPersonCost,
        percentageFromAverage: 0 // Will calculate after
      });
    });

    // Calculate average and percentages
    const avgCost = forecasts.reduce((sum, f) => sum + f.totalCost, 0) / forecasts.length;
    forecasts.forEach(f => {
      f.percentageFromAverage = ((f.totalCost - avgCost) / avgCost) * 100;
    });

    return {
      forecasts,
      averageCost: avgCost,
      minCost: Math.min(...forecasts.map(f => f.totalCost)),
      maxCost: Math.max(...forecasts.map(f => f.totalCost)),
      bestSeason: forecasts.find(f => f.totalCost === Math.min(...forecasts.map(fc => fc.totalCost))),
      worstSeason: forecasts.find(f => f.totalCost === Math.max(...forecasts.map(fc => fc.totalCost)))
    };
  }

  // =========================================
  // Private Helper Methods
  // =========================================

  private getCurrentSeason(): 'summer' | 'autumn' | 'winter' | 'spring' {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  private findRecipe(itemName: string): any {
    const normalized = itemName.toLowerCase().replace(/\s+/g, '_');
    return RECIPE_TEMPLATES[normalized] || null;
  }

  private calculateLaborCost(minutes: number, servings: number): number {
    const hourlyRate = 150; // TL per hour
    const hours = minutes / 60;
    const totalLaborCost = hours * hourlyRate;
    return totalLaborCost;
  }

  private calculateOverheadCosts(mealCost: number): any {
    const overheadRates = {
      management: 0.08,
      logistics: 0.05,
      equipment: 0.03,
      utilities: 0.04,
      insurance: 0.02,
      profit: 0.15
    };

    const breakdown = {};
    let total = 0;

    Object.entries(overheadRates).forEach(([category, rate]) => {
      const cost = mealCost * rate;
      breakdown[category] = cost;
      total += cost;
    });

    return {
      breakdown,
      total,
      percentageOfMealCost: (total / mealCost) * 100
    };
  }

  private calculateTotalMenuCost(menu: any[]): number {
    // Simplified calculation
    return menu.reduce((sum, item) => sum + (item.cost || 100), 0);
  }

  private estimateStrategySaving(strategy: any, menu: any[]): number {
    // Parse percentage range and return average
    if (strategy.potential_savings) {
      const match = strategy.potential_savings.match(/(\d+)-(\d+)/);
      if (match) {
        const min = parseInt(match[1]);
        const max = parseInt(match[2]);
        const avgPercentage = (min + max) / 2;
        return this.calculateTotalMenuCost(menu) * (avgPercentage / 100);
      }
    }
    return 0;
  }

  private getImplementationSteps(strategy: any): string[] {
    const steps = [];

    if (strategy.methods) {
      strategy.methods.forEach((method: string) => {
        steps.push(method);
      });
    }

    if (strategy.examples) {
      strategy.examples.forEach((example: any) => {
        steps.push(`Örnek: ${example.original || example.season} - ${example.saving} tasarruf`);
      });
    }

    return steps;
  }

  private selectOptimalStrategies(optimizations: any[], targetReduction: number): any[] {
    const selected = [];
    let totalReduction = 0;

    for (const opt of optimizations) {
      if (totalReduction < targetReduction * 100) {
        selected.push(opt);
        totalReduction += opt.percentageSaving;
      }
    }

    return selected;
  }

  private createImplementationPlan(strategies: any[]): any {
    return {
      phase1: {
        name: 'Analiz',
        duration: '1 hafta',
        tasks: [
          'Mevcut maliyet analizi',
          'Fire oranları tespiti',
          'Tedarikçi değerlendirmesi'
        ]
      },
      phase2: {
        name: 'Planlama',
        duration: '1 hafta',
        tasks: strategies.slice(0, 3).map(s => s.strategy)
      },
      phase3: {
        name: 'Uygulama',
        duration: '2 hafta',
        tasks: [
          'Pilot uygulama',
          'Personel eğitimi',
          'Sistem entegrasyonu'
        ]
      },
      phase4: {
        name: 'İzleme',
        duration: 'Sürekli',
        tasks: [
          'Maliyet takibi',
          'Sapma analizi',
          'Optimizasyon'
        ]
      }
    };
  }

  private estimatePortionIngredientCost(category: string, portionSize: number): number {
    // Rough estimates based on category
    const costPerGram = {
      corba: 0.02,
      ana_yemek_et: 0.25,
      ana_yemek_sebze: 0.08,
      pilav_makarna: 0.04,
      salata: 0.03,
      meyve: 0.05,
      tatli: 0.10,
      ekmek: 0.02
    };

    return (costPerGram[category] || 0.05) * portionSize;
  }
}

// Export singleton instance
export const costExpert = new CostExpert();