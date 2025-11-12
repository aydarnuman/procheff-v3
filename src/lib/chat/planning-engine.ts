/**
 * Planning Engine for Multi-turn Conversations
 * Manages step-by-step wizards and guided workflows
 */

import { AILogger } from '@/lib/ai/logger';

// Planning templates for different scenarios
export const PLANNING_TEMPLATES = {
  'ihale_degerlendirme': {
    id: 'tender_evaluation',
    name: 'İhale Değerlendirme Sihirbazı',
    description: 'Adım adım ihale analizi ve karar verme',
    estimatedTime: '15-20 dakika',
    steps: [
      {
        id: 'step1',
        title: 'İhale Bilgileri',
        description: 'Temel ihale bilgilerini toplayalım',
        questions: [
          {
            id: 'institution',
            text: 'İhaleyi açan kurum hangisi?',
            type: 'text',
            required: true,
            examples: ['Sağlık Bakanlığı', 'İstanbul Üniversitesi', 'Ankara Büyükşehir'],
            validation: {
              minLength: 3,
              pattern: null
            }
          },
          {
            id: 'budget',
            text: 'İhale bütçesi nedir? (TL)',
            type: 'number',
            required: true,
            examples: ['5000000', '2500000'],
            validation: {
              min: 100000,
              max: 100000000
            }
          },
          {
            id: 'person_count',
            text: 'Günlük kaç kişiye hizmet verilecek?',
            type: 'number',
            required: true,
            examples: ['500', '1000', '2000'],
            validation: {
              min: 50,
              max: 50000
            }
          },
          {
            id: 'duration',
            text: 'İhale süresi kaç ay?',
            type: 'number',
            required: true,
            examples: ['12', '24', '36'],
            validation: {
              min: 1,
              max: 60
            }
          }
        ],
        nextStep: 'step2'
      },
      {
        id: 'step2',
        title: 'Teknik Gereksinimler',
        description: 'İhalenin teknik detaylarını inceleyelim',
        questions: [
          {
            id: 'meal_count',
            text: 'Günde kaç öğün hizmet verilecek?',
            type: 'select',
            required: true,
            options: [
              { value: '1', label: '1 Öğün (Öğle)' },
              { value: '2', label: '2 Öğün (Sabah-Öğle)' },
              { value: '3', label: '3 Öğün (Sabah-Öğle-Akşam)' }
            ]
          },
          {
            id: 'special_requirements',
            text: 'Özel gereksinimler var mı?',
            type: 'multiselect',
            required: false,
            options: [
              { value: 'diet', label: 'Diyet menüler' },
              { value: 'vegetarian', label: 'Vejetaryen seçenekler' },
              { value: 'gluten_free', label: 'Glutensiz menüler' },
              { value: 'halal', label: 'Helal sertifika' },
              { value: 'organic', label: 'Organik ürünler' }
            ]
          },
          {
            id: 'equipment_needed',
            text: 'Ekipman yatırımı gerekiyor mu?',
            type: 'select',
            required: true,
            options: [
              { value: 'none', label: 'Gerekmiyor' },
              { value: 'minor', label: 'Küçük yatırım (<100K TL)' },
              { value: 'moderate', label: 'Orta yatırım (100K-500K TL)' },
              { value: 'major', label: 'Büyük yatırım (>500K TL)' }
            ]
          }
        ],
        nextStep: 'step3'
      },
      {
        id: 'step3',
        title: 'Rekabet Analizi',
        description: 'Rakip firmaları değerlendirelim',
        questions: [
          {
            id: 'competitor_count',
            text: 'Tahmini kaç firma teklif verecek?',
            type: 'number',
            required: true,
            examples: ['5', '10', '15'],
            validation: {
              min: 1,
              max: 50
            }
          },
          {
            id: 'known_competitors',
            text: 'Bilinen güçlü rakipler kimler? (virgülle ayırın)',
            type: 'text',
            required: false,
            examples: ['ABC Catering, XYZ Yemek, 123 Gıda'],
            validation: {
              maxLength: 200
            }
          },
          {
            id: 'our_advantages',
            text: 'Size avantaj sağlayacak özellikleriniz neler?',
            type: 'multiselect',
            required: true,
            options: [
              { value: 'experience', label: 'Benzer deneyim' },
              { value: 'local', label: 'Yerel firma avantajı' },
              { value: 'certificates', label: 'Kalite belgeleri' },
              { value: 'references', label: 'Güçlü referanslar' },
              { value: 'price', label: 'Rekabetçi fiyat' },
              { value: 'team', label: 'Deneyimli ekip' }
            ]
          }
        ],
        nextStep: 'step4'
      },
      {
        id: 'step4',
        title: 'Risk Değerlendirmesi',
        description: 'Potansiyel riskleri belirleyelim',
        questions: [
          {
            id: 'payment_risk',
            text: 'Kurumun ödeme geçmişi nasıl?',
            type: 'select',
            required: true,
            options: [
              { value: 'excellent', label: 'Mükemmel (zamanında öder)' },
              { value: 'good', label: 'İyi (küçük gecikmeler)' },
              { value: 'average', label: 'Orta (1-2 ay gecikme)' },
              { value: 'poor', label: 'Kötü (3+ ay gecikme)' },
              { value: 'unknown', label: 'Bilinmiyor' }
            ]
          },
          {
            id: 'operational_risks',
            text: 'Operasyonel riskler neler?',
            type: 'multiselect',
            required: false,
            options: [
              { value: 'distance', label: 'Coğrafi uzaklık' },
              { value: 'staff', label: 'Personel bulma zorluğu' },
              { value: 'supply', label: 'Tedarik zinciri riski' },
              { value: 'quality', label: 'Kalite standartları yüksek' },
              { value: 'penalty', label: 'Ağır ceza maddeleri' }
            ]
          },
          {
            id: 'risk_tolerance',
            text: 'Risk toleransınız nedir?',
            type: 'select',
            required: true,
            options: [
              { value: 'low', label: 'Düşük (güvenli oyun)' },
              { value: 'medium', label: 'Orta (dengeli yaklaşım)' },
              { value: 'high', label: 'Yüksek (agresif strateji)' }
            ]
          }
        ],
        nextStep: 'step5'
      },
      {
        id: 'step5',
        title: 'Maliyet ve Strateji',
        description: 'Fiyatlandırma stratejinizi belirleyelim',
        questions: [
          {
            id: 'target_margin',
            text: 'Hedef kar marjınız nedir? (%)',
            type: 'number',
            required: true,
            examples: ['10', '15', '20'],
            validation: {
              min: 5,
              max: 30
            }
          },
          {
            id: 'pricing_strategy',
            text: 'Fiyatlandırma stratejiniz?',
            type: 'select',
            required: true,
            options: [
              { value: 'aggressive', label: 'Agresif (düşük fiyat, düşük kar)' },
              { value: 'competitive', label: 'Rekabetçi (piyasa fiyatı)' },
              { value: 'premium', label: 'Premium (yüksek kalite, yüksek fiyat)' },
              { value: 'balanced', label: 'Dengeli (fiyat-kalite optimum)' }
            ]
          },
          {
            id: 'cost_optimization',
            text: 'Maliyet optimizasyon yöntemleriniz?',
            type: 'multiselect',
            required: false,
            options: [
              { value: 'bulk', label: 'Toplu alım indirimleri' },
              { value: 'seasonal', label: 'Mevsimsel menü planlama' },
              { value: 'waste', label: 'Fire azaltma programı' },
              { value: 'automation', label: 'Otomasyon yatırımı' },
              { value: 'partnership', label: 'Tedarikçi ortaklıkları' }
            ]
          }
        ],
        nextStep: 'complete'
      }
    ],
    completionMessage: 'İhale değerlendirmeniz tamamlandı! Şimdi detaylı analiz ve öneriler hazırlanıyor...'
  },

  'maliyet_optimizasyon': {
    id: 'cost_optimization',
    name: 'Maliyet Optimizasyon Sihirbazı',
    description: 'Mevcut maliyetleri analiz edip optimizasyon önerileri',
    estimatedTime: '10-15 dakika',
    steps: [
      {
        id: 'current_state',
        title: 'Mevcut Durum Analizi',
        description: 'Şu anki maliyet yapınızı anlayalım',
        questions: [
          {
            id: 'monthly_cost',
            text: 'Aylık toplam yemek maliyetiniz? (TL)',
            type: 'number',
            required: true,
            validation: {
              min: 10000,
              max: 10000000
            }
          },
          {
            id: 'person_served',
            text: 'Aylık kaç kişiye hizmet veriyorsunuz?',
            type: 'number',
            required: true,
            validation: {
              min: 100,
              max: 100000
            }
          },
          {
            id: 'current_margin',
            text: 'Mevcut kar marjınız? (%)',
            type: 'number',
            required: true,
            validation: {
              min: 0,
              max: 50
            }
          }
        ],
        nextStep: 'problem_areas'
      },
      {
        id: 'problem_areas',
        title: 'Problem Alanları',
        description: 'Maliyet artışına neden olan faktörler',
        questions: [
          {
            id: 'main_problems',
            text: 'En büyük maliyet sorunlarınız?',
            type: 'multiselect',
            required: true,
            options: [
              { value: 'ingredient_prices', label: 'Yüksek malzeme fiyatları' },
              { value: 'waste', label: 'Yüksek fire oranı' },
              { value: 'labor', label: 'İşçilik maliyetleri' },
              { value: 'energy', label: 'Enerji giderleri' },
              { value: 'logistics', label: 'Lojistik/nakliye' }
            ]
          },
          {
            id: 'waste_rate',
            text: 'Tahmini fire oranınız? (%)',
            type: 'number',
            required: true,
            validation: {
              min: 0,
              max: 30
            }
          }
        ],
        nextStep: 'optimization_goals'
      },
      {
        id: 'optimization_goals',
        title: 'Optimizasyon Hedefleri',
        description: 'Ulaşmak istediğiniz hedefler',
        questions: [
          {
            id: 'target_reduction',
            text: 'Hedef maliyet azaltma oranı? (%)',
            type: 'number',
            required: true,
            validation: {
              min: 5,
              max: 30
            }
          },
          {
            id: 'timeline',
            text: 'Bu hedefe ne zamanda ulaşmak istiyorsunuz?',
            type: 'select',
            required: true,
            options: [
              { value: '1', label: '1 ay içinde' },
              { value: '3', label: '3 ay içinde' },
              { value: '6', label: '6 ay içinde' },
              { value: '12', label: '1 yıl içinde' }
            ]
          },
          {
            id: 'acceptable_changes',
            text: 'Hangi değişiklikleri kabul edebilirsiniz?',
            type: 'multiselect',
            required: true,
            options: [
              { value: 'menu', label: 'Menü değişikliği' },
              { value: 'suppliers', label: 'Tedarikçi değişikliği' },
              { value: 'portions', label: 'Porsiyon ayarlaması' },
              { value: 'quality', label: 'Kalite standardı revizyonu' },
              { value: 'investment', label: 'Ekipman yatırımı' }
            ]
          }
        ],
        nextStep: 'complete'
      }
    ],
    completionMessage: 'Maliyet analizi tamamlandı! Optimizasyon önerileri hazırlanıyor...'
  },

  'menu_planlama': {
    id: 'menu_planning',
    name: 'Menü Planlama Asistanı',
    description: 'Bütçe ve beslenme dengeli menü oluşturma',
    estimatedTime: '10 dakika',
    steps: [
      {
        id: 'basics',
        title: 'Temel Bilgiler',
        description: 'Menü planlama için temel parametreler',
        questions: [
          {
            id: 'institution_type',
            text: 'Kurum tipi nedir?',
            type: 'select',
            required: true,
            options: [
              { value: 'hospital', label: 'Hastane' },
              { value: 'school', label: 'Okul' },
              { value: 'university', label: 'Üniversite' },
              { value: 'factory', label: 'Fabrika/İşyeri' },
              { value: 'other', label: 'Diğer' }
            ]
          },
          {
            id: 'daily_people',
            text: 'Günlük kaç kişi?',
            type: 'number',
            required: true,
            validation: {
              min: 50,
              max: 10000
            }
          },
          {
            id: 'budget_per_person',
            text: 'Kişi başı günlük bütçe? (TL)',
            type: 'number',
            required: true,
            validation: {
              min: 20,
              max: 200
            }
          }
        ],
        nextStep: 'preferences'
      },
      {
        id: 'preferences',
        title: 'Tercihler ve Kısıtlar',
        description: 'Menü tercihlerinizi belirleyin',
        questions: [
          {
            id: 'meal_types',
            text: 'Hangi öğünler?',
            type: 'multiselect',
            required: true,
            options: [
              { value: 'breakfast', label: 'Kahvaltı' },
              { value: 'lunch', label: 'Öğle Yemeği' },
              { value: 'dinner', label: 'Akşam Yemeği' },
              { value: 'snack', label: 'Ara Öğün' }
            ]
          },
          {
            id: 'dietary_restrictions',
            text: 'Diyet kısıtlamaları?',
            type: 'multiselect',
            required: false,
            options: [
              { value: 'vegetarian', label: 'Vejetaryen seçenek' },
              { value: 'vegan', label: 'Vegan seçenek' },
              { value: 'gluten_free', label: 'Glutensiz' },
              { value: 'diabetic', label: 'Diyabetik' },
              { value: 'low_salt', label: 'Tuzsuz/Az tuzlu' }
            ]
          },
          {
            id: 'cuisine_preferences',
            text: 'Mutfak tercihleri?',
            type: 'multiselect',
            required: false,
            options: [
              { value: 'traditional', label: 'Geleneksel Türk' },
              { value: 'mediterranean', label: 'Akdeniz' },
              { value: 'international', label: 'Dünya mutfağı' },
              { value: 'healthy', label: 'Sağlıklı/Fit' }
            ]
          }
        ],
        nextStep: 'complete'
      }
    ],
    completionMessage: 'Menü planınız hazırlanıyor! Beslenme değerleri ve maliyet analizi ile birlikte sunulacak...'
  }
};

/**
 * Planning state interface
 */
export interface PlanningState {
  planId: string;
  templateId: string;
  currentStep: string;
  startedAt: string;
  completedSteps: string[];
  collectedData: Record<string, any>;
  validationErrors: Record<string, string>;
  isComplete: boolean;
}

/**
 * Planning Engine Class
 */
export class PlanningEngine {
  private static instance: PlanningEngine;
  private activePlans: Map<string, PlanningState> = new Map();

  // Singleton
  public static getInstance(): PlanningEngine {
    if (!PlanningEngine.instance) {
      PlanningEngine.instance = new PlanningEngine();
    }
    return PlanningEngine.instance;
  }

  /**
   * Start a new planning session
   */
  startPlanning(templateId: string, userId?: string): PlanningState {
    const template = PLANNING_TEMPLATES[templateId];
    if (!template) {
      throw new Error(`Planning template not found: ${templateId}`);
    }

    const planId = this.generatePlanId();
    const state: PlanningState = {
      planId,
      templateId,
      currentStep: template.steps[0].id,
      startedAt: new Date().toISOString(),
      completedSteps: [],
      collectedData: {},
      validationErrors: {},
      isComplete: false
    };

    this.activePlans.set(planId, state);

    AILogger.info('Planning session started', {
      planId,
      templateId,
      userId
    });

    return state;
  }

  /**
   * Get current step information
   */
  getCurrentStep(planId: string): any {
    const state = this.activePlans.get(planId);
    if (!state) {
      throw new Error(`Planning session not found: ${planId}`);
    }

    const template = PLANNING_TEMPLATES[state.templateId];
    return template.steps.find(s => s.id === state.currentStep);
  }

  /**
   * Submit step data and move to next step
   */
  submitStep(planId: string, stepData: Record<string, any>): {
    success: boolean;
    errors?: Record<string, string>;
    nextStep?: any;
    isComplete?: boolean;
  } {
    const state = this.activePlans.get(planId);
    if (!state) {
      throw new Error(`Planning session not found: ${planId}`);
    }

    const template = PLANNING_TEMPLATES[state.templateId];
    const currentStep = template.steps.find(s => s.id === state.currentStep);

    if (!currentStep) {
      throw new Error(`Step not found: ${state.currentStep}`);
    }

    // Validate step data
    const errors = this.validateStepData(currentStep, stepData);
    if (Object.keys(errors).length > 0) {
      state.validationErrors = errors;
      return { success: false, errors };
    }

    // Save step data
    Object.entries(stepData).forEach(([key, value]) => {
      state.collectedData[key] = value;
    });

    // Mark step as completed
    state.completedSteps.push(state.currentStep);
    state.validationErrors = {};

    // Move to next step
    if (currentStep.nextStep === 'complete') {
      state.isComplete = true;

      AILogger.success('Planning session completed', {
        planId,
        templateId: state.templateId,
        stepsCompleted: state.completedSteps.length,
        dataCollected: Object.keys(state.collectedData).length
      });

      return {
        success: true,
        isComplete: true
      };
    } else {
      state.currentStep = currentStep.nextStep;
      const nextStep = template.steps.find(s => s.id === currentStep.nextStep);

      return {
        success: true,
        nextStep
      };
    }
  }

  /**
   * Go back to previous step
   */
  goBack(planId: string): any {
    const state = this.activePlans.get(planId);
    if (!state) {
      throw new Error(`Planning session not found: ${planId}`);
    }

    const template = PLANNING_TEMPLATES[state.templateId];
    const currentStepIndex = template.steps.findIndex(s => s.id === state.currentStep);

    if (currentStepIndex > 0) {
      const previousStep = template.steps[currentStepIndex - 1];
      state.currentStep = previousStep.id;

      // Remove from completed steps
      state.completedSteps = state.completedSteps.filter(id => id !== previousStep.id);

      return previousStep;
    }

    return null;
  }

  /**
   * Get planning state
   */
  getState(planId: string): PlanningState | undefined {
    return this.activePlans.get(planId);
  }

  /**
   * Get planning progress
   */
  getProgress(planId: string): number {
    const state = this.activePlans.get(planId);
    if (!state) return 0;

    const template = PLANNING_TEMPLATES[state.templateId];
    return (state.completedSteps.length / template.steps.length) * 100;
  }

  /**
   * Cancel planning session
   */
  cancelPlanning(planId: string): void {
    this.activePlans.delete(planId);

    AILogger.info('Planning session cancelled', { planId });
  }

  /**
   * Get completed plan data
   */
  getCompletedPlanData(planId: string): any {
    const state = this.activePlans.get(planId);
    if (!state || !state.isComplete) {
      return null;
    }

    return {
      planId: state.planId,
      templateId: state.templateId,
      completedAt: new Date().toISOString(),
      data: state.collectedData,
      summary: this.generatePlanSummary(state)
    };
  }

  /**
   * Get available planning templates
   */
  getAvailableTemplates(): any[] {
    return Object.entries(PLANNING_TEMPLATES).map(([id, template]) => ({
      id,
      name: template.name,
      description: template.description,
      estimatedTime: template.estimatedTime,
      stepCount: template.steps.length
    }));
  }

  // =========================================
  // Private Helper Methods
  // =========================================

  private generatePlanId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateStepData(step: any, data: Record<string, any>): Record<string, string> {
    const errors: Record<string, string> = {};

    step.questions.forEach((question: any) => {
      const value = data[question.id];

      // Check required fields
      if (question.required && !value) {
        errors[question.id] = 'Bu alan zorunludur';
        return;
      }

      // Skip validation if not required and empty
      if (!question.required && !value) {
        return;
      }

      // Type-specific validation
      switch (question.type) {
        case 'text':
          if (question.validation) {
            if (question.validation.minLength && value.length < question.validation.minLength) {
              errors[question.id] = `En az ${question.validation.minLength} karakter olmalı`;
            }
            if (question.validation.maxLength && value.length > question.validation.maxLength) {
              errors[question.id] = `En fazla ${question.validation.maxLength} karakter olabilir`;
            }
            if (question.validation.pattern) {
              const regex = new RegExp(question.validation.pattern);
              if (!regex.test(value)) {
                errors[question.id] = 'Geçersiz format';
              }
            }
          }
          break;

        case 'number':
          const numValue = Number(value);
          if (isNaN(numValue)) {
            errors[question.id] = 'Geçerli bir sayı giriniz';
          } else if (question.validation) {
            if (question.validation.min !== undefined && numValue < question.validation.min) {
              errors[question.id] = `En az ${question.validation.min} olmalı`;
            }
            if (question.validation.max !== undefined && numValue > question.validation.max) {
              errors[question.id] = `En fazla ${question.validation.max} olabilir`;
            }
          }
          break;

        case 'select':
          const validOptions = question.options.map((o: any) => o.value);
          if (!validOptions.includes(value)) {
            errors[question.id] = 'Geçersiz seçim';
          }
          break;

        case 'multiselect':
          if (!Array.isArray(value)) {
            errors[question.id] = 'Geçersiz seçim';
          } else {
            const validMultiOptions = question.options.map((o: any) => o.value);
            const invalidSelections = value.filter(v => !validMultiOptions.includes(v));
            if (invalidSelections.length > 0) {
              errors[question.id] = 'Geçersiz seçimler var';
            }
          }
          break;
      }
    });

    return errors;
  }

  private generatePlanSummary(state: PlanningState): string {
    const template = PLANNING_TEMPLATES[state.templateId];
    const data = state.collectedData;

    let summary = `**${template.name} Özeti**\n\n`;

    // Add key data points based on template type
    switch (state.templateId) {
      case 'ihale_degerlendirme':
        summary += `• Kurum: ${data.institution || 'Belirtilmedi'}\n`;
        summary += `• Bütçe: ${this.formatCurrency(data.budget)}\n`;
        summary += `• Kişi Sayısı: ${data.person_count || 0}\n`;
        summary += `• Süre: ${data.duration || 0} ay\n`;
        summary += `• Risk Toleransı: ${data.risk_tolerance || 'Orta'}\n`;
        summary += `• Hedef Kar Marjı: %${data.target_margin || 15}\n`;
        break;

      case 'maliyet_optimizasyon':
        summary += `• Aylık Maliyet: ${this.formatCurrency(data.monthly_cost)}\n`;
        summary += `• Kişi Sayısı: ${data.person_served || 0}\n`;
        summary += `• Mevcut Marj: %${data.current_margin || 0}\n`;
        summary += `• Hedef Azaltma: %${data.target_reduction || 0}\n`;
        summary += `• Süre: ${data.timeline || 0} ay\n`;
        break;

      case 'menu_planlama':
        summary += `• Kurum Tipi: ${data.institution_type || 'Diğer'}\n`;
        summary += `• Günlük Kişi: ${data.daily_people || 0}\n`;
        summary += `• Kişi Başı Bütçe: ${this.formatCurrency(data.budget_per_person)}\n`;
        summary += `• Öğünler: ${data.meal_types?.join(', ') || 'Belirtilmedi'}\n`;
        break;
    }

    return summary;
  }

  private formatCurrency(amount: number): string {
    if (!amount) return '0 TL';
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}

// Export singleton instance
export const planningEngine = PlanningEngine.getInstance();