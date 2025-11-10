import { NextResponse } from "next/server";

/**
 * Health Check Endpoint
 * Used by DigitalOcean, Docker, and monitoring services
 */
export async function GET() {
  try {
    // Basic health check
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || "3.0.0",
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
    };

    // Check critical services
    const checks: Record<string, boolean> = {
      redis: false,
      database: false,
      ai: false,
    };

    // Check Redis connection (optional)
    try {
      if (process.env.UPSTASH_REDIS_REST_URL) {
        const redisResponse = await fetch(
          `${process.env.UPSTASH_REDIS_REST_URL}/ping`,
          {
            headers: {
              Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
            },
            signal: AbortSignal.timeout(2000),
          }
        );
        checks.redis = redisResponse.ok;
      }
    } catch (error) {
      console.warn("Redis health check failed:", error);
      checks.redis = false;
    }

    // Check database (optional)
    try {
      // Simple check - if DATABASE_PATH exists
      checks.database = !!process.env.DATABASE_PATH;
    } catch {
      checks.database = false;
    }

    // Check AI API keys
    checks.ai =
      !!process.env.ANTHROPIC_API_KEY || !!process.env.GOOGLE_API_KEY;

    // Determine overall health
    const isHealthy = checks.ai; // At minimum, AI must be available
    const status = isHealthy ? "healthy" : "unhealthy";

    return NextResponse.json(
      {
        ...health,
        status,
        checks,
      },
      {
        status: isHealthy ? 200 : 503,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
