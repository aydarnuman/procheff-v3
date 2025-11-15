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
    const settings = db
      .prepare("SELECT name, value, type FROM performance_settings")
      .all() as Array<{ name: string; value: string; type: string }>;

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
    const updateStmt = db.prepare(`
      UPDATE performance_settings
      SET value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE name = ?
    `);

    const requiresRestart: string[] = [];

    // Update each setting in a transaction
    db.transaction(() => {
      for (const [name, value] of Object.entries(validated)) {
        // Convert value to string for storage
        const stringValue = String(value);

        // Check if restart required
        const setting = db
          .prepare("SELECT requires_restart FROM performance_settings WHERE name = ?")
          .get(name) as { requires_restart: number } | undefined;

        if (setting?.requires_restart === 1) {
          requiresRestart.push(name);
        }

        // Update the value
        updateStmt.run(stringValue, session.user.email, name);
      }

      // Log the change in audit log
      try {
        db.prepare(`
          INSERT INTO security_audit_logs (user_id, action, metadata)
          VALUES (?, 'performance_settings_updated', ?)
        `).run(
          session.user.email,
          JSON.stringify({ settings: Object.keys(validated) })
        );
      } catch (auditError) {
        // Audit log failure should not break the main operation
        console.warn("Failed to log audit:", auditError);
      }
    })();

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
  const profiles = db
    .prepare("SELECT * FROM performance_profiles ORDER BY is_active DESC, name ASC")
    .all();
  return profiles;
}