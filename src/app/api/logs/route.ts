import { getDatabase } from "@/lib/db/universal-client";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const db = await getDatabase();
    const logs = await db.query(
      "SELECT * FROM logs ORDER BY id DESC LIMIT 50"
    );

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch logs";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
