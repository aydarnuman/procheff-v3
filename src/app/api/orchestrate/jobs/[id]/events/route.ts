import { getJobState, subscribeJob } from "@/lib/jobs";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ExtendedController extends ReadableStreamDefaultController {
  cleanup?: () => void;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return new Response(
    new ReadableStream({
      start(controller: ReadableStreamDefaultController) {
        const enc = new TextEncoder();
        const send = (data: unknown) =>
          controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));

        // Send current state immediately
        const state = getJobState(id);
        if (state) {
          send(state);
        }

        // Subscribe to job updates
        const unsub = subscribeJob(id, send);

        // Keep-alive ping every 10 seconds
        const ping = setInterval(() => {
          send({ type: "ping", t: Date.now() });
        }, 10000);

        // Cleanup on connection close
        const cleanup = () => {
          clearInterval(ping);
          unsub();
        };

        // Store cleanup function for cancel event
        (controller as ExtendedController).cleanup = cleanup;
      },
      cancel(controller: ReadableStreamDefaultController) {
        // Call cleanup when client disconnects
        const extended = controller as ExtendedController;
        if (extended.cleanup) {
          extended.cleanup();
        }
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    }
  );
}
