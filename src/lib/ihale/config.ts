/**
 * İhale Worker API Configuration
 * Merkezi timeout ve retry ayarları
 */

export const IHALE_CONFIG = {
  // Worker URL
  WORKER_URL: process.env.IHALE_WORKER_URL || 'http://127.0.0.1:8080',

  // Timeout values (milliseconds)
  TIMEOUTS: {
    LOGIN: 30_000,        // 30 saniye - Login işlemi
    LIST: 120_000,        // 2 dakika - Liste çekme (çok sayfalı)
    DETAIL: 90_000,       // 90 saniye - Detay çekme (büyük dosyalar)
    PROXY: 90_000,        // 90 saniye - Dosya indirme
  },

  // Retry configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY_MS: 1000,
    BACKOFF_MULTIPLIER: 2,
  },

  // Logging
  DEBUG: process.env.NODE_ENV === 'development',
} as const;

/**
 * Helper: Wait with timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await promise;
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      throw new Error(errorMessage);
    }
    throw error;
  }
}
