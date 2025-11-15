/**
 * Chunk Upload Utility
 * Büyük dosyaları parçalara bölerek yükleme
 */

export interface ChunkMetadata {
  fileId: string;
  fileName: string;
  fileSize: number;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: Set<number>;
  hash: string;
}

export class ChunkUploader {
  private static CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
  private static uploads = new Map<string, ChunkMetadata>();

  /**
   * Dosyayı parçalara böl ve yükle
   */
  static async uploadFile(
    file: File,
    onProgress: (progress: number) => void,
    onChunkComplete?: (chunkIndex: number, totalChunks: number) => void
  ): Promise<{ success: boolean; fileId: string; error?: string }> {
    const fileId = `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);
    
    // Calculate file hash for integrity
    const fileBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
    const hash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Initialize metadata
    const metadata: ChunkMetadata = {
      fileId,
      fileName: file.name,
      fileSize: file.size,
      chunkSize: this.CHUNK_SIZE,
      totalChunks,
      uploadedChunks: new Set(),
      hash
    };
    
    this.uploads.set(fileId, metadata);

    try {
      // Upload chunks sequentially (can be parallelized)
      for (let i = 0; i < totalChunks; i++) {
        const start = i * this.CHUNK_SIZE;
        const end = Math.min(start + this.CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        
        // Upload chunk
        const success = await this.uploadChunk(fileId, i, chunk, metadata);
        
        if (!success) {
          throw new Error(`Chunk ${i} upload failed`);
        }
        
        metadata.uploadedChunks.add(i);
        
        // Calculate overall progress
        const progress = ((i + 1) / totalChunks) * 100;
        onProgress(progress);
        onChunkComplete?.(i + 1, totalChunks);
      }

      // Verify upload completion
      const verified = await this.verifyUpload(fileId, metadata);
      
      if (!verified) {
        throw new Error('Upload verification failed');
      }

      return { success: true, fileId };
      
    } catch (error) {
      console.error('Chunk upload error:', error);
      return { 
        success: false, 
        fileId,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Upload single chunk
   */
  private static async uploadChunk(
    fileId: string,
    chunkIndex: number,
    chunk: Blob,
    metadata: ChunkMetadata
  ): Promise<boolean> {
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('fileId', fileId);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('totalChunks', metadata.totalChunks.toString());
    formData.append('fileName', metadata.fileName);
    formData.append('fileSize', metadata.fileSize.toString());
    formData.append('hash', metadata.hash);

    try {
      const response = await fetch('/api/upload/chunk', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      return result.success;
      
    } catch (error) {
      console.error(`Chunk ${chunkIndex} upload failed:`, error);
      
      // Retry logic (3 attempts)
      for (let retry = 1; retry <= 3; retry++) {
        await new Promise(resolve => setTimeout(resolve, 1000 * retry));
        
        try {
          const response = await fetch('/api/upload/chunk', {
            method: 'POST',
            body: formData
          });
          
          if (response.ok) {
            return true;
          }
        } catch (error) {}
      }
      
      return false;
    }
  }

  /**
   * Verify upload completion
   */
  private static async verifyUpload(
    fileId: string,
    metadata: ChunkMetadata
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/upload/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          fileName: metadata.fileName,
          fileSize: metadata.fileSize,
          totalChunks: metadata.totalChunks,
          hash: metadata.hash
        })
      });

      const result = await response.json();
      return result.verified;
      
    } catch (error) {
      console.error('Upload verification failed:', error);
      return false;
    }
  }

  /**
   * Resume incomplete upload
   */
  static async resumeUpload(
    fileId: string,
    file: File,
    onProgress: (progress: number) => void
  ): Promise<{ success: boolean; error?: string }> {
    const metadata = this.uploads.get(fileId);
    
    if (!metadata) {
      return { success: false, error: 'Upload metadata not found' };
    }

    try {
      // Find missing chunks
      const missingChunks: number[] = [];
      for (let i = 0; i < metadata.totalChunks; i++) {
        if (!metadata.uploadedChunks.has(i)) {
          missingChunks.push(i);
        }
      }

      // Upload missing chunks
      for (const chunkIndex of missingChunks) {
        const start = chunkIndex * this.CHUNK_SIZE;
        const end = Math.min(start + this.CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        
        const success = await this.uploadChunk(fileId, chunkIndex, chunk, metadata);
        
        if (!success) {
          throw new Error(`Chunk ${chunkIndex} upload failed`);
        }
        
        metadata.uploadedChunks.add(chunkIndex);
        
        const progress = (metadata.uploadedChunks.size / metadata.totalChunks) * 100;
        onProgress(progress);
      }

      // Verify completion
      const verified = await this.verifyUpload(fileId, metadata);
      
      return { success: verified };
      
    } catch (error) {
      return { 
        success: false,
        error: error instanceof Error ? error.message : 'Resume failed'
      };
    }
  }

  /**
   * Get upload status
   */
  static getUploadStatus(fileId: string): {
    exists: boolean;
    progress?: number;
    uploadedChunks?: number;
    totalChunks?: number;
  } {
    const metadata = this.uploads.get(fileId);
    
    if (!metadata) {
      return { exists: false };
    }

    return {
      exists: true,
      progress: (metadata.uploadedChunks.size / metadata.totalChunks) * 100,
      uploadedChunks: metadata.uploadedChunks.size,
      totalChunks: metadata.totalChunks
    };
  }

  /**
   * Cancel upload
   */
  static cancelUpload(fileId: string): void {
    this.uploads.delete(fileId);
    
    // Notify server to clean up chunks
    fetch('/api/upload/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId })
    }).catch(console.error);
  }
}
