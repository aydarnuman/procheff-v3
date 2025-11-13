/**
 * Cache Statistics API
 * GET /api/cache/stats - Get semantic cache statistics
 * DELETE /api/cache/cleanup - Clean up expired cache entries
 */

import { NextResponse } from "next/server";
import { getCacheStats, cleanupExpiredCache } from "@/lib/ai/semantic-cache";
import { AILogger } from "@/lib/ai/logger";

export async function GET() {
  try {
    const stats = getCacheStats();
    
    AILogger.info("Cache stats retrieved", stats);
    
    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        cacheEfficiency: stats.totalHits > 0 
          ? ((stats.totalHits / (stats.totalHits + stats.totalEntries)) * 100).toFixed(2) + '%'
          : '0%',
        estimatedMonthlySavings: (stats.estimatedCostSaved * 30).toFixed(2)
      }
    });
  } catch (error) {
    AILogger.error("Failed to get cache stats", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const deletedCount = cleanupExpiredCache();
    
    AILogger.success("Expired cache entries cleaned up", { deletedCount });
    
    return NextResponse.json({
      success: true,
      data: {
        deletedCount,
        message: `Cleaned up ${deletedCount} expired cache entries`
      }
    });
  } catch (error) {
    AILogger.error("Failed to cleanup cache", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}






