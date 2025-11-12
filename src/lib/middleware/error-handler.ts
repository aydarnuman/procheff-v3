/**
 * 🆕 Error Handling Middleware
 * Standardized error handling for all API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { AILogger } from '@/lib/ai/logger';
import { createErrorResponse, getErrorDetails, type ErrorCode } from '@/lib/utils/error-codes';

export interface ErrorContext {
  path?: string;
  method?: string;
  userId?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Categorize error into ErrorCode
 */
function categorizeError(error: unknown): ErrorCode {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // File size errors
    if (message.includes('too large') || message.includes('size')) {
      return 'FILE_TOO_LARGE';
    }
    
    // Format errors
    if (message.includes('unsupported') || message.includes('format')) {
      return 'UNSUPPORTED_FORMAT';
    }
    
    // Network errors
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'NETWORK_ERROR';
    }
    
    // API errors
    if (message.includes('rate limit') || message.includes('quota')) {
      return 'API_RATE_LIMIT';
    }
    
    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'TIMEOUT';
    }
    
    // Processing errors
    if (message.includes('processing') || message.includes('extract') || message.includes('parse')) {
      return 'PROCESSING_ERROR';
    }
    
    // OCR errors
    if (message.includes('ocr') || message.includes('tesseract')) {
      return 'OCR_FAILED';
    }
    
    // ZIP errors
    if (message.includes('zip') || message.includes('extract')) {
      return 'ZIP_EXTRACTION_FAILED';
    }
  }
  
  return 'UNKNOWN_ERROR';
}

/**
 * Error Handler Middleware
 * Wraps API route handlers with standardized error handling
 */
export function errorHandler<T = any>(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse<T>>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse<T>> => {
    const startTime = Date.now();
    const correlationId = req.headers.get('x-correlation-id') || 
                         `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Add correlation ID to response headers
      const response = await handler(req, context);
      response.headers.set('x-correlation-id', correlationId);
      
      const duration = Date.now() - startTime;
      
      // Log successful requests (only if > 1s or error status)
      if (duration > 1000 || response.status >= 400) {
        AILogger.info('API request completed', {
          path: req.url,
          method: req.method,
          status: response.status,
          duration,
          correlationId
        });
      }
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorCode = categorizeError(error);
      const errorDetails = getErrorDetails(errorCode);
      
      const errorContext: ErrorContext = {
        path: req.url,
        method: req.method,
        correlationId,
        metadata: {
          duration,
          errorType: errorCode,
          errorMessage: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      };
      
      // Log error with context
      AILogger.error(`API error: ${errorDetails.message}`, {
        ...errorContext,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : String(error)
      });
      
      // Create standardized error response
      const errorResponse = createErrorResponse(
        errorCode,
        error instanceof Error ? error.message : String(error)
      );
      
      // Return error response
      const response = NextResponse.json(
        {
          ...errorResponse,
          correlationId,
          timestamp: new Date().toISOString()
        },
        { 
          status: errorResponse.httpStatus || 500,
          headers: {
            'x-correlation-id': correlationId,
            'x-error-code': errorCode
          }
        }
      );
      
      return response as NextResponse<T>;
    }
  };
}

/**
 * Async error handler for background jobs
 */
export function asyncErrorHandler(
  handler: () => Promise<void>,
  context: ErrorContext
): Promise<void> {
  return handler().catch((error) => {
    const errorCode = categorizeError(error);
    const errorDetails = getErrorDetails(errorCode);
    
    AILogger.error(`Async job error: ${errorDetails.message}`, {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : String(error)
    });
    
    // Re-throw for upstream handling
    throw error;
  });
}

/**
 * Validation error handler
 */
export function handleValidationError(
  errors: any[],
  context?: ErrorContext
): NextResponse {
  AILogger.warn('Validation error', {
    ...context,
    errors
  });
  
  return NextResponse.json(
    createErrorResponse('INVALID_REQUEST', 'Validation failed', errors),
    { status: 400 }
  );
}

