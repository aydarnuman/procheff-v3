/**
 * Server-Sent Events (SSE) Endpoint for Job Status Updates
 * Real-time job progress streaming
 */

import { jobManager } from "@/lib/jobs/job-manager";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Check if job exists
  const job = jobManager.getJob(id);
  if (!job) {
    return new Response("Job not found", { status: 404 });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial job data
      const data = `data: ${JSON.stringify(job)}\n\n`;
      controller.enqueue(encoder.encode(data));

      // Subscribe to job updates
      const unsubscribe = jobManager.subscribe(id, (updatedJob) => {
        const eventData = `data: ${JSON.stringify({
          status: updatedJob.status,
          progress: updatedJob.progress,
          result: updatedJob.result,
          error: updatedJob.error,
        })}\n\n`;
        controller.enqueue(encoder.encode(eventData));

        // Close stream if job is completed or errored
        if (updatedJob.status === "completed" || updatedJob.status === "error") {
          controller.close();
          unsubscribe();
        }
      });

      // Auto-cleanup after 5 minutes
      const timeout = setTimeout(() => {
        controller.close();
        unsubscribe();
      }, 5 * 60 * 1000);

      // Handle client disconnect
      req.signal.addEventListener("abort", () => {
        clearTimeout(timeout);
        controller.close();
        unsubscribe();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
