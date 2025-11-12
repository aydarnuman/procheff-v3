/**
 * Tender Expert Module
 * Domain-specific knowledge for tender analysis
 */

import { AILogger } from '@/lib/ai/logger';

// Institution profiles with historical patterns
export const INSTITUTION_PROFILES = {
  'saglik_bakanligi': {
    name: 'Sağlık Bakanlığı',
    category: 'Kamu Sağlık',
    characteristics: {
      paymentReliability: 0.95,
      averagePaymentDays: 45,
      documentationLevel: 'Yüksek',
      inspectionStrictness: 'Çok Yüksek',
      priceFlexibility: 'Düşük'
    },
    commonRequirements: [
      'TSE Hizmet Yeterlilik Belgesi',
      'ISO 22000 Gıda Güvenliği',
      'Hijyen Eğitimi Sertifikaları',
      'Numune sunumu zorunlu',
      'Aylık denetim raporu'
    ],
    riskFactors: [
      'Hijyen standartları çok katı',
      'Sıfır hata toleransı',
      'Ani menü değişiklikleri',
      'Özel diyet talepleri yüksek'
    ],
    successFactors: [
      'Deneyimli gıda mühendisi',
      'Güçlü kalite kontrol sistemi',
      'Hızlı sorun çözme kabiliyeti',
      'Yedek tedarikçi ağı'
    ],
    averageBudgetRange: {
      min: 1000000,
      max: 10000000,
      currency: 'TRY'
    },
    averagePersonCount: {
      min: 500,
      max: 3000
    },
    preferredVendorSize: 'Büyük',
    historicalSuccessRate: 0.72
  },

  'milli_egitim': {
    name: 'Milli Eğitim Bakanlığı',
    category: 'Eğitim',
    characteristics: {
      paymentReliability: 0.85,
      averagePaymentDays: 60,
      documentationLevel: 'Orta',
      inspectionStrictness: 'Orta',
      priceFlexibility: 'Orta'
    },
    commonRequirements: [
      'Hijyen sertifikası',
      'Personel sağlık raporu',
      'Vergi levhası',
      'İmza sirküleri'
    ],
    riskFactors: [
      'Bütçe kısıtlamaları',
      'Mevsimsel tatiller',
      'Öğrenci sayısı dalgalanmaları'
    ],
    successFactors: [
      'Esnek menü planlama',
      'Çocuk damak tadına uygun',
      'Porsiyon kontrolü',
      'Düşük maliyet yönetimi'
    ],
    averageBudgetRange: {
      min: 500000,
      max: 5000000,
      currency: 'TRY'
    },
    averagePersonCount: {
      min: 200,
      max: 2000
    },
    preferredVendorSize: 'Orta',
    historicalSuccessRate: 0.68
  },

  'belediyeler': {
    name: 'Belediyeler',
    category: 'Yerel Yönetim',
    characteristics: {
      paymentReliability: 0.75,
      averagePaymentDays: 75,
      documentationLevel: 'Orta',
      inspectionStrictness: 'Orta',
      priceFlexibility: 'Yüksek'
    },
    commonRequirements: [
      'Ticaret sicil',
      'Vergi levhası',
      'SGK borcu yoktur',
      'Teminat mektubu'
    ],
    riskFactors: [
      'Politik değişimler',
      'Bütçe gecikmeleri',
      'Yerel hassasiyetler'
    ],
    successFactors: [
      'Yerel tedarikçi ağı',
      'Hızlı adaptasyon',
      'İyi halkla ilişkiler',
      'Sosyal sorumluluk projeleri'
    ],
    averageBudgetRange: {
      min: 300000,
      max: 3000000,
      currency: 'TRY'
    },
    averagePersonCount: {
      min: 100,
      max: 1000
    },
    preferredVendorSize: 'Küçük-Orta',
    historicalSuccessRate: 0.65
  },

  'universiteler': {
    name: 'Üniversiteler',
    category: 'Yüksek Öğretim',
    characteristics: {
      paymentReliability: 0.90,
      averagePaymentDays: 50,
      documentationLevel: 'Yüksek',
      inspectionStrictness: 'Yüksek',
      priceFlexibility: 'Düşük'
    },
    commonRequirements: [
      'ISO belgeleri',
      'Deneyim belgesi',
      'Referans listesi',
      'Mali yeterlilik belgesi',
      'Kalite kontrol prosedürleri'
    ],
    riskFactors: [
      'Akademik takvim',
      'Öğrenci profili çeşitliliği',
      'Yüksek kalite beklentisi'
    ],
    successFactors: [
      'Menü çeşitliliği',
      'Vejetaryen/vegan seçenekler',
      '7/24 hizmet kabiliyeti',
      'Kampüs içi lojistik'
    ],
    averageBudgetRange: {
      min: 2000000,
      max: 20000000,
      currency: 'TRY'
    },
    averagePersonCount: {
      min: 1000,
      max: 10000
    },
    preferredVendorSize: 'Büyük',
    historicalSuccessRate: 0.78
  },

  'askeri_birlikler': {
    name: 'Askeri Birlikler',
    category: 'Savunma',
    characteristics: {
      paymentReliability: 0.98,
      averagePaymentDays: 30,
      documentationLevel: 'Çok Yüksek',
      inspectionStrictness: 'Çok Yüksek',
      priceFlexibility: 'Düşük'
    },
    commonRequirements: [
      'Güvenlik soruşturması',
      'Gizlilik sözleşmesi',
      'NATO standartları',
      'Acil durum planı',
      'Yedekleme sistemi'
    ],
    riskFactors: [
      'Güvenlik gereksinimleri',
      'Ani operasyonel değişiklikler',
      'Sıfır tolerans'
    ],
    successFactors: [
      'Güvenilirlik',
      'Zamanında teslimat',
      'Yüksek kalori/protein',
      'Kriz yönetimi deneyimi'
    ],
    averageBudgetRange: {
      min: 3000000,
      max: 30000000,
      currency: 'TRY'
    },
    averagePersonCount: {
      min: 500,
      max: 5000
    },
    preferredVendorSize: 'Büyük',
    historicalSuccessRate: 0.82
  }
};

// Risk assessment patterns
export const RISK_PATTERNS = {
  high_risk: {
    indicators: [
      'İlk kez çalışılacak kurum',
      'Kısa hazırlık süresi (< 30 gün)',
      'Yüksek ceza maddeleri',
      'Belirsiz teknik şartname',
      'Düşük kar marjı (< %10)',
      'Özel ekipman gerektiren',
      'Coğrafi uzaklık (> 100km)'
    ],
    mitigation_strategies: [
      'Detaylı fizibilite analizi',
      'Hukuki danışmanlık',
      'Sigorta poliçesi',
      'Ortaklık kurma',
      'Pilot uygulama talebi'
    ]
  },
  medium_risk: {
    indicators: [
      'Benzer deneyim az (< 3)',
      'Orta hazırlık süresi (30-60 gün)',
      'Standart ceza maddeleri',
      'Kısmi belirsizlikler',
      'Orta kar marjı (%10-20)',
      'Kısmi yatırım gerektiren'
    ],
    mitigation_strategies: [
      'Deneyimli danışman',
      'Referans kontrolü',
      'Kısmi sigorta',
      'Tedarikçi anlaşmaları',
      'Buffer bütçe (%10)'
    ]
  },
  low_risk: {
    indicators: [
      'Daha önce çalışılmış kurum',
      'Uzun hazırlık süresi (> 60 gün)',
      'Esnek şartname',
      'Net teknik detaylar',
      'Yüksek kar marjı (> %20)',
      'Mevcut altyapı yeterli'
    ],
    mitigation_strategies: [
      'Standart prosedürler',
      'Rutin kontroller',
      'Performans takibi'
    ]
  }
};

// Winning strategies based on tender type
export const WINNING_STRATEGIES = {
  price_focused: {
    name: 'Fiyat Odaklı Strateji',
    when_to_use: [
      'Düşük teknik puan ağırlığı (< %30)',
      'Standart hizmet gereksinimleri',
      'Çok sayıda rakip',
      'Kamu kurumu'
    ],
    tactics: [
      'Agresif fiyatlandırma',
      'Hacim ekonomisi',
      'Otomasyona yatırım',
      'Düşük kar marjı kabul',
      'Uzun vadeli kontrat hedefi'
    ],
    success_rate: 0.65
  },
  quality_focused: {
    name: 'Kalite Odaklı Strateji',
    when_to_use: [
      'Yüksek teknik puan ağırlığı (> %50)',
      'Özel gereksinimler',
      'Prestijli kurumlar',
      'Sağlık sektörü'
    ],
    tactics: [
      'Sertifika ve belgeler',
      'Deneyimli kadro',
      'İnovatif çözümler',
      'Müşteri referansları',
      'Katma değerli hizmetler'
    ],
    success_rate: 0.75
  },
  relationship_focused: {
    name: 'İlişki Odaklı Strateji',
    when_to_use: [
      'Yerel kurumlar',
      'Uzun süreli kontratlar',
      'Referans hassasiyeti',
      'Sosyal sorumluluk vurgusu'
    ],
    tactics: [
      'Yerel istihdam',
      'Kurumsal sosyal sorumluluk',
      'Yönetimle iyi ilişkiler',
      'Hızlı sorun çözme',
      'Esnek yaklaşım'
    ],
    success_rate: 0.70
  },
  hybrid: {
    name: 'Hibrit Strateji',
    when_to_use: [
      'Dengeli puanlama',
      'Orta büyüklük ihaleler',
      'Rekabet orta seviyede',
      'Çoklu kriter'
    ],
    tactics: [
      'Optimal fiyat-kalite dengesi',
      'Seçici yatırımlar',
      'Risk dağıtımı',
      'Esnek teklif yapısı',
      'Alternatif seçenekler'
    ],
    success_rate: 0.72
  }
};

// Success metrics and KPIs
export const SUCCESS_METRICS = {
  pre_tender: {
    name: 'İhale Öncesi',
    kpis: [
      { name: 'Doküman Analiz Süresi', target: '< 2 gün', weight: 0.15 },
      { name: 'Fizibilite Doğruluğu', target: '> %90', weight: 0.25 },
      { name: 'Risk Değerlendirme Skoru', target: '< 30', weight: 0.20 },
      { name: 'Rakip Analizi Derinliği', target: '> 5 firma', weight: 0.10 },
      { name: 'Teklif Hazırlık Süresi', target: '< 5 gün', weight: 0.30 }
    ]
  },
  execution: {
    name: 'Uygulama',
    kpis: [
      { name: 'Zamanında Teslimat', target: '> %98', weight: 0.25 },
      { name: 'Kalite Skoru', target: '> 4.5/5', weight: 0.20 },
      { name: 'Müşteri Memnuniyeti', target: '> %90', weight: 0.20 },
      { name: 'Bütçe Sapması', target: '< %5', weight: 0.15 },
      { name: 'Personel Devir Oranı', target: '< %10', weight: 0.10 },
      { name: 'Hijyen Puanı', target: '> 95/100', weight: 0.10 }
    ]
  },
  financial: {
    name: 'Finansal',
    kpis: [
      { name: 'Brüt Kar Marjı', target: '> %15', weight: 0.25 },
      { name: 'Net Kar Marjı', target: '> %8', weight: 0.25 },
      { name: 'Tahsilat Süresi', target: '< 60 gün', weight: 0.20 },
      { name: 'İşletme Sermayesi Oranı', target: '> 1.2', weight: 0.15 },
      { name: 'ROI', target: '> %20', weight: 0.15 }
    ]
  }
};

/**
 * Tender Expert Class
 */
export class TenderExpert {
  /**
   * Analyze institution and provide insights
   */
  analyzeInstitution(institutionName: string): any {
    const normalizedName = this.normalizeInstitutionName(institutionName);
    const profile = this.findInstitutionProfile(normalizedName);

    if (!profile) {
      return this.getGenericProfile();
    }

    return {
      profile,
      insights: this.generateInstitutionInsights(profile),
      recommendations: this.generateRecommendations(profile),
      historicalData: this.getHistoricalData(normalizedName)
    };
  }

  /**
   * Assess risk level for a tender
   */
  assessRisk(tenderData: any): any {
    const riskScore = this.calculateRiskScore(tenderData);
    const riskLevel = this.determineRiskLevel(riskScore);
    const riskFactors = this.identifyRiskFactors(tenderData);
    const mitigation = this.suggestMitigation(riskLevel, riskFactors);

    return {
      score: riskScore,
      level: riskLevel,
      factors: riskFactors,
      mitigation,
      recommendation: this.getRiskRecommendation(riskLevel)
    };
  }

  /**
   * Recommend winning strategy
   */
  recommendStrategy(tenderData: any, competitorData?: any): any {
    const tenderCharacteristics = this.analyzeTenderCharacteristics(tenderData);
    const competitiveLandscape = this.analyzeCompetition(competitorData);
    const strategyType = this.selectOptimalStrategy(tenderCharacteristics, competitiveLandscape);
    const strategy = WINNING_STRATEGIES[strategyType];

    return {
      recommendedStrategy: strategy,
      customTactics: this.customizeTactics(strategy, tenderData),
      expectedSuccessRate: this.calculateSuccessProbability(strategy, tenderData),
      alternativeStrategies: this.getAlternativeStrategies(strategyType),
      implementation: this.createImplementationPlan(strategy, tenderData)
    };
  }

  /**
   * Calculate success probability
   */
  calculateSuccessProbability(strategy: any, tenderData: any): number {
    let probability = strategy.success_rate || 0.5;

    // Adjust based on institution profile
    const institution = this.findInstitutionProfile(tenderData.kurum);
    if (institution) {
      probability *= institution.historicalSuccessRate;
    }

    // Adjust based on experience
    if (tenderData.previousExperience) {
      probability += 0.1;
    }

    // Adjust based on budget fit
    if (this.isBudgetOptimal(tenderData)) {
      probability += 0.05;
    }

    // Cap at realistic maximum
    return Math.min(probability, 0.92);
  }

  /**
   * Generate competitive analysis
   */
  analyzeCompetitors(competitors: string[]): any {
    return {
      count: competitors.length,
      threat_level: this.assessCompetitiveThreat(competitors),
      key_competitors: this.identifyKeyCompetitors(competitors),
      competitive_advantages: this.identifyAdvantages(),
      competitive_weaknesses: this.identifyWeaknesses(),
      differentiation_strategy: this.suggestDifferentiation()
    };
  }

  // =========================================
  // Private Helper Methods
  // =========================================

  private normalizeInstitutionName(name: string): string {
    return name.toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[ğ]/g, 'g')
      .replace(/[ü]/g, 'u')
      .replace(/[ş]/g, 's')
      .replace(/[ı]/g, 'i')
      .replace(/[ö]/g, 'o')
      .replace(/[ç]/g, 'c');
  }

  private findInstitutionProfile(normalizedName: string): any {
    // Check exact match
    if (INSTITUTION_PROFILES[normalizedName]) {
      return INSTITUTION_PROFILES[normalizedName];
    }

    // Check partial matches
    for (const key in INSTITUTION_PROFILES) {
      if (normalizedName.includes(key) || key.includes(normalizedName)) {
        return INSTITUTION_PROFILES[key];
      }
    }

    return null;
  }

  private getGenericProfile(): any {
    return {
      name: 'Genel Kurum',
      category: 'Diğer',
      characteristics: {
        paymentReliability: 0.70,
        averagePaymentDays: 60,
        documentationLevel: 'Orta',
        inspectionStrictness: 'Orta',
        priceFlexibility: 'Orta'
      },
      commonRequirements: [
        'Standart belgeler',
        'Vergi levhası',
        'SGK belgesi'
      ],
      riskFactors: [
        'Bilinmeyen kurum kültürü',
        'Belirsiz beklentiler'
      ],
      successFactors: [
        'Esnek yaklaşım',
        'İyi iletişim',
        'Referanslar'
      ]
    };
  }

  private generateInstitutionInsights(profile: any): string[] {
    const insights = [];

    if (profile.characteristics.paymentReliability < 0.8) {
      insights.push('Ödeme güvenilirliği orta seviyede, nakit akışı planlaması kritik');
    }

    if (profile.characteristics.averagePaymentDays > 60) {
      insights.push('Uzun ödeme süresi, işletme sermayesi ihtiyacı yüksek');
    }

    if (profile.characteristics.inspectionStrictness === 'Çok Yüksek') {
      insights.push('Denetimler çok sıkı, kalite kontrol sistemleri güçlü olmalı');
    }

    return insights;
  }

  private generateRecommendations(profile: any): string[] {
    const recommendations = [];

    profile.commonRequirements.forEach((req: string) => {
      recommendations.push(`Gerekli belge: ${req}`);
    });

    profile.successFactors.forEach((factor: string) => {
      recommendations.push(`Başarı faktörü: ${factor}`);
    });

    return recommendations;
  }

  private getHistoricalData(institutionName: string): any {
    // Mock historical data
    return {
      totalTenders: Math.floor(Math.random() * 50) + 10,
      averageContractValue: Math.floor(Math.random() * 5000000) + 500000,
      averageCompetitors: Math.floor(Math.random() * 10) + 3,
      successRate: Math.random() * 0.3 + 0.4
    };
  }

  private calculateRiskScore(tenderData: any): number {
    let score = 50; // Base score

    // Budget risk
    if (tenderData.budget < 500000) score += 10;
    if (tenderData.budget > 10000000) score += 15;

    // Timeline risk
    if (tenderData.preparationDays < 30) score += 20;

    // Competition risk
    if (tenderData.expectedCompetitors > 10) score += 15;

    // Documentation risk
    if (tenderData.complexDocumentation) score += 10;

    return Math.min(score, 100);
  }

  private determineRiskLevel(score: number): string {
    if (score < 30) return 'low';
    if (score < 60) return 'medium';
    return 'high';
  }

  private identifyRiskFactors(tenderData: any): string[] {
    const factors = [];

    if (tenderData.isFirstTime) {
      factors.push('İlk kez çalışılacak kurum');
    }

    if (tenderData.preparationDays < 30) {
      factors.push('Kısa hazırlık süresi');
    }

    if (tenderData.technicalScore > 50) {
      factors.push('Yüksek teknik gereksinimler');
    }

    return factors;
  }

  private suggestMitigation(riskLevel: string, factors: string[]): string[] {
    const pattern = RISK_PATTERNS[`${riskLevel}_risk`];
    return pattern ? pattern.mitigation_strategies : [];
  }

  private getRiskRecommendation(level: string): string {
    switch (level) {
      case 'low':
        return 'Risk düşük, standart prosedürlerle devam edilebilir';
      case 'medium':
        return 'Orta risk, dikkatli planlama ve takip gerekli';
      case 'high':
        return 'Yüksek risk, detaylı analiz ve güçlü hazırlık şart';
      default:
        return 'Risk değerlendirmesi yapılamadı';
    }
  }

  private analyzeTenderCharacteristics(tenderData: any): any {
    return {
      priceWeight: tenderData.priceScore || 70,
      technicalWeight: tenderData.technicalScore || 30,
      complexity: tenderData.complexity || 'medium',
      urgency: tenderData.urgency || 'normal',
      size: tenderData.budget > 5000000 ? 'large' : 'medium'
    };
  }

  private analyzeCompetition(competitorData: any): any {
    if (!competitorData) {
      return { level: 'unknown', count: 0 };
    }

    return {
      level: competitorData.count > 5 ? 'high' : 'medium',
      count: competitorData.count || 0,
      strongCompetitors: competitorData.strong || []
    };
  }

  private selectOptimalStrategy(characteristics: any, competition: any): string {
    if (characteristics.priceWeight > 70) {
      return 'price_focused';
    }

    if (characteristics.technicalWeight > 50) {
      return 'quality_focused';
    }

    if (competition.level === 'high') {
      return 'hybrid';
    }

    return 'relationship_focused';
  }

  private customizeTactics(strategy: any, tenderData: any): string[] {
    const customTactics = [...strategy.tactics];

    if (tenderData.localPreference) {
      customTactics.push('Yerel tedarikçi vurgusu');
    }

    if (tenderData.sustainabilityFocus) {
      customTactics.push('Sürdürülebilirlik sertifikaları');
    }

    return customTactics;
  }

  private getAlternativeStrategies(currentStrategy: string): any[] {
    return Object.entries(WINNING_STRATEGIES)
      .filter(([key]) => key !== currentStrategy)
      .map(([key, value]) => ({ key, ...value }))
      .slice(0, 2);
  }

  private createImplementationPlan(strategy: any, tenderData: any): any {
    return {
      phase1: {
        name: 'Hazırlık',
        duration: '7 gün',
        tasks: [
          'Doküman analizi',
          'Ekip kurulumu',
          'Bütçe hazırlığı'
        ]
      },
      phase2: {
        name: 'Teklif Hazırlama',
        duration: '10 gün',
        tasks: strategy.tactics.slice(0, 3)
      },
      phase3: {
        name: 'Sunum',
        duration: '3 gün',
        tasks: [
          'Prezentasyon hazırlığı',
          'Soru-cevap provası',
          'Final kontrol'
        ]
      }
    };
  }

  private isBudgetOptimal(tenderData: any): boolean {
    const budget = tenderData.budget || 0;
    return budget > 1000000 && budget < 10000000;
  }

  private assessCompetitiveThreat(competitors: string[]): string {
    if (competitors.length > 10) return 'çok yüksek';
    if (competitors.length > 5) return 'yüksek';
    if (competitors.length > 2) return 'orta';
    return 'düşük';
  }

  private identifyKeyCompetitors(competitors: string[]): string[] {
    // Mock: return top 3
    return competitors.slice(0, 3);
  }

  private identifyAdvantages(): string[] {
    return [
      'Yerel tedarikçi ağı',
      'Deneyimli kadro',
      'Esnek menü planlama',
      'Hızlı adaptasyon'
    ];
  }

  private identifyWeaknesses(): string[] {
    return [
      'Yüksek personel maliyeti',
      'Sınırlı nakit akışı',
      'Teknoloji yatırımı ihtiyacı'
    ];
  }

  private suggestDifferentiation(): string {
    return 'Teknoloji entegrasyonu ve sürdürülebilirlik vurgusu ile farklılaşma';
  }
}

// Export singleton instance
export const tenderExpert = new TenderExpert();