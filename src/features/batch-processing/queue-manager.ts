import {
  getPendingBatchFiles,
  updateBatchFileStatus,
  incrementRetryCount,
  getBatchJob,
  updateBatchJobStatus,
  incrementProcessedFiles,
  type BatchFile,
} from "./init-batch-schema";
import { BATCH_CONFIG } from "../config";
import { AILogger } from "@/lib/ai/logger";

/**
 * Queue Manager
 *
 * Background job processor for batch file uploads.
 * Processes files concurrently with retry logic.
 */

class QueueManager {
  private isProcessing: boolean = false;
  private activeJobs: Set<string> = new Set();
  private processingInterval: NodeJS.Timeout | null = null;

  /**
   * Start the queue processor
   */
  start() {
    if (this.processingInterval) {
      console.log("[Queue] Already running");
      return;
    }

    console.log("[Queue] Starting queue processor");
    this.isProcessing = true;

    // Process queue every 5 seconds
    this.processingInterval = setInterval(() => {
      this.processQueue().catch((err) => {
        console.error("[Queue] Error processing queue:", err);
      });
    }, 5000);
  }

  /**
   * Stop the queue processor
   */
  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      this.isProcessing = false;
      console.log("[Queue] Stopped queue processor");
    }
  }

  /**
   * Process pending files in queue
   */
  private async processQueue() {
    // Don't process if we're at max concurrent jobs
    if (this.activeJobs.size >= BATCH_CONFIG.CONCURRENT_JOBS) {
      return;
    }

    // Get pending files (respecting priority)
    const availableSlots = BATCH_CONFIG.CONCURRENT_JOBS - this.activeJobs.size;
    const pendingFiles = getPendingBatchFiles(availableSlots);

    if (pendingFiles.length === 0) {
      return;
    }

    console.log(
      `[Queue] Processing ${pendingFiles.length} files (${this.activeJobs.size} active)`
    );

    // Process each file in parallel
    const promises = pendingFiles.map((file) => this.processFile(file));
    await Promise.allSettled(promises);
  }

  /**
   * Process a single file
   */
  private async processFile(file: BatchFile) {
    const fileId = file.id;

    // Add to active jobs
    this.activeJobs.add(fileId);

    try {
      // Update status to processing
      updateBatchFileStatus(fileId, "processing", 10);

      AILogger.info("[Queue] Processing file", {
        fileId,
        batchId: file.batch_id,
        filename: file.filename,
      });

      // Simulate file processing (replace with actual processing logic)
      const result = await this.executeFileProcessing(file);

      // Mark as completed
      updateBatchFileStatus(
        fileId,
        "completed",
        100,
        JSON.stringify(result),
        undefined
      );

      incrementProcessedFiles(file.batch_id, false);

      AILogger.success("[Queue] File processed successfully", {
        fileId,
        filename: file.filename,
      });

      // Check if batch is complete
      await this.checkBatchCompletion(file.batch_id);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      AILogger.error("[Queue] File processing failed", {
        fileId,
        filename: file.filename,
        error: errorMessage,
      });

      // Retry logic
      const retryCount = incrementRetryCount(fileId);

      if (retryCount < BATCH_CONFIG.MAX_RETRIES) {
        // Reset to pending for retry
        updateBatchFileStatus(fileId, "pending", 0, undefined, errorMessage);

        AILogger.info("[Queue] Retrying file", {
          fileId,
          retryCount,
          maxRetries: BATCH_CONFIG.MAX_RETRIES,
        });
      } else {
        // Max retries reached, mark as failed
        updateBatchFileStatus(fileId, "failed", 0, undefined, errorMessage);
        incrementProcessedFiles(file.batch_id, true);

        AILogger.error("[Queue] File failed after max retries", {
          fileId,
          retryCount,
        });

        // Check if batch should be marked as failed
        await this.checkBatchCompletion(file.batch_id);
      }
    } finally {
      // Remove from active jobs
      this.activeJobs.delete(fileId);
    }
  }

  /**
   * Execute actual file processing
   * This is where the file analysis happens
   */
  private async executeFileProcessing(file: BatchFile): Promise<any> {
    // TODO: Implement actual file processing
    // For now, simulate processing with delay

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate 10% random failure
        if (Math.random() < 0.1) {
          reject(new Error("Simulated processing error"));
        } else {
          resolve({
            filename: file.filename,
            fileHash: file.file_hash,
            analysis: "Sample analysis result",
            processedAt: new Date().toISOString(),
          });
        }
      }, 2000 + Math.random() * 3000); // 2-5 seconds
    });
  }

  /**
   * Check if batch is complete and update status
   */
  private async checkBatchCompletion(batchId: string) {
    const batch = getBatchJob(batchId);
    if (!batch) return;

    const isComplete = batch.processed_files >= batch.total_files;

    if (isComplete) {
      if (batch.failed_files === 0) {
        updateBatchJobStatus(batchId, "completed");
        AILogger.success("[Queue] Batch completed successfully", { batchId });
      } else if (batch.failed_files === batch.total_files) {
        updateBatchJobStatus(batchId, "failed", "All files failed");
        AILogger.error("[Queue] Batch failed completely", { batchId });
      } else {
        updateBatchJobStatus(
          batchId,
          "completed",
          `Completed with ${batch.failed_files} failures`
        );
        AILogger.warn("[Queue] Batch completed with failures", {
          batchId,
          failed: batch.failed_files,
          total: batch.total_files,
        });
      }
    }
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      activeJobs: this.activeJobs.size,
      maxConcurrent: BATCH_CONFIG.CONCURRENT_JOBS,
    };
  }
}

// Singleton instance
export const queueManager = new QueueManager();

// Auto-start queue processor on import (only in production/development)
if (process.env.NODE_ENV !== "test") {
  queueManager.start();
}
