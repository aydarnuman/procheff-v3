import { getDB } from "@/lib/db/sqlite-client";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const db = getDB();
    const logs = db
      .prepare("SELECT * FROM logs ORDER BY id DESC LIMIT 50")
      .all();
    
    return NextResponse.json({ success: true, logs });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch logs";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
