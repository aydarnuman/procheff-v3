import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { analyzeProductRisk } from '@/lib/market/risk-analysis';
import { seriesOf } from '@/lib/market/provider/db';
import { webQuote } from '@/lib/market/provider/web';
import { AILogger } from '@/lib/ai/logger';
import { RiskAnalyzeRequestSchema } from '@/lib/validation/market-v2';
import { validateRequest } from '@/lib/utils/validate';
import { upgradeToMarketQuoteV2 } from '@/lib/market/schema';
import type { MarketQuote } from '@/lib/market/schema';

/**
 * Product Risk Analysis API (Standalone 5-Category Risk Analysis)
 * 
 * Comprehensive risk assessment without price calculation
 * Fetches historical data and analyzes 5 risk categories
 * 
 * POST /api/market/risk/analyze
 * 
 * @param productKey - Normalized product key (required, e.g., "domates-salcasi")
 * @param includePriceHistory - Fetch price history (optional, default: true)
 * @param includeStockHistory - Fetch stock history (optional, default: true)
 * 
 * @returns ProductRiskAnalysis (5 categories + alerts + mitigation strategies)
 * 
 * **Risk Categories:**
 * 1. Price Volatility (CV-based)
 * 2. Stock Availability (out-of-stock frequency)
 * 3. Supplier Concentration (HHI)
 * 4. Seasonality (monthly pattern)
 * 5. Data Quality (freshness + completeness)
 * 
 * **Use Cases:**
 * - Pre-tender risk assessment
 * - Supplier evaluation
 * - Procurement planning
 * - Contract negotiations
 */
export async function POST(req: NextRequest) {
  try {
    // Parse and validate request
    const {
      productKey,
      includePriceHistory,
      includeStockHistory
    } = await validateRequest(req, RiskAnalyzeRequestSchema);

    AILogger.info('[Risk Analyze API] Starting risk analysis', {
      productKey,
      includePriceHistory,
      includeStockHistory
    });

    // ===== STEP 1: FETCH CURRENT MARKET QUOTES =====
    let quotes: MarketQuote[] = [];
    try {
      const webData = await webQuote(productKey);
      if (webData) quotes.push(webData);
    } catch (error) {
      AILogger.warn('[Risk Analyze API] Failed to fetch web quotes', {
        productKey,
        error: error instanceof Error ? error.message : 'Unknown'
      });
    }

    if (quotes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'no_data',
          message: 'Bu ürün için veri bulunamadı. Risk analizi yapılamaz.',
          productKey
        },
        { status: 404 }
      );
    }

    // Upgrade to V2
    const quotesV2 = quotes.map(q => upgradeToMarketQuoteV2(q));

    // ===== STEP 2: FETCH PRICE HISTORY =====
    let priceHistory: Array<{ date: string; price: number }> = [];

    if (includePriceHistory) {
      const priceSeries = await seriesOf(productKey, 90); // Last 90 days
      if (priceSeries && priceSeries.length > 0) {
        priceHistory = priceSeries.map(p => ({
          date: p.date,
          price: p.price
        }));

        AILogger.info('[Risk Analyze API] Price history fetched', {
          dataPoints: priceHistory.length
        });
      } else {
        AILogger.warn('[Risk Analyze API] No price history found', { productKey });
      }
    }

    // ===== STEP 3: EXTRACT STOCK HISTORY =====
    let stockHistory: Array<{ date: string; status: string; market: string }> = [];

    if (includeStockHistory) {
      stockHistory = quotesV2
        .filter(q => q.stock_status)
        .map(q => ({
          date: q.asOf,
          status: q.stock_status || 'unknown',
          market: q.source
        }));

      AILogger.info('[Risk Analyze API] Stock history extracted', {
        dataPoints: stockHistory.length
      });
    }

    // ===== STEP 4: VALIDATE MINIMUM DATA =====
    if (priceHistory.length < 3 && stockHistory.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'insufficient_data',
          message: 'Risk analizi için yeterli veri yok (min 3 fiyat verisi veya 2 stok verisi gerekli)',
          productKey,
          dataAvailable: {
            priceHistoryCount: priceHistory.length,
            stockHistoryCount: stockHistory.length,
            quotesCount: quotesV2.length
          }
        },
        { status: 400 }
      );
    }

    // ===== STEP 5: COMPREHENSIVE RISK ANALYSIS =====
    const riskAnalysis = analyzeProductRisk(quotesV2, priceHistory, stockHistory);

    AILogger.success('[Risk Analyze API] Risk analysis completed', {
      productKey,
      overallRiskScore: riskAnalysis.overallRiskScore,
      riskLevel: riskAnalysis.riskLevel,
      alertsCount: riskAnalysis.alerts.length,
      mitigationStrategiesCount: riskAnalysis.mitigationStrategies.length
    });

    // ===== STEP 6: RETURN RESPONSE =====
    return NextResponse.json({
      success: true,
      data: {
        productKey,
        riskAnalysis,
        meta: {
          priceHistoryDataPoints: priceHistory.length,
          stockHistoryDataPoints: stockHistory.length,
          quotesAnalyzed: quotesV2.length,
          analyzedAt: new Date().toISOString()
        }
      }
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'validation_error',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    AILogger.error('[Risk Analyze API] Analysis error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';

    return NextResponse.json(
      {
        success: false,
        error: 'internal_error',
        message,
      },
      { status: 500 }
    );
  }
}
