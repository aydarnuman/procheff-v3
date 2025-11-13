import { FEATURE_FLAGS, RATE_LIMIT_CONFIG } from "@/features/config";
import { AILogger } from "@/lib/ai/logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * Performance Configuration Update Schema
 */
const PerformanceConfigSchema = z.object({
  rateLimiting: z.object({
    enabled: z.boolean(),
    globalLimit: z.number().min(1).max(10000).optional(),
  }),
  caching: z.object({
    enabled: z.boolean(),
    defaultTTL: z.number().min(60).max(86400).optional(),
  }),
});

/**
 * GET /api/performance/config
 * 
 * Returns current performance configuration
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        rateLimiting: {
          enabled: FEATURE_FLAGS.RATE_LIMITING_ENABLED,
          globalLimit: RATE_LIMIT_CONFIG.GLOBAL.requests,
        },
        caching: {
          enabled: FEATURE_FLAGS.CACHING_ENABLED,
          defaultTTL: 3600, // Default TTL in seconds
        },
      },
    });
  } catch (error) {
    AILogger.error("Failed to fetch performance config", { error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/performance/config
 * 
 * Updates performance configuration
 * 
 * Note: Currently, feature flags are managed via environment variables.
 * This endpoint validates and logs the requested changes, but actual
 * configuration changes require environment variable updates and restart.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedConfig = PerformanceConfigSchema.parse(body);

    AILogger.info("Performance config update requested", {
      rateLimiting: {
        requested: validatedConfig.rateLimiting.enabled,
        current: FEATURE_FLAGS.RATE_LIMITING_ENABLED,
      },
      caching: {
        requested: validatedConfig.caching.enabled,
        current: FEATURE_FLAGS.CACHING_ENABLED,
      },
    });

    // Validate requested changes
    const changes: string[] = [];
    const warnings: string[] = [];

    if (validatedConfig.rateLimiting.enabled !== FEATURE_FLAGS.RATE_LIMITING_ENABLED) {
      changes.push(
        `Rate limiting: ${FEATURE_FLAGS.RATE_LIMITING_ENABLED ? "disabled" : "enabled"} → ${validatedConfig.rateLimiting.enabled ? "enabled" : "disabled"}`
      );
      warnings.push(
        "Rate limiting changes require environment variable update (ENABLE_RATE_LIMITING) and server restart"
      );
    }

    if (validatedConfig.caching.enabled !== FEATURE_FLAGS.CACHING_ENABLED) {
      changes.push(
        `Caching: ${FEATURE_FLAGS.CACHING_ENABLED ? "disabled" : "enabled"} → ${validatedConfig.caching.enabled ? "enabled" : "disabled"}`
      );
      warnings.push(
        "Caching changes require environment variable update (ENABLE_CACHING) and server restart"
      );
    }

    if (validatedConfig.rateLimiting.globalLimit && 
        validatedConfig.rateLimiting.globalLimit !== RATE_LIMIT_CONFIG.GLOBAL.requests) {
      changes.push(
        `Global rate limit: ${RATE_LIMIT_CONFIG.GLOBAL.requests} → ${validatedConfig.rateLimiting.globalLimit}`
      );
      warnings.push(
        "Rate limit changes require code update in src/features/config.ts and server restart"
      );
    }

    // For now, we'll store user preferences in a simple way
    // In production, you might want to store these in a database or Redis
    // For now, we'll just validate and return success with warnings

    return NextResponse.json({
      success: true,
      message: "Configuration validated successfully",
      data: {
        requested: validatedConfig,
        current: {
          rateLimiting: {
            enabled: FEATURE_FLAGS.RATE_LIMITING_ENABLED,
            globalLimit: RATE_LIMIT_CONFIG.GLOBAL.requests,
          },
          caching: {
            enabled: FEATURE_FLAGS.CACHING_ENABLED,
            defaultTTL: 3600,
          },
        },
        changes: changes.length > 0 ? changes : ["No changes requested"],
        warnings: warnings.length > 0 ? warnings : [],
        note: "Feature flags are managed via environment variables. Changes require server restart.",
      },
    });
  } catch (error) {
    AILogger.error("Failed to update performance config", { error });
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid configuration",
          details: (error as any).errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

