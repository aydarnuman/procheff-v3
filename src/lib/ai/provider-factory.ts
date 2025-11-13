import Anthropic from "@anthropic-ai/sdk";
import { AILogger } from "./logger";
import { getCachedResponse, setCachedResponse } from "./semantic-cache";

/**
 * Configuration for Claude API calls
 */
export interface ClaudeConfig {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  timeout?: number;
}

/**
 * Structured message response with metadata
 */
export interface StructuredMessageResponse<T> {
  data: T;
  metadata: {
    duration_ms: number;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    cost_usd: number;
    cached?: boolean;
    cache_hit_type?: 'exact' | 'semantic';
    similarity_score?: number;
    tokens_saved?: number;
    cache_age_seconds?: number;
  };
}

/**
 * JSON Schema definition for structured outputs
 */
export interface JSONSchema {
  name: string;
  schema: Record<string, unknown>;
}

export class AIProviderFactory {
  private static claudeClient: Anthropic | null = null;

  static getClaude(): Anthropic {
    if (!this.claudeClient) {
      let apiKey = process.env.ANTHROPIC_API_KEY;
      
      if (!apiKey) {
        const error = new Error("ANTHROPIC_API_KEY environment variable is not set. Please add it to your .env.local file.");
        console.error('❌ [CRITICAL] Claude API key missing!');
        console.error('   → Add ANTHROPIC_API_KEY=sk-ant-api03-xxxxx to your .env.local file');
        console.error('   → Get your API key from: https://console.anthropic.com/');
        throw error;
      }
      
      // CRITICAL: Trim whitespace (common issue - users copy-paste with spaces)
      const originalKey = apiKey;
      apiKey = apiKey.trim();
      
      if (originalKey !== apiKey) {
        console.warn('⚠️ [WARNING] ANTHROPIC_API_KEY had leading/trailing whitespace - trimmed');
        console.warn(`   → Original length: ${originalKey.length}, Trimmed length: ${apiKey.length}`);
      }
      
      // Validate API key format (should start with 'sk-ant-')
      if (!apiKey.startsWith('sk-ant-')) {
        console.error('❌ [CRITICAL] ANTHROPIC_API_KEY format is invalid!');
        console.error(`   → Current key starts with: "${apiKey.slice(0, Math.min(20, apiKey.length))}..."`);
        console.error('   → Expected format: sk-ant-api03-xxxxx');
        console.error('   → Get a valid key from: https://console.anthropic.com/');
        throw new Error('ANTHROPIC_API_KEY format is invalid. Must start with "sk-ant-"');
      }
      
      // Check if key looks like a placeholder
      if (apiKey.includes('YOUR_KEY') || apiKey.includes('xxxxx') || apiKey.length < 50) {
        console.error('❌ [CRITICAL] ANTHROPIC_API_KEY appears to be a placeholder or too short!');
        console.error(`   → Key length: ${apiKey.length} (expected: 50+ characters)`);
        console.error('   → Please replace it with your actual API key from https://console.anthropic.com/');
        throw new Error('ANTHROPIC_API_KEY is a placeholder or invalid. Please set a real API key.');
      }
      
      // Validate key structure (should have format: sk-ant-api03-...)
      const keyParts = apiKey.split('-');
      if (keyParts.length < 4 || keyParts[0] !== 'sk' || keyParts[1] !== 'ant') {
        console.error('❌ [CRITICAL] ANTHROPIC_API_KEY structure is invalid!');
        console.error(`   → Key format: ${keyParts.slice(0, 3).join('-')}...`);
        console.error('   → Expected format: sk-ant-api03-xxxxx');
        throw new Error('ANTHROPIC_API_KEY structure is invalid.');
      }
      
      try {
        this.claudeClient = new Anthropic({ apiKey });
        console.log('✅ Claude client initialized successfully');
        console.log(`   → API key format: ${apiKey.slice(0, 15)}... (${apiKey.length} chars)`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('❌ [CRITICAL] Failed to initialize Claude client:', message);
        throw new Error(`Claude client initialization failed: ${message}`);
      }
    }
    return this.claudeClient;
  }

  /**
   * Create structured message with guaranteed JSON schema compliance
   * 
   * This method uses Anthropic's native structured outputs feature
   * to guarantee valid JSON responses without manual parsing/cleaning.
   * 
   * @param prompt - The prompt to send to Claude
   * @param schema - JSON schema definition for structured output
   * @param config - Optional configuration (model, temperature, etc.)
   * @returns Structured response with typed data and metadata
   * 
   * @example
   * ```typescript
   * const { data, metadata } = await AIProviderFactory.createStructuredMessage(
   *   prompt,
   *   COST_ANALYSIS_SCHEMA,
   *   { temperature: 0.4 }
   * );
   * ```
   */
  static async createStructuredMessage<T>(
    prompt: string,
    schema: JSONSchema,
    config?: Partial<ClaudeConfig> & { bypassCache?: boolean }
  ): Promise<StructuredMessageResponse<T>> {
    const startTime = Date.now();

    const model = config?.model || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
    const temperature = config?.temperature ?? 0.4;
    const maxTokens = config?.max_tokens ?? 8000;
    const timeout = config?.timeout ?? 120000;
    const bypassCache = config?.bypassCache ?? false;

    // 🚀 Check cache first (unless bypassed)
    if (!bypassCache) {
      const cached = getCachedResponse<T>(prompt, model, temperature);
      
      if (cached) {
        const duration = Date.now() - startTime;
        
        AILogger.success("⚡ Cache hit - no API call needed", {
          schemaName: schema.name,
          cacheType: cached.metadata.cache_hit_type,
          similarityScore: cached.metadata.similarity_score,
          tokensSaved: cached.metadata.tokens_saved,
          cacheAge: cached.metadata.age_seconds,
          duration_ms: duration,
        });
        
        return {
          data: cached.data,
          metadata: {
            duration_ms: duration,
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0,
            cost_usd: 0,
            cached: true,
            cache_hit_type: cached.metadata.cache_hit_type,
            similarity_score: cached.metadata.similarity_score,
            tokens_saved: cached.metadata.tokens_saved,
            cache_age_seconds: cached.metadata.age_seconds,
          },
        };
      }
    }

    // Cache miss - make API call
    const client = this.getClaude();

    try {
      AILogger.info("🤖 Structured message request (cache miss)", {
        model,
        schemaName: schema.name,
        promptLength: prompt.length,
        bypassCache,
        timeout_ms: timeout,
      });

      // ✅ Correct timeout usage: pass as second parameter (request options)
      const response = await client.messages.create(
        {
          model,
          temperature,
          max_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }],
          // 🎯 STRUCTURED OUTPUT - Guarantees valid JSON
          ...(schema ? {
            response_format: {
              type: "json_schema" as const,
              json_schema: {
                name: schema.name,
                strict: true,
                schema: schema.schema,
              },
            },
          } : {}),
        },
        {
          // ✅ Timeout in request options (prevents hanging!)
          timeout: timeout,
        }
      );

      const duration = Date.now() - startTime;

      // Extract text content (structured output is always text with valid JSON)
      const textContent = response.content[0];
      if (textContent.type !== "text") {
        throw new Error("Unexpected response type from Claude API");
      }

      // Parse JSON (guaranteed to be valid due to structured output)
      const data = JSON.parse(textContent.text) as T;

      // Calculate costs (Claude Sonnet 4 pricing as of 2025)
      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;
      const totalTokens = inputTokens + outputTokens;
      
      // Pricing: $3 per 1M input tokens, $15 per 1M output tokens
      const inputCost = (inputTokens / 1_000_000) * 3;
      const outputCost = (outputTokens / 1_000_000) * 15;
      const costUsd = inputCost + outputCost;

      AILogger.success("✅ Structured message completed", {
        schemaName: schema.name,
        duration_ms: duration,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        cost_usd: costUsd.toFixed(6),
      });

      // 💾 Save to cache for future use
      try {
        setCachedResponse(prompt, model, temperature, data, totalTokens, 24);
        AILogger.info("💾 Response cached successfully", {
          schemaName: schema.name,
          tokens: totalTokens,
        });
      } catch (cacheError) {
        AILogger.warn("Failed to cache response", { error: cacheError });
        // Don't fail the request if caching fails
      }

      return {
        data,
        metadata: {
          duration_ms: duration,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: totalTokens,
          cost_usd: costUsd,
          cached: false,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      AILogger.error("❌ Structured message failed", {
        schemaName: schema.name,
        duration_ms: duration,
        error: errorMessage,
      });

      throw new Error(`Structured message failed: ${errorMessage}`);
    }
  }
}
