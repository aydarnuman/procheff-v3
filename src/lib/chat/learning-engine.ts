/**
 * Learning Engine
 * Pattern recognition and knowledge extraction from user interactions
 */

import type { UserFeedback } from './memory-manager';

export interface LearningRule {
  id: string;
  condition: string;
  action: string;
  confidence: number;
  source: string;
  createdAt: string;
}

export class LearningEngine {
  /**
   * Extract keywords from text using simple NLP
   */
  extractKeywords(text: string): string[] {
    // Turkish stop words
    const stopWords = [
      'bir', 'bu', 'şu', 'o', 'için', 'ile', 'veya', 've', 'ama', 'fakat',
      'çünkü', 'gibi', 'kadar', 'daha', 'en', 'mi', 'mu', 'mı', 'mü',
      'da', 'de', 'ta', 'te', 'ki', 'var', 'yok', 'olan', 'olarak'
    ];

    // Clean and tokenize
    const words = text
      .toLowerCase()
      .replace(/[^\wğüşıöçĞÜŞİÖÇ\s]/g, ' ')
      .split(/\s+/)
      .filter(word => {
        return (
          word.length > 3 &&
          !stopWords.includes(word) &&
          !word.match(/^\d+$/) // Not just numbers
        );
      });

    // Count frequency
    const frequency = new Map<string, number>();
    words.forEach(word => {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    });

    // Sort by frequency and return top keywords
    const sorted = Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);

    return sorted.slice(0, 10);
  }

  /**
   * Calculate similarity between two tender analyses
   * Using simple Jaccard similarity on keywords
   */
  calculateSimilarity(tender1: any, tender2: any): number {
    try {
      // Extract text from tenders
      const text1 = this.extractTextFromTender(tender1);
      const text2 = this.extractTextFromTender(tender2);

      // Get keywords
      const keywords1 = new Set(this.extractKeywords(text1));
      const keywords2 = new Set(this.extractKeywords(text2));

      // Jaccard similarity: intersection / union
      const intersection = new Set(
        [...keywords1].filter(x => keywords2.has(x))
      );
      const union = new Set([...keywords1, ...keywords2]);

      if (union.size === 0) return 0;

      return intersection.size / union.size;
    } catch (error) {
      console.error('❌ Failed to calculate similarity:', error);
      return 0;
    }
  }

  /**
   * Generate learning rule from user feedback
   */
  generateLearningRule(feedback: UserFeedback): LearningRule {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Extract condition from feedback
    const condition = this.extractConditionFromFeedback(feedback);

    // Extract action/correction
    const action = feedback.correction;

    // Initial confidence based on feedback quality
    const confidence = this.calculateInitialConfidence(feedback);

    return {
      id,
      condition,
      action,
      confidence,
      source: `user_feedback_${feedback.timestamp}`,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Update knowledge graph with new learning rule
   * This creates an entity in the memory system
   */
  generateLearningEntity(rule: LearningRule): any {
    return {
      name: `ogrenme_kurali_${rule.id}`,
      entityType: 'ogrenme_kurali',
      observations: [
        `Condition: ${rule.condition}`,
        `Action: ${rule.action}`,
        `Confidence: ${rule.confidence}`,
        `Source: ${rule.source}`,
        `Created: ${rule.createdAt}`
      ]
    };
  }

  /**
   * Analyze patterns in multiple analyses
   */
  analyzePatterns(analyses: any[]): { patterns: string[]; insights: string[] } {
    const patterns: string[] = [];
    const insights: string[] = [];

    try {
      // Group by decision
      const decisions = new Map<string, number>();
      analyses.forEach(analysis => {
        if (analysis.deep?.karar_onerisi?.karar) {
          const karar = analysis.deep.karar_onerisi.karar;
          decisions.set(karar, (decisions.get(karar) || 0) + 1);
        }
      });

      // Pattern: Most common decision
      const mostCommon = Array.from(decisions.entries())
        .sort((a, b) => b[1] - a[1])[0];
      if (mostCommon) {
        patterns.push(`En sık karar: ${mostCommon[0]} (${mostCommon[1]} kez)`);
      }

      // Pattern: Risk levels
      const riskLevels = new Map<string, number>();
      analyses.forEach(analysis => {
        if (analysis.contextual?.operasyonel_riskler?.seviye) {
          const risk = analysis.contextual.operasyonel_riskler.seviye;
          riskLevels.set(risk, (riskLevels.get(risk) || 0) + 1);
        }
      });

      const highRisk = riskLevels.get('yuksek') || 0;
      if (highRisk > analyses.length * 0.3) {
        insights.push('Yüksek riskli ihalelerin oranı fazla. Dikkatli olun.');
      }

      // Pattern: Budget ranges
      const budgets = analyses
        .map(a => a.dataPool?.basicInfo?.butce)
        .filter(Boolean)
        .map(b => parseFloat(b.replace(/[^\d.]/g, '')))
        .filter(n => !isNaN(n));

      if (budgets.length > 0) {
        const avgBudget = budgets.reduce((a, b) => a + b, 0) / budgets.length;
        insights.push(`Ortalama bütçe: ${avgBudget.toFixed(0)} TL`);
      }
    } catch (error) {
      console.error('❌ Pattern analysis failed:', error);
    }

    return { patterns, insights };
  }

  /**
   * Score the relevance of a context item to a query
   */
  scoreRelevance(item: any, query: string): number {
    try {
      const queryKeywords = new Set(this.extractKeywords(query));
      const itemText = this.extractTextFromObject(item);
      const itemKeywords = new Set(this.extractKeywords(itemText));

      const intersection = new Set(
        [...queryKeywords].filter(x => itemKeywords.has(x))
      );

      return intersection.size / queryKeywords.size;
    } catch (error) {
      return 0;
    }
  }

  // =========================================
  // Private Helper Methods
  // =========================================

  /**
   * Extract text from tender object
   */
  private extractTextFromTender(tender: any): string {
    const parts: string[] = [];

    if (tender.observations) {
      parts.push(...tender.observations);
    }

    if (tender.dataPool?.basicInfo) {
      const { kurum, ihale_turu, butce } = tender.dataPool.basicInfo;
      if (kurum) parts.push(kurum);
      if (ihale_turu) parts.push(ihale_turu);
      if (butce) parts.push(butce);
    }

    if (tender.contextual?.genel_oneri) {
      parts.push(tender.contextual.genel_oneri);
    }

    return parts.join(' ');
  }

  /**
   * Extract text from any object
   */
  private extractTextFromObject(obj: any): string {
    if (typeof obj === 'string') return obj;
    if (Array.isArray(obj)) return obj.map(i => this.extractTextFromObject(i)).join(' ');
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).map(v => this.extractTextFromObject(v)).join(' ');
    }
    return String(obj);
  }

  /**
   * Extract condition from user feedback
   */
  private extractConditionFromFeedback(feedback: UserFeedback): string {
    // Simple heuristic: extract keywords from correction
    const keywords = this.extractKeywords(feedback.correction);

    if (keywords.length === 0) {
      return 'genel_durum';
    }

    // Build condition string
    return `contains:${keywords.slice(0, 3).join('|')}`;
  }

  /**
   * Calculate initial confidence for a learning rule
   */
  private calculateInitialConfidence(feedback: UserFeedback): number {
    // Base confidence
    let confidence = 0.6;

    // Longer corrections are more detailed and trustworthy
    const length = feedback.correction.length;
    if (length > 100) confidence += 0.2;
    else if (length > 50) confidence += 0.1;

    // Cap at 0.95 (never 100% certain initially)
    return Math.min(confidence, 0.95);
  }
}
