/**
 * API Type Definitions
 * Universal types for API requests and responses
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T = unknown> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * API error response
 */
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

/**
 * File upload request
 */
export interface FileUploadRequest {
  file: File;
  type?: string;
  metadata?: Record<string, unknown>;
}

/**
 * File upload response
 */
export interface FileUploadResponse {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Bulk operation request
 */
export interface BulkOperationRequest<T = unknown> {
  items: T[];
  operation: 'create' | 'update' | 'delete';
}

/**
 * Bulk operation response
 */
export interface BulkOperationResponse {
  success: number;
  failed: number;
  errors?: Array<{
    index: number;
    error: string;
  }>;
}

/**
 * Search/filter parameters
 */
export interface SearchParams {
  query?: string;
  filters?: Record<string, unknown>;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  page?: number;
  limit?: number;
}

/**
 * Export request
 */
export interface ExportRequest {
  format: 'pdf' | 'xlsx' | 'csv' | 'json';
  data: unknown;
  options?: Record<string, unknown>;
}

/**
 * Export response
 */
export interface ExportResponse {
  filename: string;
  url?: string;
  buffer?: Buffer;
  mimeType: string;
}
