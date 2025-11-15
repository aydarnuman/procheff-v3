import { getDatabase } from "@/lib/db/universal-client";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

// Validation schema
const PerformanceSettingsSchema = z.object({
  cache_ttl: z.number().min(60).max(86400).optional(),
  max_memory_mb: z.number().min(128).max(2048).optional(),
  parallel_tasks: z.number().min(1).max(16).optional(),
  db_connection_limit: z.number().min(5).max(50).optional(),
  api_rate_limit: z.number().min(10).max(1000).optional(),
  enable_compression: z.boolean().optional(),
  enable_caching: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDatabase();
    const settings = await db.query("SELECT name, value, type FROM performance_settings") as Array<{ name: string; value: string; type: string }>;

    // Convert to object format
    const settingsObj = settings.reduce((acc, setting) => {
      let value: any = setting.value;

      // Type conversion
      if (setting.type === "number") {
        value = parseInt(setting.value, 10);
      } else if (setting.type === "boolean") {
        value = setting.value === "true";
      } else if (setting.type === "json") {
        value = JSON.parse(setting.value);
      }

      acc[setting.name] = value;
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      success: true,
      settings: settingsObj,
    });
  } catch (error) {
    console.error("Failed to fetch performance settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = PerformanceSettingsSchema.parse(body);

    const db = await getDatabase();
    const requiresRestart: string[] = [];

    // Update each setting (PostgreSQL doesn't have db.transaction() like SQLite)
    for (const [name, value] of Object.entries(validated)) {
      // Convert value to string for storage
      const stringValue = String(value);

      // Check if restart required
      const setting = await db.queryOne(
        "SELECT requires_restart FROM performance_settings WHERE name = $1",
        [name]
      ) as { requires_restart: boolean } | undefined;

      if (setting?.requires_restart === true) {
        requiresRestart.push(name);
      }

      // Update the value
      await db.execute(`
        UPDATE performance_settings
        SET value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
        WHERE name = $3
      `, [stringValue, session.user.email, name]);
    }

    // Log the change in audit log
    try {
      await db.execute(`
        INSERT INTO security_audit_logs (user_id, action, metadata)
        VALUES ($1, 'performance_settings_updated', $2)
      `, [
        session.user.email,
        JSON.stringify({ settings: Object.keys(validated) })
      ]);
    } catch (auditError) {
      // Audit log failure should not break the main operation
      console.warn("Failed to log audit:", auditError);
    }

    return NextResponse.json({
      success: true,
      message: "Settings saved successfully",
      requiresRestart: requiresRestart.length > 0 ? requiresRestart : null,
    });
  } catch (error) {
    console.error("Failed to save performance settings:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid settings", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}

// Helper function for internal use (not exported as route handler)
async function getProfilesInternal() {
  const db = await getDatabase();
  const profiles = await db.query("SELECT * FROM performance_profiles ORDER BY is_active DESC, name ASC");
  return profiles;
}