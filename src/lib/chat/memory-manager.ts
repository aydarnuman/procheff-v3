/**
 * Memory Manager - MCP Memory Integration
 * Manages knowledge graph for learning chat assistant
 */

import type { AnalysisResult } from '@/store/analysisStore';
import { mcpIntegration, type MCPEntity, type MCPRelation } from './mcp-integration';
import { AILogger } from '@/lib/ai/logger';

export interface UserFeedback {
  analysisId: string;
  correction: string;
  timestamp: string;
  userId?: string;
}

export interface Context {
  similarTenders: MCPEntity[];
  learnedRules: MCPEntity[];
  relevantObservations: string[];
}

export class MemoryManager {
  /**
   * Save analysis results to memory (knowledge graph)
   */
  async saveAnalysisToMemory(analysis: AnalysisResult): Promise<void> {
    try {
      const entityName = this.generateEntityName('ihale_analizi', analysis.id);

      // Build observations from analysis data
      const observations = this.buildAnalysisObservations(analysis);

      // Create entity in knowledge graph
      const entities = [{
        name: entityName,
        entityType: 'ihale_analizi',
        observations
      }];

      // Save to memory using MCP
      const success = await this.createEntities(entities);

      // Extract and save keywords as separate entities
      if (success && analysis.dataPool) {
        await this.saveKeywordsAsEntities(entityName, analysis);
      }

      AILogger.success(`Analysis saved to memory: ${entityName}`, {
        entityName,
        observationCount: observations.length
      });
    } catch (error) {
      AILogger.error('Failed to save analysis to memory', { error });
      throw error;
    }
  }

  /**
   * Find similar tenders based on keywords
   */
  async findSimilarTenders(keywords: string[]): Promise<any[]> {
    try {
      const results = [];

      for (const keyword of keywords) {
        const searchResults = await this.searchNodes(keyword);
        if (searchResults && searchResults.length > 0) {
          results.push(...searchResults);
        }
      }

      // Remove duplicates
      const unique = this.removeDuplicates(results);

      return unique.slice(0, 5); // Return top 5
    } catch (error) {
      AILogger.error('Failed to find similar tenders', { error });
      return [];
    }
  }

  /**
   * Add user feedback to memory
   */
  async addUserFeedback(feedback: UserFeedback): Promise<void> {
    try {
      const entityName = this.generateEntityName('kullanici_feedback', feedback.timestamp);

      const entities = [{
        name: entityName,
        entityType: 'kullanici_feedback',
        observations: [
          `Analysis ID: ${feedback.analysisId}`,
          `Correction: ${feedback.correction}`,
          `Timestamp: ${feedback.timestamp}`,
          `User: ${feedback.userId || 'anonymous'}`
        ]
      }];

      await this.createEntities(entities);

      // Create relation to original analysis
      const relations = [{
        from: entityName,
        to: this.generateEntityName('ihale_analizi', feedback.analysisId),
        relationType: 'duzeltir'
      }];

      await this.createRelations(relations);

      AILogger.success(`User feedback saved: ${entityName}`);
    } catch (error) {
      AILogger.error('Failed to save user feedback', { error });
      throw error;
    }
  }

  /**
   * Get relevant context for chat query
   */
  async getRelevantContext(query: string): Promise<Context> {
    try {
      const keywords = this.extractKeywords(query);

      // Search for similar tenders
      const similarTenders = await this.findSimilarTenders(keywords);

      // Search for learned rules
      const learnedRules = await this.searchNodes('ogrenme_kurali');

      // Collect relevant observations
      const relevantObservations: string[] = [];
      for (const tender of similarTenders.slice(0, 3)) {
        if (tender.observations) {
          relevantObservations.push(...tender.observations);
        }
      }

      return {
        similarTenders,
        learnedRules: learnedRules || [],
        relevantObservations
      };
    } catch (error) {
      AILogger.error('Failed to get relevant context', { error });
      return {
        similarTenders: [],
        learnedRules: [],
        relevantObservations: []
      };
    }
  }

  /**
   * Build observations from analysis results
   */
  private buildAnalysisObservations(analysis: AnalysisResult): string[] {
    const observations: string[] = [];

    // Basic info
    observations.push(`Analysis ID: ${analysis.id}`);
    observations.push(`Created: ${analysis.created_at}`);
    observations.push(`Status: ${analysis.status}`);

    // Data pool info
    if (analysis.dataPool) {
      const { basicInfo } = analysis.dataPool;
      if (basicInfo) {
        if (basicInfo.kurum) observations.push(`Kurum: ${basicInfo.kurum}`);
        if (basicInfo.butce) observations.push(`Bütçe: ${basicInfo.butce}`);
        if (basicInfo.kisilik) observations.push(`Kişilik: ${basicInfo.kisilik}`);
        if (basicInfo.ihale_turu) observations.push(`İhale Türü: ${basicInfo.ihale_turu}`);
      }
    }

    // Contextual analysis
    if ((analysis as any).contextual) {
      observations.push(`Risk Seviyesi: ${(analysis as any).contextual.operasyonel_riskler.seviye}`);
      observations.push(`Maliyet Sapma: ${(analysis as any).contextual.maliyet_sapma_olasiligi.oran}%`);
      observations.push(`Zaman Uygun: ${(analysis as any).contextual.zaman_uygunlugu.yeterli ? 'Evet' : 'Hayır'}`);
    }

    // Deep analysis decision
    if ((analysis as any).deep?.karar_onerisi) {
      observations.push(`Karar: ${(analysis as any).deep.karar_onerisi.karar}`);
      observations.push(`Puan: ${(analysis as any).deep.karar_onerisi.puan}`);
      observations.push(`Gerekçe: ${(analysis as any).deep.karar_onerisi.gerekce}`);
    }

    return observations;
  }

  /**
   * Save keywords as separate entities for better search
   */
  private async saveKeywordsAsEntities(analysisEntityName: string, analysis: AnalysisResult): Promise<void> {
    try {
      const keywords: string[] = [];

      // Extract keywords from data pool
      if (analysis.dataPool?.basicInfo) {
        const { kurum, ihale_turu } = analysis.dataPool.basicInfo;
        if (kurum) keywords.push(...kurum.split(' ').filter(k => k.length > 3));
        if (ihale_turu) keywords.push(...ihale_turu.split(' ').filter(k => k.length > 3));
      }

      // Create keyword entities
      const entities = keywords.slice(0, 10).map(keyword => ({
        name: `keyword_${keyword.toLowerCase()}`,
        entityType: 'anahtar_kelime',
        observations: [`Keyword: ${keyword}`]
      }));

      if (entities.length > 0) {
        await this.createEntities(entities);

        // Create relations
        const relations = entities.map(entity => ({
          from: analysisEntityName,
          to: entity.name,
          relationType: 'icerir_kelime'
        }));

        await this.createRelations(relations);
      }
    } catch (error) {
      AILogger.warn('Failed to save keywords', { error });
      // Non-critical, don't throw
    }
  }

  /**
   * Extract keywords from text (simple implementation)
   */
  private extractKeywords(text: string): string[] {
    // Remove common words and extract meaningful keywords
    const commonWords = ['bir', 'bu', 'şu', 'için', 'ile', 've', 'veya', 'ama', 'fakat'];
    const words = text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word));

    return [...new Set(words)]; // Remove duplicates
  }

  /**
   * Generate entity name
   */
  private generateEntityName(type: string, identifier: string): string {
    const cleanId = identifier.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    return `${type}_${cleanId}`;
  }

  /**
   * Remove duplicate entities
   */
  private removeDuplicates(entities: MCPEntity[]): MCPEntity[] {
    const seen = new Set();
    return entities.filter(entity => {
      const key = entity.name || JSON.stringify(entity);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // =========================================
  // MCP Tool Wrappers - ACTIVE
  // =========================================

  /**
   * Create entities in the knowledge graph
   */
  private async createEntities(entities: MCPEntity[]): Promise<boolean> {
    return mcpIntegration.createEntities(entities);
  }

  /**
   * Create relations between entities
   */
  private async createRelations(relations: MCPRelation[]): Promise<boolean> {
    return mcpIntegration.createRelations(relations);
  }

  /**
   * Search for nodes in the knowledge graph
   */
  private async searchNodes(query: string): Promise<MCPEntity[]> {
    return mcpIntegration.searchNodes(query);
  }
}
