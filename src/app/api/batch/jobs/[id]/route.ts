import { getBatchJob, getBatchFiles } from "@/features/batch-processing/init-batch-schema";
import { FEATURE_FLAGS } from "@/features/config";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/batch/jobs/[id]
 * Get a specific batch job with its files
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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
    const { id } = await context.params;

    // Get batch job
    const job = getBatchJob(id);
    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: "Batch job not found",
        },
        { status: 404 }
      );
    }

    // Get associated files
    const files = getBatchFiles(id);

    return NextResponse.json({
      success: true,
      data: {
        job,
        files,
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
