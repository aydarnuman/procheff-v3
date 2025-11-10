/**
 * Cleans Claude's response by removing markdown code blocks
 * @param text - Raw text from Claude API
 * @returns Cleaned text without markdown formatting
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
