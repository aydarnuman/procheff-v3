/**
 * Database Type Definitions
 * Type-safe interfaces for SQLite database rows
 */

/**
 * Tender table row
 */
export interface TenderDBRow {
  id: string;
  tenderNumber: string;
  title: string;
  organization: string;
  city: string;
  tenderType: string;
  partialBidAllowed: number; // SQLite boolean (0 or 1)
  publishDate: string;
  tenderDate: string;
  daysRemaining: number;
  url: string;
  created_at: string;
  is_archived: number; // SQLite boolean (0 or 1)
}

/**
 * Analysis history table row
 */
export interface AnalysisHistoryDBRow {
  id: string;
  tender_id?: string;
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
  storage_path?: string; // File storage path
  progress?: number; // Progress percentage (0-100)
  data_pool?: string; // JSON string
  extracted_fields?: string; // JSON string
  contextual_analysis?: string; // JSON string
  market_analysis?: string; // JSON string
  validation?: string; // JSON string
  processing_time_ms?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Analysis results table row
 */
export interface AnalysisResultDBRow {
  id: string;
  analysis_id: string;
  stage: 'contextual' | 'market' | 'deep' | 'validation';
  result_data: string; // JSON string
  created_at: string;
}

/**
 * AI logs table row
 */
export interface AILogDBRow {
  id: number;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  operation: string;
  model?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  duration_ms?: number;
  cost_usd?: number;
  metadata?: string; // JSON string
  error_message?: string;
  user_id?: string;
}

/**
 * Users table row (auth)
 */
export interface UserDBRow {
  id: string;
  name?: string;
  email: string;
  password_hash: string;
  role: 'OWNER' | 'ADMIN' | 'ANALYST' | 'VIEWER';
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Notifications table row
 */
export interface NotificationDBRow {
  id: string;
  user_id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  read: number; // SQLite boolean
  created_at: string;
}
