import { getDatabase } from "@/lib/db/universal-client";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings
 * Get user settings by category
 * Query params:
 * - category: 'profile' | 'ai' | 'pipeline' | 'appearance' | 'security'
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Category parameter required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const result = await db.queryOne(
      `SELECT settings_json FROM user_settings
       WHERE user_id = $1 AND category = $2`,
      [session.user.email, category]
    ) as { settings_json: string } | undefined;

    if (!result) {
      // Return default settings for category
      const defaultSettings = getDefaultSettings(category);
      return NextResponse.json({
        success: true,
        settings: defaultSettings,
        isDefault: true
      });
    }

    return NextResponse.json({
      success: true,
      settings: JSON.parse(result.settings_json),
      isDefault: false
    });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings
 * Save or update user settings
 * Body:
 * - category: string
 * - settings: object
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { category, settings } = body;

    if (!category || !settings) {
      return NextResponse.json(
        { success: false, error: "Category and settings required" },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['profile', 'ai', 'pipeline', 'appearance', 'security'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: "Invalid category" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const settingsJson = JSON.stringify(settings);

    // Upsert (insert or update)
    await db.execute(`
      INSERT INTO user_settings (user_id, category, settings_json, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, category) DO UPDATE SET
        settings_json = EXCLUDED.settings_json,
        updated_at = CURRENT_TIMESTAMP
    `, [session.user.email, category, settingsJson]);

    return NextResponse.json({
      success: true,
      message: "Settings saved successfully",
      category,
      settings
    });
  } catch (error) {
    console.error("Settings POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings
 * Reset settings to default
 * Body:
 * - category: string
 */
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Category parameter required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    await db.execute(
      `DELETE FROM user_settings WHERE user_id = $1 AND category = $2`,
      [session.user.email, category]
    );

    return NextResponse.json({
      success: true,
      message: "Settings reset to default"
    });
  } catch (error) {
    console.error("Settings DELETE error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * Get default settings for a category
 */
function getDefaultSettings(category: string): Record<string, any> {
  const defaults: Record<string, Record<string, any>> = {
    profile: {
      name: "",
      email: "",
      avatar: null,
      language: "tr",
      timezone: "Europe/Istanbul"
    },
    ai: {
      claudeModel: "claude-sonnet-4-20250514",
      claudeTemperature: 0.7,
      claudeMaxTokens: 4096,
      claudeTimeout: 90,
      geminiModel: "gemini-2.0-flash-exp",
      geminiTemperature: 0.4,
      primaryProvider: "claude",
      enableFallback: true,
      fallbackModel: "claude-haiku-4-5-20251001"
    },
    pipeline: {
      maxRetries: 2,
      timeout: 60,
      concurrentJobs: 3,
      autoExport: true
    },
    appearance: {
      theme: "dark",
      sidebarCollapsed: false,
      compactMode: false,
      animations: true
    },
    security: {
      twoFactorEnabled: false,
      sessionTimeout: 3600,
      apiKeyRotation: false
    }
  };

  return defaults[category] || {};
}
