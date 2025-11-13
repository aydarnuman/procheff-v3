/**
 * 🆕 Standardized SSE Stream Utility
 * Unified Server-Sent Events implementation
 */

export interface SSEEvent {
  type: 'progress' | 'error' | 'success' | 'info';
  stage?: string;
  progress?: number; // 0-100
  message?: string;
  details?: string;
  data?: unknown;
  timestamp?: number;
  code?: string;    // Error code
  error?: string;    // Error message (for compatibility)
}

export class SSEStream {
  private controller: ReadableStreamDefaultController<Uint8Array>;
  private encoder: TextEncoder;
  
  constructor(controller: ReadableStreamDefaultController<Uint8Array>) {
    this.controller = controller;
    this.encoder = new TextEncoder();
  }
  
  /**
   * Send progress event
   */
  sendProgress(stage: string, progress: number, details?: string): void {
    this.send({
      type: 'progress',
      stage,
      progress: Math.max(0, Math.min(100, progress)), // Clamp 0-100
      details,
      timestamp: Date.now()
    });
  }
  
  /**
   * Send error event
   */
  sendError(code: string, message: string, details?: string): void {
    this.send({
      type: 'error',
      code,        // Frontend'de kullanılabilir
      message,
      error: message,  // Frontend compatibility
      details: details || code,
      timestamp: Date.now()
    });
  }
  
  /**
   * Send success event with data
   */
  sendSuccess(data: unknown, message?: string): void {
    this.send({
      type: 'success',
      data,
      message: message || 'İşlem tamamlandı',
      timestamp: Date.now()
    });
  }
  
  /**
   * Send info event
   */
  sendInfo(message: string, details?: string): void {
    this.send({
      type: 'info',
      message,
      details,
      timestamp: Date.now()
    });
  }
  
  /**
   * Send custom event
   */
  send(event: SSEEvent): void {
    try {
      const message = `data: ${JSON.stringify(event)}\n\n`;
      this.controller.enqueue(this.encoder.encode(message));
    } catch (error) {
      console.error('SSE send error:', error);
    }
  }
  
  /**
   * Close the stream
   */
  close(): void {
    try {
      this.controller.close();
    } catch {
      // Stream already closed
    }
  }
}

/**
 * Create SSE response
 */
export function createSSEResponse(
  handler: (stream: SSEStream) => Promise<void>
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const sse = new SSEStream(controller);
      let isClosed = false;
      
      const cleanup = () => {
        if (!isClosed) {
          isClosed = true;
          try {
            sse.close();
          } catch {
            // Already closed
          }
        }
      };
      
      // Handle abort signal if available
      if ((controller as any).signal) {
        (controller as any).signal.addEventListener('abort', cleanup);
      }
      
      try {
        await handler(sse);
        cleanup();
      } catch (error) {
        if (!isClosed) {
          sse.sendError(
            'UNKNOWN_ERROR',
            error instanceof Error ? error.message : 'Bilinmeyen hata oluştu'
          );
          cleanup();
        }
      }
    },
    cancel() {
      // Client disconnected - cleanup handled in start
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable nginx buffering
    }
  });
}

