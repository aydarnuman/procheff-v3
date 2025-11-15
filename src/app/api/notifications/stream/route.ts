import { getDatabase } from "@/lib/db/universal-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ status: "connected" })}\n\n`)
      );

      // Poll database for new notifications every 2 seconds
      const interval = setInterval(async () => {
        try {
          const db = await getDatabase();
          const notifications = await db.query(
            "SELECT id, level, message, created_at FROM notifications WHERE is_read = false ORDER BY created_at DESC LIMIT 10"
          );

          if (notifications.length > 0) {
            notifications.forEach((notification: any) => {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(notification)}\n\n`)
              );
            });
          }
        } catch (error) {
          console.error("SSE error:", error);
        }
      }, 2000);

      // Cleanup on client disconnect
      return () => {
        clearInterval(interval);
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
