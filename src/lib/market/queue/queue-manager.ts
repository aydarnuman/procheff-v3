/**
 * Queue Manager
 * Local queue implementation using SQLite for persistence
 * (BullMQ alternative that doesn't require Redis)
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface QueueJob<T = any> {
  id: string;
  queue: string;
  data: T;
  priority: number;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
  result?: any;
  nextRetryAt?: Date;
}

export interface QueueOptions {
  maxConcurrency?: number;
  defaultPriority?: number;
  maxAttempts?: number;
  retryDelay?: number;
  stallTimeout?: number;
}

export interface QueueProcessor<T = any> {
  (job: QueueJob<T>): Promise<any>;
}

export class QueueManager extends EventEmitter {
  private static instance: QueueManager;
  private db: Database.Database | null = null;
  private processors: Map<string, QueueProcessor> = new Map();
  private activeJobs: Map<string, NodeJS.Timeout> = new Map();
  private isProcessing: boolean = false;
  private options: Required<QueueOptions> = {
    maxConcurrency: 3,
    defaultPriority: 5,
    maxAttempts: 3,
    retryDelay: 5000,
    stallTimeout: 30000
  };
  
  private constructor() {
    super();
    this.initializeDatabase();
    this.startProcessing();
  }
  
  static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }
  
  /**
   * Initialize database
   */
  private initializeDatabase(): void {
    try {
      const dbPath = join(process.cwd(), 'procheff.db');
      this.db = new Database(dbPath);
      
      // Create queue table if not exists
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS queue_jobs (
          id TEXT PRIMARY KEY,
          queue TEXT NOT NULL,
          data TEXT NOT NULL,
          priority INTEGER DEFAULT 5,
          attempts INTEGER DEFAULT 0,
          max_attempts INTEGER DEFAULT 3,
          status TEXT NOT NULL CHECK(status IN ('pending','processing','completed','failed','cancelled')),
          created_at INTEGER NOT NULL,
          processed_at INTEGER,
          completed_at INTEGER,
          failed_at INTEGER,
          error TEXT,
          result TEXT,
          next_retry_at INTEGER,
          UNIQUE(id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_queue_status ON queue_jobs(queue, status, priority DESC, created_at);
        CREATE INDEX IF NOT EXISTS idx_queue_next_retry ON queue_jobs(next_retry_at);
      `);
      
      // Clean up stalled jobs on startup
      this.cleanupStalledJobs();
    } catch (error) {
      console.error('[QueueManager] Database initialization failed:', error);
    }
  }
  
  /**
   * Register a processor for a queue
   */
  process<T>(queueName: string, processor: QueueProcessor<T>): void {
    this.processors.set(queueName, processor);
    this.emit('processor:registered', queueName);
  }
  
  /**
   * Add a job to the queue
   */
  async add<T>(
    queueName: string, 
    data: T, 
    options: Partial<QueueOptions> = {}
  ): Promise<QueueJob<T>> {
    const job: QueueJob<T> = {
      id: uuidv4(),
      queue: queueName,
      data,
      priority: options.defaultPriority || this.options.defaultPriority,
      attempts: 0,
      maxAttempts: options.maxAttempts || this.options.maxAttempts,
      status: 'pending',
      createdAt: new Date()
    };
    
    if (this.db) {
      try {
        this.db.prepare(`
          INSERT INTO queue_jobs 
          (id, queue, data, priority, attempts, max_attempts, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          job.id,
          job.queue,
          JSON.stringify(job.data),
          job.priority,
          job.attempts,
          job.maxAttempts,
          job.status,
          job.createdAt.getTime()
        );
        
        this.emit('job:added', job);
        
        // Trigger processing
        if (!this.isProcessing) {
          this.startProcessing();
        }
      } catch (error) {
        console.error('[QueueManager] Failed to add job:', error);
        throw error;
      }
    }
    
    return job;
  }
  
  /**
   * Add multiple jobs at once
   */
  async addBulk<T>(
    queueName: string,
    jobs: Array<{ data: T; options?: Partial<QueueOptions> }>
  ): Promise<QueueJob<T>[]> {
    const createdJobs: QueueJob<T>[] = [];
    
    if (this.db) {
      const stmt = this.db.prepare(`
        INSERT INTO queue_jobs 
        (id, queue, data, priority, attempts, max_attempts, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const insertMany = this.db.transaction((jobs: QueueJob<T>[]) => {
        for (const job of jobs) {
          stmt.run(
            job.id,
            job.queue,
            JSON.stringify(job.data),
            job.priority,
            job.attempts,
            job.maxAttempts,
            job.status,
            job.createdAt.getTime()
          );
        }
      });
      
      try {
        const jobsToInsert = jobs.map(({ data, options = {} }) => ({
          id: uuidv4(),
          queue: queueName,
          data,
          priority: options.defaultPriority || this.options.defaultPriority,
          attempts: 0,
          maxAttempts: options.maxAttempts || this.options.maxAttempts,
          status: 'pending' as const,
          createdAt: new Date()
        }));
        
        insertMany(jobsToInsert);
        createdJobs.push(...jobsToInsert);
        
        this.emit('jobs:added', createdJobs);
        
        if (!this.isProcessing) {
          this.startProcessing();
        }
      } catch (error) {
        console.error('[QueueManager] Failed to add bulk jobs:', error);
        throw error;
      }
    }
    
    return createdJobs;
  }
  
  /**
   * Get job by ID
   */
  async getJob<T>(jobId: string): Promise<QueueJob<T> | null> {
    if (!this.db) return null;
    
    try {
      const row = this.db.prepare('SELECT * FROM queue_jobs WHERE id = ?').get(jobId) as any;
      
      if (row) {
        return this.rowToJob<T>(row);
      }
    } catch (error) {
      console.error('[QueueManager] Failed to get job:', error);
    }
    
    return null;
  }
  
  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    if (!this.db) return false;
    
    try {
      // Cancel active job if processing
      const activeTimeout = this.activeJobs.get(jobId);
      if (activeTimeout) {
        clearTimeout(activeTimeout);
        this.activeJobs.delete(jobId);
      }
      
      const result = this.db.prepare(`
        UPDATE queue_jobs 
        SET status = 'cancelled' 
        WHERE id = ? AND status IN ('pending', 'processing')
      `).run(jobId);
      
      if (result.changes > 0) {
        this.emit('job:cancelled', jobId);
        return true;
      }
    } catch (error) {
      console.error('[QueueManager] Failed to cancel job:', error);
    }
    
    return false;
  }
  
  /**
   * Get queue statistics
   */
  async getQueueStats(queueName?: string): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
  }> {
    if (!this.db) {
      return { pending: 0, processing: 0, completed: 0, failed: 0, cancelled: 0 };
    }
    
    try {
      const query = queueName
        ? 'SELECT status, COUNT(*) as count FROM queue_jobs WHERE queue = ? GROUP BY status'
        : 'SELECT status, COUNT(*) as count FROM queue_jobs GROUP BY status';
      
      const rows = queueName
        ? this.db.prepare(query).all(queueName) as any[]
        : this.db.prepare(query).all() as any[];
      
      const stats = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        cancelled: 0
      };
      
      rows.forEach(row => {
        stats[row.status as keyof typeof stats] = row.count;
      });
      
      return stats;
    } catch (error) {
      console.error('[QueueManager] Failed to get queue stats:', error);
      return { pending: 0, processing: 0, completed: 0, failed: 0, cancelled: 0 };
    }
  }
  
  /**
   * Start processing jobs
   */
  private startProcessing(): void {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    const processLoop = async () => {
      while (this.isProcessing) {
        try {
          // Get active job count
          const activeCount = this.activeJobs.size;
          
          if (activeCount < this.options.maxConcurrency) {
            const job = await this.getNextJob();
            
            if (job) {
              this.processJob(job);
            } else {
              // No jobs available, wait before checking again
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } else {
            // At max concurrency, wait before checking again
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error('[QueueManager] Process loop error:', error);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    };
    
    processLoop();
  }
  
  /**
   * Stop processing
   */
  stopProcessing(): void {
    this.isProcessing = false;
    
    // Cancel all active jobs
    this.activeJobs.forEach((timeout, jobId) => {
      clearTimeout(timeout);
    });
    this.activeJobs.clear();
  }
  
  /**
   * Get next job to process
   */
  private async getNextJob(): Promise<QueueJob | null> {
    if (!this.db) return null;
    
    try {
      // Get jobs that are ready to process
      const row = this.db.prepare(`
        SELECT * FROM queue_jobs 
        WHERE status = 'pending' 
          OR (status = 'failed' AND next_retry_at <= ?)
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
      `).get(Date.now()) as any;
      
      if (row && this.processors.has(row.queue)) {
        // Update status to processing
        this.db.prepare(`
          UPDATE queue_jobs 
          SET status = 'processing', processed_at = ?, attempts = attempts + 1
          WHERE id = ?
        `).run(Date.now(), row.id);
        
        return this.rowToJob(row);
      }
    } catch (error) {
      console.error('[QueueManager] Failed to get next job:', error);
    }
    
    return null;
  }
  
  /**
   * Process a job
   */
  private async processJob(job: QueueJob): Promise<void> {
    const processor = this.processors.get(job.queue);
    if (!processor) return;
    
    // Set timeout for stalled job detection
    const timeout = setTimeout(() => {
      this.handleStalledJob(job);
    }, this.options.stallTimeout);
    
    this.activeJobs.set(job.id, timeout);
    this.emit('job:processing', job);
    
    try {
      const result = await processor(job);
      
      clearTimeout(timeout);
      this.activeJobs.delete(job.id);
      
      // Mark as completed
      if (this.db) {
        this.db.prepare(`
          UPDATE queue_jobs 
          SET status = 'completed', completed_at = ?, result = ?
          WHERE id = ?
        `).run(Date.now(), JSON.stringify(result), job.id);
      }
      
      this.emit('job:completed', job, result);
    } catch (error: any) {
      clearTimeout(timeout);
      this.activeJobs.delete(job.id);
      
      // Handle failure
      const shouldRetry = job.attempts < job.maxAttempts;
      
      if (this.db) {
        if (shouldRetry) {
          const nextRetryAt = Date.now() + this.options.retryDelay * job.attempts;
          
          this.db.prepare(`
            UPDATE queue_jobs 
            SET status = 'failed', failed_at = ?, error = ?, next_retry_at = ?
            WHERE id = ?
          `).run(Date.now(), error.message, nextRetryAt, job.id);
          
          this.emit('job:retry', job, error);
        } else {
          this.db.prepare(`
            UPDATE queue_jobs 
            SET status = 'failed', failed_at = ?, error = ?
            WHERE id = ?
          `).run(Date.now(), error.message, job.id);
          
          this.emit('job:failed', job, error);
        }
      }
    }
  }
  
  /**
   * Handle stalled job
   */
  private handleStalledJob(job: QueueJob): void {
    this.activeJobs.delete(job.id);
    
    if (this.db) {
      this.db.prepare(`
        UPDATE queue_jobs 
        SET status = 'failed', error = 'Job stalled'
        WHERE id = ?
      `).run(job.id);
    }
    
    this.emit('job:stalled', job);
  }
  
  /**
   * Clean up stalled jobs on startup
   */
  private cleanupStalledJobs(): void {
    if (!this.db) return;
    
    try {
      const result = this.db.prepare(`
        UPDATE queue_jobs 
        SET status = 'failed', error = 'Job stalled on restart'
        WHERE status = 'processing'
      `).run();
      
      if (result.changes > 0) {
        console.log(`[QueueManager] Cleaned up ${result.changes} stalled jobs`);
      }
    } catch (error) {
      console.error('[QueueManager] Failed to cleanup stalled jobs:', error);
    }
  }
  
  /**
   * Convert database row to job object
   */
  private rowToJob<T>(row: any): QueueJob<T> {
    return {
      id: row.id,
      queue: row.queue,
      data: JSON.parse(row.data),
      priority: row.priority,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      status: row.status,
      createdAt: new Date(row.created_at),
      processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      failedAt: row.failed_at ? new Date(row.failed_at) : undefined,
      error: row.error,
      result: row.result ? JSON.parse(row.result) : undefined,
      nextRetryAt: row.next_retry_at ? new Date(row.next_retry_at) : undefined
    };
  }
  
  /**
   * Clean old completed jobs
   */
  async cleanOldJobs(olderThanDays: number = 7): Promise<number> {
    if (!this.db) return 0;
    
    try {
      const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
      
      const result = this.db.prepare(`
        DELETE FROM queue_jobs 
        WHERE status IN ('completed', 'failed', 'cancelled') 
          AND created_at < ?
      `).run(cutoffTime);
      
      return result.changes;
    } catch (error) {
      console.error('[QueueManager] Failed to clean old jobs:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const queueManager = QueueManager.getInstance();
