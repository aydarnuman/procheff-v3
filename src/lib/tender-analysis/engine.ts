/**
 * Tender Analysis Orchestrator Engine
 * Coordinates the entire analysis pipeline
 */

import type {
  TenderAnalysisResult,
  AnalysisOptions,
  ValidationResult,
  ExtractedFields,
  ContextualAnalysis,
  MarketAnalysis,
  SourcedStatement,
  CostItem
} from './types';
import type { DataPool } from '@/lib/document-processor/types';

import { extractBasicFields, performContextualAnalysis } from './contextual';
import { performMarketAnalysis, extractMenuItems } from './market-intel';
import { validateAnalysisData } from './validators';
import { getDB } from '@/lib/db/sqlite-client';
import { AILogger } from '@/lib/ai/logger';
import { useAnalysisStore } from '@/store/analysisStore';

export class TenderAnalysisEngine {
  private analysisId: string;
  private options: AnalysisOptions;
  private startTime: number;

  constructor(analysisId: string, options?: Partial<AnalysisOptions>) {
    this.analysisId = analysisId;
    this.options = {
      enable_contextual: true,
      enable_market: true,
      enable_deep: false, // Will implement in Phase 3
      use_ai_for_market: false,
      parallel_processing: true,
      save_to_db: true,
      generate_report: false,
      ...options
    };
    this.startTime = Date.now();
  }

  /**
   * Main processing method
   */
  async processAnalysis(dataPool: DataPool): Promise<TenderAnalysisResult> {
    AILogger.info('Starting tender analysis', {
      analysisId: this.analysisId,
      documents: dataPool.documents.length,
      options: this.options
    });

    try {
      // 1. Extract basic fields
      const extractedFields = await this.extractFields(dataPool);

      // 2. Run analyses in parallel or sequential
      let contextual, market;

      if (this.options.parallel_processing) {
        // Parallel processing
        const promises: [Promise<ContextualAnalysis | null>, Promise<MarketAnalysis | null>] = [
          this.options.enable_contextual
            ? performContextualAnalysis(dataPool, extractedFields)
            : Promise.resolve(undefined),
          this.options.enable_market
            ? performMarketAnalysis(dataPool, extractedFields, extractMenuItems(dataPool))
            : Promise.resolve(undefined)
        ];

        const results = await Promise.allSettled(promises);

        // Extract results
        if (this.options.enable_contextual) {
          const contextualResult = results[0];
          contextual = contextualResult.status === 'fulfilled'
            ? contextualResult.value
            : undefined;
        }

        if (this.options.enable_market) {
          const marketResult = results[1];
          market = marketResult.status === 'fulfilled'
            ? marketResult.value
            : undefined;
        }

      } else {
        // Sequential processing
        if (this.options.enable_contextual) {
          contextual = await performContextualAnalysis(dataPool, extractedFields);
        }

        if (this.options.enable_market) {
          const menuItems = extractMenuItems(dataPool);
          market = await performMarketAnalysis(dataPool, extractedFields, menuItems);
        }
      }

      // 3. Validate results
      const validation = await this.validateResults(extractedFields, contextual, market);

      // 4. Build final result
      const result: TenderAnalysisResult = {
        analysis_id: this.analysisId,
        created_at: new Date(),
        data_pool: dataPool,
        extracted_fields: extractedFields,
        contextual,
        market,
        validation,
        processing_time_ms: Date.now() - this.startTime,
        status: 'completed',
        current_stage: 'done'
      };

      // 5. Save to database if enabled
      if (this.options.save_to_db) {
        await this.saveToDatabase(result);
      }

      // 6. Update store
      this.updateStore(result);

      AILogger.success('Tender analysis completed', {
        analysisId: this.analysisId,
        duration: result.processing_time_ms,
        contextualScore: contextual?.genel_degerlendirme?.puan,
        marketRisk: market?.comparison?.risk_level
      });

      return result;

    } catch (error) {
      AILogger.error('Tender analysis failed', {
        analysisId: this.analysisId,
        error
      });

      // Return partial result with error
      return {
        analysis_id: this.analysisId,
        created_at: new Date(),
        data_pool: dataPool,
        extracted_fields: {},
        processing_time_ms: Date.now() - this.startTime,
        status: 'failed',
        current_stage: 'done',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Extract basic fields from data pool
   */
  private async extractFields(dataPool: DataPool): Promise<ExtractedFields> {
    AILogger.info('Extracting basic fields', {
      analysisId: this.analysisId
    });

    const fields = await extractBasicFields(dataPool);

    AILogger.info('Fields extracted', {
      analysisId: this.analysisId,
      fields: Object.keys(fields)
    });

    return fields;
  }

  /**
   * Validate analysis results
   */
  private async validateResults(
    extractedFields: ExtractedFields,
    contextual?: ContextualAnalysis,
    market?: MarketAnalysis
  ): Promise<ValidationResult> {
    return validateAnalysisData(extractedFields, contextual, market);
  }

  /**
   * Save results to database
   */
  private async saveToDatabase(result: TenderAnalysisResult): Promise<void> {
    try {
      const db = getDB();

      // Update analysis history
      const updateStmt = db.prepare(`
        UPDATE analysis_history
        SET
          status = ?,
          data_pool = ?,
          extracted_fields = ?,
          contextual_analysis = ?,
          market_analysis = ?,
          validation = ?,
          processing_time_ms = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      updateStmt.run(
        result.status,
        JSON.stringify(result.data_pool),
        JSON.stringify(result.extracted_fields),
        JSON.stringify(result.contextual || {}),
        JSON.stringify(result.market || {}),
        JSON.stringify(result.validation || {}),
        result.processing_time_ms,
        this.analysisId
      );

      // Insert detailed results
      if (result.contextual) {
        const contextualStmt = db.prepare(`
          INSERT INTO analysis_results (id, analysis_id, stage, result_data)
          VALUES (?, ?, ?, ?)
        `);

        contextualStmt.run(
          `${this.analysisId}_contextual`,
          this.analysisId,
          'contextual',
          JSON.stringify(result.contextual)
        );
      }

      if (result.market) {
        const marketStmt = db.prepare(`
          INSERT INTO analysis_results (id, analysis_id, stage, result_data)
          VALUES (?, ?, ?, ?)
        `);

        marketStmt.run(
          `${this.analysisId}_market`,
          this.analysisId,
          'market',
          JSON.stringify(result.market)
        );
      }

      AILogger.info('Results saved to database', {
        analysisId: this.analysisId
      });

    } catch (error) {
      AILogger.error('Failed to save to database', {
        analysisId: this.analysisId,
        error
      });
      // Don't throw - continue even if DB save fails
    }
  }

  /**
   * Update analysis store
   */
  private updateStore(result: TenderAnalysisResult): void {
    try {
      const store = useAnalysisStore.getState();

      // Update contextual analysis
      if (result.contextual) {
        store.setContextualAnalysis(this.analysisId, {
          operasyonel_riskler: {
            seviye: result.contextual.operasyonel_riskler.seviye,
            nedenler: result.contextual.operasyonel_riskler.nedenler.map((s: SourcedStatement) => s.text),
            aciklama: result.contextual.operasyonel_riskler.nedenler[0]?.text || '',
            kaynak: result.contextual.operasyonel_riskler.nedenler.flatMap((s: SourcedStatement) => s.source_ref)
          },
          maliyet_sapma_olasiligi: {
            oran: result.contextual.maliyet_sapma_olasiligi.oran,
            neden: result.contextual.maliyet_sapma_olasiligi.faktorler[0]?.text || '',
            kaynak: result.contextual.maliyet_sapma_olasiligi.faktorler.flatMap((s: SourcedStatement) => s.source_ref)
          },
          zaman_uygunlugu: {
            yeterli: result.contextual.zaman_uygunlugu.yeterli,
            gerekce: result.contextual.zaman_uygunlugu.gun_analizi[0]?.text || '',
            kaynak: result.contextual.zaman_uygunlugu.gun_analizi.flatMap((s: SourcedStatement) => s.source_ref)
          },
          genel_oneri: result.contextual.genel_degerlendirme.ozet
        });
      }

      // Update market analysis
      if (result.market) {
        store.setMarketAnalysis(this.analysisId, {
          cost_items: result.market.cost_items.map((item: CostItem) => ({
            product_key: item.product_key,
            name: item.name_normalized,
            unit: item.unit,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            confidence: item.confidence,
            source_mix: [
              item.prices?.tuik ? 'tuik' : '',
              item.prices?.web ? 'web' : '',
              item.prices?.db ? 'db' : '',
              item.prices?.manual ? 'manual' : ''
            ].filter(Boolean)
          })),
          total_cost: result.market.total_cost,
          forecast: {
            next_month_total: result.market.forecast.next_month,
            confidence: result.market.forecast.confidence,
            trend: result.market.forecast.trend
          }
        });
      }

      // Complete analysis with scores
      const scores = this.calculateScores(result);
      store.updateAnalysis(this.analysisId, {
        status: 'completed',
        contextual_analysis: result.contextual,
        market_analysis: result.market,
        deep_analysis: result.deep,
        ...scores
      });

    } catch (error) {
      AILogger.error('Failed to update store', {
        analysisId: this.analysisId,
        error
      });
    }
  }

  /**
   * Calculate overall scores
   */
  private calculateScores(result: TenderAnalysisResult) {
    const contextual = result.contextual;
    const market = result.market;

    const riskScore = contextual
      ? (100 - contextual.operasyonel_riskler.skor)
      : 50;

    const opportunityScore = contextual
      ? contextual.genel_degerlendirme.puan
      : 50;

    const feasibilityScore = market
      ? (market.comparison.risk_level === 'safe' ? 80 :
         market.comparison.risk_level === 'tight' ? 50 : 20)
      : 50;

    const confidenceScore = result.validation
      ? result.validation.data_quality_score
      : 50;

    return {
      risk: riskScore,
      opportunity: opportunityScore,
      feasibility: feasibilityScore,
      confidence: confidenceScore
    };
  }
}

/**
 * Helper function to start analysis
 */
export async function startTenderAnalysis(
  analysisId: string,
  dataPool: DataPool,
  options?: Partial<AnalysisOptions>
): Promise<TenderAnalysisResult> {
  const engine = new TenderAnalysisEngine(analysisId, options);
  return engine.processAnalysis(dataPool);
}