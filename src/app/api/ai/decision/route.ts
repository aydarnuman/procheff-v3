/**
 * AI Decision Engine API Route
 * Teklif Karar Motoru - Katıl/Katılma/Dikkatli Katıl kararı üretir
 */

import { AILogger } from "@/lib/ai/logger";
import { DECISION_PROMPT } from "@/lib/ai/prompts";
import { AIProviderFactory } from "@/lib/ai/provider-factory";
import { DECISION_ANALYSIS_SCHEMA, type DecisionAnalysisResponse } from "@/lib/ai/schemas";
import { AnalysisRepository } from "@/lib/db/analysis-repository";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Request validation schema
const DecisionRequestSchema = z.object({
  cost_analysis: z.object({
    gunluk_kisi_maliyeti: z.string().optional(),
    tahmini_toplam_gider: z.string().optional(),
    onerilen_karlilik_orani: z.string().optional(),
    riskli_kalemler: z.array(z.string()).optional(),
    maliyet_dagilimi: z.record(z.string(), z.string()).optional(),
    optimizasyon_onerileri: z.array(z.string()).optional(),
  }),
  menu_data: z.array(z.any()).optional(),
  ihale_bilgileri: z
    .object({
      kurum: z.string().optional(),
      ihale_turu: z.string().optional(),
      sure: z.string().optional(),
      butce: z.string().optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Parse and validate request
    const body = await req.json();
    const validatedData = DecisionRequestSchema.parse(body);

    const { cost_analysis, menu_data, ihale_bilgileri } = validatedData;

    AILogger.info("🧠 Teklif karar analizi başladı", {
      maliyet_var: !!cost_analysis,
      menu_var: !!menu_data,
      ihale_var: !!ihale_bilgileri,
    });

    // Construct the analysis prompt
    const prompt = `
${DECISION_PROMPT}

=== MALİYET ANALİZİ VERİLERİ ===
${JSON.stringify(cost_analysis, null, 2)}

=== MENÜ VERİLERİ ===
${menu_data ? JSON.stringify(menu_data, null, 2) : "Menü verisi mevcut değil"}

=== İHALE BİLGİLERİ ===
${ihale_bilgileri ? JSON.stringify(ihale_bilgileri, null, 2) : "İhale bilgisi mevcut değil"}

GÖREV: Yukarıdaki verileri analiz et ve net bir teklif kararı ver.
`;

    // 🎯 Use structured output for guaranteed valid JSON
    const { data, metadata } = await AIProviderFactory.createStructuredMessage<DecisionAnalysisResponse>(
      prompt,
      DECISION_ANALYSIS_SCHEMA,
      {
        temperature: 0.5,
        max_tokens: 8000,
      }
    );

    // Log success
    AILogger.success("✅ Karar analizi tamamlandı", {
      duration_ms: metadata.duration_ms,
      karar: data.karar,
      risk_orani: data.risk_orani,
      kar_orani: data.tahmini_kar_orani,
      input_tokens: metadata.input_tokens,
      output_tokens: metadata.output_tokens,
      cost_usd: metadata.cost_usd,
    });

    // Save API metrics (non-blocking)
    try {
      AnalysisRepository.saveAPIMetric({
        endpoint: "/api/ai/decision",
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        input_tokens: metadata.input_tokens,
        output_tokens: metadata.output_tokens,
        total_tokens: metadata.total_tokens,
        cost_usd: metadata.cost_usd,
        duration_ms: metadata.duration_ms,
        success: true,
      });
    } catch (metricError) {
      AILogger.warn("Failed to save API metric", { error: metricError });
    }

    // Return response
    return NextResponse.json({
      success: true,
      data,
      meta: {
        duration_ms: metadata.duration_ms,
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        input_tokens: metadata.input_tokens,
        output_tokens: metadata.output_tokens,
        total_tokens: metadata.total_tokens,
        cost_usd: metadata.cost_usd,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";

    AILogger.error("❌ Karar analizi hatası", {
      error: errorMessage,
    });

    // Save error metric (non-blocking)
    try {
      AnalysisRepository.saveAPIMetric({
        endpoint: "/api/ai/decision",
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        success: false,
        error_message: errorMessage,
      });
    } catch (_metricError) {
      // Ignore metric errors
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage || "Karar analizi sırasında bir hata oluştu",
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
