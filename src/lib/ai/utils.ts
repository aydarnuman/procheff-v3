/**
 * Cleans Claude's response by removing markdown code blocks
 * @param text - Raw text from Claude API
 * @returns Cleaned text without markdown formatting
 * 
 * @deprecated This function is deprecated. Use AIProviderFactory.createStructuredMessage() 
 * with structured outputs instead for guaranteed valid JSON responses.
 * 
 * This function is kept for backward compatibility with legacy code that hasn't been
 * migrated to structured outputs yet (e.g., Gemini-based endpoints, contextual analysis).
 * 
 * @see AIProviderFactory.createStructuredMessage()
 * @see src/lib/ai/schemas.ts for available schemas
 */
export function cleanClaudeJSON(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/g, "")
    .trim();
}

/**
 * Estimates token count for a given text
 * Rough approximation: ~4 characters per token
 * @param text - Text to estimate
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
