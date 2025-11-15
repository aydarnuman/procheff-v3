import { AILogger } from "@/lib/ai/logger";
import { AIProviderFactory } from "@/lib/ai/provider-factory";
import { DEEP_ANALYSIS_SCHEMA, type DeepAnalysisResponse } from "@/lib/ai/schemas";
import { AnalysisRepository } from "@/lib/db/analysis-repository";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  checkRateLimit,
  addRateLimitHeaders,
} from "@/features/rate-limiting/middleware";

export async function POST(req: NextRequest) {
  // Rate limiting check
  const limitResult = await checkRateLimit(req, "/api/ai/deep-analysis");
  if (!limitResult.success) {
    return limitResult.response!;
  }

  const schema = z.object({
    extracted_data: z.any(),
    contextual_analysis: z.any().optional(),
  });

  try {
    const { extracted_data, contextual_analysis } = schema.parse(
      await req.json()
    );
    
    AILogger.info("🚀 Claude analiz çağrısı başlatıldı", {
      kurum: extracted_data.kurum,
      ihale_turu: extracted_data.ihale_turu,
    });

    // Build prompt
    const prompt = `
      SYSTEM TALİMATI:
      Sen bir kamu ihalesi danışmanısın.
      Görevin, aşağıdaki veriyi analiz edip JSON formatında detaylı bir sonuç üretmek.
      ${JSON.stringify(extracted_data)}
      ${JSON.stringify(contextual_analysis || {})}
    `;

    // 🎯 Use structured output for guaranteed valid JSON
    const { data, metadata } = await AIProviderFactory.createStructuredMessage<DeepAnalysisResponse>(
      prompt,
      DEEP_ANALYSIS_SCHEMA,
      {
        temperature: 0.4,
        max_tokens: 8000,
      }
    );

    AILogger.success("✨ Analiz başarıyla tamamlandı", {
      duration_ms: metadata.duration_ms,
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      input_tokens: metadata.input_tokens,
      output_tokens: metadata.output_tokens,
      total_tokens: metadata.total_tokens,
      cost_usd: metadata.cost_usd,
      kurum: data.kurum,
      ihale_turu: data.ihale_turu,
    });

    // Save API metrics (non-blocking)
    try {
      AnalysisRepository.saveAPIMetric({
        endpoint: "/api/ai/deep-analysis",
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

    const response = NextResponse.json({
      success: true,
      data,
      meta: {
        duration_ms: metadata.duration_ms,
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        input_tokens: metadata.input_tokens,
        output_tokens: metadata.output_tokens,
        total_tokens: metadata.total_tokens,
        cost_usd: metadata.cost_usd,
      },
    });
    return addRateLimitHeaders(response, limitResult);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    AILogger.error("💥 Claude analiz hatası", errorMessage);
    
    // Save error metric (non-blocking)
    try {
      AnalysisRepository.saveAPIMetric({
        endpoint: "/api/ai/deep-analysis",
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        success: false,
        error_message: errorMessage,
      });
    } catch (_metricError) {
      // Ignore metric errors
    }
    
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
