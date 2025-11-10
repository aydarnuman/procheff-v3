/**
 * Enhanced Retry Logic with Exponential Backoff
 * For Claude/Gemini API failures with production-grade resilience
 */

import { AILogger } from "@/lib/ai/logger";

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number; // ms
  maxDelay?: number; // ms
  backoffFactor?: number;
  timeout?: number; // ms per request
  onRetry?: (attempt: number, error: Error) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  attempts: number;
}

/**
 * Exponential backoff: 2s → 4s → 8s → 16s (capped at maxDelay)
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = options.initialDelay * Math.pow(options.backoffFactor, attempt - 1);
  return Math.min(delay, options.maxDelay);
}

/**
 * Parse error message from various sources
 */
function parseErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (typeof error === "object" && error !== null) {
    // Check common API error formats
    const err = error as Record<string, unknown>;
    if (err.message && typeof err.message === "string") {
      return err.message;
    }
    if (err.error && typeof err.error === "string") {
      return err.error;
    }
    if (err.detail && typeof err.detail === "string") {
      return err.detail;
    }
  }
  return String(error);
}

/**
 * Enhanced error categorization for AI services
 */
export function categorizeAIError(error: unknown): {
  type: "rate_limit" | "timeout" | "server" | "auth" | "validation" | "network" | "unknown";
  message: string;
  recoverable: boolean;
} {
  const msg = parseErrorMessage(error).toLowerCase();

  if (msg.includes("rate limit") || msg.includes("429") || msg.includes("quota")) {
    return {
      type: "rate_limit",
      message: "API rate limit aşıldı. Lütfen birkaç dakika bekleyin.",
      recoverable: true,
    };
  }

  if (msg.includes("timeout") || msg.includes("timed out") || msg.includes("aborted")) {
    return {
      type: "timeout",
      message: "İstek zaman aşımına uğradı. Tekrar deneniyor...",
      recoverable: true,
    };
  }

  if (msg.includes("500") || msg.includes("502") || msg.includes("503") || msg.includes("internal server")) {
    return {
      type: "server",
      message: "AI servisi geçici olarak kullanılamıyor. Tekrar deneniyor...",
      recoverable: true,
    };
  }

  if (msg.includes("401") || msg.includes("403") || msg.includes("unauthorized") || msg.includes("api key")) {
    return {
      type: "auth",
      message: "API kimlik doğrulama hatası. Lütfen ayarları kontrol edin.",
      recoverable: false,
    };
  }

  if (msg.includes("400") || msg.includes("invalid") || msg.includes("validation")) {
    return {
      type: "validation",
      message: "Geçersiz istek. Lütfen giriş verilerini kontrol edin.",
      recoverable: false,
    };
  }

  if (msg.includes("fetch") || msg.includes("network") || msg.includes("econnrefused")) {
    return {
      type: "network",
      message: "Ağ bağlantı hatası. Tekrar deneniyor...",
      recoverable: true,
    };
  }

  return {
    type: "unknown",
    message: msg || "Bilinmeyen hata",
    recoverable: true,
  };
}

/**
 * Retry with exponential backoff + enhanced error handling
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts: Required<RetryOptions> = {
    maxAttempts: options.maxAttempts ?? 3,
    initialDelay: options.initialDelay ?? 2000, // 2s
    maxDelay: options.maxDelay ?? 16000, // 16s
    backoffFactor: options.backoffFactor ?? 2,
    timeout: options.timeout ?? 60000, // 60s
    onRetry: options.onRetry ?? (() => {}),
  };

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      // Timeout wrapper
      const result = await Promise.race<T>([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), opts.timeout)
        ),
      ]);

      AILogger.success(`Retry success on attempt ${attempt}`, { attempt });
      return { success: true, data: result, attempts: attempt };
    } catch (error) {
      lastError = error;
      const errorInfo = categorizeAIError(error);

      AILogger.warn(`Attempt ${attempt}/${opts.maxAttempts} failed`, {
        attempt,
        errorType: errorInfo.type,
        message: errorInfo.message,
        recoverable: errorInfo.recoverable,
      });

      // Non-recoverable errors → stop immediately
      if (!errorInfo.recoverable) {
        return {
          success: false,
          error: errorInfo.message,
          attempts: attempt,
        };
      }

      // Last attempt → return error
      if (attempt === opts.maxAttempts) {
        return {
          success: false,
          error: errorInfo.message,
          attempts: attempt,
        };
      }

      // Exponential backoff before next attempt
      const delay = calculateDelay(attempt, opts);
      AILogger.info(`Retrying in ${delay}ms`, { delay, attempt });

      opts.onRetry(attempt, error as Error);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Should never reach here
  return {
    success: false,
    error: parseErrorMessage(lastError),
    attempts: opts.maxAttempts,
  };
}

/**
 * Retry wrapper for fetch API calls (JSON)
 */
export async function retryFetch<T>(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<RetryResult<T>> {
  return retryWithBackoff(async () => {
    const res = await fetch(url, init);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return (await res.json()) as T;
  }, options);
}

/**
 * Retry wrapper for FormData uploads
 */
export async function retryFormUpload<T>(
  url: string,
  formData: FormData,
  options?: RetryOptions
): Promise<RetryResult<T>> {
  return retryWithBackoff(async () => {
    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return (await res.json()) as T;
  }, {
    ...options,
    timeout: options?.timeout ?? 120000, // 120s for file uploads
  });
}
