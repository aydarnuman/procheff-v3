/**
 * DataPool Event Emitter
 * Client-safe event emitter for DataPool updates
 * Can be imported in client components without server dependencies
 */

import type { DataPool } from '@/lib/document-processor/types';

export class DataPoolEventEmitter {
  private static listeners: Map<string, Set<(dataPool: DataPool) => void>> = new Map();
  
  /**
   * Subscribe to DataPool updates
   */
  static on(analysisId: string, callback: (dataPool: DataPool) => void): () => void {
    if (!this.listeners.has(analysisId)) {
      this.listeners.set(analysisId, new Set());
    }
    
    this.listeners.get(analysisId)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(analysisId);
      if (callbacks) {
        callbacks.delete(callback);
        // Clean up empty Sets
        if (callbacks.size === 0) {
          this.listeners.delete(analysisId);
        }
      }
    };
  }
  
  /**
   * Emit DataPool update event
   */
  static emit(analysisId: string, dataPool: DataPool): void {
    const callbacks = this.listeners.get(analysisId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(dataPool);
        } catch (error) {
          console.error('DataPool event callback error:', error);
        }
      });
    }
  }
  
  /**
   * Remove all listeners for an analysis
   */
  static removeAll(analysisId: string): void {
    this.listeners.delete(analysisId);
  }
}

