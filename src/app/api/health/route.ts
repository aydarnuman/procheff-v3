import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/universal-client";

/**
 * Health check endpoint for monitoring and deployment verification
 * GET /api/health
 */
export async function GET() {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || "3.0.0",
    environment: process.env.NODE_ENV,
    checks: {
      database: false,
      memory: false,
      disk: false,
    },
    details: {} as any,
  };

  try {
    // 1. Database check
    try {
      const db = await getDatabase();
      const result = await db.queryOne("SELECT 1 as check") as { check: number } | undefined;
      health.checks.database = result?.check === 1;

      // Get database stats (PostgreSQL-specific)
      const tableCount = await db.queryOne(
        "SELECT COUNT(*) as count FROM pg_tables WHERE schemaname = 'public'"
      ) as { count: number } | undefined;

      health.details.database = {
        connected: true,
        tables: tableCount?.count || 0,
      };
    } catch (dbError) {
      health.checks.database = false;
      health.details.database = {
        connected: false,
        error: dbError instanceof Error ? dbError.message : "Unknown error",
      };
    }

    // 2. Memory check
    const memUsage = process.memoryUsage();
    const memoryUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const memoryTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    
    health.checks.memory = memoryUsedMB < memoryTotalMB * 0.9; // Less than 90% used
    health.details.memory = {
      used: `${memoryUsedMB} MB`,
      total: `${memoryTotalMB} MB`,
      percentage: Math.round((memoryUsedMB / memoryTotalMB) * 100),
    };

    // 3. Uptime
    health.details.uptime = {
      seconds: Math.floor(process.uptime()),
      formatted: formatUptime(process.uptime()),
    };

    // Overall status
    const allChecksPass = Object.values(health.checks).every(check => check);
    health.status = allChecksPass ? "healthy" : "degraded";

    // Return appropriate status code
    const statusCode = allChecksPass ? 200 : 503;
    
    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(" ");
}