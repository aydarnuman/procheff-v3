import { AILogger } from "@/lib/ai/logger";
import { COST_ANALYSIS_PROMPT } from "@/lib/ai/prompts";
import { AIProviderFactory } from "@/lib/ai/provider-factory";
import { cleanClaudeJSON, estimateTokens } from "@/lib/ai/utils";
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

    const startTime = Date.now();
    const client = AIProviderFactory.getClaude();

    const prompt = `${COST_ANALYSIS_PROMPT}

İhale Verisi:
${JSON.stringify(extracted_data, null, 2)}
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
      AILogger.success("💵 Maliyet analizi tamamlandı", {
        duration_ms: elapsedMs,
        model: modelName,
        estimated_input_tokens: inputTokens,
        estimated_output_tokens: outputTokens,
        total_estimated_tokens: inputTokens + outputTokens,
        gunluk_maliyet: data.gunluk_kisi_maliyeti,
        toplam_gider: data.tahmini_toplam_gider,
      });
    } catch (parseErr) {
      AILogger.warn("⚠️  JSON parse hatası (maliyet analizi)", {
        duration_ms: elapsedMs,
        error: parseErr instanceof Error ? parseErr.message : String(parseErr),
      });
      data = { raw_output: cleanedText, parse_error: true };
    }

    return NextResponse.json({
      success: true,
      data,
      meta: {
        duration_ms: elapsedMs,
        model: modelName,
        estimated_tokens: inputTokens + outputTokens,
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error occurred";
    AILogger.error("💥 Maliyet analizi hatası", err);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
