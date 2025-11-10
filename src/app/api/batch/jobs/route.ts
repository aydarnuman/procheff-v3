import { getAllBatchJobs } from "@/features/batch-processing/init-batch-schema";
import { FEATURE_FLAGS } from "@/features/config";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/batch/jobs
 * Get all batch jobs with pagination and filtering
 */
export async function GET(req: NextRequest) {
  if (!FEATURE_FLAGS.BATCH_PROCESSING_ENABLED) {
    return NextResponse.json(
      {
        success: false,
        error: "Batch processing is not enabled",
      },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);

    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
        const status = (searchParams.get("status") as "pending" | "processing" | "completed" | "failed" | "cancelled") || undefined;
    const userId = searchParams.get("user_id") || undefined;

    const jobs = getAllBatchJobs({
      limit,
      offset,
      status,
      userId,
    });

    return NextResponse.json({
      success: true,
      data: jobs,
      pagination: {
        limit,
        offset,
        total: jobs.length,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
