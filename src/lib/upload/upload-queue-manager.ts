/**
 * 🚀 Upload Queue Manager
 * Prevents server overload by managing concurrent uploads
 * Features:
 * - Max 3 concurrent uploads
 * - Queue system for pending files
 * - Real-time progress tracking
 * - Automatic retry on failure
 * - Server crash prevention
 */

export interface QueueItem {
  id: string;
  file: File;
  folderName?: string;
  status: 'waiting' | 'uploading' | 'completed' | 'failed';
  progress: number;
  retryCount: number;
  error?: string;
  onProgress?: (progress: number) => void;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
  controller?: AbortController;
}

export class UploadQueueManager {
  private static instance: UploadQueueManager | null = null;
  
  private queue: QueueItem[] = [];
  private activeUploads: Map<string, QueueItem> = new Map();
  private maxConcurrent = 3; // Maximum 3 parallel uploads
  private maxRetries = 2;
  private retryDelay = 2000; // 2 seconds
  
  // Event handlers
  private onQueueChange?: (queue: QueueItem[]) => void;
  private onActiveCountChange?: (count: number) => void;
  
  private constructor() {
    // Singleton
  }
  
  static getInstance(): UploadQueueManager {
    if (!UploadQueueManager.instance) {
      UploadQueueManager.instance = new UploadQueueManager();
    }
    return UploadQueueManager.instance;
  }
  
  /**
   * Set event handlers
   */
  setEventHandlers(handlers: {
    onQueueChange?: (queue: QueueItem[]) => void;
    onActiveCountChange?: (count: number) => void;
  }) {
    this.onQueueChange = handlers.onQueueChange;
    this.onActiveCountChange = handlers.onActiveCountChange;
  }
  
  /**
   * Add file to queue
   */
  addToQueue(item: Omit<QueueItem, 'status' | 'progress' | 'retryCount'>): string {
    const queueItem: QueueItem = {
      ...item,
      status: 'waiting',
      progress: 0,
      retryCount: 0,
    };
    
    this.queue.push(queueItem);
    this.onQueueChange?.(this.queue);
    this.processQueue();
    
    return queueItem.id;
  }
  
  /**
   * Process queue - start uploads if under limit
   */
  private async processQueue() {
    // Check if we can start more uploads
    while (this.activeUploads.size < this.maxConcurrent && this.queue.length > 0) {
      const nextItem = this.queue.find(item => item.status === 'waiting');
      if (!nextItem) break;
      
      // Mark as uploading
      nextItem.status = 'uploading';
      this.activeUploads.set(nextItem.id, nextItem);
      this.onActiveCountChange?.(this.activeUploads.size);
      
      // Start upload (async, don't wait)
      this.uploadFile(nextItem).finally(() => {
        // Remove from active uploads
        this.activeUploads.delete(nextItem.id);
        this.onActiveCountChange?.(this.activeUploads.size);
        
        // Process next in queue
        this.processQueue();
      });
    }
  }
  
  /**
   * Upload single file with progress tracking
   */
  private async uploadFile(item: QueueItem): Promise<void> {
    const controller = new AbortController();
    item.controller = controller;
    
    try {
      const formData = new FormData();
      formData.append('file', item.file);
      if (item.folderName) {
        formData.append('folderName', item.folderName);
      }
      
      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          item.progress = progress;
          item.onProgress?.(progress);
          this.onQueueChange?.(this.queue);
        }
      });
      
      // Handle completion
      const uploadPromise = new Promise<any>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              reject(new Error('Invalid response format'));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });
        
        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });
      });
      
      // Start upload
      xhr.open('POST', '/api/analysis/process-single');
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send(formData);
      
      // Wait for completion
      const result = await uploadPromise;
      
      // Mark as completed
      item.status = 'completed';
      item.progress = 100;
      item.onComplete?.(result);
      this.onQueueChange?.(this.queue);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if we should retry
      if (item.retryCount < this.maxRetries && !controller.signal.aborted) {
        item.retryCount++;
        item.status = 'waiting';
        item.progress = 0;
        item.error = `Retry ${item.retryCount}/${this.maxRetries}: ${errorMessage}`;
        
        // Add back to queue with delay
        setTimeout(() => {
          this.processQueue();
        }, this.retryDelay);
        
      } else {
        // Final failure
        item.status = 'failed';
        item.error = errorMessage;
        item.onError?.(errorMessage);
        this.onQueueChange?.(this.queue);
      }
    }
  }
  
  /**
   * Cancel specific upload
   */
  cancelUpload(id: string) {
    const item = this.queue.find(q => q.id === id);
    if (item) {
      item.controller?.abort();
      item.status = 'failed';
      item.error = 'Cancelled by user';
      
      // Remove from active if uploading
      if (this.activeUploads.has(id)) {
        this.activeUploads.delete(id);
        this.onActiveCountChange?.(this.activeUploads.size);
        this.processQueue(); // Start next in queue
      }
      
      this.onQueueChange?.(this.queue);
    }
  }
  
  /**
   * Cancel all uploads
   */
  cancelAll() {
    // Abort all active uploads
    for (const [id, item] of this.activeUploads) {
      item.controller?.abort();
    }
    
    // Clear everything
    this.queue = [];
    this.activeUploads.clear();
    
    this.onQueueChange?.([]);
    this.onActiveCountChange?.(0);
  }
  
  /**
   * Get queue status
   */
  getStatus() {
    return {
      queue: this.queue,
      activeCount: this.activeUploads.size,
      waitingCount: this.queue.filter(q => q.status === 'waiting').length,
      completedCount: this.queue.filter(q => q.status === 'completed').length,
      failedCount: this.queue.filter(q => q.status === 'failed').length,
    };
  }
  
  /**
   * Clear completed/failed items
   */
  clearCompleted() {
    this.queue = this.queue.filter(q => 
      q.status === 'waiting' || q.status === 'uploading'
    );
    this.onQueueChange?.(this.queue);
  }
}

// Export singleton instance
export const uploadQueue = UploadQueueManager.getInstance();
