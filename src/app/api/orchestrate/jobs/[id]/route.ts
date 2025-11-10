import { cancelOrchestration, deleteOrchestration, getOrchestration } from "@/lib/db/init-auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/orchestrate/jobs/[id]
 * Get single orchestration job details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = getOrchestration(id);

    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const parsedJob = {
      ...job,
      result: job.result ? JSON.parse(job.result) : null,
      steps_json: job.steps_json ? JSON.parse(job.steps_json) : null,
      warnings: job.warnings ? JSON.parse(job.warnings) : null,
    };

    return NextResponse.json({
      success: true,
      job: parsedJob,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orchestrate/jobs/[id]
 * Delete completed job or cancel running job
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = getOrchestration(id);

    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 }
      );
    }

    // If job is running, cancel it first
    if (job.status === "running") {
      cancelOrchestration(id);
      return NextResponse.json({
        success: true,
        message: "Job cancelled successfully",
      });
    }

    // Delete completed/failed/cancelled jobs
    deleteOrchestration(id);

    return NextResponse.json({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/orchestrate/jobs/[id]
 * Cancel a running job
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action } = await req.json();

    if (action !== "cancel") {
      return NextResponse.json(
        { success: false, error: "Invalid action. Use 'cancel'" },
        { status: 400 }
      );
    }

    const job = getOrchestration(id);

    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 }
      );
    }

    if (job.status !== "running") {
      return NextResponse.json(
        { success: false, error: "Only running jobs can be cancelled" },
        { status: 400 }
      );
    }

    cancelOrchestration(id);

    return NextResponse.json({
      success: true,
      message: "Job cancelled successfully",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
