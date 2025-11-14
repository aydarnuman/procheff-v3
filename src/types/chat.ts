/**
 * Chat Type Definitions
 * Types for AI chat, messages, sessions, and analytics
 */

/**
 * Message role
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Message type
 */
export type MessageType =
  | 'text'
  | 'file'
  | 'analysis'
  | 'suggestion'
  | 'error'
  | 'system';

/**
 * Chat message
 */
export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  metadata?: {
    model?: string;
    tokens?: number;
    duration?: number;
    attachments?: Array<{
      id: string;
      filename: string;
      type: string;
      size: number;
    }>;
    analysis?: {
      tenderId?: string;
      analysisId?: string;
      type?: string;
    };
    error?: {
      code: string;
      message: string;
    };
  };
  createdAt: string;
  updatedAt?: string;
}

/**
 * Chat session
 */
export interface ChatSession {
  id: string;
  userId: string;
  title?: string;
  context?: {
    tenderId?: string;
    analysisId?: string;
    projectId?: string;
  };
  systemPrompt?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  messageCount: number;
  totalTokens: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
}

/**
 * Chat request
 */
export interface ChatRequest {
  sessionId?: string;
  message: string;
  context?: {
    tenderId?: string;
    analysisId?: string;
    files?: File[];
  };
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  };
}

/**
 * Chat response
 */
export interface ChatResponse {
  success: boolean;
  message?: ChatMessage;
  session?: ChatSession;
  error?: string;
  metadata?: {
    model: string;
    tokens: number;
    duration: number;
  };
}

/**
 * Streaming chat chunk
 */
export interface ChatStreamChunk {
  id: string;
  sessionId: string;
  delta: string;
  isComplete: boolean;
  metadata?: {
    tokens?: number;
    finishReason?: string;
  };
}

/**
 * AI suggestion
 */
export interface AISuggestion {
  id: string;
  type: 'question' | 'action' | 'insight' | 'warning';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  context?: {
    tenderId?: string;
    analysisId?: string;
  };
  action?: {
    type: string;
    params: Record<string, unknown>;
  };
  createdAt: string;
}

/**
 * Chat analytics
 */
export interface ChatAnalytics {
  sessionId: string;
  userId: string;
  metrics: {
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    totalTokens: number;
    averageResponseTime: number;
    sessionDuration: number;
  };
  usage: {
    models: Array<{
      model: string;
      requests: number;
      tokens: number;
    }>;
    byType: Array<{
      type: MessageType;
      count: number;
    }>;
  };
  satisfaction?: {
    rating?: number;
    feedback?: string;
  };
  period: {
    from: string;
    to: string;
  };
}

/**
 * Chat context
 */
export interface ChatContext {
  tender?: {
    id: string;
    title: string;
    institution: string;
    deadline: string;
  };
  analysis?: {
    id: string;
    status: string;
    hasContextual: boolean;
    hasMarket: boolean;
    hasCost: boolean;
    hasDecision: boolean;
  };
  user?: {
    role: string;
    preferences?: Record<string, unknown>;
  };
}

/**
 * System message template
 */
export interface SystemMessageTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
  category: 'analysis' | 'cost' | 'decision' | 'general';
  isActive: boolean;
}

/**
 * Chat file attachment
 */
export interface ChatFileAttachment {
  id: string;
  messageId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url?: string;
  extractedText?: string;
  metadata?: Record<string, unknown>;
  uploadedAt: string;
}

/**
 * Chat feedback
 */
export interface ChatFeedback {
  id: string;
  messageId: string;
  sessionId: string;
  userId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  feedback?: string;
  issues?: Array<'incorrect' | 'incomplete' | 'irrelevant' | 'unclear' | 'other'>;
  createdAt: string;
}

/**
 * Chat export request
 */
export interface ChatExportRequest {
  sessionId: string;
  format: 'txt' | 'json' | 'pdf' | 'html';
  includeMetadata?: boolean;
  includeAttachments?: boolean;
}

/**
 * Chat export response
 */
export interface ChatExportResponse {
  success: boolean;
  filename: string;
  content?: string;
  url?: string;
  error?: string;
}

/**
 * Chat search filters
 */
export interface ChatSearchFilters {
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  role?: MessageRole;
  type?: MessageType;
  tenderId?: string;
  analysisId?: string;
  hasAttachments?: boolean;
  query?: string;
}

/**
 * Chat search result
 */
export interface ChatSearchResult {
  sessions: Array<{
    session: ChatSession;
    matchingMessages: ChatMessage[];
    relevanceScore: number;
  }>;
  totalResults: number;
  query: string;
  searchedAt: string;
}

/**
 * AI model configuration
 */
export interface AIModelConfig {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai' | 'google';
  modelId: string;
  maxTokens: number;
  defaultTemperature: number;
  costPerToken: {
    input: number;
    output: number;
  };
  capabilities: Array<'text' | 'vision' | 'function_calling' | 'streaming'>;
  isActive: boolean;
}

/**
 * Conversation summary
 */
export interface ConversationSummary {
  sessionId: string;
  summary: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: string[];
  topics: string[];
  generatedAt: string;
}
