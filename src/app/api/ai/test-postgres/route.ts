/**
 * Test route for PostgreSQL AI logging
 */

import { NextRequest, NextResponse } from "next/server";
import { AILogger } from "@/lib/ai/logger-postgres";
import { getPool } from "@/lib/db/postgres-client";

export async function GET(_req: NextRequest) {
  try {
    // Test logging
    AILogger.info("🧪 PostgreSQL AI test başladı");
    AILogger.success("✅ Test log kaydedildi");
    AILogger.warn("⚠️ Bu bir test uyarısı");
    
    // Test database connection
    const pool = await getPool();
    const result = await pool.query("SELECT COUNT(*) FROM ai_logs");
    const count = result.rows[0].count;
    
    AILogger.success(`✅ PostgreSQL bağlantısı başarılı. ${count} log kaydı bulundu.`);
    
    // Get recent logs
    const logsResult = await pool.query(
      "SELECT * FROM ai_logs ORDER BY created_at DESC LIMIT 5"
    );
    
    return NextResponse.json({
      success: true,
      message: "PostgreSQL AI logging çalışıyor",
      logCount: count,
      recentLogs: logsResult.rows
    });
    
  } catch (error) {
    AILogger.error("PostgreSQL test hatası", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message, level = "info" } = await req.json();
    
    // Log the message
    switch (level) {
      case "success":
        AILogger.success(message);
        break;
      case "warn":
        AILogger.warn(message);
        break;
      case "error":
        AILogger.error(message);
        break;
      default:
        AILogger.info(message);
    }
    
    return NextResponse.json({
      success: true,
      message: "Log kaydedildi"
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
