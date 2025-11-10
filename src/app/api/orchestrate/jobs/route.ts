import {
    getOrchestrationsByStatus,
    getRecentOrchestrations,
    searchOrchestrations,
} from "@/lib/db/init-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const QuerySchema = z.object({
  status: z.enum(["pending", "running", "completed", "failed", "cancelled"]).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
});

/**
 * GET /api/orchestrate/jobs
 * List all orchestration jobs with optional filtering
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const params = QuerySchema.parse({
      status: searchParams.get("status"),
      search: searchParams.get("search"),
      limit: searchParams.get("limit"),
    });

    let jobs;

    if (params.search) {
      jobs = searchOrchestrations(params.search, params.limit);
    } else if (params.status) {
      jobs = getOrchestrationsByStatus(params.status, params.limit);
    } else {
      jobs = getRecentOrchestrations(params.limit);
    }

    // Parse result and steps_json back to objects
    const parsedJobs = jobs.map((job) => ({
      ...job,
      result: job.result ? JSON.parse(job.result) : null,
      steps_json: job.steps_json ? JSON.parse(job.steps_json) : null,
    }));

    return NextResponse.json({
      success: true,
      jobs: parsedJobs,
      count: parsedJobs.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
