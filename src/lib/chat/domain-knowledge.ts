/**
 * Domain Knowledge Integration Service
 * Combines tender and cost expertise for intelligent chat responses
 */

import { tenderExpert } from './expertise/tender-expert';
import { costExpert } from './expertise/cost-expert';
import { AILogger } from '@/lib/ai/logger';

export interface DomainContext {
  institution?: string;
  budget?: number;
  personCount?: number;
  menuItems?: string[];
  tenderType?: string;
  timeline?: number;
  competitors?: string[];
}

export interface DomainInsight {
  category: 'tender' | 'cost' | 'strategy' | 'risk' | 'optimization';
  title: string;
  content: string;
  confidence: number;
  source: string;
  recommendations?: string[];
  data?: any;
}

/**
 * Domain Knowledge Service
 * Provides expert insights for chat responses
 */
export class DomainKnowledgeService {
  private static instance: DomainKnowledgeService;

  // Singleton
  public static getInstance(): DomainKnowledgeService {
    if (!DomainKnowledgeService.instance) {
      DomainKnowledgeService.instance = new DomainKnowledgeService();
    }
    return DomainKnowledgeService.instance;
  }

  /**
   * Get comprehensive insights based on context
   */
  async getInsights(query: string, context: DomainContext): Promise<DomainInsight[]> {
    const insights: DomainInsight[] = [];

    try {
      // Analyze query intent
      const intent = this.analyzeIntent(query);

      // Get relevant insights based on intent
      switch (intent.primary) {
        case 'institution':
          insights.push(...this.getInstitutionInsights(context));
          break;

        case 'cost':
          insights.push(...this.getCostInsights(context));
          break;

        case 'risk':
          insights.push(...this.getRiskInsights(context));
          break;

        case 'strategy':
          insights.push(...this.getStrategyInsights(context));
          break;

        case 'optimization':
          insights.push(...this.getOptimizationInsights(context));
          break;

        default:
          // Provide general insights
          insights.push(...this.getGeneralInsights(context));
      }

      // Add secondary insights if relevant
      if (intent.secondary) {
        insights.push(...this.getSecondaryInsights(intent.secondary, context));
      }

      AILogger.info('Domain insights generated', {
        query: query.substring(0, 50),
        intent: intent.primary,
        insightCount: insights.length
      });

    } catch (error) {
      AILogger.error('Failed to generate domain insights', { error });
    }

    return insights;
  }

  /**
   * Get institution-specific insights
   */
  private getInstitutionInsights(context: DomainContext): DomainInsight[] {
    const insights: DomainInsight[] = [];

    if (context.institution) {
      const analysis = tenderExpert.analyzeInstitution(context.institution);

      insights.push({
        category: 'tender',
        title: 'Kurum Profili',
        content: this.formatInstitutionProfile(analysis.profile),
        confidence: 0.85,
        source: 'tender-expert',
        recommendations: analysis.recommendations,
        data: analysis
      });

      if (analysis.insights && analysis.insights.length > 0) {
        insights.push({
          category: 'strategy',
          title: 'Kuruma Özel Dikkat Noktaları',
          content: analysis.insights.join('\n'),
          confidence: 0.80,
          source: 'tender-expert',
          recommendations: analysis.profile.successFactors
        });
      }
    }

    return insights;
  }

  /**
   * Get cost-related insights
   */
  private getCostInsights(context: DomainContext): DomainInsight[] {
    const insights: DomainInsight[] = [];

    if (context.menuItems && context.personCount) {
      const costAnalysis = costExpert.calculateMealCost(
        context.menuItems,
        context.personCount
      );

      insights.push({
        category: 'cost',
        title: 'Maliyet Analizi',
        content: this.formatCostAnalysis(costAnalysis),
        confidence: 0.90,
        source: 'cost-expert',
        data: costAnalysis
      });

      // Seasonal forecast
      const seasonalForecast = costExpert.forecastSeasonalCosts(
        context.menuItems,
        context.personCount
      );

      insights.push({
        category: 'cost',
        title: 'Mevsimsel Maliyet Tahmini',
        content: this.formatSeasonalForecast(seasonalForecast),
        confidence: 0.75,
        source: 'cost-expert',
        data: seasonalForecast
      });
    }

    // Portion cost if institution type is known
    if (context.institution && context.personCount) {
      const institutionType = this.mapInstitutionType(context.institution);
      const portionCost = costExpert.calculatePortionCost(
        institutionType,
        'ogle',
        context.personCount
      );

      insights.push({
        category: 'cost',
        title: 'Porsiyon Standardı ve Maliyeti',
        content: this.formatPortionCost(portionCost),
        confidence: 0.85,
        source: 'cost-expert',
        recommendations: [
          'Porsiyon kontrolü ile %5-10 tasarruf',
          'Standart reçete kartları kullanın',
          'Günlük fire takibi yapın'
        ],
        data: portionCost
      });
    }

    return insights;
  }

  /**
   * Get risk-related insights
   */
  private getRiskInsights(context: DomainContext): DomainInsight[] {
    const insights: DomainInsight[] = [];

    const tenderData = {
      budget: context.budget,
      preparationDays: context.timeline,
      expectedCompetitors: context.competitors?.length || 0,
      isFirstTime: true,
      kurum: context.institution
    };

    const riskAssessment = tenderExpert.assessRisk(tenderData);

    insights.push({
      category: 'risk',
      title: 'Risk Değerlendirmesi',
      content: this.formatRiskAssessment(riskAssessment),
      confidence: 0.80,
      source: 'tender-expert',
      recommendations: riskAssessment.mitigation,
      data: riskAssessment
    });

    return insights;
  }

  /**
   * Get strategy insights
   */
  private getStrategyInsights(context: DomainContext): DomainInsight[] {
    const insights: DomainInsight[] = [];

    const tenderData = {
      budget: context.budget,
      kurum: context.institution,
      technicalScore: 30,
      priceScore: 70
    };

    const strategy = tenderExpert.recommendStrategy(tenderData);

    insights.push({
      category: 'strategy',
      title: `Önerilen Strateji: ${strategy.recommendedStrategy.name}`,
      content: this.formatStrategy(strategy),
      confidence: strategy.expectedSuccessRate,
      source: 'tender-expert',
      recommendations: strategy.customTactics,
      data: strategy
    });

    return insights;
  }

  /**
   * Get optimization insights
   */
  private getOptimizationInsights(context: DomainContext): DomainInsight[] {
    const insights: DomainInsight[] = [];

    if (context.menuItems) {
      const optimization = costExpert.optimizeMenuCost(
        context.menuItems.map(item => ({ name: item, cost: 100 })),
        0.15
      );

      insights.push({
        category: 'optimization',
        title: 'Maliyet Optimizasyon Önerileri',
        content: this.formatOptimization(optimization),
        confidence: 0.85,
        source: 'cost-expert',
        recommendations: optimization.recommendedStrategies.map((s: any) => s.strategy),
        data: optimization
      });
    }

    return insights;
  }

  /**
   * Get general insights when intent is unclear
   */
  private getGeneralInsights(context: DomainContext): DomainInsight[] {
    const insights: DomainInsight[] = [];

    // Provide basic insights based on available context
    if (context.institution) {
      insights.push(...this.getInstitutionInsights(context));
    }

    if (context.budget) {
      insights.push({
        category: 'tender',
        title: 'Bütçe Değerlendirmesi',
        content: this.evaluateBudget(context.budget),
        confidence: 0.70,
        source: 'domain-knowledge'
      });
    }

    return insights;
  }

  /**
   * Get secondary insights
   */
  private getSecondaryInsights(intent: string, context: DomainContext): DomainInsight[] {
    // Provide additional relevant insights based on secondary intent
    switch (intent) {
      case 'comparison':
        return this.getComparisonInsights(context);
      case 'trend':
        return this.getTrendInsights(context);
      default:
        return [];
    }
  }

  /**
   * Get comparison insights
   */
  private getComparisonInsights(context: DomainContext): DomainInsight[] {
    const insights: DomainInsight[] = [];

    if (context.competitors && context.competitors.length > 0) {
      const competitorAnalysis = tenderExpert.analyzeCompetitors(context.competitors);

      insights.push({
        category: 'strategy',
        title: 'Rakip Analizi',
        content: this.formatCompetitorAnalysis(competitorAnalysis),
        confidence: 0.75,
        source: 'tender-expert',
        recommendations: competitorAnalysis.differentiation_strategy
          ? [competitorAnalysis.differentiation_strategy]
          : [],
        data: competitorAnalysis
      });
    }

    return insights;
  }

  /**
   * Get trend insights
   */
  private getTrendInsights(context: DomainContext): DomainInsight[] {
    // Placeholder for trend analysis
    return [];
  }

  /**
   * Analyze query intent
   */
  private analyzeIntent(query: string): { primary: string; secondary?: string } {
    const lowercaseQuery = query.toLowerCase();

    // Primary intent detection
    if (lowercaseQuery.includes('kurum') || lowercaseQuery.includes('hastane') ||
        lowercaseQuery.includes('okul') || lowercaseQuery.includes('üniversite')) {
      return { primary: 'institution' };
    }

    if (lowercaseQuery.includes('maliyet') || lowercaseQuery.includes('fiyat') ||
        lowercaseQuery.includes('hesapla') || lowercaseQuery.includes('porsiyon')) {
      return { primary: 'cost' };
    }

    if (lowercaseQuery.includes('risk') || lowercaseQuery.includes('tehlike') ||
        lowercaseQuery.includes('sorun')) {
      return { primary: 'risk' };
    }

    if (lowercaseQuery.includes('strateji') || lowercaseQuery.includes('yaklaşım') ||
        lowercaseQuery.includes('taktik') || lowercaseQuery.includes('nasıl')) {
      return { primary: 'strategy' };
    }

    if (lowercaseQuery.includes('optimizasyon') || lowercaseQuery.includes('tasarruf') ||
        lowercaseQuery.includes('düşür') || lowercaseQuery.includes('azalt')) {
      return { primary: 'optimization' };
    }

    // Secondary intent
    let secondary;
    if (lowercaseQuery.includes('karşılaştır') || lowercaseQuery.includes('kıyasla')) {
      secondary = 'comparison';
    } else if (lowercaseQuery.includes('trend') || lowercaseQuery.includes('gelecek')) {
      secondary = 'trend';
    }

    return { primary: 'general', secondary };
  }

  // =========================================
  // Formatting Helper Methods
  // =========================================

  private formatInstitutionProfile(profile: any): string {
    return `
**${profile.name}** - ${profile.category}

📊 **Özellikler:**
- Ödeme Güvenilirliği: ${(profile.characteristics.paymentReliability * 100).toFixed(0)}%
- Ortalama Ödeme Süresi: ${profile.characteristics.averagePaymentDays} gün
- Dokümantasyon Seviyesi: ${profile.characteristics.documentationLevel}
- Denetim Sıkılığı: ${profile.characteristics.inspectionStrictness}

💰 **Bütçe Aralığı:** ${this.formatCurrency(profile.averageBudgetRange.min)} - ${this.formatCurrency(profile.averageBudgetRange.max)}
👥 **Kişi Sayısı:** ${profile.averagePersonCount.min} - ${profile.averagePersonCount.max}
🎯 **Başarı Oranı:** ${(profile.historicalSuccessRate * 100).toFixed(0)}%
    `.trim();
  }

  private formatCostAnalysis(analysis: any): string {
    return `
💰 **Toplam Maliyet:** ${this.formatCurrency(analysis.totalCost)}
👤 **Kişi Başı Maliyet:** ${this.formatCurrency(analysis.perPersonCost)}

**Maliyet Dağılımı:**
- Yemek Maliyeti: ${this.formatCurrency(analysis.mealCost)}
- Genel Giderler: ${this.formatCurrency(analysis.overheadCosts.total)}
  - Yönetim: %${(analysis.overheadCosts.breakdown.management / analysis.mealCost * 100).toFixed(1)}
  - Lojistik: %${(analysis.overheadCosts.breakdown.logistics / analysis.mealCost * 100).toFixed(1)}
  - Kar Marjı: %${(analysis.overheadCosts.breakdown.profit / analysis.mealCost * 100).toFixed(1)}
    `.trim();
  }

  private formatSeasonalForecast(forecast: any): string {
    const seasonNames = {
      summer: 'Yaz',
      autumn: 'Sonbahar',
      winter: 'Kış',
      spring: 'İlkbahar'
    };

    let result = `📅 **Mevsimsel Maliyet Değişimi:**\n\n`;

    forecast.forecasts.forEach((f: any) => {
      const indicator = f.percentageFromAverage > 0 ? '📈' : '📉';
      result += `${indicator} **${seasonNames[f.season]}:** ${this.formatCurrency(f.perPersonCost)}/kişi`;
      result += ` (${f.percentageFromAverage > 0 ? '+' : ''}${f.percentageFromAverage.toFixed(1)}%)\n`;
    });

    result += `\n✅ **En Uygun:** ${seasonNames[forecast.bestSeason.season]}`;
    result += `\n⚠️ **En Pahalı:** ${seasonNames[forecast.worstSeason.season]}`;

    return result;
  }

  private formatPortionCost(portionCost: any): string {
    return `
🍽️ **${portionCost.institutionType} Porsiyon Standardı**

💰 **Günlük Kişi Başı:** ${this.formatCurrency(portionCost.perPersonCost)}
🔥 **Günlük Kalori:** ${portionCost.dailyCalories.standard} kcal

**Porsiyon Detayları:**
${portionCost.breakdown.slice(0, 5).map((item: any) =>
  `- ${item.category}: ${item.portion} (${this.formatCurrency(item.unitCost)}/porsiyon)`
).join('\n')}
    `.trim();
  }

  private formatRiskAssessment(assessment: any): string {
    const riskEmoji = {
      low: '🟢',
      medium: '🟡',
      high: '🔴'
    };

    return `
${riskEmoji[assessment.level]} **Risk Seviyesi:** ${assessment.level.toUpperCase()}
📊 **Risk Skoru:** ${assessment.score}/100

**Risk Faktörleri:**
${assessment.factors.map((f: string) => `- ${f}`).join('\n')}

**Önerilen Önlemler:**
${assessment.mitigation.slice(0, 3).map((m: string) => `✅ ${m}`).join('\n')}

💡 **Tavsiye:** ${assessment.recommendation}
    `.trim();
  }

  private formatStrategy(strategy: any): string {
    return `
🎯 **Başarı Olasılığı:** ${(strategy.expectedSuccessRate * 100).toFixed(0)}%

**Taktikler:**
${strategy.customTactics.slice(0, 5).map((t: string) => `- ${t}`).join('\n')}

**Uygulama Planı:**
${Object.entries(strategy.implementation).slice(0, 3).map(([phase, details]: [string, any]) =>
  `📌 **${details.name}** (${details.duration})`
).join('\n')}
    `.trim();
  }

  private formatOptimization(optimization: any): string {
    return `
💰 **Mevcut Maliyet:** ${this.formatCurrency(optimization.currentCost)}
🎯 **Hedef Maliyet:** ${this.formatCurrency(optimization.targetCost)}
📉 **Hedef Tasarruf:** %${optimization.targetReduction}

**Önerilen Stratejiler:**
${optimization.recommendedStrategies.slice(0, 3).map((s: any) =>
  `✅ **${s.strategy}** - %${s.percentageSaving.toFixed(1)} tasarruf`
).join('\n')}

💡 **Tahmin Edilen Yeni Maliyet:** ${this.formatCurrency(optimization.estimatedNewCost)}
🎯 **Ulaşılabilir Tasarruf:** %${optimization.achievableReduction.toFixed(1)}
    `.trim();
  }

  private formatCompetitorAnalysis(analysis: any): string {
    return `
🏢 **Rakip Sayısı:** ${analysis.count}
⚠️ **Tehdit Seviyesi:** ${analysis.threat_level}

**Rekabet Avantajlarımız:**
${analysis.competitive_advantages.slice(0, 3).map((a: string) => `✅ ${a}`).join('\n')}

**Geliştirilmesi Gerekenler:**
${analysis.competitive_weaknesses.slice(0, 3).map((w: string) => `⚠️ ${w}`).join('\n')}

💡 **Farklılaşma Stratejisi:** ${analysis.differentiation_strategy}
    `.trim();
  }

  private evaluateBudget(budget: number): string {
    let evaluation = '';

    if (budget < 500000) {
      evaluation = 'Küçük ölçekli ihale. Düşük risk, ancak kar marjı sınırlı.';
    } else if (budget < 2000000) {
      evaluation = 'Orta ölçekli ihale. Dengeli risk-kar oranı.';
    } else if (budget < 10000000) {
      evaluation = 'Büyük ölçekli ihale. Yüksek kar potansiyeli, dikkatli planlama gerekli.';
    } else {
      evaluation = 'Çok büyük ölçekli ihale. Konsorsiyum veya ortaklık düşünülebilir.';
    }

    return `💰 **Bütçe:** ${this.formatCurrency(budget)}\n📊 **Değerlendirme:** ${evaluation}`;
  }

  private mapInstitutionType(institution: string): string {
    const normalized = institution.toLowerCase();

    if (normalized.includes('hastane') || normalized.includes('sağlık')) {
      return 'hastane';
    }
    if (normalized.includes('okul') || normalized.includes('eğitim')) {
      return 'okul';
    }
    if (normalized.includes('üniversite')) {
      return 'universiteler';
    }

    return 'fabrika';
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}

// Export singleton instance
export const domainKnowledge = DomainKnowledgeService.getInstance();