import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

/**
 * Simple in-memory rate limiter
 * Tracks requests by IP address
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const requestCounts = new Map<string, RateLimitRecord>();

// Cleanup old records every minute
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(ip);
    }
  }
}, 60000);

/**
 * Rate limiter middleware
 */
export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  let record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    // New window
    record = {
      count: 1,
      resetTime: now + config.RATE_LIMIT_WINDOW_MS,
    };
    requestCounts.set(ip, record);
    next();
    return;
  }

  if (record.count >= config.RATE_LIMIT_MAX_REQUESTS) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);

    res.status(429).json({
      error: 'rate_limit_exceeded',
      message: `Çok fazla istek gönderdiniz. Lütfen ${retryAfter} saniye bekleyin.`,
      retryAfter,
    });
    return;
  }

  // Increment count
  record.count++;
  next();
}

/**
 * Get rate limiter statistics
 */
export function getRateLimiterStats() {
  return {
    trackedIPs: requestCounts.size,
    totalRequests: Array.from(requestCounts.values()).reduce((sum, record) => sum + record.count, 0),
  };
}
