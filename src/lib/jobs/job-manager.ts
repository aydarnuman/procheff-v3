/**
 * Job Manager - In-Memory Job Tracking System
 * Manages background job processing with real-time status updates
 */

export interface JobData {
  id: string;
  status: 'pending' | 'processing' | 'extract' | 'ocr' | 'preprocess' | 'chunk' | 'analyze' | 'completed' | 'error';
  progress: number;
  result?: unknown;
  error?: string;
  createdAt: number;
  updatedAt: number;
  metadata?: {
    filename?: string;
    filesize?: number;
    mime_type?: string;
    ocr_used?: boolean;
    preprocessing_applied?: boolean;
  };
}

class JobManager {
  private jobs: Map<string, JobData> = new Map();
  private listeners: Map<string, Set<(data: JobData) => void>> = new Map();

  createJob(id: string, metadata?: JobData['metadata']): JobData {
    const job: JobData = {
      id,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata,
    };
    this.jobs.set(id, job);
    return job;
  }

  updateJob(id: string, updates: Partial<JobData>): JobData | null {
    const job = this.jobs.get(id);
    if (!job) return null;

    const updated = {
      ...job,
      ...updates,
      updatedAt: Date.now(),
    };

    this.jobs.set(id, updated);
    this.notifyListeners(id, updated);
    return updated;
  }

  getJob(id: string): JobData | null {
    return this.jobs.get(id) || null;
  }

  deleteJob(id: string): boolean {
    this.listeners.delete(id);
    return this.jobs.delete(id);
  }

  subscribe(id: string, callback: (data: JobData) => void): () => void {
    if (!this.listeners.has(id)) {
      this.listeners.set(id, new Set());
    }
    this.listeners.get(id)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(id);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(id);
        }
      }
    };
  }

  private notifyListeners(id: string, data: JobData): void {
    const listeners = this.listeners.get(id);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  // Cleanup old jobs (older than 1 hour)
  cleanup(): number {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let cleaned = 0;

    for (const [id, job] of this.jobs.entries()) {
      if (job.updatedAt < oneHourAgo) {
        this.deleteJob(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  getAllJobs(): JobData[] {
    return Array.from(this.jobs.values());
  }

  getJobCount(): number {
    return this.jobs.size;
  }
}

// Singleton instance
export const jobManager = new JobManager();

// Auto-cleanup every 30 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cleaned = jobManager.cleanup();
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} old jobs`);
    }
  }, 30 * 60 * 1000);
}
