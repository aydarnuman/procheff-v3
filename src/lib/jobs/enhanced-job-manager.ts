/**
 * Enhanced Job Manager v2 - Advanced Pipeline Orchestration
 *
 * Features:
 * - Retry logic with fallback models
 * - Graceful degradation (done_with_warning)
 * - DB persistence & auto-resume
 * - Event emitter for real-time updates
 * - Warning collection
 * - Duration tracking
 */

import {
    createOrchestration,
    getOrchestration,
    updateOrchestration,
} from "@/lib/db/init-auth";
import { EventEmitter } from "events";
import {
    PIPELINE_CONFIG,
    calculateProgress,
    getPipelineStep,
} from "./pipeline-config";

export interface JobState {
  id: string;
  fileName: string;
  fileSize: number;
  status: "pending" | "running" | "completed" | "failed" | "done_with_warning";
  currentStep: string | null;
  completedSteps: string[];
  failedSteps: string[];
  warnings: string[];
  progress: number;
  result: Record<string, unknown>;
  error: string | null;
  startTime: number;
  endTime: number | null;
}

class EnhancedJobManager extends EventEmitter {
  private jobs = new Map<string, JobState>();
  private retryCount = new Map<string, number>();

  /**
   * Create new pipeline job
   */
  createJob(id: string, fileName: string, fileSize: number): JobState {
    const job: JobState = {
      id,
      fileName,
      fileSize,
      status: "pending",
      currentStep: null,
      completedSteps: [],
      failedSteps: [],
      warnings: [],
      progress: 0,
      result: {},
      error: null,
      startTime: Date.now(),
      endTime: null,
    };

    this.jobs.set(id, job);

    // Create DB record
    createOrchestration(id, { fileName });
    updateOrchestration(id, {
      status: "pending",
      progress: 0,
    });

    // Emit event
    this.emit("job:created", job);

    return job;
  }

  /**
   * Get job state
   */
  getJob(id: string): JobState | undefined {
    return this.jobs.get(id);
  }

  /**
   * Start a pipeline step
   */
  async startStep(jobId: string, stepId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    job.currentStep = stepId;
    if (job.status === "pending") {
      job.status = "running";
    }

    const step = getPipelineStep(stepId);
    if (!step) throw new Error(`Step ${stepId} not found in pipeline config`);

    // Update DB
    updateOrchestration(jobId, {
      current_step: stepId,
      status: "running",
      started_at: new Date(job.startTime).toISOString(),
    });

    this.emit("step:start", {
      jobId,
      stepId,
      stepName: step.name,
      timestamp: Date.now(),
    });
  }

  /**
   * Complete a pipeline step successfully
   */
  async completeStep(
    jobId: string,
    stepId: string,
    result: unknown
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    job.completedSteps.push(stepId);
    job.result[stepId] = result;
    job.progress = calculateProgress(job.completedSteps);
    job.currentStep = null;

    // Reset retry count for this step
    this.retryCount.delete(`${jobId}:${stepId}`);

    // Update DB
    updateOrchestration(jobId, {
      progress: job.progress,
      result: job.result,
    });

    const step = getPipelineStep(stepId);
    this.emit("step:complete", {
      jobId,
      stepId,
      stepName: step?.name,
      result,
      progress: job.progress,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle step failure with retry logic
   * Returns true if should retry, false otherwise
   */
  async failStep(
    jobId: string,
    stepId: string,
    error: string
  ): Promise<{ shouldRetry: boolean; useFallback: boolean }> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    const step = getPipelineStep(stepId);
    if (!step) throw new Error(`Step ${stepId} not found in pipeline config`);

    const retryKey = `${jobId}:${stepId}`;
    const currentRetries = this.retryCount.get(retryKey) || 0;

    // Check if we should retry
    if (step.retryable && currentRetries < step.maxRetries) {
      this.retryCount.set(retryKey, currentRetries + 1);

      const warning = `Step "${step.name}" failed (attempt ${currentRetries + 1}/${step.maxRetries}): ${error}`;
      job.warnings.push(warning);

      // Update DB warnings
      updateOrchestration(jobId, {
        warnings: JSON.stringify(job.warnings),
      });

      // Determine if we should use fallback model on last retry
      const useFallback =
        currentRetries === step.maxRetries - 1 && !!step.fallbackModel;

      this.emit("step:retry", {
        jobId,
        stepId,
        stepName: step.name,
        attempt: currentRetries + 1,
        maxRetries: step.maxRetries,
        useFallback,
        fallbackModel: step.fallbackModel,
        error,
        timestamp: Date.now(),
      });

      return { shouldRetry: true, useFallback };
    }

    // No more retries available
    job.failedSteps.push(stepId);
    job.currentStep = null;

    // Handle based on step requirement and config
    if (step.required) {
      if (PIPELINE_CONFIG.settings.stopOnError) {
        // Critical failure - stop entire pipeline
        job.status = "failed";
        job.error = error;
        job.endTime = Date.now();

        updateOrchestration(jobId, {
          status: "failed",
          error,
          duration_ms: job.endTime - job.startTime,
          completed_at: new Date(job.endTime).toISOString(),
        });

        this.emit("job:failed", { jobId, error, timestamp: Date.now() });

        return { shouldRetry: false, useFallback: false };
      } else {
        // Log as warning but continue
        const warning = `Required step "${step.name}" failed after ${step.maxRetries} retries: ${error}`;
        job.warnings.push(warning);

        updateOrchestration(jobId, {
          warnings: JSON.stringify(job.warnings),
        });

        this.emit("step:failed", {
          jobId,
          stepId,
          stepName: step.name,
          error,
          continuesPipeline: true,
          timestamp: Date.now(),
        });

        return { shouldRetry: false, useFallback: false };
      }
    } else {
      // Optional step failed - just log warning
      const warning = `Optional step "${step.name}" skipped due to error: ${error}`;
      job.warnings.push(warning);

      updateOrchestration(jobId, {
        warnings: JSON.stringify(job.warnings),
      });

      this.emit("step:skipped", {
        jobId,
        stepId,
        stepName: step.name,
        error,
        timestamp: Date.now(),
      });

      return { shouldRetry: false, useFallback: false };
    }
  }

  /**
   * Complete entire pipeline job
   */
  async completeJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    job.endTime = Date.now();
    job.progress = 100;
    job.currentStep = null;

    // Determine final status
    const hasWarnings = job.warnings.length > 0 || job.failedSteps.length > 0;
    job.status = hasWarnings ? "done_with_warning" : "completed";

    const duration = job.endTime - job.startTime;

    // Update DB
    await updateOrchestration(jobId, {
      status: job.status,
      progress: 100,
      result: job.result,
      warnings: job.warnings.length > 0 ? JSON.stringify(job.warnings) : null,
      duration_ms: duration,
      completed_at: new Date(job.endTime).toISOString(),
    });

    this.emit("job:complete", {
      jobId,
      status: job.status,
      result: job.result,
      warnings: job.warnings,
      duration,
      timestamp: Date.now(),
    });

    // Cleanup retry counts
    for (const key of this.retryCount.keys()) {
      if (key.startsWith(`${jobId}:`)) {
        this.retryCount.delete(key);
      }
    }
  }

  /**
   * Resume job from database
   */
  async resumeJob(jobId: string): Promise<JobState | null> {
    // Try to load from DB
    const dbRecord = await getOrchestration(jobId);
    if (!dbRecord) return null;

    // Don't resume completed or failed jobs
    if (
      dbRecord.status === "completed" ||
      dbRecord.status === "failed" ||
      dbRecord.status === "done_with_warning"
    ) {
      return null;
    }

    // Reconstruct job state
    const result = dbRecord.result ? JSON.parse(dbRecord.result) : {};
    const completedSteps = Object.keys(result);

    const job: JobState = {
      id: dbRecord.id,
      fileName: dbRecord.file_name || "unknown",
      fileSize: dbRecord.file_size || 0,
      status: dbRecord.status as JobState["status"],
      currentStep: dbRecord.current_step || null,
      completedSteps,
      failedSteps: [],
      warnings: dbRecord.warnings ? JSON.parse(dbRecord.warnings) : [],
      progress: dbRecord.progress,
      result,
      error: dbRecord.error,
      startTime: dbRecord.started_at
        ? new Date(dbRecord.started_at).getTime()
        : Date.now(),
      endTime: dbRecord.completed_at
        ? new Date(dbRecord.completed_at).getTime()
        : null,
    };

    this.jobs.set(jobId, job);
    this.emit("job:resumed", { jobId, job, timestamp: Date.now() });

    return job;
  }

  /**
   * Cleanup job from memory
   */
  cleanup(jobId: string): void {
    this.jobs.delete(jobId);

    // Cleanup retry counts
    for (const key of this.retryCount.keys()) {
      if (key.startsWith(`${jobId}:`)) {
        this.retryCount.delete(key);
      }
    }
  }

  /**
   * Get all active jobs
   */
  getAllJobs(): JobState[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get job statistics
   */
  getStats() {
    const jobs = this.getAllJobs();
    return {
      total: jobs.length,
      pending: jobs.filter((j) => j.status === "pending").length,
      running: jobs.filter((j) => j.status === "running").length,
      completed: jobs.filter((j) => j.status === "completed").length,
      failed: jobs.filter((j) => j.status === "failed").length,
      withWarnings: jobs.filter((j) => j.status === "done_with_warning").length,
    };
  }
}

// Singleton instance
export const enhancedJobManager = new EnhancedJobManager();
