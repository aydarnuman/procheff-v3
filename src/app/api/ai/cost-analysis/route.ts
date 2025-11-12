import { AILogger } from "@/lib/ai/logger";
import { COST_ANALYSIS_PROMPT } from "@/lib/ai/prompts";
import { AIProviderFactory } from "@/lib/ai/provider-factory";
import { COST_ANALYSIS_SCHEMA, type CostAnalysisResponse } from "@/lib/ai/schemas";
import { AnalysisRepository } from "@/lib/db/analysis-repository";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function POST(req: NextRequest) {
  const schema = z.object({
    extracted_data: z.object({
      kurum: z.string().optional(),
      ihale_turu: z.string().optional(),
      kisilik: z.union([z.string(), z.number()]).optional(),
      butce: z.string().optional(),
    }).passthrough(),
  });

  try {
    const { extracted_data } = schema.parse(await req.json());
    
    AILogger.info("💰 Maliyet analizi başlatıldı", {
      kurum: extracted_data.kurum,
      ihale_turu: extracted_data.ihale_turu,
      kisilik: extracted_data.kisilik,
    });

    // Build prompt with extracted data
    const prompt = `${COST_ANALYSIS_PROMPT}

İhale Verisi:
${JSON.stringify(extracted_data, null, 2)}
`;

    // 🎯 Use structured output for guaranteed valid JSON
    const { data, metadata } = await AIProviderFactory.createStructuredMessage<CostAnalysisResponse>(
      prompt,
      COST_ANALYSIS_SCHEMA,
      {
        temperature: 0.4,
        max_tokens: 8000,
      }
    );

    AILogger.success("💵 Maliyet analizi tamamlandı", {
      duration_ms: metadata.duration_ms,
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      input_tokens: metadata.input_tokens,
      output_tokens: metadata.output_tokens,
      total_tokens: metadata.total_tokens,
      cost_usd: metadata.cost_usd,
      gunluk_maliyet: data.gunluk_kisi_maliyeti,
      toplam_gider: data.tahmini_toplam_gider,
    });

    // Save API metrics (non-blocking)
    try {
      AnalysisRepository.saveAPIMetric({
        endpoint: "/api/ai/cost-analysis",
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        input_tokens: metadata.input_tokens,
        output_tokens: metadata.output_tokens,
        total_tokens: metadata.total_tokens,
        cost_usd: metadata.cost_usd,
        duration_ms: metadata.duration_ms,
        success: true,
      });
    } catch (metricError) {
      // Non-critical, don't fail the request
      AILogger.warn("Failed to save API metric", { error: metricError });
    }

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
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error occurred";
    AILogger.error("💥 Maliyet analizi hatası", err);
    
    // Save error metric (non-blocking)
    try {
      AnalysisRepository.saveAPIMetric({
        endpoint: "/api/ai/cost-analysis",
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        success: false,
        error_message: error,
      });
    } catch (metricError) {
      // Ignore metric errors
    }
    
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
