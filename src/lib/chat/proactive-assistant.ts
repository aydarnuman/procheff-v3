/**
 * Proactive Assistant Service
 * Provides automatic suggestions, alerts, and contextual help
 */

import { AILogger } from '@/lib/ai/logger';
import { getDatabase } from '@/lib/db/universal-client';

import * as TenderExpertModule from './expertise/tender-expert';
import * as CostExpertModule from './expertise/cost-expert';

export interface ProactiveSuggestion {
  id: string;
  type: 'tip' | 'alert' | 'opportunity' | 'reminder' | 'insight';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  action?: {
    label: string;
    command: string;
  };
  metadata?: {
    source?: string;
    expires?: Date;
    relatedTo?: string;
    confidence?: number;
  };
  icon?: string;
}

export interface ProactiveContext {
  currentPage?: string;
  recentActivities?: Array<{
    type: string;
    timestamp: Date;
    data?: any;
  }>;
  userProfile?: {
    role?: string;
    experience?: 'beginner' | 'intermediate' | 'expert';
    preferences?: string[];
  };
  systemState?: {
    activeTenders?: number;
    pendingAnalyses?: number;
    recentErrors?: number;
  };
}

export class ProactiveAssistant {
  private suggestions: Map<string, ProactiveSuggestion> = new Map();
  private shownSuggestions: Set<string> = new Set();
  private lastCheckTime: Date = new Date();

  constructor() {
    this.initDatabase();
    this.startMonitoring();
  }

  private async initDatabase() {
    const db = await getDatabase();

    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS proactive_suggestions (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          priority TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          action_label TEXT,
          action_command TEXT,
          metadata TEXT,
          shown_count INTEGER DEFAULT 0,
          last_shown TIMESTAMPTZ,
          dismissed BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS proactive_triggers (
          id SERIAL PRIMARY KEY,
          trigger_type TEXT NOT NULL,
          condition TEXT NOT NULL,
          suggestion_template TEXT NOT NULL,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Create indexes separately
      try {
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_suggestions_type ON proactive_suggestions(type)`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_suggestions_priority ON proactive_suggestions(priority)`);
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_triggers_type ON proactive_triggers(trigger_type)`);
      } catch (e) {
        // Indexes may already exist, ignore
      }
    } catch (error) {
      console.error('Failed to initialize proactive assistant database:', error);
    }
  }
    `);

    // Seed default triggers
    await this.seedDefaultTriggers();
  }

  private async seedDefaultTriggers() {
    const db = await getDatabase();

    const triggers = [
      {
        type: 'deadline_approaching',
        condition: 'tender_deadline < 48_hours',
        template: 'İhale son teslim tarihine 48 saat kaldı'
      },
      {
        type: 'high_budget_tender',
        condition: 'tender_budget > 1000000',
        template: 'Yüksek bütçeli ihale tespit edildi'
      },
      {
        type: 'similar_past_tender',
        condition: 'similarity_score > 0.8',
        template: 'Benzer bir ihaleye daha önce katıldınız'
      },
      {
        type: 'cost_optimization',
        condition: 'cost_variance > 15%',
        template: 'Maliyet optimizasyonu fırsatı tespit edildi'
      },
      {
        type: 'incomplete_analysis',
        condition: 'analysis_progress < 100%',
        template: 'Tamamlanmamış analiz bulundu'
      }
    ];

    for (const trigger of triggers) {
      await db.execute(`
        INSERT INTO proactive_triggers (trigger_type, condition, suggestion_template)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
      `, [trigger.type, trigger.condition, trigger.template]);
    }
  }

  private startMonitoring() {
    // Check for suggestions every 30 seconds
    setInterval(() => {
      this.checkForSuggestions();
    }, 30000);
  }

  /**
   * Get proactive suggestions based on context
   */
  async getSuggestions(context: ProactiveContext): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = [];

    // Page-specific suggestions
    if (context.currentPage) {
      suggestions.push(...this.getPageSuggestions(context.currentPage));
    }

    // Activity-based suggestions
    if (context.recentActivities) {
      suggestions.push(...this.getActivitySuggestions(context.recentActivities));
    }

    // System state suggestions
    if (context.systemState) {
      suggestions.push(...this.getSystemStateSuggestions(context.systemState));
    }

    // Time-based suggestions
    suggestions.push(...this.getTimeSuggestions());

    // Expertise-based suggestions
    suggestions.push(...await this.getExpertiseSuggestions(context));

    // Filter out already shown suggestions (unless critical)
    const filtered = suggestions.filter(s =>
      s.priority === 'critical' || !this.shownSuggestions.has(s.id)
    );

    // Mark as shown
    filtered.forEach(s => this.shownSuggestions.add(s.id));

    // Sort by priority
    return filtered.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Get page-specific suggestions
   */
  private getPageSuggestions(page: string): ProactiveSuggestion[] {
    const suggestions: ProactiveSuggestion[] = [];

    switch (page) {
      case '/ihale':
        suggestions.push({
          id: 'ihale-tip-1',
          type: 'tip',
          priority: 'low',
          title: 'İhale Listesi İpucu',
          message: 'Tabloyu CSV olarak dışa aktarmak için "Export CSV" butonunu kullanabilirsiniz.',
          icon: '💡'
        });

        suggestions.push({
          id: 'ihale-opportunity-1',
          type: 'opportunity',
          priority: 'medium',
          title: 'Yeni İhaleler Var',
          message: 'Son kontrolünüzden bu yana 5 yeni ihale eklendi.',
          action: {
            label: 'İhaleleri Gör',
            command: '/refresh-tenders'
          },
          icon: '🎯'
        });
        break;

      case '/analysis':
        suggestions.push({
          id: 'analysis-tip-1',
          type: 'tip',
          priority: 'low',
          title: 'Analiz İpucu',
          message: 'Birden fazla dosyayı aynı anda yükleyerek toplu analiz yapabilirsiniz.',
          icon: '📊'
        });
        break;

      case '/chat':
        suggestions.push({
          id: 'chat-insight-1',
          type: 'insight',
          priority: 'medium',
          title: 'Sıkça Sorulan Sorular',
          message: 'En çok "maliyet hesaplama" konusunda soru soruyorsunuz. Detaylı bir rehber ister misiniz?',
          action: {
            label: 'Rehberi Göster',
            command: '/show-cost-guide'
          },
          icon: '📚'
        });
        break;

      case '/decision':
        suggestions.push({
          id: 'decision-alert-1',
          type: 'alert',
          priority: 'high',
          title: 'Eksik Bilgi',
          message: 'Karar verme için menü analizi tamamlanmamış.',
          action: {
            label: 'Menü Analizi Yap',
            command: '/navigate-menu-parser'
          },
          icon: '⚠️'
        });
        break;
    }

    return suggestions;
  }

  /**
   * Get activity-based suggestions
   */
  private getActivitySuggestions(activities: Array<{ type: string; timestamp: Date; data?: any }>): ProactiveSuggestion[] {
    const suggestions: ProactiveSuggestion[] = [];

    // Check for repeated failures
    const recentErrors = activities.filter(a =>
      a.type === 'error' &&
      (new Date().getTime() - a.timestamp.getTime()) < 300000 // Last 5 minutes
    );

    if (recentErrors.length >= 3) {
      suggestions.push({
        id: 'error-pattern-1',
        type: 'alert',
        priority: 'high',
        title: 'Tekrarlayan Hatalar',
        message: 'Son 5 dakikada birden fazla hata oluştu. Yardım almak ister misiniz?',
        action: {
          label: 'Yardım Al',
          command: '/help-errors'
        },
        icon: '🆘'
      });
    }

    // Check for incomplete workflows
    const startedAnalysis = activities.find(a => a.type === 'analysis_started');
    const completedAnalysis = activities.find(a => a.type === 'analysis_completed');

    if (startedAnalysis && !completedAnalysis) {
      const timeDiff = new Date().getTime() - startedAnalysis.timestamp.getTime();
      if (timeDiff > 600000) { // 10 minutes
        suggestions.push({
          id: 'incomplete-analysis-1',
          type: 'reminder',
          priority: 'medium',
          title: 'Tamamlanmamış Analiz',
          message: 'Başlattığınız analizi tamamlamak ister misiniz?',
          action: {
            label: 'Analizi Tamamla',
            command: '/continue-analysis'
          },
          icon: '🔄'
        });
      }
    }

    return suggestions;
  }

  /**
   * Get system state suggestions
   */
  private getSystemStateSuggestions(state: any): ProactiveSuggestion[] {
    const suggestions: ProactiveSuggestion[] = [];

    if (state.activeTenders > 10) {
      suggestions.push({
        id: 'high-tender-count-1',
        type: 'opportunity',
        priority: 'medium',
        title: 'Çok Sayıda Aktif İhale',
        message: `${state.activeTenders} aktif ihale var. Öncelik sıralaması yapmak ister misiniz?`,
        action: {
          label: 'Öncelikleri Belirle',
          command: '/prioritize-tenders'
        },
        icon: '📈'
      });
    }

    if (state.pendingAnalyses > 0) {
      suggestions.push({
        id: 'pending-analyses-1',
        type: 'reminder',
        priority: 'medium',
        title: 'Bekleyen Analizler',
        message: `${state.pendingAnalyses} adet bekleyen analiz var.`,
        action: {
          label: 'Analizleri Göster',
          command: '/show-pending'
        },
        icon: '⏳'
      });
    }

    if (state.recentErrors > 5) {
      suggestions.push({
        id: 'system-health-1',
        type: 'alert',
        priority: 'high',
        title: 'Sistem Sağlığı',
        message: 'Sistem performansında düşüş tespit edildi.',
        action: {
          label: 'Detayları Gör',
          command: '/system-health'
        },
        icon: '🔧'
      });
    }

    return suggestions;
  }

  /**
   * Get time-based suggestions
   */
  private getTimeSuggestions(): ProactiveSuggestion[] {
    const suggestions: ProactiveSuggestion[] = [];
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // Morning briefing
    if (hour >= 8 && hour <= 10) {
      suggestions.push({
        id: `morning-brief-${now.toDateString()}`,
        type: 'insight',
        priority: 'low',
        title: 'Günaydın!',
        message: 'Bugün için 3 kritik ihale son teslim tarihi yaklaşıyor.',
        action: {
          label: 'İhaleleri Gör',
          command: '/today-deadlines'
        },
        icon: '☀️',
        metadata: {
          expires: new Date(now.getTime() + 7200000) // 2 hours
        }
      });
    }

    // Friday reminder
    if (dayOfWeek === 5 && hour >= 14) {
      suggestions.push({
        id: `friday-reminder-${now.toDateString()}`,
        type: 'reminder',
        priority: 'medium',
        title: 'Haftalık Özet',
        message: 'Bu hafta 12 analiz tamamlandı. Haftalık raporu görmek ister misiniz?',
        action: {
          label: 'Raporu Gör',
          command: '/weekly-report'
        },
        icon: '📅',
        metadata: {
          expires: new Date(now.getTime() + 14400000) // 4 hours
        }
      });
    }

    return suggestions;
  }

  /**
   * Get expertise-based suggestions
   */
  private async getExpertiseSuggestions(context: ProactiveContext): Promise<ProactiveSuggestion[]> {
    const suggestions: ProactiveSuggestion[] = [];

    // Check for institution-specific tips
    if (context.recentActivities) {
      const tenderActivity = context.recentActivities.find(a =>
        a.type === 'tender_view' && a.data?.institution
      );

      if (tenderActivity?.data?.institution) {
        const institution = tenderActivity.data.institution.toLowerCase();

        // Find matching profile
        const profile = Object.entries(TenderExpertModule.INSTITUTION_PROFILES).find(([key]) =>
          institution.includes(key.replace('_', ' '))
        );

        if (profile) {
          suggestions.push({
            id: `institution-tip-${profile[0]}`,
            type: 'insight',
            priority: 'medium',
            title: 'Kurum Önerisi',
            message: (profile[1] as any).tips?.[0] || 'Kurum hakkında bilgi mevcut',
            icon: '🏢',
            metadata: {
              source: 'tender_expert',
              relatedTo: institution
            }
          });
        }
      }
    }

    // Check for cost optimization opportunities
    if (context.currentPage === '/analysis' || context.currentPage === '/decision') {
      const seasonalItems = CostExpertModule.INGREDIENT_PRICES;
      const currentMonth = new Date().getMonth() + 1;

      const inSeasonItems = Object.entries(seasonalItems)
        .filter(([_, months]) => Array.isArray(months) && months.includes(currentMonth))
        .slice(0, 3);

      if (inSeasonItems.length > 0) {
        suggestions.push({
          id: `seasonal-tip-${currentMonth}`,
          type: 'opportunity',
          priority: 'low',
          title: 'Mevsimsel Fırsat',
          message: `Bu ay ${inSeasonItems.map(([item]) => item).join(', ')} ürünleri sezonda ve daha uygun fiyatlı.`,
          icon: '🌿',
          metadata: {
            source: 'cost_expert'
          }
        });
      }
    }

    return suggestions;
  }

  /**
   * Check for suggestions periodically
   */
  private async checkForSuggestions() {
    try {
      const db = await getDatabase();

      // Get active triggers
      const triggers = await db.query(`
        SELECT * FROM proactive_triggers WHERE active = $1
      `, [true]) as any[];

      // Evaluate each trigger
      for (const trigger of triggers) {
        // This is simplified - in production, you'd evaluate actual conditions
        if (Math.random() < 0.1) { // 10% chance for demo
          const suggestion: ProactiveSuggestion = {
            id: `trigger-${trigger.id}-${Date.now()}`,
            type: 'alert',
            priority: 'medium',
            title: trigger.suggestion_template,
            message: 'Otomatik tespit edildi.',
            icon: '🔔'
          };

          this.suggestions.set(suggestion.id, suggestion);
        }
      }

      AILogger.info('Proactive check completed', {
        suggestionCount: this.suggestions.size
      });
    } catch (error) {
      AILogger.error('Proactive check failed', { error });
    }
  }

  /**
   * Dismiss a suggestion
   */
  async dismissSuggestion(suggestionId: string): Promise<void> {
    const db = await getDatabase();

    await db.execute(`
      UPDATE proactive_suggestions
      SET dismissed = $1
      WHERE id = $2
    `, [true, suggestionId]);

    this.suggestions.delete(suggestionId);
    this.shownSuggestions.add(suggestionId);
  }

  /**
   * Execute suggestion action
   */
  async executeAction(suggestionId: string): Promise<any> {
    const suggestion = this.suggestions.get(suggestionId);
    if (!suggestion?.action) return null;

    // Log action execution
    AILogger.info('Executing proactive action', {
      suggestionId,
      command: suggestion.action.command
    });

    // In a real implementation, this would execute the actual command
    // For now, return a success message
    return {
      success: true,
      command: suggestion.action.command,
      message: 'Komut çalıştırıldı'
    };
  }
}

export const proactiveAssistant = new ProactiveAssistant();
