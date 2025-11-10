/**
 * AI Decision Engine API Route
 * Teklif Karar Motoru - Katıl/Katılma/Dikkatli Katıl kararı üretir
 */

import { AILogger } from "@/lib/ai/logger";
import { DECISION_PROMPT } from "@/lib/ai/prompts";
import { AIProviderFactory } from "@/lib/ai/provider-factory";
import { cleanClaudeJSON, estimateTokens } from "@/lib/ai/utils";
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
  const startTime = Date.now();

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

    // Get Claude client
    const client = AIProviderFactory.getClaude();

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

    const estimatedTokens = estimateTokens(prompt);
    AILogger.info(`📊 Token tahmini: ~${estimatedTokens} tokens`);

    // Call Claude API
    const result = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      temperature: 0.5,
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    // Extract and clean response
    const contentBlock = result.content?.[0];
    const rawResponse =
      contentBlock && "text" in contentBlock ? contentBlock.text : "";
    const cleanedJSON = cleanClaudeJSON(rawResponse);
    const decisionData = JSON.parse(cleanedJSON);

    const duration = Date.now() - startTime;

    // Log success
    AILogger.success(`✅ Karar analizi tamamlandı (${duration}ms)`, {
      karar: decisionData.karar,
      risk_orani: decisionData.risk_orani,
      kar_orani: decisionData.tahmini_kar_orani,
    });

    // Return response
    return NextResponse.json({
      success: true,
      data: decisionData,
      meta: {
        duration_ms: duration,
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        estimated_tokens: estimatedTokens,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";

    AILogger.error("❌ Karar analizi hatası", {
      error: errorMessage,
      duration,
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage || "Karar analizi sırasında bir hata oluştu",
        meta: {
          duration_ms: duration,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
