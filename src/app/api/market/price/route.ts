import { AILogger } from '@/lib/ai/logger';
import { cacheGet, cacheSet } from '@/lib/market/cache';
import { forecastNextMonth } from '@/lib/market/forecast';
import { fusionEngineV2 } from '@/lib/market/fusion-engine-v2';
import { normalizeProductV2 } from '@/lib/market/product-normalizer-v2';
import { aiQuote, shouldUseAI } from '@/lib/market/provider/ai';
import { dbQuote, last12Months, seriesOf } from '@/lib/market/provider/db';
import { tuikQuote } from '@/lib/market/provider/tuik';
import { webQuote } from '@/lib/market/provider/web';
import type { MarketQuote } from '@/lib/market/schema';
import { upgradeToMarketQuoteV2 } from '@/lib/market/schema';
import { analyzeVolatility } from '@/lib/market/volatility';
import { validateRequest } from '@/lib/utils/validate';
import { EnhancedPriceRequestSchema } from '@/lib/validation/market-v2';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Market Price API (V2 Enhanced)
 * 
 * **Backward Compatible** - supports both V1 and V2 requests
 * 
 * POST /api/market/price
 * 
 * @param product - Product name (required)
 * @param unit - Unit (optional, defaults to 'kg')
 * @param includeRiskAnalysis - Enable 5-category risk analysis (optional, default: false)
 * @param includeSKUSuggestions - Return SKU-level suggestions (optional, default: false)
 * @param includeRegionalPricing - Include regional pricing data (optional, default: false)
 * 
 * @returns MarketFusionV2 with enhanced features
 */
export async function POST(req: NextRequest) {
  try {
    // Parse and validate request
    const {
      product,
      includeRiskAnalysis,
      includeSKUSuggestions,
      includeRegionalPricing
    } = await validateRequest(req, EnhancedPriceRequestSchema);

    // ===== STEP 1: PRODUCT NORMALIZATION (V2 - 3 LAYERS) =====
    const normalized = await normalizeProductV2(product);

    if (!normalized.productKey || normalized.confidence < 0.3) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_product',
          message: 'Ürün tanımlanamadı',
          suggestions: normalized.skuSuggestions || []
        },
        { status: 400 }
      );
    }

    const product_key = normalized.productKey;

    AILogger.info('[Market API V2] Product normalized (3-layer)', {
      input: product,
      canonical: normalized.canonical,
      category: normalized.category,
      variant: normalized.variant,
      confidence: normalized.confidence,
      method: normalized.method,
      skuCount: normalized.skuSuggestions?.length || 0
    });

    // ===== STEP 2: CACHE CHECK =====
    const cacheKey = product_key;
    const cached = await cacheGet(cacheKey);

    if (cached) {
      return NextResponse.json({
        ok: true,
        data: cached,
        cached: true,
        normalized: {
          product_key,
          canonical: normalized.canonical,
          category: normalized.category,
          variant: normalized.variant,
          skuSuggestions: includeSKUSuggestions ? normalized.skuSuggestions : undefined
        },
      });
    }

    // ===== STEP 3: FETCH FROM PROVIDERS =====
    const [qTuik, qWeb, qDb] = await Promise.all([
      tuikQuote(product_key),
      webQuote(product_key),
      dbQuote(product_key),
    ]);

    const quotes = [qTuik, qWeb, qDb].filter(Boolean) as MarketQuote[];

    // Try AI fallback if needed
    if (shouldUseAI(quotes)) {
      AILogger.info('[Market API V2] Using AI fallback', { product_key });
      const qAi = await aiQuote(product_key, quotes[0]?.unit || 'kg');
      if (qAi) {
        quotes.push(qAi);
      }
    }

    if (quotes.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'no_data',
          message: 'Bu ürün için fiyat bilgisi bulunamadı',
          product_key,
          suggestions: normalized.skuSuggestions || []
        },
        { status: 404 }
      );
    }

    // ===== STEP 4: UPGRADE QUOTES TO V2 =====
    const quotesV2 = quotes.map(q => upgradeToMarketQuoteV2(q));

    // ===== STEP 5: OPTIONAL RISK ANALYSIS DATA =====
    let priceHistory: Array<{ date: string; price: number }> | undefined;
    let stockHistory: Array<{ date: string; status: string; market: string }> | undefined;

    if (includeRiskAnalysis) {
      // Fetch price history (last 90 days)
      const priceSeries = await seriesOf(product_key, 90);
      if (priceSeries && priceSeries.length >= 3) {
        priceHistory = priceSeries.map(p => ({
          date: p.date,
          price: p.price
        }));
      }

      // Extract stock history from quotes
      stockHistory = quotesV2
        .filter(q => q.stock_status)
        .map(q => ({
          date: q.asOf,
          status: q.stock_status || 'unknown',
          market: q.source
        }));

      AILogger.info('[Market API V2] Risk analysis data prepared', {
        priceHistoryLength: priceHistory?.length || 0,
        stockHistoryLength: stockHistory?.length || 0
      });
    }

    // ===== STEP 6: FUSION ENGINE V2 =====
    const fusion = includeRiskAnalysis && priceHistory && stockHistory
      ? await fusionEngineV2.fullFuseV2(quotesV2, priceHistory, stockHistory)
      : await fusionEngineV2.quickFuseV2(quotesV2);

    // ===== STEP 7: ADD FORECAST (EXISTING LOGIC) =====
    const history = await last12Months(product_key);
    if (history && history.length >= 3) {
      const forecast = forecastNextMonth(history);
      if (forecast) {
        fusion.forecast = {
          ...forecast,
          trend: fusion.volatility?.trend
        };
      }
    }

    // ===== STEP 8: ADD VOLATILITY (EXISTING LOGIC) =====
    const volatilitySeries = await seriesOf(product_key, 90);
    if (volatilitySeries && volatilitySeries.length >= 7) {
      const volatility = analyzeVolatility(volatilitySeries);
      fusion.volatility = volatility;
    }

    // ===== STEP 9: CACHE THE RESULT =====
    await cacheSet(cacheKey, fusion);

    AILogger.success('[Market API V2] Fusion completed', {
      product_key,
      price: fusion.price,
      confidence: fusion.conf,
      sources: fusion.sources?.length || 0,
      brands: fusion.priceByBrand?.length || 0,
      hasRiskAnalysis: !!fusion.riskAnalysis,
      hasPriceIntelligence: !!fusion.priceIntelligence,
      hasScanSummary: !!fusion.scanSummary
    });

    // ===== STEP 10: RETURN RESPONSE =====
    return NextResponse.json({
      ok: true,
      data: fusion,
      cached: false,
      normalized: {
        product_key,
        canonical: normalized.canonical,
        confidence: normalized.confidence,
        method: normalized.method,
        category: normalized.category,
        variant: normalized.variant,
        skuSuggestions: includeSKUSuggestions ? normalized.skuSuggestions : undefined
      },
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'validation_error',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    AILogger.error('[Market API V2] Price endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    const message = error instanceof Error ? error.message : 'Bilinmeyen hata';

    return NextResponse.json(
      {
        ok: false,
        error: 'internal_error',
        message,
      },
      { status: 500 }
    );
  }
}
