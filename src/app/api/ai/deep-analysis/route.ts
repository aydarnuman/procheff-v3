import { AILogger } from "@/lib/ai/logger";
import { AIProviderFactory } from "@/lib/ai/provider-factory";
import { cleanClaudeJSON, estimateTokens } from "@/lib/ai/utils";
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

    const startTime = Date.now();
    const client = AIProviderFactory.getClaude();

    const prompt = `
      SYSTEM TALİMATI:
      Sen bir kamu ihalesi danışmanısın.
      Görevin, aşağıdaki veriyi analiz edip JSON formatında detaylı bir sonuç üretmek.
      ${JSON.stringify(extracted_data)}
      ${JSON.stringify(contextual_analysis || {})}
    `;

    const modelName = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
    const result = await client.messages.create({
      model: modelName,
      temperature: 0.4,
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    const elapsedMs = Date.now() - startTime;
    const rawText = result.content?.[0]?.type === "text" ? result.content[0].text.trim() : "";
    const cleanedText = cleanClaudeJSON(rawText);
    
    const inputTokens = estimateTokens(prompt);
    const outputTokens = estimateTokens(rawText);

    let data;
    try {
      data = JSON.parse(cleanedText);
      AILogger.success("✨ Analiz başarıyla tamamlandı", {
        duration_ms: elapsedMs,
        model: modelName,
        estimated_input_tokens: inputTokens,
        estimated_output_tokens: outputTokens,
        total_estimated_tokens: inputTokens + outputTokens,
      });
    } catch (parseErr) {
      AILogger.warn("⚠️  JSON parse hatası, ham çıktı döndürülüyor", {
        duration_ms: elapsedMs,
        error: parseErr instanceof Error ? parseErr.message : String(parseErr),
      });
      data = { raw_output: cleanedText, parse_error: true };
    }

    const response = NextResponse.json({ success: true, data });
    return addRateLimitHeaders(response, limitResult);
  } catch (err) {
    const error =
      err instanceof Error ? err.message : "Unknown error occurred";
    AILogger.error("💥 Claude analiz hatası", err);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
