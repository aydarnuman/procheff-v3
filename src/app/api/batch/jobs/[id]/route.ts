import { NextRequest, NextResponse } from "next/server";
import { FEATURE_FLAGS } from "@/features/config";
import {
  getBatchJob,
  getBatchFiles,
} from "@/features/batch-processing/init-batch-schema";

/**
 * GET /api/batch/jobs/[id]
 * Get detailed status of a specific batch job
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
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
    const batchId = params.id;

    const batch = getBatchJob(batchId);
    if (!batch) {
      return NextResponse.json(
        {
          success: false,
          error: "Batch job not found",
        },
        { status: 404 }
      );
    }

    const files = getBatchFiles(batchId);

    // Calculate progress percentage
    const progressPercent =
      batch.total_files > 0
        ? Math.round((batch.processed_files / batch.total_files) * 100)
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        batch: {
          ...batch,
          progressPercent,
        },
        files,
        summary: {
          total: batch.total_files,
          completed: files.filter((f) => f.status === "completed").length,
          processing: files.filter((f) => f.status === "processing").length,
          pending: files.filter((f) => f.status === "pending").length,
          failed: batch.failed_files,
        },
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
