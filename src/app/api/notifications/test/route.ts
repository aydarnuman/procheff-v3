import { getDatabase } from "@/lib/db/universal-client";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const db = await getDatabase();

    // Insert sample notifications
    const notifications = [
      { level: "success", message: "✅ Sistem başarıyla başlatıldı" },
      { level: "info", message: "📊 Yeni ihale analizi tamamlandı" },
      { level: "error", message: "⚠️ API bağlantı hatası tespit edildi" },
    ];

    for (const n of notifications) {
      await db.execute(
        "INSERT INTO notifications (level, message, is_read) VALUES ($1, $2, 0)",
        [n.level, n.message]
      );
    }

    return NextResponse.json({
      success: true,
      message: "Test notifications created",
      count: notifications.length
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
