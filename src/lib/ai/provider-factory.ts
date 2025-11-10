import Anthropic from "@anthropic-ai/sdk";

export class AIProviderFactory {
  private static claudeClient: Anthropic | null = null;

  static getClaude(): Anthropic {
    if (!this.claudeClient) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("ANTHROPIC_API_KEY environment variable is not set");
      }
      this.claudeClient = new Anthropic({ apiKey });
    }
    return this.claudeClient;
  }
}
