import Anthropic from '@anthropic-ai/sdk';

// Re-export AILogger from its current location
export { AILogger } from './logger';

// Initialize Anthropic client
let anthropicClient: Anthropic | null = null;

if (typeof window === 'undefined') {
  // Only initialize on server-side
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      anthropicClient = new Anthropic({
        apiKey: apiKey,
      });
      console.log('✅ Anthropic client initialized successfully');
    } else {
      console.warn('⚠️ ANTHROPIC_API_KEY not found in environment variables');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Anthropic client:', error);
  }
}

// Export the client
export { anthropicClient };

// Helper function to get the client with error handling
export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    throw new Error('Anthropic client is not initialized. Please check your ANTHROPIC_API_KEY environment variable.');
  }
  return anthropicClient;
}

// Check if client is available
export function isAnthropicAvailable(): boolean {
  return anthropicClient !== null;
}

// Common models
export const CLAUDE_MODELS = {
  HAIKU: 'claude-3-haiku-20240307',
  SONNET: 'claude-3-sonnet-20240229',
  SONNET_35: 'claude-3-5-sonnet-20241022',
  OPUS: 'claude-3-opus-20240229',
} as const;

// Get the default model from environment or use Haiku as fallback
export function getDefaultModel(): string {
  return process.env.ANTHROPIC_MODEL || CLAUDE_MODELS.HAIKU;
}

// Helper function to clean Claude's JSON responses
export function cleanClaudeJSON(text: string): string {
  // Remove markdown code blocks
  text = text.replace(/```json?\s*/g, '').replace(/```\s*$/g, '');
  
  // Find JSON object or array
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    return jsonMatch[0].trim();
  }
  
  return text.trim();
}

// Error types
export class AIError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'AIError';
  }
}

export class AIRateLimitError extends AIError {
  constructor(message: string, public readonly retryAfter?: number) {
    super(message, 'RATE_LIMIT');
    this.name = 'AIRateLimitError';
  }
}

export class AIAuthenticationError extends AIError {
  constructor(message: string) {
    super(message, 'AUTHENTICATION');
    this.name = 'AIAuthenticationError';
  }
}
