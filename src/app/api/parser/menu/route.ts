import { AILogger } from "@/lib/ai/logger";
import { MENU_PARSER_PROMPT } from "@/lib/ai/prompts";
import { AIProviderFactory } from "@/lib/ai/provider-factory";
import { cleanClaudeJSON, estimateTokens } from "@/lib/ai/utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Dosya bulunamadı" },
        { status: 400 }
      );
    }

    AILogger.info("🍱 Menü dosyası yüklendi", {
      filename: file.name,
      size: file.size,
      type: file.type,
    });

    // Dosyayı text olarak oku
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder("utf-8").decode(buffer);

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Dosya içeriği boş" },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    const client = AIProviderFactory.getClaude();

    const prompt = `${MENU_PARSER_PROMPT}

DOSYA İÇERİĞİ:
${text}
`;

    const modelName = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
    const result = await client.messages.create({
      model: modelName,
      temperature: 0.3,
      max_tokens: 6000,
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

      // Eğer array değilse, array'e çevir
      if (!Array.isArray(data)) {
        data = [data];
      }

      AILogger.success("🍽️  Menü başarıyla çözümlendi", {
        duration_ms: elapsedMs,
        model: modelName,
        estimated_input_tokens: inputTokens,
        estimated_output_tokens: outputTokens,
        total_estimated_tokens: inputTokens + outputTokens,
        items_count: data.length,
      });
    } catch (parseErr) {
      AILogger.warn("⚠️  JSON parse hatası (menü parser)", {
        duration_ms: elapsedMs,
        error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        raw_text_preview: rawText.substring(0, 200),
      });
      return NextResponse.json(
        {
          success: false,
          error: "Menü verisi çözümlenemedi",
          details: parseErr instanceof Error ? parseErr.message : String(parseErr),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      meta: {
        duration_ms: elapsedMs,
        model: modelName,
        estimated_tokens: inputTokens + outputTokens,
        items_count: data.length,
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error occurred";
    AILogger.error("💥 Menü parser hatası", err);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
