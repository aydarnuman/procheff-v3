import { AILogger } from "@/lib/ai/logger";
import { MENU_ROBOT_PROMPT } from "@/lib/ai/prompts";
import { AIProviderFactory } from "@/lib/ai/provider-factory";
import { MENU_ROBOT_SCHEMA, type MenuItemResponse } from "@/lib/ai/schemas";
import { AnalysisRepository } from "@/lib/db/analysis-repository";
import { NextRequest, NextResponse } from "next/server";
import { MenuRobotMetadataSchema } from "@/lib/validation/menu-robot";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const metadataPayload = formData.get("metadata");

    if (metadataPayload) {
      try {
        MenuRobotMetadataSchema.parse(
          JSON.parse(metadataPayload.toString())
        );
      } catch (error) {
        return NextResponse.json(
          { success: false, error: "Metadata doğrulaması başarısız" },
          { status: 400 }
        );
      }
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Dosya bulunamadı" },
        { status: 400 }
      );
    }

    AILogger.info("🍱 Menu robotu: dosya yüklendi", {
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

    const prompt = `${MENU_ROBOT_PROMPT}

DOSYA İÇERİĞİ:
${text}
`;

    // 🎯 Use structured output for guaranteed valid JSON
    const { data, metadata } = await AIProviderFactory.createStructuredMessage<MenuItemResponse[]>(
      prompt,
      MENU_ROBOT_SCHEMA,
      {
        temperature: 0.3,
        max_tokens: 6000,
      }
    );

    // Ensure data is an array (schema already guarantees this, but double-check)
    const menuItems = Array.isArray(data) ? data : [data];

    AILogger.success("🍽️  Menu robotu: başarıyla çözümlendi", {
      duration_ms: metadata.duration_ms,
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      input_tokens: metadata.input_tokens,
      output_tokens: metadata.output_tokens,
      total_tokens: metadata.total_tokens,
      cost_usd: metadata.cost_usd,
      items_count: menuItems.length,
    });

    // Save API metrics (non-blocking)
    try {
      AnalysisRepository.saveAPIMetric({
        endpoint: "/api/menu-robot",
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

    return NextResponse.json({
      success: true,
      data: menuItems,
      meta: {
        duration_ms: metadata.duration_ms,
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        input_tokens: metadata.input_tokens,
        output_tokens: metadata.output_tokens,
        total_tokens: metadata.total_tokens,
        cost_usd: metadata.cost_usd,
        items_count: menuItems.length,
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error occurred";
    AILogger.error("💥 Menu robotu hatası", err);

    // Save error metric (non-blocking)
    try {
      AnalysisRepository.saveAPIMetric({
        endpoint: "/api/menu-robot",
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
